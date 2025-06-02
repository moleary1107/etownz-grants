import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export interface VectorMetadata {
  id: string;
  type: 'grant' | 'application' | 'document' | 'organization' | 'monitoring_rule';
  title: string;
  content: string;
  organizationId?: string;
  grantId?: string;
  applicationId?: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  // Additional metadata fields
  [key: string]: any;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export interface VectorUpsertRequest {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface VectorQueryOptions {
  topK?: number;
  namespace?: string;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export class VectorDatabaseService {
  private pinecone: Pinecone;
  private indexName: string = 'etownz-grants';
  private defaultNamespace: string = 'default';

  constructor() {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required for production');
    }

    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });
      logger.info('VectorDatabaseService initialized with Pinecone');
    } catch (error) {
      logger.error('Failed to initialize Pinecone', { error });
      throw new Error(`Failed to initialize VectorDatabaseService: ${error instanceof Error ? error.message : String(error)}`);
    }

    logger.info('VectorDatabaseService initialized');
  }

  /**
   * Initialize the Pinecone index if it doesn't exist
   */
  async initializeIndex(): Promise<void> {

    try {
      logger.info(`Initializing Pinecone index: ${this.indexName}`);
      
      const indexList = await this.pinecone.listIndexes();
      const existingIndex = indexList.indexes?.find(index => index.name === this.indexName);
      
      if (!existingIndex) {
        logger.info(`Creating new Pinecone index: ${this.indexName}`);
        
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // text-embedding-3-small dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
        logger.info(`Successfully created Pinecone index: ${this.indexName}`);
      } else {
        logger.info(`Pinecone index already exists: ${this.indexName}`);
      }
    } catch (error) {
      logger.error('Failed to initialize Pinecone index:', error);
      throw new Error(`Failed to initialize vector database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Wait for index to be ready after creation
   */
  private async waitForIndexReady(maxWaitTime: number = 300000): Promise<void> {

    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexStats = await this.pinecone.index(this.indexName).describeIndexStats();
        if (indexStats) {
          logger.info('Index is ready');
          return;
        }
      } catch (error) {
        // Index might not be ready yet, continue polling
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Index failed to become ready within timeout period');
  }

  /**
   * Store a vector with metadata in Pinecone
   */
  async storeVector(
    id: string,
    embedding: number[],
    metadata: VectorMetadata,
    namespace: string = this.defaultNamespace
  ): Promise<void> {

    try {
      if (!id || !embedding || !metadata) {
        throw new Error('Missing required parameters: id, embedding, or metadata');
      }

      if (embedding.length !== 1536) {
        throw new Error(`Invalid embedding dimension: expected 1536, got ${embedding.length}`);
      }

      const index = this.pinecone.index(this.indexName);
      
      const upsertRequest: VectorUpsertRequest = {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          updatedAt: new Date().toISOString()
        }
      };

      await index.namespace(namespace).upsert([upsertRequest]);
      
      logger.info(`Successfully stored vector for ${metadata.type}: ${id} in namespace: ${namespace}`);
    } catch (error) {
      logger.error(`Failed to store vector for ${id}:`, error);
      throw new Error(`Failed to store vector: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store multiple vectors in batch
   */
  async storeBatchVectors(
    vectors: Array<{
      id: string;
      embedding: number[];
      metadata: VectorMetadata;
    }>,
    namespace: string = this.defaultNamespace
  ): Promise<void> {

    try {
      if (!vectors || vectors.length === 0) {
        throw new Error('No vectors provided for batch storage');
      }

      const index = this.pinecone.index(this.indexName);
      
      const upsertRequests: VectorUpsertRequest[] = vectors.map(vector => ({
        id: vector.id,
        values: vector.embedding,
        metadata: {
          ...vector.metadata,
          updatedAt: new Date().toISOString()
        }
      }));

      // Process in batches of 100 (Pinecone limit)
      const batchSize = 100;
      for (let i = 0; i < upsertRequests.length; i += batchSize) {
        const batch = upsertRequests.slice(i, i + batchSize);
        await index.namespace(namespace).upsert(batch);
        logger.info(`Stored batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(upsertRequests.length / batchSize)}`);
      }

      logger.info(`Successfully stored ${vectors.length} vectors in namespace: ${namespace}`);
    } catch (error) {
      logger.error('Failed to store batch vectors:', error);
      throw new Error(`Failed to store batch vectors: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for similar vectors
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: VectorQueryOptions = {}
  ): Promise<VectorSearchResult[]> {

    try {
      if (!queryEmbedding || queryEmbedding.length !== 1536) {
        throw new Error(`Invalid query embedding dimension: expected 1536, got ${queryEmbedding?.length || 0}`);
      }

      const {
        topK = 10,
        namespace = this.defaultNamespace,
        filter,
        includeMetadata = true,
        includeValues = false
      } = options;

      const index = this.pinecone.index(this.indexName);
      
      const queryRequest = {
        vector: queryEmbedding,
        topK,
        includeMetadata,
        includeValues,
        ...(filter && { filter })
      };

      const queryResponse = await index.namespace(namespace).query(queryRequest);
      
      if (!queryResponse.matches) {
        return [];
      }

      const results: VectorSearchResult[] = queryResponse.matches.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as VectorMetadata
      }));

      logger.info(`Found ${results.length} similar vectors in namespace: ${namespace}`);
      return results;
    } catch (error) {
      logger.error('Failed to search similar vectors:', error);
      throw new Error(`Failed to search vectors: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search with hybrid approach (vector + metadata filters)
   */
  async hybridSearch(
    queryEmbedding: number[],
    filters: {
      type?: string;
      organizationId?: string;
      dateRange?: {
        start: string;
        end: string;
      };
      tags?: string[];
    },
    topK: number = 10,
    namespace: string = this.defaultNamespace
  ): Promise<VectorSearchResult[]> {
    try {
      // Build Pinecone filter from search filters
      const pineconeFilter: Record<string, any> = {};
      
      if (filters.type) {
        pineconeFilter.type = { $eq: filters.type };
      }
      
      if (filters.organizationId) {
        pineconeFilter.organizationId = { $eq: filters.organizationId };
      }
      
      if (filters.dateRange) {
        pineconeFilter.createdAt = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }
      
      if (filters.tags && filters.tags.length > 0) {
        pineconeFilter.tags = { $in: filters.tags };
      }

      return await this.searchSimilar(queryEmbedding, {
        topK,
        namespace,
        filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
        includeMetadata: true
      });
    } catch (error) {
      logger.error('Failed to perform hybrid search:', error);
      throw new Error(`Failed to perform hybrid search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(
    id: string,
    namespace: string = this.defaultNamespace
  ): Promise<VectorSearchResult | null> {

    try {
      const index = this.pinecone.index(this.indexName);
      const response = await index.namespace(namespace).fetch([id]);
      
      if (!response.records || !response.records[id]) {
        return null;
      }

      const vector = response.records[id];
      return {
        id,
        score: 1.0, // Perfect match for direct fetch
        metadata: vector.metadata as VectorMetadata
      };
    } catch (error) {
      logger.error(`Failed to get vector ${id}:`, error);
      throw new Error(`Failed to get vector: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(
    id: string,
    namespace: string = this.defaultNamespace
  ): Promise<void> {

    try {
      const index = this.pinecone.index(this.indexName);
      await index.namespace(namespace).deleteOne(id);
      logger.info(`Successfully deleted vector: ${id} from namespace: ${namespace}`);
    } catch (error) {
      logger.error(`Failed to delete vector ${id}:`, error);
      throw new Error(`Failed to delete vector: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteVectorsByFilter(
    filter: Record<string, any>,
    namespace: string = this.defaultNamespace
  ): Promise<void> {

    try {
      const index = this.pinecone.index(this.indexName);
      await index.namespace(namespace).deleteMany(filter);
      logger.info(`Successfully deleted vectors matching filter in namespace: ${namespace}`);
    } catch (error) {
      logger.error('Failed to delete vectors by filter:', error);
      throw new Error(`Failed to delete vectors by filter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {

    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();
      logger.info('Retrieved index statistics');
      return stats;
    } catch (error) {
      logger.error('Failed to get index statistics:', error);
      throw new Error(`Failed to get index statistics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all namespaces in the index
   */
  async listNamespaces(): Promise<string[]> {
    try {
      const stats = await this.getIndexStats();
      const namespaces = Object.keys(stats.namespaces || {});
      logger.info(`Found ${namespaces.length} namespaces`);
      return namespaces;
    } catch (error) {
      logger.error('Failed to list namespaces:', error);
      throw new Error(`Failed to list namespaces: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check for the vector database
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    indexExists: boolean;
    vectorCount: number;
    namespaces: string[];
    error?: string;
  }> {

    try {
      // Check if index exists
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.indexName) || false;
      
      if (!indexExists) {
        return {
          status: 'unhealthy',
          indexExists: false,
          vectorCount: 0,
          namespaces: [],
          error: 'Index does not exist'
        };
      }

      // Get index stats
      const stats = await this.getIndexStats();
      const namespaces = Object.keys(stats.namespaces || {});
      const vectorCount = stats.totalVectorCount || 0;

      return {
        status: 'healthy',
        indexExists: true,
        vectorCount,
        namespaces
      };
    } catch (error) {
      logger.error('Vector database health check failed:', error);
      return {
        status: 'unhealthy',
        indexExists: false,
        vectorCount: 0,
        namespaces: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate a unique vector ID
   */
  generateVectorId(type: string, entityId?: string): string {
    const timestamp = Date.now();
    const random = uuidv4().slice(0, 8);
    return entityId ? `${type}_${entityId}_${timestamp}_${random}` : `${type}_${timestamp}_${random}`;
  }
}

export default VectorDatabaseService;