import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../services/logger';
import { MigrationValidator } from './migration-validator';

const execAsync = promisify(exec);

interface MigrationRecord {
  id: number;
  filename: string;
  executed_at: Date;
  checksum: string;
  execution_time_ms: number;
  rollback_sql?: string;
}

interface RollbackInfo {
  filename: string;
  rollbackSql: string;
  dependencies: string[];
}

export class EnhancedMigrationRunner {
  private pool: Pool;
  private migrationsPath: string;
  private validator: MigrationValidator;

  constructor(migrationsPath: string = path.join(__dirname, '../migrations')) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.migrationsPath = migrationsPath;
    this.validator = new MigrationValidator(this.pool, migrationsPath);
  }

  /**
   * Create enhanced migration history table
   */
  async createMigrationTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        execution_time_ms INTEGER NOT NULL,
        rollback_sql TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_migration_history_filename ON migration_history(filename);
      CREATE INDEX IF NOT EXISTS idx_migration_history_executed_at ON migration_history(executed_at);
    `);
  }

  /**
   * Generate checksum for migration file
   */
  private generateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Extract rollback SQL from migration file
   */
  private extractRollbackSql(content: string): string | undefined {
    const rollbackMatch = content.match(/--\s*ROLLBACK:\s*\n([\s\S]*?)(?=--\s*END ROLLBACK|$)/i);
    return rollbackMatch ? rollbackMatch[1].trim() : undefined;
  }

  /**
   * Generate automatic rollback SQL for common operations
   */
  private generateRollbackSql(content: string, filename: string): string {
    const rollback: string[] = [];
    
    // Extract created tables
    const createTableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
    for (const match of createTableMatches) {
      rollback.push(`DROP TABLE IF EXISTS ${match[1]} CASCADE;`);
    }

    // Extract created indexes
    const createIndexMatches = content.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
    for (const match of createIndexMatches) {
      rollback.push(`DROP INDEX IF EXISTS ${match[1]};`);
    }

    // Extract added columns (from ALTER TABLE ADD COLUMN)
    const addColumnMatches = content.matchAll(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)/gi);
    for (const match of addColumnMatches) {
      rollback.push(`ALTER TABLE ${match[1]} DROP COLUMN IF EXISTS ${match[2]};`);
    }

    // Extract created constraints
    const addConstraintMatches = content.matchAll(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+(\w+)/gi);
    for (const match of addConstraintMatches) {
      rollback.push(`ALTER TABLE ${match[1]} DROP CONSTRAINT IF EXISTS ${match[2]};`);
    }

    if (rollback.length === 0) {
      rollback.push(`-- No automatic rollback generated for ${filename}`);
      rollback.push(`-- Manual rollback may be required`);
    }

    rollback.reverse(); // Reverse order for proper rollback
    return rollback.join('\n');
  }

  /**
   * Create database backup using pg_dump
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(process.cwd(), `backup-${timestamp}.sql`);
    
    try {
      const databaseUrl = process.env.DATABASE_URL!;
      await execAsync(`pg_dump "${databaseUrl}" > "${backupFile}"`);
      logger.info('✅ Database backup created', { backupFile });
      return backupFile;
    } catch (error) {
      logger.error('❌ Failed to create backup', { error });
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<Set<string>> {
    try {
      const result = await this.pool.query('SELECT filename FROM migration_history');
      return new Set(result.rows.map(row => row.filename));
    } catch {
      return new Set();
    }
  }

  /**
   * Execute a single migration with validation and rollback preparation
   */
  async executeMigration(filename: string, options: {
    dryRun?: boolean;
    createBackup?: boolean;
    validateFirst?: boolean;
  } = {}): Promise<{
    success: boolean;
    executionTime: number;
    error?: string;
    rollbackSql?: string;
  }> {
    const startTime = Date.now();
    const filePath = path.join(this.migrationsPath, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const checksum = this.generateChecksum(content);
    
    // Validate dependencies if requested
    if (options.validateFirst) {
      const metadata = (this.validator as any).parseMigrationFile(filePath);
      const validation = await this.validator.validateMigrationDependencies(metadata);
      
      if (!validation.valid) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          error: `Missing dependencies: ${validation.missingDependencies.map(d => d.table).join(', ')}`
        };
      }
    }

    // Create backup if requested
    if (options.createBackup) {
      await this.createBackup();
    }

    // Extract or generate rollback SQL
    let rollbackSql = this.extractRollbackSql(content);
    if (!rollbackSql) {
      rollbackSql = this.generateRollbackSql(content, filename);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration
      await client.query(content);
      
      if (options.dryRun) {
        await client.query('ROLLBACK');
        logger.info('🧪 Dry run successful', { filename });
      } else {
        // Record migration execution
        await client.query(`
          INSERT INTO migration_history (filename, checksum, execution_time_ms, rollback_sql)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (filename) DO UPDATE SET
            executed_at = NOW(),
            checksum = $2,
            execution_time_ms = $3,
            rollback_sql = $4
        `, [filename, checksum, Date.now() - startTime, rollbackSql]);
        
        await client.query('COMMIT');
        logger.info('✅ Migration executed successfully', { filename });
      }

      return {
        success: true,
        executionTime: Date.now() - startTime,
        rollbackSql
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        rollbackSql
      };
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a specific migration
   */
  async rollbackMigration(filename: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get rollback SQL from history
      const result = await client.query(
        'SELECT rollback_sql FROM migration_history WHERE filename = $1',
        [filename]
      );

      if (result.rows.length === 0) {
        throw new Error(`Migration ${filename} not found in history`);
      }

      const rollbackSql = result.rows[0].rollback_sql;
      if (!rollbackSql || rollbackSql.includes('No automatic rollback')) {
        throw new Error(`No rollback SQL available for ${filename}`);
      }

      await client.query('BEGIN');
      
      // Execute rollback
      await client.query(rollbackSql);
      
      // Remove from migration history
      await client.query('DELETE FROM migration_history WHERE filename = $1', [filename]);
      
      await client.query('COMMIT');
      
      logger.info('✅ Migration rolled back successfully', { filename });
      
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Rollback failed', { filename, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations with comprehensive validation
   */
  async runMigrations(options: {
    dryRun?: boolean;
    createBackup?: boolean;
    validateAll?: boolean;
    stopOnError?: boolean;
  } = {}): Promise<{
    success: boolean;
    executed: string[];
    failed: string[];
    errors: { [filename: string]: string };
  }> {
    await this.createMigrationTable();
    
    const executed: string[] = [];
    const failed: string[] = [];
    const errors: { [filename: string]: string } = {};

    try {
      // Validate all migrations first if requested
      if (options.validateAll) {
        logger.info('🔍 Validating all migrations...');
        const validation = await this.validator.validateAllMigrations();
        
        if (!validation.valid) {
          logger.error('❌ Migration validation failed. Aborting.');
          for (const result of validation.results) {
            if (!result.valid) {
              errors[result.filename] = `Missing dependencies: ${result.missingDependencies.map(d => d.table).join(', ')}`;
            }
          }
          return { success: false, executed, failed: Object.keys(errors), errors };
        }
      }

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();

      // Get all migration files
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Create backup before running migrations
      if (options.createBackup && !options.dryRun) {
        await this.createBackup();
      }

      // Execute pending migrations
      for (const filename of migrationFiles) {
        if (executedMigrations.has(filename)) {
          logger.info('⏭️  Skipping already executed migration', { filename });
          continue;
        }

        logger.info('🔄 Executing migration', { filename });

        const result = await this.executeMigration(filename, {
          dryRun: options.dryRun,
          validateFirst: true
        });

        if (result.success) {
          executed.push(filename);
        } else {
          failed.push(filename);
          if (result.error) {
            errors[filename] = result.error;
          }

          if (options.stopOnError) {
            logger.error('❌ Stopping on error as requested');
            break;
          }
        }
      }

      const success = failed.length === 0;
      
      if (success) {
        logger.info('✅ All migrations completed successfully', { 
          executed: executed.length 
        });
      } else {
        logger.error('❌ Some migrations failed', { 
          executed: executed.length,
          failed: failed.length 
        });
      }

      return { success, executed, failed, errors };

    } catch (error) {
      logger.error('❌ Migration process failed', { error });
      return { 
        success: false, 
        executed, 
        failed, 
        errors: { ...errors, _general: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Get migration status and history
   */
  async getStatus(): Promise<{
    executed: MigrationRecord[];
    pending: string[];
    totalFiles: number;
  }> {
    await this.createMigrationTable();

    const [executedResult, migrationFiles] = await Promise.all([
      this.pool.query('SELECT * FROM migration_history ORDER BY executed_at ASC'),
      fs.readdirSync(this.migrationsPath).filter(file => file.endsWith('.sql')).sort()
    ]);

    const executed = executedResult.rows;
    const executedSet = new Set(executed.map(m => m.filename));
    const pending = migrationFiles.filter(file => !executedSet.has(file));

    return {
      executed,
      pending,
      totalFiles: migrationFiles.length
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI interface
export async function runEnhancedMigrations() {
  const runner = new EnhancedMigrationRunner();

  try {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'status':
        const status = await runner.getStatus();
        console.log('\n📊 Migration Status:');
        console.log(`Total files: ${status.totalFiles}`);
        console.log(`Executed: ${status.executed.length}`);
        console.log(`Pending: ${status.pending.length}`);
        
        if (status.pending.length > 0) {
          console.log('\n📋 Pending migrations:');
          status.pending.forEach(file => console.log(`  - ${file}`));
        }
        break;

      case 'run':
        const dryRun = args.includes('--dry-run');
        const validateAll = args.includes('--validate');
        const createBackup = args.includes('--backup');
        
        await runner.runMigrations({
          dryRun,
          validateAll: true,
          createBackup,
          stopOnError: true
        });
        break;

      case 'rollback':
        const filename = args[1];
        if (!filename) {
          console.error('❌ Please specify migration filename to rollback');
          process.exit(1);
        }
        await runner.rollbackMigration(filename);
        break;

      case 'validate':
        const validator = new MigrationValidator(runner['pool']);
        const validation = await validator.validateAllMigrations();
        
        if (validation.valid) {
          console.log('✅ All migrations are valid');
        } else {
          console.log('❌ Migration validation failed');
          process.exit(1);
        }
        break;

      default:
        console.log(`
Usage: npm run migration [command] [options]

Commands:
  status              Show migration status
  run [options]       Run pending migrations
    --dry-run         Test migrations without applying
    --validate        Validate dependencies first
    --backup          Create backup before running
  rollback <file>     Rollback specific migration
  validate            Validate all migrations

Examples:
  npm run migration status
  npm run migration run --validate --backup
  npm run migration run --dry-run
  npm run migration rollback 007_grant_monitoring_system.sql
        `);
    }

  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

// Run if called directly
if (require.main === module) {
  runEnhancedMigrations().catch(console.error);
}