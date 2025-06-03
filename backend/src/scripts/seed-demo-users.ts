import { DatabaseService } from '../services/database';
import { logger } from '../services/logger';
import * as fs from 'fs';
import * as path from 'path';

export async function seedDemoUsers(): Promise<void> {
  logger.info('Starting demo users seeding...');
  
  const db = DatabaseService.getInstance();
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '011_demo_users_seed.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    logger.info('Executing demo users migration...');
    
    // Execute migration in a transaction
    await db.transaction(async (client) => {
      await client.query(migrationSQL);
    });
    
    logger.info('Demo users seeded successfully');
    
    // Verify by checking if admin user exists
    const result = await db.query('SELECT email, first_name, last_name, role FROM users WHERE email = $1', ['admin@etownz.com']);
    if (result.rows.length > 0) {
      logger.info('Demo user verification successful', { user: result.rows[0] });
    } else {
      logger.warn('Could not find demo admin user after seeding');
    }
    
  } catch (error) {
    logger.error('Failed to seed demo users', { error });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoUsers()
    .then(() => {
      logger.info('Demo user seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Demo user seeding failed', { error });
      process.exit(1);
    });
}