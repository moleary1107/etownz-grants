import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../services/logger';

interface MigrationDependency {
  table: string;
  columns?: string[];
  type: 'table' | 'column' | 'constraint' | 'index';
}

interface MigrationMetadata {
  filename: string;
  dependencies: MigrationDependency[];
  creates: MigrationDependency[];
  description: string;
  rollbackSql?: string;
}

export class MigrationValidator {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool, migrationsPath: string = path.join(__dirname, '../migrations')) {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  /**
   * Parse SQL file to extract dependencies and what it creates
   */
  private parseMigrationFile(filePath: string): MigrationMetadata {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    
    const metadata: MigrationMetadata = {
      filename,
      dependencies: [],
      creates: [],
      description: this.extractDescription(content)
    };

    // Extract table dependencies from REFERENCES clauses
    const referenceMatches = content.matchAll(/REFERENCES\s+(\w+)\s*\(/gi);
    for (const match of referenceMatches) {
      metadata.dependencies.push({
        table: match[1],
        type: 'table'
      });
    }

    // Extract ALTER TABLE dependencies
    const alterMatches = content.matchAll(/ALTER\s+TABLE\s+(\w+)/gi);
    for (const match of alterMatches) {
      metadata.dependencies.push({
        table: match[1],
        type: 'table'
      });
    }

    // Extract created tables
    const createMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
    for (const match of createMatches) {
      metadata.creates.push({
        table: match[1],
        type: 'table'
      });
    }

    // Extract created indexes
    const indexMatches = content.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
    for (const match of indexMatches) {
      metadata.creates.push({
        table: match[1],
        type: 'index'
      });
    }

    return metadata;
  }

  /**
   * Extract description from migration file comments
   */
  private extractDescription(content: string): string {
    const lines = content.split('\n');
    const descriptionLines = lines
      .filter(line => line.trim().startsWith('--'))
      .slice(0, 3)
      .map(line => line.replace(/^--\s*/, ''));
    
    return descriptionLines.join(' ').trim();
  }

  /**
   * Check if a table exists in the database
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = $1 AND table_schema = 'public'
      )
    `, [tableName]);
    
    return result.rows[0].exists;
  }

  /**
   * Check if a column exists in a table
   */
  async columnExists(tableName: string, columnName: string): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'
      )
    `, [tableName, columnName]);
    
    return result.rows[0].exists;
  }

  /**
   * Validate dependencies for a single migration
   */
  async validateMigrationDependencies(metadata: MigrationMetadata): Promise<{
    valid: boolean;
    missingDependencies: MigrationDependency[];
    warnings: string[];
  }> {
    const missingDependencies: MigrationDependency[] = [];
    const warnings: string[] = [];

    for (const dependency of metadata.dependencies) {
      if (dependency.type === 'table') {
        const exists = await this.tableExists(dependency.table);
        if (!exists) {
          missingDependencies.push(dependency);
        }
      }
      
      if (dependency.type === 'column' && dependency.columns) {
        for (const column of dependency.columns) {
          const exists = await this.columnExists(dependency.table, column);
          if (!exists) {
            missingDependencies.push({
              table: dependency.table,
              columns: [column],
              type: 'column'
            });
          }
        }
      }
    }

    // Check for potential conflicts
    for (const created of metadata.creates) {
      if (created.type === 'table') {
        const exists = await this.tableExists(created.table);
        if (exists) {
          warnings.push(`Table ${created.table} already exists - migration may fail or be skipped`);
        }
      }
    }

    return {
      valid: missingDependencies.length === 0,
      missingDependencies,
      warnings
    };
  }

  /**
   * Validate all pending migrations
   */
  async validateAllMigrations(): Promise<{
    valid: boolean;
    results: Array<{
      filename: string;
      valid: boolean;
      missingDependencies: MigrationDependency[];
      warnings: string[];
    }>;
  }> {
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const results: Array<{
      filename: string;
      valid: boolean;
      missingDependencies: MigrationDependency[];
      warnings: string[];
    }> = [];
    let allValid = true;

    for (const file of migrationFiles) {
      const filePath = path.join(this.migrationsPath, file);
      const metadata = this.parseMigrationFile(filePath);
      const validation = await this.validateMigrationDependencies(metadata);
      
      results.push({
        filename: file,
        valid: validation.valid,
        missingDependencies: validation.missingDependencies,
        warnings: validation.warnings
      });

      if (!validation.valid) {
        allValid = false;
      }
    }

    return {
      valid: allValid,
      results
    };
  }

  /**
   * Generate dependency graph
   */
  generateDependencyGraph(migrationFiles: string[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    const allMetadata = new Map<string, MigrationMetadata>();

    // Parse all migrations
    for (const file of migrationFiles) {
      const filePath = path.join(this.migrationsPath, file);
      const metadata = this.parseMigrationFile(filePath);
      allMetadata.set(file, metadata);
      graph.set(file, []);
    }

    // Build dependency relationships
    for (const [file, metadata] of allMetadata) {
      for (const dependency of metadata.dependencies) {
        // Find which migration creates this dependency
        for (const [otherFile, otherMetadata] of allMetadata) {
          if (otherFile !== file) {
            const creates = otherMetadata.creates.find(c => 
              c.table === dependency.table && c.type === dependency.type
            );
            if (creates) {
              const deps = graph.get(file) || [];
              if (!deps.includes(otherFile)) {
                deps.push(otherFile);
                graph.set(file, deps);
              }
            }
          }
        }
      }
    }

    return graph;
  }

  /**
   * Suggest optimal migration order
   */
  suggestMigrationOrder(migrationFiles: string[]): string[] {
    const graph = this.generateDependencyGraph(migrationFiles);
    const visited = new Set<string>();
    const result: string[] = [];

    function visit(file: string) {
      if (visited.has(file)) return;
      visited.add(file);

      const dependencies = graph.get(file) || [];
      for (const dep of dependencies) {
        visit(dep);
      }

      result.push(file);
    }

    for (const file of migrationFiles) {
      visit(file);
    }

    return result;
  }

  /**
   * Create a backup before running migrations
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(process.cwd(), `backup-${timestamp}.sql`);
    
    // This would use pg_dump in a real implementation
    logger.info('Creating database backup', { backupFile });
    
    return backupFile;
  }

  /**
   * Test migration in a transaction (dry run)
   */
  async testMigration(migrationFile: string): Promise<{
    success: boolean;
    error?: string;
    warnings: string[];
  }> {
    const client = await this.pool.connect();
    const warnings: string[] = [];

    try {
      await client.query('BEGIN');
      
      const filePath = path.join(this.migrationsPath, migrationFile);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      // Execute migration in transaction
      await client.query(sql);
      
      // Rollback to test without applying changes
      await client.query('ROLLBACK');
      
      return {
        success: true,
        warnings
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        warnings
      };
    } finally {
      client.release();
    }
  }
}

// CLI interface
export async function runMigrationValidator() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const validator = new MigrationValidator(pool);

  try {
    logger.info('🔍 Starting migration validation...');
    
    const validation = await validator.validateAllMigrations();
    
    if (validation.valid) {
      logger.info('✅ All migrations are valid!');
    } else {
      logger.error('❌ Migration validation failed:');
      
      for (const result of validation.results) {
        if (!result.valid) {
          logger.error(`Migration ${result.filename}:`);
          for (const dep of result.missingDependencies) {
            logger.error(`  Missing ${dep.type}: ${dep.table}${dep.columns ? `.${dep.columns.join(', ')}` : ''}`);
          }
        }
        
        if (result.warnings.length > 0) {
          logger.warn(`Warnings for ${result.filename}:`);
          for (const warning of result.warnings) {
            logger.warn(`  ${warning}`);
          }
        }
      }
    }

    // Generate migration order suggestion
    const migrationFiles = fs.readdirSync(path.join(__dirname, '../migrations'))
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    const suggestedOrder = validator.suggestMigrationOrder(migrationFiles);
    logger.info('📋 Suggested migration order:', { order: suggestedOrder });

  } catch (error) {
    logger.error('Validation failed:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrationValidator().catch(console.error);
}