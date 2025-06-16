// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Try multiple possible .env locations
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.DATABASE_URL) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.error('❌ Failed to load .env file from any location');
  console.error('Tried paths:', envPaths);
}

import { db } from '../services/database';
import { logger } from '../services/logger';

async function testDatabaseConnection() {
  try {
    console.log('🔄 Testing database connection...');
    console.log('📍 Environment:', process.env.NODE_ENV);
    console.log('🗄️ Database URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');
    
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time, version() as db_version');
    
    console.log('✅ Database connection successful!');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('📊 Database version:', result.rows[0].db_version);
    
    // Test if our tables exist
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('grant_sources', 'job_queue', 'crawl_monitoring')
      ORDER BY table_name;
    `);
    
    console.log('\n🏗️ Automation tables status:');
    const requiredTables = ['grant_sources', 'job_queue', 'crawl_monitoring'];
    const existingTables = tableCheck.rows.map(row => row.table_name);
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ ${table} - exists`);
      } else {
        console.log(`❌ ${table} - missing`);
      }
    }
    
    // Check if migration tracking table exists and show status
    try {
      const migrationCheck = await db.query(`
        SELECT migration_name, executed_at 
        FROM migration_history 
        WHERE migration_name LIKE '%grant_sources%'
        ORDER BY executed_at DESC;
      `);
      
      console.log('\n📋 Recent grant-related migrations:');
      if (migrationCheck.rows.length > 0) {
        migrationCheck.rows.forEach(row => {
          console.log(`✅ ${row.migration_name} - ${row.executed_at}`);
        });
      } else {
        console.log('ℹ️ No grant-related migrations found');
      }
    } catch (error) {
      console.log('ℹ️ Migration history table not available');
    }
    
    // Test grant sources table if it exists
    if (existingTables.includes('grant_sources')) {
      const sourceCount = await db.query('SELECT COUNT(*) as count FROM grant_sources');
      console.log(`\n📊 Grant sources count: ${sourceCount.rows[0].count}`);
      
      if (sourceCount.rows[0].count > 0) {
        const sources = await db.query('SELECT name, is_active, crawl_schedule FROM grant_sources LIMIT 5');
        console.log('📝 Existing sources:');
        sources.rows.forEach(source => {
          console.log(`  • ${source.name} (${source.crawl_schedule}, ${source.is_active ? 'active' : 'inactive'})`);
        });
      } else {
        console.log('⚠️ Grant sources table is empty - seeding needed');
      }
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Database connection failed:', error);
    
    if (error?.code === '3D000') {
      console.error('\n💡 Suggestions:');
      console.error('   - Check if database name in DATABASE_URL is correct');
      console.error('   - Verify database exists on DigitalOcean');
      console.error('   - Try connecting to "defaultdb" database first');
    } else if (error?.code === '28P01') {
      console.error('\n💡 Suggestions:');
      console.error('   - Check database credentials');
      console.error('   - Verify DATABASE_URL has correct username/password');
    } else if (error?.code === 'ENOTFOUND') {
      console.error('\n💡 Suggestions:');
      console.error('   - Check database host address');
      console.error('   - Verify network connectivity');
    }
    
    process.exit(1);
  }
}

testDatabaseConnection();