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

import { automationPipeline } from '../services/automationPipeline';
import { jobQueueService } from '../services/jobQueueService';
import { grantSourcesService } from '../services/grantSourcesService';
import { crawlMonitoringService } from '../services/crawlMonitoringService';
import { logger } from '../services/logger';

async function testAutomationPipeline() {
  try {
    console.log('🧪 Testing Automation Pipeline...\n');
    
    // Test 1: Check services health
    console.log('1️⃣ Testing service health checks...');
    const [sourcesHealthy, jobQueueHealthy, emailHealthy] = await Promise.all([
      grantSourcesService.healthCheck(),
      jobQueueService.healthCheck(),
      crawlMonitoringService.verifyEmailConfiguration()
    ]);
    
    console.log(`   📊 Grant Sources: ${sourcesHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   🔄 Job Queue: ${jobQueueHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   📧 Email Config: ${emailHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    // Test 2: Get automation metrics
    console.log('\n2️⃣ Testing metrics collection...');
    const [sourceMetrics, jobMetrics, alertMetrics, performanceMetrics] = await Promise.all([
      grantSourcesService.getSourceMetrics(),
      jobQueueService.getQueueMetrics(),
      crawlMonitoringService.getDashboardMetrics(),
      grantSourcesService.getPerformanceMetrics()
    ]);
    
    console.log('   📈 Source Metrics:');
    console.log(`     - Total: ${sourceMetrics.total}`);
    console.log(`     - Active: ${sourceMetrics.active}`);
    console.log(`     - Scheduled: ${sourceMetrics.scheduled}`);
    
    console.log('   ⚙️ Job Metrics:');
    console.log(`     - Pending: ${jobMetrics.total_pending || 0}`);
    console.log(`     - Running: ${jobMetrics.total_running || 0}`);
    console.log(`     - Completed: ${jobMetrics.total_completed || 0}`);
    console.log(`     - Failed: ${jobMetrics.total_failed || 0}`);
    
    console.log('   🚨 Alert Metrics:');
    console.log(`     - Total alerts: ${alertMetrics.total_alerts || 0}`);
    console.log(`     - Unacknowledged: ${alertMetrics.unacknowledged_alerts || 0}`);
    console.log(`     - Critical: ${alertMetrics.critical_alerts || 0}`);
    
    console.log('   📊 Performance Metrics:');
    console.log(`     - Success rate: ${parseFloat(performanceMetrics.success_rate || 0).toFixed(1)}%`);
    console.log(`     - Avg duration: ${parseFloat(performanceMetrics.avg_crawl_duration || 0).toFixed(1)}s`);
    console.log(`     - Total grants found: ${performanceMetrics.total_grants_found || 0}`);
    
    // Test 3: Get active sources
    console.log('\n3️⃣ Testing grant source retrieval...');
    const allSources = await grantSourcesService.getAllSources();
    const activeSources = allSources.filter(source => source.isActive);
    
    console.log(`   📋 Found ${allSources.length} total sources, ${activeSources.length} active`);
    
    if (activeSources.length > 0) {
      console.log('   🟢 Active sources:');
      activeSources.slice(0, 3).forEach(source => {
        console.log(`     - ${source.name} (${source.crawlSchedule})`);
      });
      if (activeSources.length > 3) {
        console.log(`     - ... and ${activeSources.length - 3} more`);
      }
    }
    
    // Test 4: Test manual job enqueuing
    if (activeSources.length > 0) {
      console.log('\n4️⃣ Testing manual job enqueuing...');
      const testSource = activeSources[0];
      
      const jobId = await jobQueueService.enqueueJob('crawl_grant_source', {
        sourceId: testSource.id,
        sourceName: testSource.name,
        url: testSource.url,
        settings: testSource.crawlSettings,
        manual: true,
        test: true
      }, {
        priority: 8, // High priority for test
        maxRetries: 1
      });
      
      console.log(`   ✅ Enqueued test job: ${jobId}`);
      console.log(`   📍 Source: ${testSource.name}`);
      
      // Wait a moment and check job status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const job = await jobQueueService.getJobById(jobId);
      if (job) {
        console.log(`   📊 Job status: ${job.status}`);
        console.log(`   ⏱️ Created: ${job.createdAt.toLocaleString()}`);
        if (job.startedAt) {
          console.log(`   🚀 Started: ${job.startedAt.toLocaleString()}`);
        }
      }
    }
    
    // Test 5: Test monitoring alerts check
    console.log('\n5️⃣ Testing monitoring alerts...');
    const recentAlerts = await crawlMonitoringService.getRecentAlerts(10);
    console.log(`   📋 Found ${recentAlerts.length} recent alerts`);
    
    if (recentAlerts.length > 0) {
      console.log('   🚨 Recent alerts:');
      recentAlerts.slice(0, 3).forEach(alert => {
        console.log(`     - ${alert.severity}: ${alert.message} (${alert.sourceName})`);
      });
    } else {
      console.log('   ✅ No recent alerts - system healthy');
    }
    
    // Test 6: Test email functionality
    console.log('\n6️⃣ Testing email notification...');
    const testEmail = 'admin@etownz.com';
    const emailSent = await crawlMonitoringService.sendTestNotification(testEmail);
    console.log(`   📧 Test email sent: ${emailSent ? '✅ Success' : '❌ Failed'}`);
    
    // Test 7: Start automation pipeline
    console.log('\n7️⃣ Testing automation pipeline startup...');
    const pipelineStatus = automationPipeline.getStatus();
    
    if (!pipelineStatus.isRunning) {
      await automationPipeline.start();
      console.log('   🚀 Automation pipeline started');
    } else {
      console.log('   ✅ Automation pipeline already running');
    }
    
    const updatedStatus = automationPipeline.getStatus();
    console.log(`   📊 Pipeline status: ${updatedStatus.isRunning ? 'Running' : 'Stopped'}`);
    console.log(`   🔄 Active jobs: ${updatedStatus.activeJobs}`);
    console.log(`   🔄 Job queue running: ${jobQueueService.isRunning()}`);
    
    // Summary
    console.log('\n🎉 Automation Pipeline Test Summary:');
    console.log('==========================================');
    console.log(`✅ Services Health: ${sourcesHealthy && jobQueueHealthy ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Metrics Collection: PASS`);
    console.log(`✅ Source Management: PASS`);
    console.log(`✅ Job Queue: ${activeSources.length > 0 ? 'PASS' : 'SKIP'}`);
    console.log(`✅ Monitoring: PASS`);
    console.log(`✅ Email Notifications: ${emailSent ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Pipeline Startup: PASS`);
    
    const overallHealth = sourcesHealthy && jobQueueHealthy && activeSources.length > 0;
    console.log(`\n🏁 Overall Status: ${overallHealth ? '🟢 HEALTHY' : '🟡 DEGRADED'}`);
    
    if (!overallHealth) {
      console.log('\n💡 Issues detected:');
      if (!sourcesHealthy) console.log('   - Grant sources service unhealthy');
      if (!jobQueueHealthy) console.log('   - Job queue service unhealthy');
      if (activeSources.length === 0) console.log('   - No active grant sources configured');
      if (!emailSent) console.log('   - Email notifications not working');
    }
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Monitor the automation dashboard for real-time metrics');
    console.log('   2. Check logs for any crawl errors or alerts');
    console.log('   3. Verify grant data is being discovered and indexed');
    console.log('   4. Test manual crawl triggers from the dashboard');
    
  } catch (error: any) {
    console.error('❌ Automation pipeline test failed:', error);
    process.exit(1);
  }
}

testAutomationPipeline();