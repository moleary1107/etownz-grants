#!/usr/bin/env node

/**
 * Verify AI Editor Tables
 * Check that all AI editor tables were created correctly
 */

require('dotenv').config();
const { Pool } = require('pg');

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

async function verifyTables() {
    const pool = new Pool(dbConfig);
    
    try {
        console.log('🔍 Verifying AI Editor tables...');
        
        const expectedTables = [
            'applications',
            'editor_sessions',
            'ai_content_suggestions',
            'ai_editor_interactions',
            'ai_editor_chat_messages',
            'ai_grant_requirements',
            'ai_content_assessments',
            'editor_collaboration_events',
            'editor_auto_saves'
        ];
        
        for (const tableName of expectedTables) {
            try {
                // Check if table exists and get column info
                const { rows: columns } = await pool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                    ORDER BY ordinal_position
                `, [tableName]);
                
                if (columns.length > 0) {
                    console.log(`✅ ${tableName} (${columns.length} columns)`);
                    
                    // Show key columns for important tables
                    if (['editor_sessions', 'ai_content_suggestions', 'ai_editor_chat_messages'].includes(tableName)) {
                        console.log(`   Key columns: ${columns.slice(0, 5).map(c => c.column_name).join(', ')}`);
                    }
                } else {
                    console.log(`❌ ${tableName} - Table not found`);
                }
            } catch (error) {
                console.log(`❌ ${tableName} - Error: ${error.message}`);
            }
        }
        
        // Check indexes
        console.log('\n🔗 Checking indexes...');
        const { rows: indexes } = await pool.query(`
            SELECT schemaname, tablename, indexname, indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (indexname LIKE '%editor%' OR indexname LIKE '%ai_editor%')
            ORDER BY tablename, indexname
        `);
        
        console.log(`Found ${indexes.length} AI editor indexes:`);
        indexes.forEach(idx => {
            console.log(`   ✓ ${idx.indexname} on ${idx.tablename}`);
        });
        
        // Test a simple query on each table
        console.log('\n🧪 Testing table accessibility...');
        for (const tableName of expectedTables) {
            try {
                await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
                console.log(`✅ ${tableName} - Accessible`);
            } catch (error) {
                console.log(`❌ ${tableName} - Query failed: ${error.message}`);
            }
        }
        
        console.log('\n🎉 AI Editor database verification complete!');
        
    } catch (error) {
        console.error('💥 Verification failed:', error.message);
    } finally {
        await pool.end();
    }
}

verifyTables().catch(console.error);