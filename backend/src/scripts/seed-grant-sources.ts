import { db } from '../services/database';

const defaultSources = [
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

async function seedGrantSources() {
  try {
    console.log('🌱 Seeding grant sources...');

    for (const source of defaultSources) {
      try {
        await db.query(`
          INSERT INTO grant_sources (
            name, url, description, category, location, 
            crawl_settings, crawl_schedule, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (url) DO NOTHING
        `, [
          source.name,
          source.url,
          source.description,
          source.category,
          source.location,
          JSON.stringify(source.crawlSettings),
          source.crawlSchedule,
          true
        ]);

        console.log(`✅ Added: ${source.name}`);
      } catch (error) {
        console.log(`⚠️ Skipped ${source.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('🎉 Grant sources seeding completed');
  } catch (error) {
    console.error('❌ Failed to seed grant sources:', error);
    process.exit(1);
  } finally {
    // Connection will be closed by process exit
  }
}

seedGrantSources();