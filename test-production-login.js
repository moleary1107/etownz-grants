#!/usr/bin/env node

const https = require('https');

// Test login credentials
const testUsers = [
  { email: 'admin1@demo.etownz.com', role: 'Admin' },
  { email: 'manager1@techcorp.demo', role: 'Manager' },
  { email: 'user1@startup.demo', role: 'User' },
  { email: 'viewer1@nonprofit.demo', role: 'Viewer' }
];

async function testLogin(email, password = 'Demo2025!') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });
    
    const options = {
      hostname: '165.227.149.136',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      rejectUnauthorized: false // Accept self-signed certificates
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ email, status: res.statusCode, success: res.statusCode === 200, data: result });
        } catch (error) {
          resolve({ email, status: res.statusCode, success: false, error: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ email, status: 0, success: false, error: error.message });
    });
    
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Testing Production Login at https://165.227.149.136');
  console.log('========================================\n');
  
  for (const user of testUsers) {
    console.log(`Testing ${user.role}: ${user.email}`);
    const result = await testLogin(user.email);
    
    if (result.success) {
      console.log(`✅ SUCCESS - Status: ${result.status}`);
      console.log(`   Token: ${result.data.token ? result.data.token.substring(0, 20) + '...' : 'No token'}`);
      console.log(`   User: ${result.data.user?.name || 'Unknown'} (${result.data.user?.role || 'Unknown role'})`);
    } else {
      console.log(`❌ FAILED - Status: ${result.status}`);
      console.log(`   Error: ${result.error || JSON.stringify(result.data)}`);
    }
    console.log('');
  }
  
  console.log('\nTesting complete!');
}

main().catch(console.error);