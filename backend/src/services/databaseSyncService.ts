import { db } from './database';
import { VectorDatabaseService, VectorMetadata } from './vectorDatabase';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export interface SyncRecord {
  id: string;
  postgres_table: string;
  postgres_id: string;
  pinecone_vector_id: string;
  content_hash: string;
  sync_status: 'synced' | 'pending' | 'failed';
  last_synced_at: Date;
  sync_error?: string;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export class DatabaseSyncService {
  private vectorDB: VectorDatabaseService;

  constructor() {
    this.vectorDB = new VectorDatabaseService();
  }

  /**
   * Initialize sync tables
   */
  async initialize(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS database_sync_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          postgres_table VARCHAR(100) NOT NULL,
          postgres_id UUID NOT NULL,
          pinecone_vector_id VARCHAR(255) NOT NULL,
          content_hash VARCHAR(64) NOT NULL,
          sync_status VARCHAR(20) DEFAULT 'pending',
          last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sync_error TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(postgres_table, postgres_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_records_table_id ON database_sync_records(postgres_table, postgres_id);
        CREATE INDEX IF NOT EXISTS idx_sync_records_vector_id ON database_sync_records(pinecone_vector_id);
        CREATE INDEX IF NOT EXISTS idx_sync_records_status ON database_sync_records(sync_status);
        CREATE INDEX IF NOT EXISTS idx_sync_records_updated ON database_sync_records(updated_at);
      `);

      logger.info('Database sync service initialized');
    } catch (error) {
      logger.error('Failed to initialize database sync service:', error);
      throw error;
    }
  }

  /**
   * Sync PostgreSQL record to Pinecone
   */
  async syncToVector(
    tableName: string,
    recordId: string,
    content: string,
    metadata: VectorMetadata,
    namespace: string = 'default'
  ): Promise<{ vectorId: string; syncRecordId: string }> {
    try {
      await this.initialize();

      // Generate content hash for change detection
      const contentHash = this.generateContentHash(content);
      
      // Check if already synced with same content
      const existingSync = await db.query(`
        SELECT id, pinecone_vector_id, content_hash, sync_status 
        FROM database_sync_records 
        WHERE postgres_table = $1 AND postgres_id = $2
      `, [tableName, recordId]);

      let vectorId: string;
      let syncRecordId: string;

      if (existingSync.rows.length > 0) {
        const existing = existingSync.rows[0];
        
        // If content hasn't changed and sync is successful, return existing
        if (existing.content_hash === contentHash && existing.sync_status === 'synced') {
          logger.info('Record already synced with same content', {
            tableName,
            recordId,
            vectorId: existing.pinecone_vector_id
          });
          return {
            vectorId: existing.pinecone_vector_id,
            syncRecordId: existing.id
          };
        }

        // Update existing sync record
        vectorId = existing.pinecone_vector_id;
        syncRecordId = existing.id;
      } else {
        // Create new sync record
        vectorId = this.vectorDB.generateVectorId(metadata.type, recordId);
        syncRecordId = uuidv4();
      }

      // Store/update in Pinecone
      try {
        const { embedding, usage } = await this.generateEmbedding(content);
        await this.vectorDB.storeVector(vectorId, embedding, metadata, namespace);

        // Update sync record
        await db.query(`
          INSERT INTO database_sync_records (
            id, postgres_table, postgres_id, pinecone_vector_id, content_hash,
            sync_status, last_synced_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, 'synced', NOW(), $6)
          ON CONFLICT (postgres_table, postgres_id) 
          DO UPDATE SET
            content_hash = EXCLUDED.content_hash,
            sync_status = 'synced',
            last_synced_at = NOW(),
            sync_error = NULL,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `, [
          syncRecordId,
          tableName,
          recordId,
          vectorId,
          contentHash,
          JSON.stringify(metadata)
        ]);

        logger.info('Successfully synced to vector database', {
          tableName,
          recordId,
          vectorId,
          usage
        });

        return { vectorId, syncRecordId };

      } catch (vectorError) {
        // Mark sync as failed
        await db.query(`
          INSERT INTO database_sync_records (
            id, postgres_table, postgres_id, pinecone_vector_id, content_hash,
            sync_status, sync_error, metadata
          ) VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7)
          ON CONFLICT (postgres_table, postgres_id) 
          DO UPDATE SET
            sync_status = 'failed',
            sync_error = EXCLUDED.sync_error,
            updated_at = NOW()
        `, [
          syncRecordId,
          tableName,
          recordId,
          vectorId,
          contentHash,
          vectorError instanceof Error ? vectorError.message : String(vectorError),
          JSON.stringify(metadata)
        ]);

        throw vectorError;
      }

    } catch (error) {
      logger.error('Failed to sync to vector database:', error);
      throw error;
    }
  }

  /**
   * Get sync status for a record
   */
  async getSyncStatus(tableName: string, recordId: string): Promise<SyncRecord | null> {
    const result = await db.query(`
      SELECT * FROM database_sync_records 
      WHERE postgres_table = $1 AND postgres_id = $2
    `, [tableName, recordId]);

    return result.rows[0] || null;
  }

  /**
   * Get all pending sync records
   */
  async getPendingSyncRecords(limit: number = 100): Promise<SyncRecord[]> {
    const result = await db.query(`
      SELECT * FROM database_sync_records 
      WHERE sync_status IN ('pending', 'failed')
      ORDER BY created_at ASC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Sync grants table to vector database
   */
  async syncGrantsToVector(): Promise<{ synced: number; failed: number }> {
    try {
      logger.info('Starting grants sync to vector database');

      const grants = await db.query(`
        SELECT id, title, description, summary, funder, categories, eligibility_criteria
        FROM grants 
        WHERE is_active = true
      `);

      let synced = 0;
      let failed = 0;

      for (const grant of grants.rows) {
        try {
          const content = [
            grant.title,
            grant.description,
            grant.summary,
            grant.funder,
            Array.isArray(grant.categories) ? grant.categories.join(' ') : '',
            Array.isArray(grant.eligibility_criteria) ? grant.eligibility_criteria.join(' ') : ''
          ].filter(Boolean).join(' ');

          const metadata: VectorMetadata = {
            id: grant.id,
            type: 'grant',
            title: grant.title,
            content: content,
            grantId: grant.id,
            source: 'postgresql',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await this.syncToVector('grants', grant.id, content, metadata, 'grants');
          synced++;

        } catch (error) {
          logger.error(`Failed to sync grant ${grant.id}:`, error);
          failed++;
        }
      }

      logger.info(`Grants sync completed: ${synced} synced, ${failed} failed`);
      return { synced, failed };

    } catch (error) {
      logger.error('Failed to sync grants to vector database:', error);
      throw error;
    }
  }

  /**
   * Sync organizations table to vector database
   */
  async syncOrganizationsToVector(): Promise<{ synced: number; failed: number }> {
    try {
      logger.info('Starting organizations sync to vector database');

      const organizations = await db.query(`
        SELECT o.id, o.name, o.description, o.website, o.contact_info, o.business_sector,
               array_agg(oc.capability_name) as capabilities,
               array_agg(oc.description) as capability_descriptions
        FROM organizations o
        LEFT JOIN organization_capabilities oc ON o.id = oc.organization_id
        GROUP BY o.id, o.name, o.description, o.website, o.contact_info, o.business_sector
      `);

      let synced = 0;
      let failed = 0;

      for (const org of organizations.rows) {
        try {
          const content = [
            org.name,
            org.description,
            org.business_sector,
            Array.isArray(org.capabilities) ? org.capabilities.filter(Boolean).join(' ') : '',
            Array.isArray(org.capability_descriptions) ? org.capability_descriptions.filter(Boolean).join(' ') : ''
          ].filter(Boolean).join(' ');

          const metadata: VectorMetadata = {
            id: org.id,
            type: 'organization',
            title: org.name,
            content: content,
            organizationId: org.id,
            source: 'postgresql',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await this.syncToVector('organizations', org.id, content, metadata, 'organizations');
          synced++;

        } catch (error) {
          logger.error(`Failed to sync organization ${org.id}:`, error);
          failed++;
        }
      }

      logger.info(`Organizations sync completed: ${synced} synced, ${failed} failed`);
      return { synced, failed };

    } catch (error) {
      logger.error('Failed to sync organizations to vector database:', error);
      throw error;
    }
  }

  /**
   * Sync grant requirements to vector database
   */
  async syncGrantRequirementsToVector(): Promise<{ synced: number; failed: number }> {
    try {
      logger.info('Starting grant requirements sync to vector database');

      const requirements = await db.query(`
        SELECT gr.id, gr.grant_id, gr.requirement_type, gr.category, 
               gr.requirement_text, gr.extracted_criteria, g.title as grant_title
        FROM grant_requirements gr
        JOIN grants g ON gr.grant_id = g.id
        WHERE g.is_active = true
      `);

      let synced = 0;
      let failed = 0;

      for (const req of requirements.rows) {
        try {
          const content = [
            req.requirement_text,
            req.requirement_type,
            req.category,
            Array.isArray(req.extracted_criteria) ? req.extracted_criteria.join(' ') : '',
            req.grant_title
          ].filter(Boolean).join(' ');

          const metadata: VectorMetadata = {
            id: req.id,
            type: 'grant',
            title: `${req.requirement_type} requirement for ${req.grant_title}`,
            content: content,
            grantId: req.grant_id,
            requirementType: req.requirement_type,
            category: req.category,
            source: 'postgresql',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await this.syncToVector('grant_requirements', req.id, content, metadata, 'grant_requirements');
          synced++;

        } catch (error) {
          logger.error(`Failed to sync requirement ${req.id}:`, error);
          failed++;
        }
      }

      logger.info(`Grant requirements sync completed: ${synced} synced, ${failed} failed`);
      return { synced, failed };

    } catch (error) {
      logger.error('Failed to sync grant requirements to vector database:', error);
      throw error;
    }
  }

  /**
   * Full database sync
   */
  async syncAllTablesToVector(): Promise<{
    grants: { synced: number; failed: number };
    organizations: { synced: number; failed: number };
    requirements: { synced: number; failed: number };
  }> {
    logger.info('Starting full database sync to vector database');

    const results = {
      grants: await this.syncGrantsToVector(),
      organizations: await this.syncOrganizationsToVector(),
      requirements: await this.syncGrantRequirementsToVector()
    };

    const totalSynced = results.grants.synced + results.organizations.synced + results.requirements.synced;
    const totalFailed = results.grants.failed + results.organizations.failed + results.requirements.failed;

    logger.info(`Full sync completed: ${totalSynced} records synced, ${totalFailed} failed`);

    return results;
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    totalRecords: number;
    syncedRecords: number;
    pendingRecords: number;
    failedRecords: number;
    lastSyncTime: Date | null;
  }> {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced_records,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_records,
        COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_records,
        MAX(last_synced_at) as last_sync_time
      FROM database_sync_records
    `);

    const stats = result.rows[0];
    return {
      totalRecords: parseInt(stats.total_records),
      syncedRecords: parseInt(stats.synced_records),
      pendingRecords: parseInt(stats.pending_records),
      failedRecords: parseInt(stats.failed_records),
      lastSyncTime: stats.last_sync_time
    };
  }

  /**
   * Helper methods
   */
  private generateContentHash(content: string): string {
    // Simple hash function - in production, use crypto.createHash
    return Buffer.from(content).toString('base64').substring(0, 64);
  }

  private async generateEmbedding(text: string): Promise<{ embedding: number[], usage: any }> {
    // This would use the OpenAI service to generate embeddings
    // For now, return a mock response
    const { OpenAIService } = require('./openaiService');
    const openaiService = new OpenAIService();
    return await openaiService.generateEmbedding(text);
  }

  /**
   * Clean up old sync records
   */
  async cleanupOldSyncRecords(daysOld: number = 30): Promise<number> {
    const result = await db.query(`
      DELETE FROM database_sync_records 
      WHERE sync_status = 'synced' 
      AND updated_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING id
    `);

    logger.info(`Cleaned up ${result.rows.length} old sync records`);
    return result.rows.length;
  }
}

export const databaseSyncService = new DatabaseSyncService();