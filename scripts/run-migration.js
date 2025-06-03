#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting demo users migration...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'backend', 'src', 'migrations', '011_demo_users_seed.sql');
    console.log(`📄 Reading migration from: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🗄️  Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('⚡ Executing migration...');
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      
      console.log('✅ Migration completed successfully!');
      
      // Test query to verify data
      const result = await client.query('SELECT email, first_name, last_name, role FROM users WHERE email = $1', ['admin@etownz.com']);
      if (result.rows.length > 0) {
        console.log('✅ Demo user verification successful:', result.rows[0]);
      } else {
        console.log('⚠️  Warning: Could not find demo user after migration');
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  console.log('🎉 Migration script completed');
}

// Run migration
runMigration();