#!/usr/bin/env node

/**
 * Test Google APIs connectivity and permissions
 * Run with: node scripts/test-google-apis.js
 */

require('dotenv').config();
const { google } = require('googleapis');

async function testGoogleAPIs() {
  console.log('🔧 Testing Google APIs connectivity...\n');

  // Test 1: Environment Variables
  console.log('1. Environment Variables:');
  console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_KEY: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log();

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('❌ Service account key not found. Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable.');
    return;
  }

  try {
    // Test 2: Service Account Authentication
    console.log('2. Service Account Authentication:');
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Client Email: ${serviceAccount.client_email}`);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    const authClient = await auth.getClient();
    console.log('   ✅ Service account authentication successful');
    console.log();

    // Test 3: Google Drive API
    console.log('3. Google Drive API:');
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    try {
      const driveResponse = await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)'
      });
      console.log('   ✅ Drive API accessible');
      console.log(`   Found ${driveResponse.data.files?.length || 0} files (limited to 1 for testing)`);
    } catch (error) {
      console.log('   ❌ Drive API error:', error.message);
      console.log('   💡 Check if Google Drive API is enabled in Google Cloud Console');
    }
    console.log();

    // Test 4: Google Docs API  
    console.log('4. Google Docs API:');
    const docs = google.docs({ version: 'v1', auth: authClient });
    
    try {
      // Try to create a test document
      const docResponse = await docs.documents.create({
        requestBody: {
          title: 'eTownz Grants API Test Document - ' + new Date().toISOString()
        }
      });
      
      const documentId = docResponse.data.documentId;
      console.log('   ✅ Docs API accessible');
      console.log(`   Created test document: ${documentId}`);
      
      // Clean up - delete the test document
      try {
        await drive.files.delete({ fileId: documentId });
        console.log('   ✅ Test document cleaned up');
      } catch (cleanupError) {
        console.log('   ⚠️  Could not delete test document:', cleanupError.message);
      }
    } catch (error) {
      console.log('   ❌ Docs API error:', error.message);
      console.log('   💡 Check if Google Docs API is enabled and service account has proper permissions');
    }
    console.log();

    // Test 5: OAuth2 Client Configuration
    console.log('5. OAuth2 Client Configuration:');
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      console.log('   ✅ OAuth2 client configured');
      console.log(`   Redirect URI: ${process.env.GOOGLE_REDIRECT_URI}`);
    } else {
      console.log('   ❌ OAuth2 client not configured');
    }
    console.log();

    console.log('🎉 Google APIs test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. If any tests failed, check the Google Cloud Console');
    console.log('   2. Ensure APIs are enabled: Drive API, Docs API');
    console.log('   3. Verify service account permissions (see scripts/setup-google-permissions.md)');
    console.log('   4. Test the export functionality in your application');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check that GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON');
    console.log('   2. Verify the service account exists in Google Cloud Console');
    console.log('   3. Ensure required APIs are enabled');
    console.log('   4. Check service account permissions');
  }
}

// Run the test
testGoogleAPIs().catch(console.error);