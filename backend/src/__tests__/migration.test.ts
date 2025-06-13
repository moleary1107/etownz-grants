import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { EnhancedMigrationRunner } from '../scripts/enhanced-migration-runner';
import { MigrationValidator } from '../scripts/migration-validator';

describe('Migration System Tests', () => {
  let pool: Pool;
  let runner: EnhancedMigrationRunner;
  let validator: MigrationValidator;
  let testDbName: string;

  beforeAll(async () => {
    // Create a test database
    testDbName = `test_db_${Date.now()}`;
    const adminPool = new Pool({
      connectionString: process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/postgres')
    });

    await adminPool.query(`CREATE DATABASE "${testDbName}"`);
    await adminPool.end();

    // Connect to test database
    const testDbUrl = process.env.DATABASE_URL?.replace(/\/[^/]+$/, `/${testDbName}`);
    pool = new Pool({ connectionString: testDbUrl });
    
    // Create test migrations directory
    const testMigrationsPath = path.join(__dirname, '../migrations-test');
    if (!fs.existsSync(testMigrationsPath)) {
      fs.mkdirSync(testMigrationsPath);
    }

    runner = new EnhancedMigrationRunner(testMigrationsPath);
    validator = new MigrationValidator(pool, testMigrationsPath);
  });

  afterAll(async () => {
    await runner.close();
    await pool.end();

    // Clean up test database
    const adminPool = new Pool({
      connectionString: process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/postgres')
    });
    await adminPool.query(`DROP DATABASE "${testDbName}"`);
    await adminPool.end();

    // Clean up test migrations
    const testMigrationsPath = path.join(__dirname, '../migrations-test');
    if (fs.existsSync(testMigrationsPath)) {
      fs.rmSync(testMigrationsPath, { recursive: true });
    }
  });

  describe('Migration Validator', () => {
    test('should detect missing table dependencies', async () => {
      const testMigration = `
        CREATE TABLE test_table (
          id SERIAL PRIMARY KEY,
          parent_id INTEGER REFERENCES non_existent_table(id)
        );
      `;

      const testFile = path.join(__dirname, '../migrations-test/001_test_dependencies.sql');
      fs.writeFileSync(testFile, testMigration);

      const validation = await validator.validateAllMigrations();
      expect(validation.valid).toBe(false);
      expect(validation.results[0].missingDependencies).toContainEqual({
        table: 'non_existent_table',
        type: 'table'
      });
    });

    test('should pass validation for valid migrations', async () => {
      const testMigration = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL
        );
        
        CREATE TABLE posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title VARCHAR(255) NOT NULL
        );
      `;

      const testFile = path.join(__dirname, '../migrations-test/002_valid_migration.sql');
      fs.writeFileSync(testFile, testMigration);

      const validation = await validator.validateAllMigrations();
      expect(validation.valid).toBe(true);
    });

    test('should generate correct dependency graph', async () => {
      const migration1 = `
        CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `;

      const migration2 = `
        CREATE TABLE products (
          id SERIAL PRIMARY KEY,
          category_id INTEGER REFERENCES categories(id),
          name VARCHAR(255) NOT NULL
        );
      `;

      fs.writeFileSync(path.join(__dirname, '../migrations-test/003_categories.sql'), migration1);
      fs.writeFileSync(path.join(__dirname, '../migrations-test/004_products.sql'), migration2);

      const files = ['003_categories.sql', '004_products.sql'];
      const graph = validator.generateDependencyGraph(files);
      
      expect(graph.get('004_products.sql')).toContain('003_categories.sql');
    });
  });

  describe('Enhanced Migration Runner', () => {
    test('should create migration history table', async () => {
      await runner.createMigrationTable();
      
      const result = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'migration_history'
      `);
      
      expect(result.rows).toHaveLength(1);
    });

    test('should execute migration with rollback generation', async () => {
      const testMigration = `
        -- Test migration
        CREATE TABLE test_rollback (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
        
        CREATE INDEX idx_test_rollback_name ON test_rollback(name);
      `;

      const testFile = path.join(__dirname, '../migrations-test/005_rollback_test.sql');
      fs.writeFileSync(testFile, testMigration);

      const result = await runner.executeMigration('005_rollback_test.sql');
      
      expect(result.success).toBe(true);
      expect(result.rollbackSql).toContain('DROP TABLE IF EXISTS test_rollback CASCADE');
      expect(result.rollbackSql).toContain('DROP INDEX IF EXISTS idx_test_rollback_name');

      // Verify table was created
      const tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'test_rollback'
      `);
      expect(tableCheck.rows).toHaveLength(1);
    });

    test('should perform dry run without applying changes', async () => {
      const testMigration = `
        CREATE TABLE dry_run_test (
          id SERIAL PRIMARY KEY,
          data TEXT
        );
      `;

      const testFile = path.join(__dirname, '../migrations-test/006_dry_run.sql');
      fs.writeFileSync(testFile, testMigration);

      const result = await runner.executeMigration('006_dry_run.sql', { dryRun: true });
      
      expect(result.success).toBe(true);

      // Verify table was NOT created
      const tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'dry_run_test'
      `);
      expect(tableCheck.rows).toHaveLength(0);
    });

    test('should rollback migration successfully', async () => {
      // First create a migration to rollback
      const testMigration = `
        CREATE TABLE rollback_target (
          id SERIAL PRIMARY KEY,
          value INTEGER
        );
      `;

      const testFile = path.join(__dirname, '../migrations-test/007_rollback_target.sql');
      fs.writeFileSync(testFile, testMigration);

      // Execute migration
      const executeResult = await runner.executeMigration('007_rollback_target.sql');
      expect(executeResult.success).toBe(true);

      // Verify table exists
      let tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'rollback_target'
      `);
      expect(tableCheck.rows).toHaveLength(1);

      // Rollback migration
      const rollbackResult = await runner.rollbackMigration('007_rollback_target.sql');
      expect(rollbackResult.success).toBe(true);

      // Verify table was dropped
      tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'rollback_target'
      `);
      expect(tableCheck.rows).toHaveLength(0);
    });

    test('should handle migration with manual rollback SQL', async () => {
      const testMigration = `
        -- Migration with manual rollback
        CREATE TABLE manual_rollback_test (
          id SERIAL PRIMARY KEY,
          data JSONB
        );
        
        -- ROLLBACK:
        -- DROP TABLE manual_rollback_test CASCADE;
        -- Custom cleanup operations here
        -- END ROLLBACK
      `;

      const testFile = path.join(__dirname, '../migrations-test/008_manual_rollback.sql');
      fs.writeFileSync(testFile, testMigration);

      const result = await runner.executeMigration('008_manual_rollback.sql');
      
      expect(result.success).toBe(true);
      expect(result.rollbackSql).toContain('DROP TABLE manual_rollback_test CASCADE');
      expect(result.rollbackSql).toContain('Custom cleanup operations here');
    });

    test('should run multiple migrations in correct order', async () => {
      // Create interdependent migrations
      const migration1 = `
        CREATE TABLE orders (
          id SERIAL PRIMARY KEY,
          customer_name VARCHAR(255) NOT NULL
        );
      `;

      const migration2 = `
        CREATE TABLE order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id),
          product_name VARCHAR(255) NOT NULL,
          quantity INTEGER NOT NULL
        );
      `;

      fs.writeFileSync(path.join(__dirname, '../migrations-test/009_orders.sql'), migration1);
      fs.writeFileSync(path.join(__dirname, '../migrations-test/010_order_items.sql'), migration2);

      const result = await runner.runMigrations({
        validateAll: true,
        stopOnError: true
      });

      expect(result.success).toBe(true);
      expect(result.executed).toContain('009_orders.sql');
      expect(result.executed).toContain('010_order_items.sql');
      expect(result.failed).toHaveLength(0);

      // Verify both tables exist
      const tablesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name IN ('orders', 'order_items')
        ORDER BY table_name
      `);
      expect(tablesResult.rows).toHaveLength(2);
    });

    test('should get accurate migration status', async () => {
      const status = await runner.getStatus();
      
      expect(status.totalFiles).toBeGreaterThan(0);
      expect(status.executed.length).toBeGreaterThan(0);
      expect(status.executed[0]).toHaveProperty('filename');
      expect(status.executed[0]).toHaveProperty('executed_at');
      expect(status.executed[0]).toHaveProperty('checksum');
    });
  });

  describe('Error Handling', () => {
    test('should handle SQL syntax errors gracefully', async () => {
      const invalidMigration = `
        CREATE TABLE syntax_error (
          id SERIAL PRIMARY KEY,
          invalid_column INVALID_TYPE
        );
      `;

      const testFile = path.join(__dirname, '../migrations-test/011_syntax_error.sql');
      fs.writeFileSync(testFile, invalidMigration);

      const result = await runner.executeMigration('011_syntax_error.sql');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle missing dependency errors', async () => {
      const dependentMigration = `
        CREATE TABLE dependent_table (
          id SERIAL PRIMARY KEY,
          missing_ref_id INTEGER REFERENCES missing_table(id)
        );
      `;

      const testFile = path.join(__dirname, '../migrations-test/012_missing_dependency.sql');
      fs.writeFileSync(testFile, dependentMigration);

      const result = await runner.executeMigration('012_missing_dependency.sql', {
        validateFirst: true
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing dependencies');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large migration files', async () => {
      // Create a migration with many operations
      const operations = Array.from({ length: 100 }, (_, i) => 
        `CREATE TABLE large_test_${i} (id SERIAL PRIMARY KEY, data TEXT);`
      ).join('\n');

      const largeMigration = `-- Large migration test\n${operations}`;
      
      const testFile = path.join(__dirname, '../migrations-test/013_large_migration.sql');
      fs.writeFileSync(testFile, largeMigration);

      const result = await runner.executeMigration('013_large_migration.sql');
      
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should handle concurrent migration attempts', async () => {
      const testMigration = `
        CREATE TABLE concurrent_test (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT NOW()
        );
      `;

      const testFile = path.join(__dirname, '../migrations-test/014_concurrent.sql');
      fs.writeFileSync(testFile, testMigration);

      // Try to run the same migration concurrently
      const promises = [
        runner.executeMigration('014_concurrent.sql'),
        runner.executeMigration('014_concurrent.sql')
      ];

      const results = await Promise.all(promises);
      
      // One should succeed, one should handle the conflict gracefully
      const successes = results.filter(r => r.success).length;
      expect(successes).toBe(1);
    });
  });
});