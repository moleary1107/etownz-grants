import OpenAI from 'openai';
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

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
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

      // Limit text to max token size (8192 tokens ≈ 32,000 characters)
      const limitedText = text.substring(0, 32000);

      const requestParams: any = {
        model,
        input: limitedText
      };

      // Add dimensions parameter if specified and supported
      if (dimensions && model === 'text-embedding-3-large') {
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
  async chatCompletion(
    prompt: string,
    options?: ChatCompletionOptions
  ): Promise<string>;
  
  /**
   * Chat completion with message array input
   */
  async chatCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options?: ChatCompletionOptions
  ): Promise<{ content: string, usage: OpenAIUsageInfo }>;

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
    try {
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

      const response = await this.openai.chat.completions.create(requestParams);
      
      const content = response.choices[0].message.content || '';
      const usage: OpenAIUsageInfo = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        estimatedCost: this.calculateChatCost(
          response.usage?.prompt_tokens || 0,
          response.usage?.completion_tokens || 0,
          model
        )
      };

      logger.info(`Chat completion: ${usage.totalTokens} tokens, $${(usage.estimatedCost / 100).toFixed(4)}`);
      
      return { content, usage };
    } catch (error) {
      logger.error('Failed to generate chat completion:', error);
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
   * Get service health status
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    openaiConnected: boolean;
    vectorDbConnected: boolean;
    error?: string;
  }> {
    try {
      // Test OpenAI connection with a simple embedding
      await this.generateEmbedding('test', { model: 'text-embedding-3-small' });
      
      // Test vector database connection
      const vectorHealth = await this.vectorDB.healthCheck();
      
      return {
        status: vectorHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        openaiConnected: true,
        vectorDbConnected: vectorHealth.status === 'healthy',
        error: vectorHealth.error
      };
    } catch (error) {
      logger.error('OpenAI service health check failed:', error);
      return {
        status: 'unhealthy',
        openaiConnected: false,
        vectorDbConnected: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Create singleton instance
export const openaiService = new OpenAIService();

export default OpenAIService;