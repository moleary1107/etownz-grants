import { firecrawlIntegrationService, ExtractedGrantData as ExtractedGrantInfo } from './firecrawlIntegrationService';
import { GrantsService, GrantProcessingResult } from './grantsService';
import { Grant } from '../repositories/grantsRepository';
import { embeddingService } from './embeddingService';
import VectorDatabaseService from './vectorDatabase';
import { logger } from './logger';
import { db } from './database';

export interface GrantIntegrationResult {
  firecrawlGrant: ExtractedGrantInfo;
  processedGrant?: Grant;
  integrationStatus: 'success' | 'duplicate' | 'failed' | 'pending_review';
  processingResult?: GrantProcessingResult;
  similarGrants?: Grant[];
  confidence: number;
  reviewNotes?: string;
}

export class GrantIntegrationService {
  private grantsService: GrantsService;
  private vectorDb: VectorDatabaseService;

  constructor() {
    this.grantsService = new GrantsService();
    this.vectorDb = new VectorDatabaseService();
  }

  /**
   * Process extracted grants from Firecrawl jobs and integrate them into the main grants system
   */
  async integrateExtractedGrants(jobId: string): Promise<GrantIntegrationResult[]> {
    try {
      logger.info('Starting grant integration process', { jobId });

      // Get extracted grants from Firecrawl job
      const extractedGrants = await firecrawlIntegrationService.getExtractedGrants({
        jobId,
        minConfidence: 0.3 // Process even low-confidence grants for review
      });

      const results: GrantIntegrationResult[] = [];

      for (const grant of extractedGrants.grants) {
        try {
          const integrationResult = await this.processExtractedGrant(grant);
          results.push(integrationResult);
        } catch (error) {
          logger.error('Failed to process extracted grant', { 
            title: grant.title, 
            error: error instanceof Error ? error.message : String(error) 
          });
          
          results.push({
            firecrawlGrant: grant,
            integrationStatus: 'failed',
            confidence: grant.confidence,
            reviewNotes: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('Grant integration completed', { 
        jobId, 
        totalGrants: extractedGrants.grants.length,
        successful: results.filter(r => r.integrationStatus === 'success').length,
        duplicates: results.filter(r => r.integrationStatus === 'duplicate').length,
        failed: results.filter(r => r.integrationStatus === 'failed').length
      });

      return results;
    } catch (error) {
      logger.error('Grant integration process failed', { jobId, error });
      throw error;
    }
  }

  /**
   * Process a single extracted grant
   */
  private async processExtractedGrant(extractedGrant: ExtractedGrantInfo): Promise<GrantIntegrationResult> {
    // Check for duplicates first
    const similarGrants = await this.findSimilarGrants(extractedGrant);
    
    if (similarGrants.length > 0) {
      const highSimilarity = similarGrants.some(g => 
        this.calculateSimilarity(extractedGrant, g) > 0.8
      );
      
      if (highSimilarity) {
        return {
          firecrawlGrant: extractedGrant,
          integrationStatus: 'duplicate',
          similarGrants,
          confidence: extractedGrant.confidence,
          reviewNotes: 'High similarity with existing grants'
        };
      }
    }

    // Convert extracted grant to standard Grant format
    const standardGrant = await this.convertToStandardGrant(extractedGrant);

    // Determine if grant needs review based on confidence and completeness
    const needsReview = this.needsManualReview(extractedGrant, standardGrant);

    if (needsReview) {
      // Save to pending review table
      await this.savePendingGrant(extractedGrant, standardGrant);
      
      return {
        firecrawlGrant: extractedGrant,
        integrationStatus: 'pending_review',
        confidence: extractedGrant.confidence,
        similarGrants,
        reviewNotes: 'Grant requires manual review due to low confidence or missing data'
      };
    }

    // Process and save the grant
    try {
      const processingResult = await this.grantsService.processNewGrant(standardGrant);
      
      // Update the grant with Firecrawl metadata
      await this.updateGrantWithFirecrawlMetadata(processingResult.grant.id, extractedGrant);

      // Add to vector database for semantic search
      try {
        await this.addGrantToVectorDatabase(processingResult.grant);
        logger.info('Grant added to vector database', { grantId: processingResult.grant.id });
      } catch (error) {
        logger.error('Failed to add grant to vector database', { 
          grantId: processingResult.grant.id, 
          error 
        });
      }

      return {
        firecrawlGrant: extractedGrant,
        processedGrant: processingResult.grant,
        integrationStatus: 'success',
        processingResult,
        confidence: extractedGrant.confidence,
        similarGrants
      };
    } catch (error) {
      logger.error('Failed to process grant through grants service', { 
        title: extractedGrant.title,
        error 
      });
      
      return {
        firecrawlGrant: extractedGrant,
        integrationStatus: 'failed',
        confidence: extractedGrant.confidence,
        reviewNotes: error instanceof Error ? error.message : 'Processing failed'
      };
    }
  }

  /**
   * Convert Firecrawl extracted grant to standard Grant format
   */
  private async convertToStandardGrant(extractedGrant: ExtractedGrantInfo): Promise<Grant> {
    // Parse deadline
    let deadline: Date | undefined = undefined;
    if (extractedGrant.deadline) {
      try {
        deadline = new Date(extractedGrant.deadline);
      } catch (error) {
        logger.warn('Failed to parse deadline', { deadline: extractedGrant.deadline });
      }
    }

    // Extract amount information
    let minAmount: number | undefined = undefined;
    let maxAmount: number | undefined = undefined;
    if (extractedGrant.amount) {
      minAmount = extractedGrant.amount.min || undefined;
      maxAmount = extractedGrant.amount.max || undefined;
    }

    // Generate a unique ID
    const grantId = `firecrawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: grantId,
      title: extractedGrant.title,
      description: extractedGrant.description,
      amount_min: minAmount,
      amount_max: maxAmount,
      currency: extractedGrant.amount?.currency || 'EUR',
      deadline: deadline,
      url: extractedGrant.source?.url || '',
      source: extractedGrant.source?.url || 'Firecrawl',
      funder: this.extractOrganization(extractedGrant.source?.url),
      categories: extractedGrant.categories || [],
      eligibility_criteria: {
        requirements: extractedGrant.eligibility || []
      },
      contact_info: extractedGrant.contactInfo || {},
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  /**
   * Find similar grants in the existing database
   */
  private async findSimilarGrants(extractedGrant: ExtractedGrantInfo): Promise<Grant[]> {
    try {
      // Search by title similarity first
      const titleQuery = `
        SELECT * FROM grants 
        WHERE title ILIKE $1 OR title ILIKE $2 
        ORDER BY similarity(title, $3) DESC 
        LIMIT 5
      `;
      
      const titleWords = extractedGrant.title.split(' ').slice(0, 3).join(' ');
      const result = await db.query(titleQuery, [
        `%${titleWords}%`,
        `%${extractedGrant.title}%`,
        extractedGrant.title
      ]);

      return result.rows;
    } catch (error) {
      logger.warn('Failed to find similar grants', { error });
      return [];
    }
  }

  /**
   * Calculate similarity between extracted grant and existing grant
   */
  private calculateSimilarity(extractedGrant: ExtractedGrantInfo, existingGrant: Grant): number {
    let score = 0;
    
    // Title similarity (40% weight)
    const titleSimilarity = this.stringSimilarity(extractedGrant.title, existingGrant.title);
    score += titleSimilarity * 0.4;
    
    // Description similarity (30% weight)
    const descSimilarity = this.stringSimilarity(
      extractedGrant.description || '', 
      existingGrant.description || ''
    );
    score += descSimilarity * 0.3;
    
    // Source similarity (20% weight)
    const sourceSimilarity = extractedGrant.source?.url === existingGrant.url ? 1 : 0;
    score += sourceSimilarity * 0.2;
    
    // Category similarity (10% weight)
    const categoryMatch = extractedGrant.categories?.some(cat => 
      existingGrant.categories?.includes(cat)
    ) ? 1 : 0;
    score += categoryMatch * 0.1;
    
    return score;
  }

  /**
   * Simple string similarity calculation
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Determine if grant needs manual review
   */
  private needsManualReview(extractedGrant: ExtractedGrantInfo, standardGrant: Grant): boolean {
    // Low confidence threshold
    if (extractedGrant.confidence < 0.7) return true;
    
    // Missing critical information
    if (!extractedGrant.title || !extractedGrant.description) return true;
    
    // Very short description (likely incomplete)
    if (extractedGrant.description && extractedGrant.description.length < 50) return true;
    
    // No deadline or amount information
    if (!extractedGrant.deadline && !extractedGrant.amount) return true;
    
    return false;
  }

  /**
   * Save grant to pending review table
   */
  private async savePendingGrant(extractedGrant: ExtractedGrantInfo, standardGrant: Grant): Promise<void> {
    try {
      await db.query(`
        INSERT INTO pending_grant_reviews (
          original_data, 
          processed_data, 
          confidence_score, 
          review_status, 
          source_url,
          created_at
        ) VALUES ($1, $2, $3, 'pending', $4, NOW())
      `, [
        JSON.stringify(extractedGrant),
        JSON.stringify(standardGrant),
        extractedGrant.confidence,
        extractedGrant.source?.url
      ]);
    } catch (error) {
      // Create table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS pending_grant_reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          original_data JSONB NOT NULL,
          processed_data JSONB NOT NULL,
          confidence_score DECIMAL(3,2) DEFAULT 0.5,
          review_status VARCHAR(20) DEFAULT 'pending',
          reviewer_id UUID REFERENCES users(id),
          source_url TEXT,
          review_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          reviewed_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_pending_reviews_status ON pending_grant_reviews(review_status);
        CREATE INDEX IF NOT EXISTS idx_pending_reviews_created ON pending_grant_reviews(created_at);
      `);
      
      // Retry the insert
      await db.query(`
        INSERT INTO pending_grant_reviews (
          original_data, 
          processed_data, 
          confidence_score, 
          review_status, 
          source_url,
          created_at
        ) VALUES ($1, $2, $3, 'pending', $4, NOW())
      `, [
        JSON.stringify(extractedGrant),
        JSON.stringify(standardGrant),
        extractedGrant.confidence,
        extractedGrant.source?.url
      ]);
    }
  }

  /**
   * Update grant with Firecrawl metadata
   */
  private async updateGrantWithFirecrawlMetadata(grantId: string, extractedGrant: ExtractedGrantInfo): Promise<void> {
    const metadata = {
      firecrawl_extracted: true,
      firecrawl_confidence: extractedGrant.confidence,
      firecrawl_source: extractedGrant.source,
      contact_info: extractedGrant.contactInfo,
      extraction_date: new Date().toISOString()
    };

    await db.query(`
      UPDATE grants 
      SET metadata = COALESCE(metadata, '{}') || $1,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(metadata), grantId]);
  }

  /**
   * Extract organization name from URL
   */
  private extractOrganization(url?: string): string {
    if (!url) return 'Unknown';
    
    try {
      const domain = new URL(url).hostname;
      
      // Map common Irish grant organization domains
      const orgMap: Record<string, string> = {
        'enterprise-ireland.com': 'Enterprise Ireland',
        'sfi.ie': 'Science Foundation Ireland',
        'idaireland.com': 'IDA Ireland',
        'citizensinformation.ie': 'Citizens Information',
        'localenterprise.ie': 'Local Enterprise Office',
        'gov.ie': 'Government of Ireland'
      };
      
      for (const [domainPattern, orgName] of Object.entries(orgMap)) {
        if (domain.includes(domainPattern)) {
          return orgName;
        }
      }
      
      // Default extraction from domain
      return domain.replace('www.', '').split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Get pending grants for review
   */
  async getPendingGrants(options: {
    limit?: number;
    offset?: number;
    minConfidence?: number;
  } = {}): Promise<{
    grants: any[];
    total: number;
  }> {
    const { limit = 20, offset = 0, minConfidence = 0 } = options;
    
    let whereClause = 'WHERE review_status = $1';
    const params = ['pending'];
    let paramIndex = 2;

    if (minConfidence > 0) {
      whereClause += ` AND confidence_score >= $${paramIndex}`;
      params.push(minConfidence.toString());
      paramIndex++;
    }

    const countResult = await db.query(`
      SELECT COUNT(*) FROM pending_grant_reviews ${whereClause}
    `, params);

    const grantsResult = await db.query(`
      SELECT * FROM pending_grant_reviews ${whereClause}
      ORDER BY confidence_score DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return {
      grants: grantsResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Approve a pending grant
   */
  async approvePendingGrant(reviewId: string, reviewerId: string, notes?: string): Promise<GrantProcessingResult> {
    const reviewResult = await db.query(
      'SELECT * FROM pending_grant_reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      throw new Error('Review not found');
    }

    const review = reviewResult.rows[0];
    const standardGrant: Grant = review.processed_data;

    // Process the grant
    const processingResult = await this.grantsService.processNewGrant(standardGrant);

    // Update review status
    await db.query(`
      UPDATE pending_grant_reviews 
      SET review_status = 'approved', 
          reviewer_id = $1, 
          review_notes = $2,
          reviewed_at = NOW()
      WHERE id = $3
    `, [reviewerId, notes, reviewId]);

    return processingResult;
  }

  /**
   * Reject a pending grant
   */
  async rejectPendingGrant(reviewId: string, reviewerId: string, notes: string): Promise<void> {
    await db.query(`
      UPDATE pending_grant_reviews 
      SET review_status = 'rejected', 
          reviewer_id = $1, 
          review_notes = $2,
          reviewed_at = NOW()
      WHERE id = $3
    `, [reviewerId, notes, reviewId]);
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStatistics(): Promise<{
    totalExtracted: number;
    successfullyIntegrated: number;
    pendingReview: number;
    duplicatesFound: number;
    integrationRate: number;
  }> {
    const extractedResult = await db.query(`
      SELECT COUNT(*) FROM firecrawl_extracted_grants
    `);

    const integratedResult = await db.query(`
      SELECT COUNT(*) FROM grants WHERE metadata ? 'firecrawl_extracted'
    `);

    const pendingResult = await db.query(`
      SELECT COUNT(*) FROM pending_grant_reviews WHERE review_status = 'pending'
    `);

    const totalExtracted = parseInt(extractedResult.rows[0].count);
    const successfullyIntegrated = parseInt(integratedResult.rows[0].count);
    const pendingReview = parseInt(pendingResult.rows[0].count);
    
    // Estimate duplicates (rough calculation)
    const duplicatesFound = Math.max(0, totalExtracted - successfullyIntegrated - pendingReview);
    
    const integrationRate = totalExtracted > 0 
      ? (successfullyIntegrated / totalExtracted) * 100 
      : 0;

    return {
      totalExtracted,
      successfullyIntegrated,
      pendingReview,
      duplicatesFound,
      integrationRate
    };
  }

  /**
   * Add a single grant to the vector database
   */
  async addGrantToVectorDatabase(grant: Grant): Promise<void> {
    try {
      // Create text for embedding
      const grantText = this.createGrantEmbeddingText(grant);
      
      // Generate embedding
      const embeddingResult = await embeddingService.generateEmbedding(grantText);
      const embedding = embeddingResult.embedding;

      // Create vector metadata
      const metadata = {
        id: grant.id,
        type: 'grant' as const,
        title: grant.title,
        content: grantText,
        source: grant.url || 'unknown',
        organizationId: '', // Would be set if grants belong to organizations
        grantId: grant.id,
        createdAt: grant.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: grant.updated_at?.toISOString() || new Date().toISOString(),
        // Additional grant-specific metadata
        funder: grant.funder,
        amount_min: grant.amount_min,
        amount_max: grant.amount_max,
        currency: grant.currency,
        deadline: grant.deadline?.toISOString(),
        categories: grant.categories || [],
        is_active: grant.is_active
      };

      // Store in vector database
      await this.vectorDb.storeVector(
        `grant_${grant.id}`,
        embedding,
        metadata,
        'grants'
      );

      // Mark grant as added to vector DB
      await this.markGrantAsVectorized(grant.id);

      logger.info('Grant successfully added to vector database', { 
        grantId: grant.id, 
        title: grant.title 
      });
    } catch (error) {
      logger.error('Failed to add grant to vector database', { 
        error, 
        grantId: grant.id, 
        title: grant.title 
      });
      throw error;
    }
  }

  /**
   * Add multiple grants to vector database
   */
  async addGrantsToVectorDatabase(grants: Grant[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    logger.info('Adding multiple grants to vector database', { count: grants.length });

    for (const grant of grants) {
      try {
        await this.addGrantToVectorDatabase(grant);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to add grant ${grant.id}: ${error}`);
      }
    }

    logger.info('Completed adding grants to vector database', {
      total: grants.length,
      success: results.success,
      failed: results.failed
    });

    return results;
  }

  /**
   * Search for similar grants using vector search
   */
  async searchSimilarGrants(
    query: string,
    options: {
      topK?: number;
      funder?: string;
      minAmount?: number;
      maxAmount?: number;
      activeOnly?: boolean;
    } = {}
  ): Promise<Array<{
    grant: Grant;
    similarity_score: number;
  }>> {
    try {
      // Generate embedding for search query
      const queryEmbeddingResult = await embeddingService.generateEmbedding(query);
      const queryEmbedding = queryEmbeddingResult.embedding;

      // Build search filters
      const filters: Record<string, any> = {};
      if (options.funder) {
        filters.funder = { $eq: options.funder };
      }
      if (options.minAmount) {
        filters.amount_min = { $gte: options.minAmount };
      }
      if (options.maxAmount) {
        filters.amount_max = { $lte: options.maxAmount };
      }
      if (options.activeOnly !== false) {
        filters.is_active = { $eq: true };
      }

      // Search vector database
      const searchResults = await this.vectorDb.searchSimilar(queryEmbedding, {
        topK: options.topK || 10,
        namespace: 'grants',
        filter: Object.keys(filters).length > 0 ? filters : undefined,
        includeMetadata: true
      });

      // Convert results to grants with similarity scores
      const results = await Promise.all(
        searchResults.map(async (result) => {
          const grant = await this.getGrantById(result.metadata.grantId || '');
          return {
            grant: grant!,
            similarity_score: result.score
          };
        })
      );

      logger.info('Grant similarity search completed', {
        query,
        resultsCount: results.length,
        options
      });

      return results.filter(r => r.grant !== null);
    } catch (error) {
      logger.error('Grant similarity search failed', { error, query, options });
      throw new Error(`Failed to search similar grants: ${error}`);
    }
  }

  /**
   * Get grant by ID from database
   */
  private async getGrantById(grantId: string): Promise<Grant | null> {
    try {
      const result = await db.query('SELECT * FROM grants WHERE id = $1', [grantId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get grant by ID', { error, grantId });
      return null;
    }
  }

  /**
   * Create text for embedding from grant data
   */
  private createGrantEmbeddingText(grant: Grant): string {
    const parts = [
      grant.title,
      grant.description,
      grant.funder,
      `Amount: ${grant.amount_min || 0} - ${grant.amount_max || 0} ${grant.currency}`,
      grant.categories?.join(', '),
      grant.eligibility_criteria?.requirements?.join(', ')
    ].filter(Boolean);

    return parts.join('\n');
  }

  /**
   * Mark grant as added to vector database
   */
  private async markGrantAsVectorized(grantId: string): Promise<void> {
    try {
      await db.query(`
        UPDATE grants 
        SET metadata = COALESCE(metadata, '{}') || $1,
            updated_at = NOW()
        WHERE id = $2
      `, [
        JSON.stringify({ vector_db_added: true, vector_db_added_at: new Date().toISOString() }),
        grantId
      ]);
    } catch (error) {
      logger.error('Failed to mark grant as vectorized', { error, grantId });
    }
  }

  /**
   * Remove grant from vector database
   */
  async removeGrantFromVectorDatabase(grantId: string): Promise<void> {
    try {
      await this.vectorDb.deleteVector(`grant_${grantId}`, 'grants');
      
      // Update grant metadata
      await db.query(`
        UPDATE grants 
        SET metadata = metadata - 'vector_db_added' - 'vector_db_added_at',
            updated_at = NOW()
        WHERE id = $1
      `, [grantId]);

      logger.info('Grant removed from vector database', { grantId });
    } catch (error) {
      logger.error('Failed to remove grant from vector database', { error, grantId });
      throw error;
    }
  }

  /**
   * Sync all grants to vector database
   */
  async syncAllGrantsToVectorDatabase(): Promise<{
    processed: number;
    added: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      added: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Get all active grants that haven't been added to vector DB
      const grantsResult = await db.query(`
        SELECT * FROM grants 
        WHERE is_active = true 
        AND (metadata->>'vector_db_added' IS NULL OR metadata->>'vector_db_added' = 'false')
        ORDER BY created_at DESC
      `);

      const grants = grantsResult.rows;
      logger.info(`Starting vector database sync for ${grants.length} grants`);

      for (const grant of grants) {
        result.processed++;
        
        try {
          await this.addGrantToVectorDatabase(grant);
          result.added++;
        } catch (error) {
          result.errors.push(`Failed to sync grant ${grant.id}: ${error}`);
          logger.error('Failed to sync grant to vector DB', { 
            grantId: grant.id, 
            error 
          });
        }
      }

      logger.info('Vector database sync completed', result);
      return result;
    } catch (error) {
      logger.error('Vector database sync failed', { error });
      throw error;
    }
  }
}

export const grantIntegrationService = new GrantIntegrationService();