import { GrantsRepository, Grant, GrantFilters, EligibilityMatch } from '../repositories/grantsRepository';
import { OpenAIService, SemanticSearchResult, GrantAnalysisResult } from './openaiService';
import { VectorDatabaseService, VectorMetadata } from './vectorDatabase';
import { logger } from './logger';
import { db } from './database';

export interface GrantProcessingResult {
  grant: Grant;
  vectorId?: string;
  aiProcessed: boolean;
  semanticTags: string[];
  processingError?: string;
}

export interface GrantMatchResult {
  grant: Grant;
  matchScore: number;
  analysisResult: GrantAnalysisResult;
  semanticSimilarity: number;
  reasoning: string;
  recommendations: string[];
}

export interface OrganizationProfile {
  id: string;
  name: string;
  description: string;
  sector?: string;
  size?: string;
  location?: string;
  capabilities?: string[];
  previousGrants?: string[];
}

export class GrantsService {
  private grantsRepository: GrantsRepository;
  private openaiService: OpenAIService;
  private vectorDB: VectorDatabaseService;

  constructor() {
    this.grantsRepository = new GrantsRepository();
    this.openaiService = new OpenAIService();
    this.vectorDB = new VectorDatabaseService();
  }

  /**
   * Process a new grant with AI analysis and vector storage
   */
  async processNewGrant(grant: Grant): Promise<GrantProcessingResult> {
    try {
      logger.info(`Processing new grant: ${grant.id} - ${grant.title}`);

      // Combine grant data for embedding
      const grantText = this.constructGrantText(grant);
      
      // Generate semantic tags using AI
      const semanticTags = await this.generateSemanticTags(grant);
      
      // Create vector metadata
      const metadata: VectorMetadata = {
        id: grant.id,
        type: 'grant',
        title: grant.title,
        content: grantText,
        source: grant.source || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Additional grant-specific metadata
        funder: grant.funder,
        deadline: grant.deadline?.toISOString(),
        amount_min: grant.amount_min,
        amount_max: grant.amount_max,
        categories: grant.categories,
        url: grant.url
      };

      // Store as vector for semantic search
      const { vectorId, usage } = await this.openaiService.storeTextAsVector(
        grantText,
        metadata,
        'grants'
      );

      // Update grant record with AI processing info
      await this.updateGrantAIProcessing(grant.id, vectorId, semanticTags);

      // Store semantic tags in database
      await this.storeSemanticTags(grant.id, semanticTags);

      // Log the AI interaction
      await this.logAIInteraction({
        interaction_type: 'grant_processing',
        model_used: 'text-embedding-3-small',
        input_text: grantText.substring(0, 1000), // Store truncated for logging
        total_tokens: usage.totalTokens,
        estimated_cost_cents: usage.estimatedCost,
        metadata: {
          grant_id: grant.id,
          vector_id: vectorId,
          tags_generated: semanticTags.length
        }
      });

      logger.info(`Successfully processed grant ${grant.id}: vectorId=${vectorId}, tags=${semanticTags.length}`);

      return {
        grant,
        vectorId,
        aiProcessed: true,
        semanticTags
      };

    } catch (error) {
      logger.error(`Failed to process grant ${grant.id}:`, error);
      
      // Still mark as processed even if vector storage failed
      await this.updateGrantAIProcessing(grant.id, null, [], error instanceof Error ? error.message : String(error));

      return {
        grant,
        aiProcessed: false,
        semanticTags: [],
        processingError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Find grants matching organization profile using AI
   */
  async findMatchingGrants(
    organizationProfile: OrganizationProfile,
    filters: GrantFilters = {},
    limit: number = 10
  ): Promise<GrantMatchResult[]> {
    try {
      logger.info(`Finding matching grants for organization: ${organizationProfile.id}`);

      // Create organization profile text for analysis
      const orgProfileText = this.constructOrganizationProfileText(organizationProfile);

      // Use semantic search to find similar grants
      const semanticResults = await this.openaiService.enhancedSemanticSearch(
        orgProfileText,
        orgProfileText,
        {
          type: 'grant',
          namespace: 'grants',
          topK: Math.min(limit * 2, 50) // Get more results for re-ranking
        }
      );

      // Analyze each grant for compatibility
      const matchResults: GrantMatchResult[] = [];
      
      for (const result of semanticResults.slice(0, limit)) {
        try {
          // Get full grant details
          const grant = await this.findGrantById(result.metadata.id);
          if (!grant) continue;

          // Get cached analysis or perform new analysis
          let analysisResult = await this.getCachedGrantAnalysis(
            grant.id,
            organizationProfile.id
          );

          if (!analysisResult) {
            const grantText = this.constructGrantText(grant);
            analysisResult = await this.openaiService.analyzeGrantRelevance(
              orgProfileText,
              grantText,
              filters.search
            );

            // Cache the analysis
            await this.cacheGrantAnalysis(
              grant.id,
              organizationProfile.id,
              analysisResult
            );
          }

          matchResults.push({
            grant,
            matchScore: analysisResult.overallCompatibility,
            analysisResult,
            semanticSimilarity: result.similarity,
            reasoning: result.reasoning || analysisResult.reasoning,
            recommendations: analysisResult.recommendations
          });

        } catch (error) {
          logger.warn(`Failed to analyze grant ${result.id}:`, error);
          continue;
        }
      }

      // Sort by match score
      matchResults.sort((a, b) => b.matchScore - a.matchScore);

      // Log the search interaction
      await this.logAIInteraction({
        interaction_type: 'grant_matching',
        model_used: 'gpt-4o-mini',
        input_text: orgProfileText.substring(0, 1000),
        metadata: {
          organization_id: organizationProfile.id,
          results_count: matchResults.length,
          filters,
          top_match_score: matchResults[0]?.matchScore || 0
        }
      });

      logger.info(`Found ${matchResults.length} matching grants for organization ${organizationProfile.id}`);
      return matchResults;

    } catch (error) {
      logger.error(`Failed to find matching grants for organization ${organizationProfile.id}:`, error);
      throw error;
    }
  }

  /**
   * Semantic search for grants
   */
  async semanticSearchGrants(
    query: string,
    organizationId?: string,
    filters: GrantFilters = {},
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    try {
      logger.info(`Semantic search for: "${query.substring(0, 50)}..."`);

      // Enhanced search with organization context if provided
      if (organizationId) {
        const org = await this.getOrganizationProfile(organizationId);
        const orgProfileText = this.constructOrganizationProfileText(org);
        
        return await this.openaiService.enhancedSemanticSearch(
          query,
          orgProfileText,
          {
            type: 'grant',
            organizationId,
            namespace: 'grants',
            topK: limit
          }
        );
      }

      // Standard semantic search
      return await this.openaiService.semanticSearch(query, {
        type: 'grant',
        namespace: 'grants',
        topK: limit
      });

    } catch (error) {
      logger.error(`Semantic search failed for query: "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get grants that need AI processing
   */
  async getUnprocessedGrants(limit: number = 50): Promise<Grant[]> {
    const query = `
      SELECT * FROM grants 
      WHERE (ai_processed IS NULL OR ai_processed = false)
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Batch process grants for vector storage
   */
  async batchProcessGrants(batchSize: number = 10): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const unprocessedGrants = await this.getUnprocessedGrants(batchSize);
      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      logger.info(`Starting batch processing of ${unprocessedGrants.length} grants`);

      for (const grant of unprocessedGrants) {
        try {
          await this.processNewGrant(grant);
          processed++;
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failed++;
          const errorMsg = `Grant ${grant.id}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          logger.error(`Batch processing error:`, errorMsg);
        }
      }

      logger.info(`Batch processing completed: ${processed} processed, ${failed} failed`);
      
      return { processed, failed, errors };
    } catch (error) {
      logger.error('Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate semantic tags for a grant using AI
   */
  private async generateSemanticTags(grant: Grant): Promise<string[]> {
    try {
      const grantText = this.constructGrantText(grant);
      
      const prompt = `
        Analyze this grant opportunity and extract semantic tags that would help with categorization and search.
        Focus on: sector, technology, stage, geography, themes, and specific domains.
        
        Grant: ${grantText}
        
        Return a JSON array of relevant tags (5-15 tags). Each tag should be a single word or short phrase.
        Example: ["technology", "ai", "healthcare", "startup", "ireland", "innovation"]
      `;

      const { content } = await this.openaiService.chatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        responseFormat: 'json_object',
        temperature: 0.3
      });

      const result = JSON.parse(content);
      return Array.isArray(result) ? result : result.tags || [];
    } catch (error) {
      logger.warn(`Failed to generate semantic tags for grant ${grant.id}:`, error);
      return [];
    }
  }

  /**
   * Construct searchable text from grant data
   */
  private constructGrantText(grant: Grant): string {
    const parts = [
      grant.title,
      grant.description,
      grant.summary,
      grant.funder,
      grant.application_process,
      JSON.stringify(grant.eligibility_criteria),
      grant.categories?.join(' '),
      grant.required_documents?.join(' ')
    ].filter(Boolean);

    return parts.join('\n\n');
  }

  /**
   * Construct organization profile text
   */
  private constructOrganizationProfileText(org: OrganizationProfile): string {
    const parts = [
      `Organization: ${org.name}`,
      `Description: ${org.description}`,
      org.sector ? `Sector: ${org.sector}` : null,
      org.size ? `Size: ${org.size}` : null,
      org.location ? `Location: ${org.location}` : null,
      org.capabilities?.length ? `Capabilities: ${org.capabilities.join(', ')}` : null,
      org.previousGrants?.length ? `Previous grants: ${org.previousGrants.join(', ')}` : null
    ].filter(Boolean);

    return parts.join('\n');
  }

  /**
   * Update grant with AI processing information
   */
  private async updateGrantAIProcessing(
    grantId: string,
    vectorId: string | null,
    semanticTags: string[],
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE grants 
      SET ai_processed = $1,
          ai_processed_at = NOW(),
          semantic_hash = $2
      WHERE id = $3
    `;

    const contentHash = vectorId ? 'processed' : (error ? 'error' : 'skipped');
    await db.query(query, [!!vectorId, contentHash, grantId]);

    // Store vector reference if successful
    if (vectorId) {
      await db.query(`
        INSERT INTO vector_embeddings (entity_type, entity_id, vector_id, embedding_model, namespace)
        VALUES ('grant', $1, $2, 'text-embedding-3-small', 'grants')
        ON CONFLICT (entity_type, entity_id, namespace) 
        DO UPDATE SET vector_id = EXCLUDED.vector_id, updated_at = NOW()
      `, [grantId, vectorId]);
    }
  }

  /**
   * Store semantic tags in database
   */
  private async storeSemanticTags(grantId: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    const values = tags.map((tag, index) => `($1, $${index + 2}, 'ai_generated', 'gpt-4o-mini', 85.0)`).join(', ');
    const params = [grantId, ...tags];

    const query = `
      INSERT INTO grant_semantic_tags (grant_id, tag_name, extraction_method, model_used, confidence_score)
      VALUES ${values}
      ON CONFLICT (grant_id, tag_name, tag_category) DO NOTHING
    `;

    await db.query(query, params);
  }

  /**
   * Get cached grant analysis
   */
  private async getCachedGrantAnalysis(
    grantId: string,
    organizationId: string
  ): Promise<GrantAnalysisResult | null> {
    const query = `
      SELECT analysis_result 
      FROM grant_ai_analysis 
      WHERE grant_id = $1 AND organization_id = $2 AND is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query, [grantId, organizationId]);
    return result.rows.length > 0 ? result.rows[0].analysis_result : null;
  }

  /**
   * Cache grant analysis result
   */
  private async cacheGrantAnalysis(
    grantId: string,
    organizationId: string,
    analysis: GrantAnalysisResult
  ): Promise<void> {
    const query = `
      INSERT INTO grant_ai_analysis (
        grant_id, organization_id, analysis_type, analysis_result, 
        confidence_score, model_used
      )
      VALUES ($1, $2, 'compatibility', $3, $4, 'gpt-4o-mini')
    `;

    await db.query(query, [
      grantId,
      organizationId,
      JSON.stringify(analysis),
      analysis.confidence
    ]);
  }

  /**
   * Log AI interaction for usage tracking
   */
  private async logAIInteraction(interaction: {
    interaction_type: string;
    model_used: string;
    input_text?: string;
    output_text?: string;
    total_tokens?: number;
    estimated_cost_cents?: number;
    metadata?: any;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO ai_interactions (
          interaction_type, model_used, input_text, output_text,
          total_tokens, estimated_cost_cents, metadata, success
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      `;

      await db.query(query, [
        interaction.interaction_type,
        interaction.model_used,
        interaction.input_text,
        interaction.output_text,
        interaction.total_tokens || 0,
        interaction.estimated_cost_cents || 0,
        JSON.stringify(interaction.metadata || {})
      ]);
    } catch (error) {
      // Don't fail the main operation if logging fails
      logger.warn('Failed to log AI interaction:', error);
    }
  }

  /**
   * Find grant by ID
   */
  private async findGrantById(grantId: string): Promise<Grant | null> {
    const query = 'SELECT * FROM grants WHERE id = $1';
    const result = await db.query(query, [grantId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get organization profile for analysis
   */
  private async getOrganizationProfile(organizationId: string): Promise<OrganizationProfile> {
    const query = `
      SELECT o.*, 
             array_agg(DISTINCT gst.tag_name) as capabilities,
             array_agg(DISTINCT g.title) as previous_grants
      FROM organizations o
      LEFT JOIN grants g ON g.funder = o.name  -- This is simplified
      LEFT JOIN grant_semantic_tags gst ON gst.grant_id = g.id
      WHERE o.id = $1
      GROUP BY o.id, o.name, o.description
    `;

    const result = await db.query(query, [organizationId]);
    if (result.rows.length === 0) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      sector: row.profile_data?.sector,
      size: row.profile_data?.size,
      location: row.profile_data?.location,
      capabilities: row.capabilities?.filter(Boolean) || [],
      previousGrants: row.previous_grants?.filter(Boolean) || []
    };
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    grantsProcessed: number;
    vectorsStored: number;
    aiInteractions: number;
    errors?: string[];
  }> {
    try {
      const errors: string[] = [];

      // Check processed grants count
      const grantsResult = await db.query(`
        SELECT COUNT(*) as processed FROM grants WHERE ai_processed = true
      `);
      const grantsProcessed = parseInt(grantsResult.rows[0].processed);

      // Check vectors stored
      const vectorsResult = await db.query(`
        SELECT COUNT(*) as stored FROM vector_embeddings WHERE entity_type = 'grant'
      `);
      const vectorsStored = parseInt(vectorsResult.rows[0].stored);

      // Check AI interactions
      const interactionsResult = await db.query(`
        SELECT COUNT(*) as interactions FROM ai_interactions 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
      const aiInteractions = parseInt(interactionsResult.rows[0].interactions);

      // Check AI services health
      const aiHealth = await this.openaiService.healthCheck();
      if (aiHealth.status === 'unhealthy') {
        errors.push(`AI Service: ${aiHealth.error}`);
      }

      return {
        status: errors.length === 0 ? 'healthy' : 'unhealthy',
        grantsProcessed,
        vectorsStored,
        aiInteractions,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        grantsProcessed: 0,
        vectorsStored: 0,
        aiInteractions: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}

export default GrantsService;