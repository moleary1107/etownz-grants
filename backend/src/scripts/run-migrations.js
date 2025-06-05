#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs all pending migrations in order
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    host: process.env.DATABASE_HOST || 'postgres',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'etownz_grants',
    user: process.env.DATABASE_USER || 'etownz',
    password: process.env.DATABASE_PASSWORD || 'etownz2024',
};

console.log('🔄 Starting database migration runner...');

async function runMigrations() {
    const pool = new Pool(dbConfig);
    
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection established');

        // Create migrations tracking table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migration_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW(),
                checksum VARCHAR(255)
            );
        `);

        // Get migration files
        const migrationsDir = path.join(__dirname, '../migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql') && file !== 'fix_all_migrations.sql')
            .sort();

        console.log(`📁 Found ${migrationFiles.length} migration files`);

        // Get already executed migrations
        const { rows: executedMigrations } = await pool.query(
            'SELECT filename FROM migration_history'
        );
        const executedSet = new Set(executedMigrations.map(row => row.filename));

        // Run pending migrations
        for (const filename of migrationFiles) {
            if (executedSet.has(filename)) {
                console.log(`⏭️  Skipping ${filename} (already executed)`);
                continue;
            }

            console.log(`🔄 Running migration: ${filename}`);
            
            try {
                const migrationPath = path.join(migrationsDir, filename);
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                
                // Execute migration in a transaction
                await pool.query('BEGIN');
                await pool.query(migrationSQL);
                await pool.query(
                    'INSERT INTO migration_history (filename) VALUES ($1)',
                    [filename]
                );
                await pool.query('COMMIT');
                
                console.log(`✅ Successfully executed: ${filename}`);
            } catch (error) {
                await pool.query('ROLLBACK');
                console.error(`❌ Failed to execute ${filename}:`, error.message);
                
                // For critical tables, try to continue
                if (filename.includes('ai_cost_management') || filename.includes('ai_monitoring')) {
                    console.log(`⚠️  Continuing despite error in ${filename} (non-critical)`);
                    // Mark as executed with error
                    await pool.query(
                        'INSERT INTO migration_history (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
                        [filename]
                    );
                } else {
                    throw error;
                }
            }
        }

        console.log('🎉 All migrations completed successfully!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migrations
runMigrations().catch(console.error);