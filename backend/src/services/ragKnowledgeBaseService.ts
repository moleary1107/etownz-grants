import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { DatabaseService, db } from './database';
import { logger } from './logger';
import crypto from 'crypto';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    documentType: 'grant' | 'policy' | 'guideline' | 'application' | 'knowledge';
    source: string;
    chunkIndex: number;
    totalChunks: number;
    title?: string;
    category?: string;
    tags?: string[];
    createdAt: Date;
    lastUpdated: Date;
  };
  embedding?: number[];
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  metadata: DocumentChunk['metadata'];
  score: number;
  context?: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  type: 'grant' | 'policy' | 'guideline' | 'application' | 'knowledge';
  source: string;
  category?: string;
  tags: string[];
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export class RAGKnowledgeBaseService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;
  private embeddingModel: string;
  private chunkSize: number;
  private chunkOverlap: number;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.indexName = process.env.PINECONE_INDEX_NAME || 'etownz-grants-knowledge';
    this.embeddingModel = 'text-embedding-3-small';
    this.chunkSize = 1000;
    this.chunkOverlap = 200;
  }

  async initializePineconeIndex(): Promise<void> {
    try {
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.indexName);

      if (!indexExists) {
        logger.info(`Creating Pinecone index: ${this.indexName}`);
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
      }

      logger.info(`Pinecone index ${this.indexName} is ready`);
    } catch (error) {
      logger.error('Error initializing Pinecone index:', error);
      throw error;
    }
  }

  private async waitForIndexReady(): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const indexStats = await this.pinecone.index(this.indexName).describeIndexStats();
        if (indexStats) {
          return;
        }
      } catch (error) {
        // Index not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error(`Pinecone index ${this.indexName} failed to become ready after ${maxAttempts} attempts`);
  }

  async addDocumentToKnowledgeBase(
    title: string,
    content: string,
    type: KnowledgeBaseEntry['type'],
    source: string,
    category?: string,
    tags: string[] = []
  ): Promise<string> {
    try {
      const entryId = crypto.randomUUID();
      
      // Store in database
      const query = `
        INSERT INTO knowledge_base (id, title, content, type, source, category, tags, embedding_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id
      `;
      
      await db.query(query, [
        entryId,
        title,
        content,
        type,
        source,
        category,
        JSON.stringify(tags),
        'pending'
      ]);

      // Process document asynchronously
      this.processDocumentEmbeddings(entryId, title, content, type, source, category, tags)
        .catch(error => logger.error(`Error processing embeddings for document ${entryId}:`, error));

      logger.info(`Added document to knowledge base: ${title} (${entryId})`);
      return entryId;
    } catch (error) {
      logger.error('Error adding document to knowledge base:', error);
      throw error;
    }
  }

  private async processDocumentEmbeddings(
    documentId: string,
    title: string,
    content: string,
    type: KnowledgeBaseEntry['type'],
    source: string,
    category?: string,
    tags: string[] = []
  ): Promise<void> {
    try {
      // Update status to processing
      await db.query(
        'UPDATE knowledge_base SET embedding_status = $1, updated_at = NOW() WHERE id = $2',
        ['processing', documentId]
      );

      // Chunk the document
      const chunks = this.chunkDocument(content, title);
      
      // Generate embeddings and store in Pinecone
      const index = this.pinecone.index(this.indexName);
      const vectors: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `${documentId}_chunk_${i}`;
        
        // Generate embedding
        const embedding = await this.generateEmbedding(chunk);
        
        vectors.push({
          id: chunkId,
          values: embedding,
          metadata: {
            documentId,
            documentType: type,
            source,
            chunkIndex: i,
            totalChunks: chunks.length,
            title,
            category: category || '',
            tags: tags.join(','),
            content: chunk,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        });

        // Batch upsert in groups of 100
        if (vectors.length >= 100 || i === chunks.length - 1) {
          await index.upsert(vectors);
          vectors.length = 0;
        }
      }

      // Update status to completed
      await db.query(
        'UPDATE knowledge_base SET embedding_status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', documentId]
      );

      logger.info(`Successfully processed embeddings for document ${documentId} (${chunks.length} chunks)`);
    } catch (error) {
      logger.error(`Error processing embeddings for document ${documentId}:`, error);
      
      // Update status to failed
      await db.query(
        'UPDATE knowledge_base SET embedding_status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', documentId]
      );
      
      throw error;
    }
  }

  private chunkDocument(content: string, title: string): string[] {
    const chunks: string[] = [];
    const titlePrefix = `Title: ${title}\n\n`;
    
    // Simple sentence-based chunking with overlap
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = titlePrefix;
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      const potentialChunk = currentChunk + trimmedSentence + '. ';
      
      if (potentialChunk.length > this.chunkSize && currentChunk.length > titlePrefix.length) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap
        const lastSentences = currentChunk.split('. ').slice(-2).join('. ');
        currentChunk = titlePrefix + lastSentences + '. ' + trimmedSentence + '. ';
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk.trim().length > titlePrefix.length) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [titlePrefix + content];
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  async semanticSearch(
    query: string,
    options: {
      topK?: number;
      filter?: Record<string, any>;
      includeMetadata?: boolean;
      minScore?: number;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      const {
        topK = 10,
        filter = {},
        includeMetadata = true,
        minScore = 0.7
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search in Pinecone
      const index = this.pinecone.index(this.indexName);
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata
      });

      // Format results
      const results: SemanticSearchResult[] = searchResponse.matches
        ?.filter(match => match.score && match.score >= minScore)
        .map(match => ({
          id: match.id,
          content: match.metadata?.content as string || '',
          metadata: {
            documentId: match.metadata?.documentId as string,
            documentType: match.metadata?.documentType as any,
            source: match.metadata?.source as string,
            chunkIndex: match.metadata?.chunkIndex as number,
            totalChunks: match.metadata?.totalChunks as number,
            title: match.metadata?.title as string,
            category: match.metadata?.category as string,
            tags: match.metadata?.tags ? (match.metadata.tags as string).split(',') : [],
            createdAt: new Date(match.metadata?.createdAt as string),
            lastUpdated: new Date(match.metadata?.lastUpdated as string)
          },
          score: match.score || 0
        })) || [];

      logger.info(`Semantic search for "${query}" returned ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('Error performing semantic search:', error);
      throw error;
    }
  }

  async getRelevantContext(
    query: string,
    documentType?: KnowledgeBaseEntry['type'],
    maxTokens: number = 4000
  ): Promise<string> {
    try {
      const filter: Record<string, any> = {};
      if (documentType) {
        filter.documentType = documentType;
      }

      const results = await this.semanticSearch(query, {
        topK: 20,
        filter,
        minScore: 0.6
      });

      // Build context string within token limit
      let context = '';
      let tokenCount = 0;
      
      for (const result of results) {
        const addition = `\n\n[Source: ${result.metadata.title || result.metadata.source}]\n${result.content}`;
        const estimatedTokens = addition.length / 4; // Rough token estimation
        
        if (tokenCount + estimatedTokens > maxTokens) {
          break;
        }
        
        context += addition;
        tokenCount += estimatedTokens;
      }

      return context;
    } catch (error) {
      logger.error('Error getting relevant context:', error);
      throw error;
    }
  }

  async updateDocument(
    documentId: string,
    updates: Partial<Pick<KnowledgeBaseEntry, 'title' | 'content' | 'category' | 'tags'>>
  ): Promise<void> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.title) {
        updateFields.push(`title = $${paramIndex++}`);
        updateValues.push(updates.title);
      }
      
      if (updates.content) {
        updateFields.push(`content = $${paramIndex++}`);
        updateValues.push(updates.content);
      }
      
      if (updates.category) {
        updateFields.push(`category = $${paramIndex++}`);
        updateValues.push(updates.category);
      }
      
      if (updates.tags) {
        updateFields.push(`tags = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.tags));
      }

      updateFields.push(`updated_at = NOW()`);
      updateFields.push(`embedding_status = $${paramIndex++}`);
      updateValues.push('pending');
      
      updateValues.push(documentId);

      const query = `
        UPDATE knowledge_base 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await db.query(query, updateValues);

      // If content was updated, reprocess embeddings
      if (updates.content) {
        // Delete old embeddings
        await this.deleteDocumentEmbeddings(documentId);
        
        // Get updated document data
        const docResult = await db.query(
          'SELECT * FROM knowledge_base WHERE id = $1',
          [documentId]
        );
        
        if (docResult.rows.length > 0) {
          const doc = docResult.rows[0];
          this.processDocumentEmbeddings(
            documentId,
            doc.title,
            doc.content,
            doc.type,
            doc.source,
            doc.category,
            JSON.parse(doc.tags || '[]')
          ).catch(error => logger.error(`Error reprocessing embeddings for document ${documentId}:`, error));
        }
      }

      logger.info(`Updated document ${documentId}`);
    } catch (error) {
      logger.error(`Error updating document ${documentId}:`, error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Delete from database
      await db.query(
        'DELETE FROM knowledge_base WHERE id = $1',
        [documentId]
      );

      // Delete embeddings from Pinecone
      await this.deleteDocumentEmbeddings(documentId);

      logger.info(`Deleted document ${documentId}`);
    } catch (error) {
      logger.error(`Error deleting document ${documentId}:`, error);
      throw error;
    }
  }

  private async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Query for all chunks of this document
      const queryResponse = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 10000,
        filter: { documentId },
        includeMetadata: true
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const chunkIds = queryResponse.matches.map(match => match.id);
        await index.deleteMany(chunkIds);
        logger.info(`Deleted ${chunkIds.length} embedding chunks for document ${documentId}`);
      }
    } catch (error) {
      logger.error(`Error deleting embeddings for document ${documentId}:`, error);
      throw error;
    }
  }

  async getKnowledgeBaseStats(): Promise<{
    totalDocuments: number;
    totalEmbeddings: number;
    documentsByType: Record<string, number>;
    embeddingStatus: Record<string, number>;
  }> {
    try {
      const [docsResult, statusResult] = await Promise.all([
        db.query(`
          SELECT type, COUNT(*) as count 
          FROM knowledge_base 
          GROUP BY type
        `),
        db.query(`
          SELECT embedding_status, COUNT(*) as count 
          FROM knowledge_base 
          GROUP BY embedding_status
        `)
      ]);

      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();

      const documentsByType: Record<string, number> = {};
      docsResult.rows.forEach(row => {
        documentsByType[row.type] = parseInt(row.count);
      });

      const embeddingStatus: Record<string, number> = {};
      statusResult.rows.forEach(row => {
        embeddingStatus[row.embedding_status] = parseInt(row.count);
      });

      return {
        totalDocuments: Object.values(documentsByType).reduce((sum, count) => sum + count, 0),
        totalEmbeddings: stats.totalRecordCount || 0,
        documentsByType,
        embeddingStatus
      };
    } catch (error) {
      logger.error('Error getting knowledge base stats:', error);
      throw error;
    }
  }

  async searchKnowledgeBase(
    searchTerm: string,
    filters: {
      type?: KnowledgeBaseEntry['type'];
      category?: string;
      tags?: string[];
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{
    documents: KnowledgeBaseEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (searchTerm) {
        whereConditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
        queryParams.push(`%${searchTerm}%`);
        paramIndex++;
      }

      if (filters.type) {
        whereConditions.push(`type = $${paramIndex}`);
        queryParams.push(filters.type);
        paramIndex++;
      }

      if (filters.category) {
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(filters.category);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        whereConditions.push(`tags::jsonb ?| $${paramIndex}`);
        queryParams.push(filters.tags);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const [documentsResult, countResult] = await Promise.all([
        db.query(`
          SELECT * FROM knowledge_base 
          ${whereClause}
          ORDER BY updated_at DESC 
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, limit, offset]),
        
        db.query(`
          SELECT COUNT(*) as total FROM knowledge_base 
          ${whereClause}
        `, queryParams)
      ]);

      const documents = documentsResult.rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]')
      }));

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        documents,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error searching knowledge base:', error);
      throw error;
    }
  }
}

export const ragKnowledgeBaseService = new RAGKnowledgeBaseService();