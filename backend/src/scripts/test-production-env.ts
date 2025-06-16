// Test production environment variables
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
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

async function testProductionEnvironment() {
  console.log('🧪 Testing Production Environment Variables...\n');
  
  // Core Variables
  console.log('🔧 Core Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || '❌ Missing'}`);
  console.log(`   PORT: ${process.env.PORT || '❌ Missing'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Present' : '❌ Missing'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Present' : '❌ Missing'}`);
  
  // AI/Automation Variables
  console.log('\n🤖 AI & Automation:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`   FIRECRAWL_API_KEY: ${process.env.FIRECRAWL_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`   PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`   ENABLE_AUTOMATION: ${process.env.ENABLE_AUTOMATION || '❌ Missing (defaults to true)'}`);
  
  // Email Configuration
  console.log('\n📧 Email Configuration:');
  console.log(`   ELASTIC_EMAIL_SMTP_HOST: ${process.env.ELASTIC_EMAIL_SMTP_HOST || '❌ Missing'}`);
  console.log(`   ELASTIC_EMAIL_SMTP_PORT: ${process.env.ELASTIC_EMAIL_SMTP_PORT || '❌ Missing'}`);
  console.log(`   ELASTIC_EMAIL_SMTP_USER: ${process.env.ELASTIC_EMAIL_SMTP_USER ? '✅ Present' : '❌ Missing'}`);
  console.log(`   ELASTIC_EMAIL_SMTP_PASS: ${process.env.ELASTIC_EMAIL_SMTP_PASS ? '✅ Present' : '❌ Missing'}`);
  console.log(`   ELASTIC_EMAIL_FROM_EMAIL: ${process.env.ELASTIC_EMAIL_FROM_EMAIL || '❌ Missing'}`);
  
  // Admin Configuration
  console.log('\n👨‍💼 Admin Configuration:');
  console.log(`   ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || '❌ Missing'}`);
  console.log(`   ADMIN_EMAIL_LIST: ${process.env.ADMIN_EMAIL_LIST || '❌ Missing'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Missing'}`);
  
  // Test Email Configuration
  console.log('\n📧 Testing Email Configuration...');
  try {
    const { emailNotificationService } = await import('../services/emailNotificationService');
    const emailWorking = await emailNotificationService.verifyEmailConfiguration();
    console.log(`   Email Config Status: ${emailWorking ? '✅ Working' : '❌ Failed'}`);
    
    if (emailWorking && process.env.ADMIN_EMAIL) {
      console.log('\n📮 Sending test email...');
      const testSent = await emailNotificationService.sendTestEmail(process.env.ADMIN_EMAIL);
      console.log(`   Test Email Sent: ${testSent ? '✅ Success' : '❌ Failed'}`);
    }
  } catch (error) {
    console.log(`   Email Test Error: ❌ ${(error as any).message}`);
  }
  
  // Test Database Connection
  console.log('\n🗄️ Testing Database Connection...');
  try {
    const { DatabaseService } = await import('../services/database');
    const db = DatabaseService.getInstance();
    await db.query('SELECT 1');
    console.log('   Database Connection: ✅ Working');
    
    // Test automation tables
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('grant_sources', 'job_queue', 'crawl_monitoring', 'crawl_alerts')
    `);
    
    console.log(`   Automation Tables: ${tablesResult.rows.length}/4 present`);
    tablesResult.rows.forEach(row => {
      console.log(`     ✅ ${row.table_name}`);
    });
    
  } catch (error) {
    console.log(`   Database Error: ❌ ${(error as any).message}`);
  }
  
  // Test Automation Pipeline
  console.log('\n🔄 Testing Automation Pipeline...');
  try {
    const { automationPipeline } = await import('../services/automationPipeline');
    const status = automationPipeline.getStatus();
    console.log(`   Pipeline Status: ${status.isRunning ? '✅ Running' : '❌ Stopped'}`);
    console.log(`   Active Jobs: ${status.activeJobs}`);
    
    if (!status.isRunning && process.env.NODE_ENV === 'production') {
      console.log('   🚀 Starting automation pipeline...');
      await automationPipeline.start();
      console.log('   ✅ Pipeline started successfully');
    }
  } catch (error) {
    console.log(`   Pipeline Error: ❌ ${(error as any).message}`);
  }
  
  // Summary
  console.log('\n📋 Environment Test Summary:');
  console.log('=' .repeat(50));
  
  const requiredVars = [
    'NODE_ENV', 'DATABASE_URL', 'OPENAI_API_KEY', 'ADMIN_EMAIL', 
    'ELASTIC_EMAIL_SMTP_USER', 'ELASTIC_EMAIL_SMTP_PASS'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    console.log('🎉 All required environment variables are set!');
    console.log('✅ Production environment is ready for automation');
  } else {
    console.log(`❌ Missing ${missingVars.length} required variables:`);
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }
  
  console.log('\n🔗 Next Steps:');
  console.log('1. Check the monitoring dashboard: https://grants.etownz.com/dashboard/automation/monitoring');
  console.log('2. Verify email alerts are working');
  console.log('3. Monitor grant source crawls');
  console.log('4. Check system logs for any issues');
}

testProductionEnvironment().catch(console.error);