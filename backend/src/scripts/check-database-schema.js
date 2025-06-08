#!/usr/bin/env node

/**
 * Database Schema Checker
 * Check current database structure
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

async function checkSchema() {
    const pool = new Pool(dbConfig);
    
    try {
        console.log('🔍 Checking current database schema...');
        
        // Check existing tables
        const { rows: tables } = await pool.query(`
            SELECT table_name, table_schema
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Existing tables:');
        tables.forEach(table => {
            console.log(`   ✓ ${table.table_name}`);
        });
        
        // Check if key tables exist
        const keyTables = ['users', 'grants', 'applications', 'organizations'];
        console.log('\n🔑 Checking key tables:');
        
        for (const tableName of keyTables) {
            const exists = tables.some(t => t.table_name === tableName);
            console.log(`   ${exists ? '✅' : '❌'} ${tableName}`);
        }
        
        // Check migration history
        const migrationExists = tables.some(t => t.table_name === 'migration_history');
        if (migrationExists) {
            const { rows: migrations } = await pool.query(`
                SELECT filename, executed_at 
                FROM migration_history 
                ORDER BY executed_at DESC
            `);
            
            console.log('\n📜 Migration history:');
            migrations.forEach(migration => {
                console.log(`   ✓ ${migration.filename} (${migration.executed_at.toISOString().split('T')[0]})`);
            });
        }
        
    } catch (error) {
        console.error('💥 Schema check failed:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema().catch(console.error);