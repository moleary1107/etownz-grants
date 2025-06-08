import { OpenAIService } from './openaiService';
import { VectorDatabaseService } from './vectorDatabase';
import { db } from './database';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export interface EditorContext {
  sessionId: string;
  applicationId: string;
  grantId: string;
  section: string;
  grantType: string;
  userId: string;
  organizationId?: string;
}

export interface AISuggestion {
  id: string;
  type: 'insertion' | 'replacement' | 'enhancement' | 'structure';
  content: string;
  position?: number;
  originalText?: string;
  reasoning: string;
  confidence: number;
  sources?: string[];
  contextData?: any;
}

export interface ContentQualityAnalysis {
  overallScore: number;
  clarityScore: number;
  completenessScore: number;
  complianceScore: number;
  impactScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: Array<{
    type: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
  }>;
  benchmarkComparison: {
    percentile: number;
    averageScore: number;
    topPerformerScore: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  confidence?: number;
  reasoning?: string;
  timestamp: Date;
  parentMessageId?: string;
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata: any;
  relevanceReason?: string;
  grantType?: string;
  successRate?: number;
}

export class AIEditorService {
  private openaiService: OpenAIService;
  private vectorService: VectorDatabaseService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.vectorService = new VectorDatabaseService();
  }

  /**
   * Generate contextual suggestions based on current editor content
   */
  async generateContextualSuggestions(
    content: string,
    cursorPosition: number,
    context: EditorContext
  ): Promise<AISuggestion[]> {
    try {
      const startTime = Date.now();
      
      // Extract surrounding content for context
      const surroundingText = this.extractSurroundingText(content, cursorPosition, 300);
      
      // Get grant requirements for this section
      const requirements = await this.getGrantRequirements(context.grantId, context.section);
      
      // Search for similar successful content
      const similarContent = await this.findSimilarSuccessfulContent(
        surroundingText,
        context
      );

      // Generate AI suggestions
      const suggestions = await this.generateAISuggestions({
        content: surroundingText,
        fullContent: content,
        position: cursorPosition,
        context,
        requirements,
        similarExamples: similarContent
      });

      // Store suggestions in database
      await this.storeSuggestions(suggestions, context);

      // Track interaction
      await this.trackInteraction({
        sessionId: context.sessionId,
        userId: context.userId,
        interactionType: 'suggestion',
        inputContent: surroundingText,
        cursorPosition,
        aiResponse: JSON.stringify(suggestions),
        processingTimeMs: Date.now() - startTime,
        contextMetadata: {
          requirementsCount: requirements.length,
          similarExamplesCount: similarContent.length,
          contentLength: content.length
        }
      });

      return suggestions;
    } catch (error) {
      logger.error('Failed to generate contextual suggestions:', error);
      throw error;
    }
  }

