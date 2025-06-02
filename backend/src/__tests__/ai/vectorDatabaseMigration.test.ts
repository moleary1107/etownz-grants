import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

// This test requires a real PostgreSQL database connection
// It's skipped by default and can be enabled for integration testing

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'etownz_grants_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

describe('Vector Database Migration', () => {
  let pool: Pool;

  beforeAll(async () => {
    // Only run if we have a test database configured
    if (!process.env.RUN_INTEGRATION_TESTS) {
      return;
    }

    pool = new Pool(DB_CONFIG);
    
    // Clean up any existing test data
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it.skip('should run the vector database migration successfully', async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration test - set RUN_INTEGRATION_TESTS=true to enable');
      return;
    }

    // Read and execute the base init.sql
    const initSqlPath = path.join(__dirname, '../../../infrastructure/db/init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf-8');
    await pool.query(initSql);

    // Read and execute the migration
    const migrationPath = path.join(__dirname, '../../../infrastructure/db/migrations/003_add_vector_support.sql');
    const migrationSql = await fs.readFile(migrationPath, 'utf-8');
    await pool.query(migrationSql);

    // Verify all tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tableNames = tables.rows.map(row => row.table_name);
    
    // Check that all expected tables exist
    const expectedTables = [
      'ai_interactions',
      'documents',
      'grant_ai_analysis',
      'grant_semantic_tags',
      'grants',
      'organization_vector_profiles',
      'organizations',
      'search_history',
      'submissions',
      'user_ai_preferences',
      'users',
      'vector_embeddings'
    ];

    expectedTables.forEach(tableName => {
      expect(tableNames).toContain(tableName);
    });

    // Verify indexes were created
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    `);

    expect(indexes.rows.length).toBeGreaterThan(10);

    // Verify views were created
    const views = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);

    const viewNames = views.rows.map(row => row.table_name);
    expect(viewNames).toContain('vector_embedding_status');
    expect(viewNames).toContain('ai_usage_analytics');

    // Test inserting data into new tables
    await pool.query(`
      INSERT INTO organizations (name, description) 
      VALUES ('Test Org', 'Test organization for vector migration')
    `);

    const orgResult = await pool.query(`
      SELECT id FROM organizations WHERE name = 'Test Org'
    `);
    const orgId = orgResult.rows[0].id;

    await pool.query(`
      INSERT INTO users (org_id, email, first_name, last_name) 
      VALUES ($1, 'test@example.com', 'Test', 'User')
    `, [orgId]);

    const userResult = await pool.query(`
      SELECT id FROM users WHERE email = 'test@example.com'
    `);
    const userId = userResult.rows[0].id;

    // Test vector_embeddings table
    await pool.query(`
      INSERT INTO vector_embeddings (entity_type, entity_id, vector_id, embedding_model, namespace)
      VALUES ('organization', $1, 'test_vector_123', 'text-embedding-3-small', 'test')
    `, [orgId]);

    // Test ai_interactions table
    await pool.query(`
      INSERT INTO ai_interactions (user_id, organization_id, interaction_type, model_used, input_text, output_text, total_tokens, estimated_cost_cents)
      VALUES ($1, $2, 'test', 'gpt-4o-mini', 'test input', 'test output', 100, 5)
    `, [userId, orgId]);

    // Test grant_semantic_tags table
    await pool.query(`
      INSERT INTO grants (title, description, funder) 
      VALUES ('Test Grant', 'Test grant description', 'Test Funder')
    `);

    const grantResult = await pool.query(`
      SELECT id FROM grants WHERE title = 'Test Grant'
    `);
    const grantId = grantResult.rows[0].id;

    await pool.query(`
      INSERT INTO grant_semantic_tags (grant_id, tag_name, tag_category, confidence_score)
      VALUES ($1, 'technology', 'sector', 85.5)
    `, [grantId]);

    // Test views
    const vectorStatusResult = await pool.query(`
      SELECT * FROM vector_embedding_status WHERE entity_type = 'organization'
    `);
    expect(vectorStatusResult.rows.length).toBe(1);
    expect(vectorStatusResult.rows[0].entity_name).toBe('Test Org');

    const analyticsResult = await pool.query(`
      SELECT * FROM ai_usage_analytics WHERE interaction_type = 'test'
    `);
    expect(analyticsResult.rows.length).toBe(1);
    expect(analyticsResult.rows[0].interaction_count).toBe('1');

    // Test user preferences were created
    const preferencesResult = await pool.query(`
      SELECT * FROM user_ai_preferences WHERE user_id = $1
    `, [userId]);
    expect(preferencesResult.rows.length).toBe(1);
    expect(preferencesResult.rows[0].preference_type).toBe('search_style');

    console.log('✅ Vector database migration test completed successfully');
  });

  it.skip('should handle migration rollback', async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration test - set RUN_INTEGRATION_TESTS=true to enable');
      return;
    }

    // Test that we can drop the vector-related tables
    const vectorTables = [
      'user_ai_preferences',
      'organization_vector_profiles', 
      'search_history',
      'grant_semantic_tags',
      'grant_ai_analysis',
      'ai_interactions',
      'vector_embeddings'
    ];

    for (const table of vectorTables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    // Verify tables were dropped
    const remainingTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
    `, [vectorTables]);

    expect(remainingTables.rows.length).toBe(0);

    console.log('✅ Migration rollback test completed successfully');
  });

  describe('Table Constraints and Relationships', () => {
    beforeEach(async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        return;
      }
      // Set up test data for constraint testing
    });

    it.skip('should enforce foreign key constraints', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        return;
      }

      // Test that invalid foreign keys are rejected
      await expect(
        pool.query(`
          INSERT INTO vector_embeddings (entity_type, entity_id, vector_id)
          VALUES ('organization', 'invalid-uuid', 'test_vector')
        `)
      ).rejects.toThrow();

      await expect(
        pool.query(`
          INSERT INTO ai_interactions (user_id, interaction_type, model_used)
          VALUES ('invalid-uuid', 'test', 'gpt-4')
        `)
      ).rejects.toThrow();
    });

    it.skip('should enforce unique constraints', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        return;
      }

      // Create test organization
      await pool.query(`
        INSERT INTO organizations (id, name) 
        VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Org')
      `);

      // First insert should succeed
      await pool.query(`
        INSERT INTO vector_embeddings (entity_type, entity_id, vector_id, namespace)
        VALUES ('organization', '550e8400-e29b-41d4-a716-446655440000', 'test_vector_1', 'default')
      `);

      // Second insert with same entity/namespace should fail
      await expect(
        pool.query(`
          INSERT INTO vector_embeddings (entity_type, entity_id, vector_id, namespace)
          VALUES ('organization', '550e8400-e29b-41d4-a716-446655440000', 'test_vector_2', 'default')
        `)
      ).rejects.toThrow(/duplicate key value/);
    });
  });

  describe('Performance and Indexes', () => {
    it.skip('should have efficient query performance with indexes', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        return;
      }

      // Insert test data
      const orgIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = await pool.query(`
          INSERT INTO organizations (name) VALUES ($1) RETURNING id
        `, [`Test Org ${i}`]);
        orgIds.push(result.rows[0].id);
      }

      for (let i = 0; i < 1000; i++) {
        await pool.query(`
          INSERT INTO vector_embeddings (entity_type, entity_id, vector_id)
          VALUES ('organization', $1, $2)
        `, [orgIds[i % orgIds.length], `vector_${i}`]);
      }

      // Test query performance with EXPLAIN
      const explainResult = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT * FROM vector_embeddings 
        WHERE entity_type = 'organization' AND entity_id = $1
      `, [orgIds[0]]);

      // Should use index scan, not sequential scan
      const planText = explainResult.rows.map(row => row['QUERY PLAN']).join('\n');
      expect(planText).toContain('Index');
      expect(planText).not.toContain('Seq Scan');
    });
  });
});

export {
  // Export for use in other integration tests
  DB_CONFIG
};