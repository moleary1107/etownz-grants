#!/usr/bin/env node

/**
 * AI Editor Migration Runner
 * Runs the AI editor system migration specifically
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const dbConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : {
    host: process.env.DATABASE_HOST || 'postgres',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'etownz_grants',
    user: process.env.DATABASE_USER || 'etownz',
    password: process.env.DATABASE_PASSWORD || 'etownz2024',
};

console.log('🤖 Running AI Editor Migration...');

async function runAIEditorMigration() {
    const pool = new Pool(dbConfig);
    
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection established');

        // Create migrations tracking table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migration_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW(),
                checksum VARCHAR(255)
            );
        `);

        const migrationFile = '024_ai_editor_system.sql';
        
        // Check if already executed
        const { rows: existingMigration } = await pool.query(
            'SELECT filename FROM migration_history WHERE filename = $1',
            [migrationFile]
        );

        if (existingMigration.length > 0) {
            console.log('⏭️  AI Editor migration already executed');
            return;
        }

        console.log('🔄 Running AI Editor migration...');
        
        const migrationPath = path.join(__dirname, '../migrations', migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration in a transaction
        await pool.query('BEGIN');
        
        try {
            await pool.query(migrationSQL);
            await pool.query(
                'INSERT INTO migration_history (filename) VALUES ($1)',
                [migrationFile]
            );
            await pool.query('COMMIT');
            
            console.log('✅ Successfully executed AI Editor migration');
            
            // Verify tables were created
            const { rows: tables } = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%editor%' OR table_name LIKE '%ai_%'
                ORDER BY table_name
            `);
            
            console.log('📋 AI Editor tables created:');
            tables.forEach(table => {
                console.log(`   ✓ ${table.table_name}`);
            });
            
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }

        console.log('🎉 AI Editor migration completed successfully!');
        
    } catch (error) {
        console.error('💥 AI Editor migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migration
runAIEditorMigration().catch(console.error);