  /**
   * Generate content based on user prompt
   */
  async generateContent(
    prompt: string,
    context: EditorContext,
    options: {
      type?: 'completion' | 'enhancement' | 'full_section';
      style?: 'formal' | 'academic' | 'concise';
      length?: 'short' | 'medium' | 'long';
    } = {}
  ): Promise<{
    content: string;
    reasoning: string;
    confidence: number;
    sources: string[];
  }> {
    try {
      const { type = 'completion', style = 'formal', length = 'medium' } = options;
      
      // Get grant-specific context
      const grantRequirements = await this.getGrantRequirements(context.grantId, context.section);
      const similarExamples = await this.findSimilarSuccessfulContent(prompt, context, 5);
      
      // Build enhanced prompt
      const enhancedPrompt = this.buildGenerationPrompt({
        userPrompt: prompt,
        context,
        requirements: grantRequirements,
        examples: similarExamples,
        type,
        style,
        length
      });

      const result = await this.openaiService.chatCompletion([
        { role: 'user', content: enhancedPrompt }
      ], {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: this.getMaxTokensForLength(length)
      });

      // Parse structured response
      const response = this.parseGenerationResponse(result.content);
      
      // Track interaction
      await this.trackInteraction({
        sessionId: context.sessionId,
        userId: context.userId,
        interactionType: 'generation',
        inputContent: prompt,
        aiResponse: response.content,
        processingTimeMs: Date.now() - Date.now(),
        contextMetadata: {
          type,
          style,
          length,
          requirementsUsed: grantRequirements.length,
          examplesUsed: similarExamples.length
        }
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate content:', error);
      throw error;
    }
  }

  /**
   * Perform semantic search with grant-specific context
   */
  async performSemanticSearch(
    query: string,
    context: EditorContext,
    options: {
      searchType?: 'content' | 'examples' | 'patterns' | 'requirements';
      topK?: number;
      filters?: any;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      const { searchType = 'content', topK = 10, filters = {} } = options;
      
      // Build search filters
      const searchFilters = {
        type: 'grant',
        grantType: context.grantType,
        section: context.section,
        ...filters
      };

      // If searching for examples, prioritize successful applications
      if (searchType === 'examples') {
        searchFilters.successRate = { $gte: 0.8 };
      }

      // Perform vector search
      const vectorResults = await this.openaiService.semanticSearch(query, {
        namespace: this.getNamespaceForSearchType(searchType),
        topK: topK * 2, // Get more results for re-ranking
        type: searchFilters.type,
        organizationId: filters.organizationId
      });

      // Enhanced results with AI analysis
      const enhancedResults = await Promise.all(
        vectorResults.slice(0, topK).map(async (result) => {
          const relevanceAnalysis = await this.analyzeRelevance(query, result.content, context);
          
          return {
            id: result.id,
            title: result.title,
            content: result.content,
            similarity: result.similarity,
            metadata: result.metadata,
            relevanceReason: relevanceAnalysis.reasoning,
            grantType: result.metadata.grantType,
            successRate: result.metadata.successRate
          };
        })
      );

      // Sort by combined similarity and relevance
      const sortedResults = enhancedResults.sort((a, b) => {
        const aScore = a.similarity * 0.7 + (a.metadata.successRate || 0.5) * 0.3;
        const bScore = b.similarity * 0.7 + (b.metadata.successRate || 0.5) * 0.3;
        return bScore - aScore;
      });

      logger.info(`Semantic search completed: ${sortedResults.length} results for "${query}"`);
      
      return sortedResults;
    } catch (error) {
      logger.error('Failed to perform semantic search:', error);
      throw error;
    }
  }

  /**
   * Analyze content quality against grant requirements
   */
  async analyzeContentQuality(
    content: string,
    context: EditorContext
  ): Promise<ContentQualityAnalysis> {
    try {
      // Get grant requirements and benchmarks
      const requirements = await this.getGrantRequirements(context.grantId, context.section);
      const benchmarks = await this.getBenchmarkContent(context);
      
      // Analyze with AI
      const analysisPrompt = this.buildQualityAnalysisPrompt({
        content,
        context,
        requirements,
        benchmarks
      });

      const result = await this.openaiService.chatCompletion([
        { role: 'user', content: analysisPrompt }
      ], {
        model: 'gpt-4-turbo',
        responseFormat: 'json_object',
        temperature: 0.3
      });

      const analysis = JSON.parse(result.content) as ContentQualityAnalysis;
      
      // Store assessment in database
      await this.storeContentAssessment(content, analysis, context);
      
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze content quality:', error);
      throw error;
    }
  }

  /**
   * Handle chat conversation with AI assistant
   */
  async processChat(
    message: string,
    context: EditorContext,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatMessage> {
    try {
      // Build conversation with context
      const messages = [
        {
          role: 'system' as const,
          content: this.buildChatSystemPrompt(context)
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: message
        }
      ];

      const result = await this.openaiService.chatCompletion(messages, {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 1000
      });

      const chatMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: result.content,
        confidence: 0.85, // Could be calculated based on response characteristics
        timestamp: new Date()
      };

      // Store chat message
      await this.storeChatMessage(chatMessage, context);
      
      return chatMessage;
    } catch (error) {
      logger.error('Failed to process chat:', error);
      throw error;
    }
  }

  /**
   * Check compliance against grant requirements
   */
  async checkCompliance(
    content: string,
    context: EditorContext
  ): Promise<{
    overallCompliance: number;
    checks: Array<{
      requirement: string;
      status: 'met' | 'partial' | 'not_met' | 'not_applicable';
      evidence?: string;
      suggestions?: string[];
    }>;
    criticalIssues: string[];
    recommendations: string[];
  }> {
    try {
      const requirements = await this.getGrantRequirements(context.grantId, context.section);
      
      const compliancePrompt = `
        Analyze the following content for compliance with grant requirements:
        
        Content:
        ${content}
        
        Requirements:
        ${requirements.map((req, index) => `${index + 1}. ${req.text} (${req.type})`).join('\n')}
        
        Provide a detailed compliance analysis including:
        1. Overall compliance percentage (0-100)
        2. Status for each requirement
        3. Evidence found in the content
        4. Critical issues that must be addressed
        5. Recommendations for improvement
        
        Return as JSON with the specified structure.
      `;

      const result = await this.openaiService.chatCompletion([
        { role: 'user', content: compliancePrompt }
      ], {
        model: 'gpt-4-turbo',
        responseFormat: 'json_object',
        temperature: 0.2
      });

      return JSON.parse(result.content);
    } catch (error) {
      logger.error('Failed to check compliance:', error);
      throw error;
    }
  }

  /**
   * Get grant requirements for a specific section
   */
  private async getGrantRequirements(grantId: string, section: string) {
    try {
      const result = await db.query(`
        SELECT requirements, compliance_rules, writing_guidelines
        FROM ai_grant_requirements
        WHERE grant_id = $1 AND section_type = $2
        ORDER BY version DESC
        LIMIT 1
      `, [grantId, section]);

      if (result.rows.length === 0) {
        // Generate requirements using AI if not exists
        return await this.generateGrantRequirements(grantId, section);
      }

      return result.rows[0].requirements || [];
    } catch (error) {
      logger.error('Failed to get grant requirements:', error);
      return [];
    }
  }

  /**
   * Find similar successful content
   */
  private async findSimilarSuccessfulContent(
    query: string,
    context: EditorContext,
    limit: number = 5
  ) {
    try {
      return await this.openaiService.enhancedSemanticSearch(
        query,
        `Grant type: ${context.grantType}, Section: ${context.section}`,
        {
          type: 'grant',
          namespace: 'successful_applications',
          topK: limit
        }
      );
    } catch (error) {
      logger.error('Failed to find similar content:', error);
      return [];
    }
  }

  /**
   * Extract surrounding text for context
   */
  private extractSurroundingText(
    content: string,
    position: number,
    radius: number
  ): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(content.length, position + radius);
    return content.substring(start, end);
  }

  /**
   * Store suggestions in database
   */
  private async storeSuggestions(
    suggestions: AISuggestion[],
    context: EditorContext
  ): Promise<void> {
    try {
      for (const suggestion of suggestions) {
        await db.query(`
          INSERT INTO ai_content_suggestions (
            session_id, user_id, suggestion_type, content_position,
            original_text, suggested_text, reasoning, confidence_score,
            source_type, context_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          context.sessionId,
          context.userId,
          suggestion.type,
          suggestion.position || 0,
          suggestion.originalText,
          suggestion.content,
          suggestion.reasoning,
          suggestion.confidence,
          'ai_generation',
          JSON.stringify(suggestion.contextData || {})
        ]);
      }
    } catch (error) {
      logger.error('Failed to store suggestions:', error);
    }
  }

  /**
   * Track AI interaction for learning and cost management
   */
  private async trackInteraction(data: {
    sessionId: string;
    userId: string;
    interactionType: string;
    inputContent?: string;
    cursorPosition?: number;
    aiResponse?: string;
    processingTimeMs?: number;
    contextMetadata?: any;
  }): Promise<void> {
    try {
      await db.query(`
        INSERT INTO ai_editor_interactions (
          session_id, user_id, interaction_type, input_content,
          cursor_position, ai_response, processing_time_ms, context_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        data.sessionId,
        data.userId,
        data.interactionType,
        data.inputContent,
        data.cursorPosition,
        data.aiResponse,
        data.processingTimeMs,
        JSON.stringify(data.contextMetadata || {})
      ]);
    } catch (error) {
      logger.error('Failed to track interaction:', error);
    }
  }

  /**
   * Store chat message in database
   */
  private async storeChatMessage(
    message: ChatMessage,
    context: EditorContext
  ): Promise<void> {
    try {
      await db.query(`
        INSERT INTO ai_editor_chat_messages (
          id, session_id, user_id, role, content, confidence, reasoning
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        message.id,
        context.sessionId,
        message.role === 'user' ? context.userId : null,
        message.role,
        message.content,
        message.confidence,
        message.reasoning
      ]);
    } catch (error) {
      logger.error('Failed to store chat message:', error);
    }
  }

  /**
   * Helper methods for AI prompt building
   */
  private buildGenerationPrompt(options: any): string {
    // Implementation for building context-aware prompts
    return `Generate content for grant application...`;
  }

  private buildQualityAnalysisPrompt(options: any): string {
    // Implementation for quality analysis prompts
    return `Analyze content quality...`;
  }

  private buildChatSystemPrompt(context: EditorContext): string {
    return `You are an expert grant writing assistant helping with a ${context.grantType} grant application, specifically the ${context.section} section. Provide helpful, actionable advice.`;
  }

  private parseGenerationResponse(content: string): any {
    // Parse AI response and extract structured data
    return {
      content,
      reasoning: 'Generated based on grant requirements and successful examples',
      confidence: 0.85,
      sources: []
    };
  }

  private getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'short': return 300;
      case 'medium': return 800;
      case 'long': return 1500;
      default: return 800;
    }
  }

  private getNamespaceForSearchType(searchType: string): string {
    switch (searchType) {
      case 'examples': return 'successful_applications';
      case 'patterns': return 'writing_patterns';
      case 'requirements': return 'grant_requirements';
      default: return 'grants';
    }
  }

  private async generateGrantRequirements(grantId: string, section: string) {
    // Implementation to generate requirements using AI
    return [];
  }

  /**
   * Generate AI suggestions based on context and requirements
   */
  private async generateAISuggestions(options: {
    content: string;
    fullContent: string;
    position: number;
    context: EditorContext;
    requirements: any[];
    similarExamples: any[];
  }): Promise<AISuggestion[]> {
    try {
      const prompt = `
        As an expert grant writing assistant, analyze the following content and provide contextual suggestions:
        
        Current Content (around cursor):
        ${options.content}
        
        Full Content Length: ${options.fullContent.length} characters
        Cursor Position: ${options.position}
        Section: ${options.context.section}
        Grant Type: ${options.context.grantType}
        
        Requirements:
        ${options.requirements.map((req, i) => `${i + 1}. ${JSON.stringify(req)}`).join('\n')}
        
        Similar Successful Examples:
        ${options.similarExamples.slice(0, 3).map((ex, i) => `${i + 1}. ${ex.content?.substring(0, 200)}...`).join('\n')}
        
        Provide 2-5 contextual suggestions for improving or completing this content. Each suggestion should include:
        - type: 'insertion', 'replacement', 'enhancement', or 'structure'
        - content: the suggested text
        - reasoning: why this suggestion is helpful
        - confidence: 0-1 score
        
        Return as JSON array.
      `;

      const result = await this.openaiService.chatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4-turbo',
        responseFormat: 'json_object',
        temperature: 0.7
      });

      const response = JSON.parse(result.content);
      const suggestions: AISuggestion[] = (response.suggestions || []).map((s: any, index: number) => ({
        id: uuidv4(),
        type: s.type || 'enhancement',
        content: s.content || '',
        position: options.position,
        reasoning: s.reasoning || '',
        confidence: s.confidence || 0.7,
        contextData: {
          requirementsUsed: options.requirements.length,
          examplesUsed: options.similarExamples.length,
          sectionType: options.context.section
        }
      }));

      return suggestions;
    } catch (error) {
      logger.error('Failed to generate AI suggestions:', error);
      return [];
    }
  }

  private async analyzeRelevance(query: string, content: string, context: EditorContext) {
    // Implementation for relevance analysis
    return { reasoning: 'Relevant based on content similarity and grant context' };
  }

  private async getBenchmarkContent(context: EditorContext) {
    // Implementation to get benchmark content for comparison
    return [];
  }

  private async storeContentAssessment(
    content: string,
    analysis: ContentQualityAnalysis,
    context: EditorContext
  ): Promise<void> {
    // Implementation to store content assessment
  }
}

export default AIEditorService;