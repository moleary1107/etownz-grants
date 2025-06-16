// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.DATABASE_URL) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

import { db } from '../services/database';

async function fixGrantSourcesSchema() {
  try {
    console.log('🔄 Checking grant_sources table schema...');
    
    // Check current columns
    const columnCheck = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'grant_sources' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Current columns:');
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    columnCheck.rows.forEach(row => {
      console.log(`  • ${row.column_name} (${row.data_type})`);
    });
    
    // Check for missing columns and add them
    const requiredColumns = [
      { name: 'crawl_schedule', type: 'VARCHAR(20)', default: "'manual'" },
      { name: 'success_count', type: 'INTEGER', default: '0' },
      { name: 'failure_count', type: 'INTEGER', default: '0' },
      { name: 'last_error', type: 'TEXT', default: 'NULL' },
      { name: 'crawl_settings', type: 'JSONB', default: "'{}'" },
      { name: 'last_crawled', type: 'TIMESTAMP WITH TIME ZONE', default: 'NULL' }
    ];
    
    console.log('\n🔧 Adding missing columns...');
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          await db.query(`
            ALTER TABLE grant_sources 
            ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}
          `);
          console.log(`✅ Added column: ${column.name}`);
        } catch (error: any) {
          console.log(`⚠️ Failed to add ${column.name}: ${error.message}`);
        }
      } else {
        console.log(`✓ Column ${column.name} already exists`);
      }
    }
    
    // Add constraints if they don't exist
    console.log('\n🛡️ Adding constraints...');
    
    try {
      await db.query(`
        ALTER TABLE grant_sources 
        ADD CONSTRAINT check_crawl_schedule 
        CHECK (crawl_schedule IN ('manual', 'daily', 'weekly', 'monthly'))
      `);
      console.log('✅ Added crawl_schedule constraint');
    } catch (error: any) {
      if (error.code === '42710') {
        console.log('✓ Crawl schedule constraint already exists');
      } else {
        console.log(`⚠️ Failed to add constraint: ${error.message}`);
      }
    }
    
    // Add unique constraint on URL if it doesn't exist
    try {
      await db.query(`
        ALTER TABLE grant_sources 
        ADD CONSTRAINT unique_grant_source_url UNIQUE(url)
      `);
      console.log('✅ Added unique URL constraint');
    } catch (error: any) {
      if (error.code === '42710') {
        console.log('✓ Unique URL constraint already exists');
      } else {
        console.log(`⚠️ Failed to add unique constraint: ${error.message}`);
      }
    }
    
    // Create missing tables
    console.log('\n🏗️ Creating missing tables...');
    
    // Create crawl_monitoring table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS crawl_monitoring (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_id UUID REFERENCES grant_sources(id) ON DELETE CASCADE,
          job_id UUID,
          status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'timeout')),
          grants_found INTEGER DEFAULT 0,
          pages_crawled INTEGER DEFAULT 0,
          duration_seconds INTEGER,
          error_type VARCHAR(50),
          error_message TEXT,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          CONSTRAINT check_completed_time CHECK (status != 'completed' OR completed_at IS NOT NULL)
        )
      `);
      console.log('✅ Created crawl_monitoring table');
    } catch (error: any) {
      console.log(`⚠️ Crawl monitoring table: ${error.message}`);
    }
    
    // Create crawl_monitoring_rules table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS crawl_monitoring_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('failure_threshold', 'timeout_threshold', 'success_rate', 'no_recent_crawls')),
          enabled BOOLEAN DEFAULT TRUE,
          parameters JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ Created crawl_monitoring_rules table');
    } catch (error: any) {
      console.log(`⚠️ Crawl monitoring rules table: ${error.message}`);
    }
    
    // Create crawl_alerts table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS crawl_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_id UUID REFERENCES grant_sources(id) ON DELETE CASCADE,
          alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('failure', 'timeout', 'low_success_rate', 'no_recent_crawls')),
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          message TEXT NOT NULL,
          details JSONB DEFAULT '{}',
          acknowledged BOOLEAN DEFAULT FALSE,
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          acknowledged_by TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ Created crawl_alerts table');
    } catch (error: any) {
      console.log(`⚠️ Crawl alerts table: ${error.message}`);
    }
    
    // Add indexes
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_grant_sources_active ON grant_sources(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_grant_sources_schedule ON grant_sources(crawl_schedule)',
      'CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_crawl_monitoring_source ON crawl_monitoring(source_id)',
      'CREATE INDEX IF NOT EXISTS idx_crawl_alerts_source ON crawl_alerts(source_id)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await db.query(indexQuery);
        console.log(`✅ Created index`);
      } catch (error: any) {
        console.log(`⚠️ Index: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Schema update completed!');
    
    // Test the updated schema
    console.log('\n🧪 Testing updated schema...');
    const testResult = await db.query('SELECT name, is_active, crawl_schedule FROM grant_sources LIMIT 3');
    console.log('✅ Schema test successful!');
    
    if (testResult.rows.length > 0) {
      console.log('📝 Sample data:');
      testResult.rows.forEach(row => {
        console.log(`  • ${row.name} (${row.crawl_schedule || 'manual'}, ${row.is_active ? 'active' : 'inactive'})`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  }
}

fixGrantSourcesSchema();