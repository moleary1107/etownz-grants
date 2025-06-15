import OpenAI from 'openai';
import axios from 'axios';
import { logger } from './logger';
import { VectorDatabaseService, VectorMetadata } from './vectorDatabase';
import AICostManagementService from './aiCostManagementService';

export interface OpenAIUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // in cents
}

export interface ChatCompletionOptions {
  model?: 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json_object';
}

export interface EmbeddingOptions {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions?: number;
  batchSize?: number;
}

export interface GrantAnalysisResult {
  overallCompatibility: number;
  eligibilityStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PARTIAL';
  matchingCriteria: {
    criterion: string;
    matches: boolean;
    score: number;
    explanation: string;
  }[];
  recommendations: string[];
  reasoning: string;
  confidence: number;
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata: VectorMetadata;
  aiScore?: number;
  reasoning?: string;
}

export interface GrantContentAnalysis {
  grants: ExtractedGrantInfo[];
  metadata: {
    processingTime: number;
    confidence: number;
    tokensUsed: number;
  };
  overallConfidence: number;
}

export interface ExtractedGrantInfo {
  title: string;
  description: string;
  amount?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  deadline?: Date;
  eligibility?: string[];
  categories?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  confidence: number;
}

export class OpenAIService {
  private openai: OpenAI;
  private vectorDB: VectorDatabaseService;
  private costManager: AICostManagementService;
  private readonly models = {
    chat: {
      'gpt-4-turbo': { 
        inputCost: 10.00, // per 1M tokens
        outputCost: 30.00 
      },
      'gpt-4o': { 
        inputCost: 5.00, 
        outputCost: 15.00 
      },
      'gpt-4o-mini': { 
        inputCost: 0.15, 
        outputCost: 0.60 
      }
    },
    embeddings: {
      'text-embedding-3-small': { cost: 0.02 },
      'text-embedding-3-large': { cost: 0.13 }
    }
  };

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Validate and sanitize API key
    let apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    // Check for Unicode characters and sanitize if needed
    const hasUnicode = /[^\x20-\x7E]/.test(apiKey);
    if (hasUnicode) {
      logger.warn('API key contains non-ASCII characters, sanitizing', { 
        keyLength: apiKey.length,
        firstChars: apiKey.substring(0, 5) + '...',
        unicodeDetected: true
      });
      // Remove non-ASCII characters and trim whitespace
      apiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
      if (!apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format after sanitization');
      }
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 3
    });

    this.vectorDB = new VectorDatabaseService();
    this.costManager = new AICostManagementService();
    logger.info('OpenAIService initialized');
  }

  /**
   * Track AI usage for cost management
   */
  private async trackUsage(
    operation: string,
    model: string,
    usage: OpenAIUsageInfo,
    duration: number,
    status: 'success' | 'error' | 'timeout',
    userId?: string,
    organizationId?: string,
    endpoint?: string,
    requestId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.costManager.recordUsage({
        userId: userId || 'system',
        organizationId,
        service: 'openai',
        operation,
        model,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        cost: usage.estimatedCost,
        duration,
        endpoint: endpoint || 'openai-api',
        requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status,
        errorMessage
      });
    } catch (error) {
      // Don't fail the main operation if cost tracking fails
      logger.warn('Failed to track AI usage:', error);
    }
  }

  /**
   * Generate embeddings for text using OpenAI's embedding models
   */
  async generateEmbedding(
    text: string, 
    options: EmbeddingOptions = {},
    userId?: string,
    organizationId?: string
  ): Promise<{ embedding: number[], usage: OpenAIUsageInfo }> {
    const startTime = Date.now();
    const requestId = `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const {
        model = 'text-embedding-3-small',
        dimensions
      } = options;

      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Clean and limit text to max token size (8192 tokens for embedding models)
      const cleanedText = text.replace(/\n/g, ' ').trim();
      const limitedText = cleanedText.substring(0, 32000);

      logger.debug(`Generating embedding for text length: ${limitedText.length}, model: ${model}`);

      const requestParams: any = {
        model,
        input: limitedText,
        encoding_format: "float"
      };

      // Add dimensions parameter if specified and supported
      if (dimensions && (model === 'text-embedding-3-large' || model === 'text-embedding-3-small')) {
        requestParams.dimensions = dimensions;
      }

      const response = await this.openai.embeddings.create(requestParams);
      
      const embedding = response.data[0].embedding;
      const usage: OpenAIUsageInfo = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: 0,
        totalTokens: response.usage.total_tokens,
        estimatedCost: this.calculateEmbeddingCost(response.usage.total_tokens, model)
      };

      const duration = Date.now() - startTime;

      // Track usage for cost management
      await this.trackUsage(
        'generate_embedding',
        model,
        usage,
        duration,
        'success',
        userId,
        organizationId,
        'openai-embeddings',
        requestId
      );

      logger.info(`Generated embedding: ${embedding.length} dimensions, ${usage.totalTokens} tokens`);
      
      return { embedding, usage };
    } catch (error) {
      const duration = Date.now() - startTime;
      const usage: OpenAIUsageInfo = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 };
      
      // Track failed usage
      await this.trackUsage(
        'generate_embedding',
        options.model || 'text-embedding-3-small',
        usage,
        duration,
        'error',
        userId,
        organizationId,
        'openai-embeddings',
        requestId,
        error instanceof Error ? error.message : String(error)
      );

      logger.error('Failed to generate embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<{ embeddings: number[][], usage: OpenAIUsageInfo }> {
    try {
      const { batchSize = 100 } = options;
      
      if (!texts || texts.length === 0) {
        throw new Error('Texts array cannot be empty');
      }

      const allEmbeddings: number[][] = [];
      const totalUsage: OpenAIUsageInfo = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      };

      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(text => this.generateEmbedding(text, options))
        );

        const batchEmbeddings = batchResults.map(result => result.embedding);
        allEmbeddings.push(...batchEmbeddings);

        // Aggregate usage
        batchResults.forEach(result => {
          totalUsage.promptTokens += result.usage.promptTokens;
          totalUsage.totalTokens += result.usage.totalTokens;
          totalUsage.estimatedCost += result.usage.estimatedCost;
        });
      }

      logger.info(`Generated ${allEmbeddings.length} embeddings in batches`);
      return { embeddings: allEmbeddings, usage: totalUsage };
    } catch (error) {
      logger.error('Failed to generate batch embeddings:', error);
      throw error;
    }
  }


  /**
   * Chat completion with string input (convenience method)
   */
  // eslint-disable-next-line no-dupe-class-members
  async chatCompletion(
    prompt: string,
    options?: ChatCompletionOptions
  ): Promise<string>;
  
  /**
   * Chat completion with message array input
   */
  // eslint-disable-next-line no-dupe-class-members
  async chatCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options?: ChatCompletionOptions
  ): Promise<{ content: string, usage: OpenAIUsageInfo }>;

  // eslint-disable-next-line no-dupe-class-members
  async chatCompletion(
    input: string | { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: ChatCompletionOptions = {}
  ): Promise<string | { content: string, usage: OpenAIUsageInfo }> {
    if (typeof input === 'string') {
      // String input version - return just content
      const messages = [{ role: 'user' as const, content: input }];
      const result = await this.chatCompletionInternal(messages, options);
      return result.content;
    } else {
      // Message array version - return content and usage
      return this.chatCompletionInternal(input, options);
    }
  }

  /**
   * Internal chat completion implementation
   */
  private async chatCompletionInternal(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: ChatCompletionOptions = {}
  ): Promise<{ content: string, usage: OpenAIUsageInfo }> {
    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens,
      responseFormat = 'text'
    } = options;

    const requestParams: any = {
      model,
      messages,
      temperature
    };

    if (maxTokens) {
      requestParams.max_tokens = maxTokens;
    }

    if (responseFormat === 'json_object') {
      requestParams.response_format = { type: 'json_object' };
    }

    try {
      // Try using the original OpenAI client first, with timeout settings
      try {
        const completion = await this.openai.chat.completions.create(requestParams);
        
        const content = completion.choices[0].message.content || '';
        const usage: OpenAIUsageInfo = {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          estimatedCost: this.calculateChatCost(
            completion.usage?.prompt_tokens || 0,
            completion.usage?.completion_tokens || 0,
            model
          )
        };

        logger.info(`Chat completion via OpenAI client: ${usage.totalTokens} tokens, $${(usage.estimatedCost / 100).toFixed(4)}`);
        return { content, usage };
        
      } catch (clientError) {
        logger.warn('OpenAI client failed, falling back to fetch', { 
          error: clientError instanceof Error ? clientError.message : String(clientError) 
        });
        
        // Fallback to fetch with comprehensive sanitization
        const sanitizeText = (text: string): string => {
          return text
            // Convert to ASCII-safe characters
            .replace(/[\u2018\u2019]/g, "'")     // Smart single quotes
            .replace(/[\u201C\u201D]/g, '"')     // Smart double quotes
            .replace(/\u2026/g, '...')           // Horizontal ellipsis
            .replace(/\u2013/g, '-')             // En dash
            .replace(/\u2014/g, '--')            // Em dash
            .replace(/\u00A0/g, ' ')             // Non-breaking space
            .replace(/[\u2000-\u200F]/g, ' ')    // Various Unicode spaces
            .replace(/[\u2028\u2029]/g, '\n')    // Line/paragraph separators
            // Remove any character above ASCII range to prevent ByteString errors
            .replace(/[^\x20-\x7E]/g, '')
            // Clean up any double spaces
            .replace(/\s+/g, ' ')
            .trim();
        };
        
        const sanitizedParams = {
          ...requestParams,
          messages: requestParams.messages.map((msg: any) => {
            const sanitized = sanitizeText(msg.content);
            // Debug: log character codes around index 10
            if (sanitized.length > 15) {
              const chars = sanitized.substring(5, 15).split('').map((c, i) => `${i+5}:${c}(${c.charCodeAt(0)})`);
              logger.debug('Characters around index 10:', { chars });
            }
            return {
              ...msg,
              content: sanitized
            };
          })
        };
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', 
          sanitizedParams,
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json; charset=utf-8'
            },
            timeout: 30000
          }
        );

        const data = response.data;
        
        const content = data.choices[0].message.content || '';
        const usage: OpenAIUsageInfo = {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          estimatedCost: this.calculateChatCost(
            data.usage?.prompt_tokens || 0,
            data.usage?.completion_tokens || 0,
            model
          )
        };

        logger.info(`Chat completion via fetch: ${usage.totalTokens} tokens, $${(usage.estimatedCost / 100).toFixed(4)}`);
        return { content, usage };
      }
      
    } catch (error) {
      logger.error('Failed to generate chat completion:', {
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
        requestParams: requestParams
      });
      throw new Error(`Failed to generate chat completion: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Streaming chat completion
   */
  async chatCompletionStream(
    input: string | { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: ChatCompletionOptions = {}
  ): Promise<any> {
    try {
      const messages = typeof input === 'string' 
        ? [{ role: 'user' as const, content: input }]
        : input;

      const {
        model = 'gpt-4o-mini',
        temperature = 0.7,
        maxTokens,
        responseFormat = 'text'
      } = options;

      const requestParams: any = {
        model,
        messages,
        temperature,
        stream: true
      };

      if (maxTokens) {
        requestParams.max_tokens = maxTokens;
      }

      if (responseFormat === 'json_object') {
        requestParams.response_format = { type: 'json_object' };
      }

      const stream = await this.openai.chat.completions.create(requestParams);
      
      logger.info(`Started streaming chat completion with model: ${model}`);
      
      return stream;
    } catch (error) {
      logger.error('Failed to start streaming chat completion:', error);
      throw new Error(`Failed to start streaming chat completion: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Semantic search using vector similarity
   */
  async semanticSearch(
    query: string,
    filters?: {
      type?: string;
      organizationId?: string;
      namespace?: string;
      topK?: number;
    }
  ): Promise<SemanticSearchResult[]> {
    try {
      // Generate embedding for the query
      const { embedding: queryEmbedding } = await this.generateEmbedding(query);
      
      const {
        type,
        organizationId,
        namespace = 'default',
        topK = 10
      } = filters || {};

      // Build search filters
      const searchFilters: any = {};
      if (type) searchFilters.type = type;
      if (organizationId) searchFilters.organizationId = organizationId;

      // Perform vector search
      const vectorResults = await this.vectorDB.searchSimilar(queryEmbedding, {
        topK,
        namespace,
        filter: Object.keys(searchFilters).length > 0 ? searchFilters : undefined,
        includeMetadata: true
      });

      // Convert to semantic search results
      const results: SemanticSearchResult[] = vectorResults.map(result => ({
        id: result.id,
        title: result.metadata.title,
        content: result.metadata.content,
        similarity: result.score,
        metadata: result.metadata
      }));

      logger.info(`Semantic search found ${results.length} results for query: "${query.substring(0, 50)}..."`);
      
      return results;
    } catch (error) {
      logger.error('Failed to perform semantic search:', error);
      throw new Error(`Failed to perform semantic search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enhanced semantic search with AI re-ranking
   */
  async enhancedSemanticSearch(
    query: string,
    organizationProfile: string,
    filters?: {
      type?: string;
      organizationId?: string;
      namespace?: string;
      topK?: number;
    }
  ): Promise<SemanticSearchResult[]> {
    try {
      // Get initial semantic search results
      const initialResults = await this.semanticSearch(query, filters);
      
      if (initialResults.length === 0) {
        return [];
      }

      // Re-rank top results using AI analysis
      const topResults = initialResults.slice(0, Math.min(20, initialResults.length));
      
      const enhancedResults = await Promise.all(
        topResults.map(async (result) => {
          const analysisResult = await this.analyzeGrantRelevance(
            organizationProfile,
            result.content,
            query
          );
          
          return {
            ...result,
            aiScore: analysisResult.overallCompatibility,
            reasoning: analysisResult.reasoning
          };
        })
      );

      // Sort by combined vector similarity (60%) and AI score (40%)
      const finalResults = enhancedResults.sort((a, b) => {
        const aScore = (a.similarity * 0.6) + ((a.aiScore || 0) * 0.004); // Convert 0-100 to 0-0.4
        const bScore = (b.similarity * 0.6) + ((b.aiScore || 0) * 0.004);
        return bScore - aScore;
      });

      logger.info(`Enhanced semantic search re-ranked ${finalResults.length} results`);
      
      return finalResults.slice(0, filters?.topK || 10);
    } catch (error) {
      logger.error('Failed to perform enhanced semantic search:', error);
      throw error;
    }
  }

  /**
   * Analyze grant relevance for an organization
   */
  async analyzeGrantRelevance(
    organizationProfile: string,
    grantDescription: string,
    specificQuery?: string
  ): Promise<GrantAnalysisResult> {
    try {
      const prompt = `
        Analyze the relevance between this organization and grant opportunity.
        
        Organization Profile:
        ${organizationProfile}
        
        Grant Opportunity:
        ${grantDescription}
        
        ${specificQuery ? `Specific Interest: ${specificQuery}` : ''}
        
        Provide a detailed analysis including:
        1. Overall compatibility score (0-100)
        2. Eligibility status (ELIGIBLE/NOT_ELIGIBLE/PARTIAL)
        3. Specific matching criteria analysis
        4. Recommendations for the organization
        5. Reasoning for the assessment
        6. Confidence level in the analysis
        
        Return ONLY a JSON object with this structure:
        {
          "overallCompatibility": number,
          "eligibilityStatus": "ELIGIBLE" | "NOT_ELIGIBLE" | "PARTIAL",
          "matchingCriteria": [
            {
              "criterion": "string",
              "matches": boolean,
              "score": number,
              "explanation": "string"
            }
          ],
          "recommendations": ["string"],
          "reasoning": "string",
          "confidence": number
        }
      `;

      const { content } = await this.chatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        responseFormat: 'json_object',
        temperature: 0.3
      });

      const result = JSON.parse(content) as GrantAnalysisResult;
      
      // Validate the result structure
      if (typeof result.overallCompatibility !== 'number' || 
          !['ELIGIBLE', 'NOT_ELIGIBLE', 'PARTIAL'].includes(result.eligibilityStatus)) {
        throw new Error('Invalid analysis result format');
      }

      logger.info(`Grant relevance analysis completed: ${result.eligibilityStatus} (${result.overallCompatibility}%)`);
      
      return result;
    } catch (error) {
      logger.error('Failed to analyze grant relevance:', error);
      throw new Error(`Failed to analyze grant relevance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store text as vector embedding
   */
  async storeTextAsVector(
    text: string,
    metadata: VectorMetadata,
    namespace: string = 'default'
  ): Promise<{ vectorId: string, usage: OpenAIUsageInfo }> {
    try {
      const { embedding, usage } = await this.generateEmbedding(text);
      
      const vectorId = this.vectorDB.generateVectorId(metadata.type, metadata.id);
      
      // Update timestamps
      metadata.updatedAt = new Date().toISOString();
      if (!metadata.createdAt) {
        metadata.createdAt = new Date().toISOString();
      }

      await this.vectorDB.storeVector(vectorId, embedding, metadata, namespace);
      
      logger.info(`Stored text as vector: ${vectorId} in namespace: ${namespace}`);
      
      return { vectorId, usage };
    } catch (error) {
      logger.error('Failed to store text as vector:', error);
      throw error;
    }
  }

  /**
   * Find similar content using text query
   */
  async findSimilarContent(
    queryText: string,
    contentType: string,
    organizationId?: string,
    topK: number = 10
  ): Promise<SemanticSearchResult[]> {
    try {
      const filters: any = { type: contentType };
      if (organizationId) {
        filters.organizationId = organizationId;
      }

      return await this.semanticSearch(queryText, {
        ...filters,
        topK,
        namespace: contentType === 'grant' ? 'grants' : 'default'
      });
    } catch (error) {
      logger.error('Failed to find similar content:', error);
      throw error;
    }
  }

  /**
   * Calculate cost for embedding generation
   */
  private calculateEmbeddingCost(tokens: number, model: string): number {
    const costPerMillion = this.models.embeddings[model as keyof typeof this.models.embeddings]?.cost || 0.02;
    return (tokens / 1000000) * costPerMillion * 100; // Return in cents
  }

  /**
   * Calculate cost for chat completion
   */
  private calculateChatCost(inputTokens: number, outputTokens: number, model: string): number {
    const modelCosts = this.models.chat[model as keyof typeof this.models.chat];
    if (!modelCosts) {
      return 0; // Unknown model
    }

    const inputCost = (inputTokens / 1000000) * modelCosts.inputCost;
    const outputCost = (outputTokens / 1000000) * modelCosts.outputCost;
    return (inputCost + outputCost) * 100; // Return in cents
  }

  /**
   * Analyze content for grant information using AI
   */
  async analyzeContentForGrants(
    content: string,
    userId?: string,
    organizationId?: string
  ): Promise<GrantContentAnalysis> {
    const startTime = Date.now();
    const requestId = `grant_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const systemPrompt = `You are an AI assistant specialized in extracting grant funding information from web content. 
      
      Analyze the provided content and identify all grant funding opportunities. For each grant found, extract:
      1. Title/name of the grant
      2. Description/purpose
      3. Funding amount (minimum, maximum, or both if specified)
      4. Application deadline
      5. Eligibility criteria
      6. Categories or focus areas
      7. Contact information (email, phone, website)
      
      Return the results in JSON format with confidence scores (0.0-1.0) for each grant found.
      
      Rules:
      - Only include actual funding opportunities, not general information
      - Extract amounts in their original currency when possible
      - Parse dates into ISO format when identifiable
      - Assign confidence based on completeness and clarity of information
      - If no grants are found, return an empty array`;

      const userPrompt = `Analyze this content for grant funding opportunities:

${content.substring(0, 8000)}`; // Limit content to avoid token limits

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use cost-effective model for content analysis
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(response);
      const duration = Date.now() - startTime;

      // Calculate usage
      const usage: OpenAIUsageInfo = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        estimatedCost: this.calculateChatCost(completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0, 'gpt-4o-mini')
      };

      // Track usage
      await this.trackUsage(
        'grant_analysis',
        'gpt-4o-mini',
        usage,
        duration,
        'success',
        userId,
        organizationId,
        'chat/completions',
        requestId
      );

      // Process and validate the response
      const grants: ExtractedGrantInfo[] = (parsedResponse.grants || []).map((grant: any) => ({
        title: grant.title || 'Untitled Grant',
        description: grant.description || '',
        amount: grant.amount ? {
          min: grant.amount.min ? Number(grant.amount.min) : undefined,
          max: grant.amount.max ? Number(grant.amount.max) : undefined,
          currency: grant.amount.currency || 'EUR'
        } : undefined,
        deadline: grant.deadline ? new Date(grant.deadline) : undefined,
        eligibility: Array.isArray(grant.eligibility) ? grant.eligibility : [],
        categories: Array.isArray(grant.categories) ? grant.categories : [],
        contactInfo: grant.contactInfo || {},
        confidence: Math.min(1.0, Math.max(0.0, Number(grant.confidence) || 0.5))
      }));

      const overallConfidence = grants.length > 0 
        ? grants.reduce((sum, grant) => sum + grant.confidence, 0) / grants.length
        : 0;

      logger.info(`Grant analysis completed: found ${grants.length} grants`, {
        requestId,
        duration,
        tokensUsed: usage.totalTokens,
        cost: usage.estimatedCost
      });

      return {
        grants,
        metadata: {
          processingTime: duration,
          confidence: overallConfidence,
          tokensUsed: usage.totalTokens
        },
        overallConfidence
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed usage
      await this.trackUsage(
        'grant_analysis',
        'gpt-4o-mini',
        { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        duration,
        'error',
        userId,
        organizationId,
        'chat/completions',
        requestId,
        error instanceof Error ? error.message : String(error)
      );

      logger.error('Grant content analysis failed:', {
        error: error instanceof Error ? error.message : String(error),
        requestId,
        duration
      });
      
      throw error;
    }
  }

  /**
   * Analyze grant opportunity for specific extraction requirements
   */
  async extractGrantWithPrompt(
    content: string,
    extractionPrompt: string,
    userId?: string,
    organizationId?: string
  ): Promise<{
    extractedData: any;
    confidence: number;
    usage: OpenAIUsageInfo;
  }> {
    const startTime = Date.now();
    const requestId = `custom_extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const systemPrompt = `You are an AI assistant that extracts specific information from grant and funding content based on user requirements.
      
      Extract information according to the user's specific instructions and return it in a structured JSON format.
      Include a confidence score (0.0-1.0) based on how well you could fulfill the extraction requirements.`;

      const userPrompt = `Content to analyze:
${content.substring(0, 8000)}

Extraction Requirements:
${extractionPrompt}

Please extract the requested information and provide a confidence score.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(response);
      const duration = Date.now() - startTime;

      // Calculate usage
      const usage: OpenAIUsageInfo = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        estimatedCost: this.calculateChatCost(completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0, 'gpt-4o-mini')
      };

      // Track usage
      await this.trackUsage(
        'custom_extraction',
        'gpt-4o-mini',
        usage,
        duration,
        'success',
        userId,
        organizationId,
        'chat/completions',
        requestId
      );

      logger.info('Custom grant extraction completed', {
        requestId,
        duration,
        tokensUsed: usage.totalTokens,
        confidence: parsedResponse.confidence || 0.5
      });

      return {
        extractedData: parsedResponse,
        confidence: Math.min(1.0, Math.max(0.0, Number(parsedResponse.confidence) || 0.5)),
        usage
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed usage
      await this.trackUsage(
        'custom_extraction',
        'gpt-4o-mini',
        { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        duration,
        'error',
        userId,
        organizationId,
        'chat/completions',
        requestId,
        error instanceof Error ? error.message : String(error)
      );

      logger.error('Custom grant extraction failed:', {
        error: error instanceof Error ? error.message : String(error),
        requestId,
        duration
      });
      
      throw error;
    }
  }

  /**
   * Generate text using OpenAI completion (convenience method for AI Editor)
   */
  async generateText(
    prompt: string,
    options: {
      model?: 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini';
      max_tokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    try {
      const {
        model = 'gpt-4o-mini',
        max_tokens = 2000,
        temperature = 0.7
      } = options;

      const messages = [{ role: 'user' as const, content: prompt }];
      
      const { content } = await this.chatCompletionInternal(messages, {
        model,
        maxTokens: max_tokens,
        temperature
      });

      return content;
    } catch (error) {
      logger.error('Failed to generate text:', error);
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    openaiConnected: boolean;
    vectorDbConnected: boolean;
    error?: string;
  }> {
    let openaiConnected = false;
    let openaiError: string | undefined;
    let vectorDbConnected = false;
    let vectorDbError: string | undefined;

    // Test OpenAI connection separately
    try {
      await this.generateEmbedding('test', { model: 'text-embedding-3-small' });
      openaiConnected = true;
      logger.debug('OpenAI embedding service: Connected successfully');
    } catch (error) {
      openaiError = error instanceof Error ? error.message : String(error);
      logger.error('OpenAI embedding service connection failed:', openaiError);
    }

    // Test vector database connection separately
    try {
      const vectorHealth = await this.vectorDB.healthCheck();
      vectorDbConnected = vectorHealth.status === 'healthy';
      if (!vectorDbConnected && vectorHealth.error) {
        vectorDbError = vectorHealth.error;
      }
      logger.debug(`Vector database: ${vectorHealth.status}`);
    } catch (error) {
      vectorDbError = error instanceof Error ? error.message : String(error);
      logger.error('Vector database connection failed:', vectorDbError);
    }

    // Determine overall status
    const isHealthy = openaiConnected && vectorDbConnected;
    const combinedError = [openaiError, vectorDbError].filter(Boolean).join('; ');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      openaiConnected,
      vectorDbConnected,
      error: combinedError || undefined
    };
  }
}

// Create singleton instance
export const openaiService = new OpenAIService();

export default OpenAIService;