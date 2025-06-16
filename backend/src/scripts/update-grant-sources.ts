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

const automationReadySources = [
  {
    name: 'Enterprise Ireland',
    url: 'https://www.enterprise-ireland.com/en/funding-supports/',
    description: 'Enterprise Ireland funding supports and grants',
    category: 'government',
    location: 'Ireland',
    crawlSettings: {
      depth: 3,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*funding*', '*grant*', '*support*'],
      excludePatterns: ['*news*', '*events*']
    },
    crawlSchedule: 'daily'
  },
  {
    name: 'Science Foundation Ireland',
    url: 'https://www.sfi.ie/funding/',
    description: 'SFI research funding opportunities',
    category: 'government',
    location: 'Ireland',
    crawlSettings: {
      depth: 3,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*funding*', '*grant*', '*award*'],
      excludePatterns: ['*news*', '*about*']
    },
    crawlSchedule: 'weekly'
  },
  {
    name: 'Dublin City Council',
    url: 'https://www.dublincity.ie/residential/community/grants-and-funding',
    description: 'Dublin City Council grants and funding',
    category: 'government',
    location: 'Ireland',
    crawlSettings: {
      depth: 2,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*grant*', '*funding*', '*scheme*'],
      excludePatterns: ['*contact*']
    },
    crawlSchedule: 'weekly'
  },
  {
    name: 'European Innovation Council',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities_en',
    description: 'EIC funding opportunities',
    category: 'eu',
    location: 'Europe',
    crawlSettings: {
      depth: 3,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*funding*', '*call*', '*grant*'],
      excludePatterns: ['*news*', '*events*']
    },
    crawlSchedule: 'weekly'
  },
  {
    name: 'Environmental Protection Agency',
    url: 'https://www.epa.ie/our-services/research/research-funding/',
    description: 'EPA research funding',
    category: 'government',
    location: 'Ireland',
    crawlSettings: {
      depth: 2,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*research*', '*funding*', '*grant*'],
      excludePatterns: ['*about*']
    },
    crawlSchedule: 'monthly'
  },
  {
    name: 'Local Government Grants',
    url: 'https://www.localgov.ie/grants-and-funding',
    description: 'Irish local government grants directory',
    category: 'government',
    location: 'Ireland',
    crawlSettings: {
      depth: 2,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*grant*', '*funding*', '*scheme*'],
      excludePatterns: ['*contact*', '*about*']
    },
    crawlSchedule: 'weekly'
  }
];

async function updateGrantSources() {
  try {
    console.log('🔄 Updating grant sources for automation...');
    
    // First, check current sources
    const existingSources = await db.query('SELECT id, name, url, crawl_schedule FROM grant_sources');
    console.log(`\n📊 Found ${existingSources.rows.length} existing sources`);
    
    // Update existing sources with automation-ready configurations
    for (const source of automationReadySources) {
      const existing = existingSources.rows.find(row => 
        row.url === source.url || 
        row.name.toLowerCase().includes(source.name.toLowerCase()) ||
        source.name.toLowerCase().includes(row.name.toLowerCase())
      );
      
      if (existing) {
        try {
          await db.query(`
            UPDATE grant_sources 
            SET 
              name = $1,
              url = $2,
              description = $3,
              crawl_settings = $4,
              crawl_schedule = $5,
              is_active = true,
              updated_at = NOW()
            WHERE id = $6
          `, [
            source.name,
            source.url,
            source.description,
            JSON.stringify(source.crawlSettings),
            source.crawlSchedule,
            existing.id
          ]);
          
          console.log(`✅ Updated: ${source.name} (${existing.crawl_schedule || 'manual'} → ${source.crawlSchedule})`);
        } catch (error: any) {
          console.log(`⚠️ Failed to update ${source.name}: ${error.message}`);
        }
      } else {
        // Insert new source
        try {
          await db.query(`
            INSERT INTO grant_sources (
              name, url, description, crawl_settings, crawl_schedule, is_active
            ) VALUES ($1, $2, $3, $4, $5, true)
          `, [
            source.name,
            source.url,
            source.description,
            JSON.stringify(source.crawlSettings),
            source.crawlSchedule
          ]);
          
          console.log(`➕ Added: ${source.name} (${source.crawlSchedule})`);
        } catch (error: any) {
          if (error.code === '23505') {
            console.log(`⚠️ Skipped ${source.name}: URL already exists`);
          } else {
            console.log(`⚠️ Failed to add ${source.name}: ${error.message}`);
          }
        }
      }
    }
    
    // Update any remaining manual sources to have better schedules
    await db.query(`
      UPDATE grant_sources 
      SET crawl_schedule = 'weekly' 
      WHERE crawl_schedule = 'manual' 
      AND is_active = true 
      AND url NOT IN (
        'https://www.enterprise-ireland.com/en/funding-supports/',
        'https://www.epa.ie/our-services/research/research-funding/'
      )
    `);
    
    console.log('✅ Set remaining manual sources to weekly schedule');
    
    // Show final status
    const finalSources = await db.query(`
      SELECT name, crawl_schedule, is_active, 
             CASE WHEN crawl_settings IS NOT NULL THEN 'configured' ELSE 'basic' END as config_status
      FROM grant_sources 
      ORDER BY crawl_schedule, name
    `);
    
    console.log(`\n📋 Final grant sources status (${finalSources.rows.length} total):`);
    
    const scheduleGroups = finalSources.rows.reduce((acc: any, source) => {
      const schedule = source.crawl_schedule || 'manual';
      if (!acc[schedule]) acc[schedule] = [];
      acc[schedule].push(source);
      return acc;
    }, {});
    
    for (const [schedule, sources] of Object.entries(scheduleGroups)) {
      console.log(`\n📅 ${schedule.toUpperCase()} (${(sources as any[]).length} sources):`);
      (sources as any[]).forEach(source => {
        const status = source.is_active ? '🟢' : '🔴';
        const config = source.config_status === 'configured' ? '⚙️' : '📝';
        console.log(`  ${status} ${config} ${source.name}`);
      });
    }
    
    console.log('\n🎉 Grant sources update completed!');
    console.log('\n💡 Legend:');
    console.log('  🟢 Active source  🔴 Inactive source');
    console.log('  ⚙️ Fully configured  📝 Basic configuration');
    
  } catch (error: any) {
    console.error('❌ Grant sources update failed:', error);
    process.exit(1);
  }
}

updateGrantSources();