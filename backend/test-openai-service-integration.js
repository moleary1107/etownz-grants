#!/usr/bin/env node

// Test the OpenAI service integration directly
const axios = require('axios');

const API_BASE = 'http://localhost:8000';

async function testOpenAIServiceIntegration() {
  console.log('🧪 Testing OpenAI Service Integration...');
  
  try {
    // Get auth token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@etownz.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful');
    
    // Test a simpler AI endpoint first (if available)
    console.log('🤖 Testing AI service directly...');
    
    // Let's try to find a working AI endpoint
    try {
      const aiHealthResponse = await axios.get(`${API_BASE}/ai/health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ AI service health check:', aiHealthResponse.data);
    } catch (error) {
      console.log('⚠️  AI health endpoint not available or failed');
    }
    
    // Test the specific grant intelligence extraction with minimal data
    console.log('🔬 Testing minimal grant requirement extraction...');
    
    const testPayload = {
      grantId: '550e8400-e29b-41d4-a716-446655440000',
      documentContent: 'Eligibility: Must be EU company with 2+ years experience.',
      documentType: 'call_document'
    };
    
    try {
      const response = await axios.post(
        `${API_BASE}/grant-intelligence/extract-requirements`,
        testPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('✅ Grant requirement extraction successful!');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ Grant requirement extraction failed:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.code === 'ECONNABORTED') {
        console.error('⏰ Request timed out (30s)');
      } else {
        console.error(`Error: ${error.message}`);
      }
      
      // Let's also check if there are any backend logs available
      console.log('\n🔍 Checking for recent backend errors...');
      try {
        const logsResponse = await axios.get(`${API_BASE}/debug/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('📝 Recent logs:', logsResponse.data);
      } catch (logError) {
        console.log('⚠️  Could not retrieve backend logs');
      }
    }
    
  } catch (authError) {
    console.error('❌ Authentication failed:', authError.message);
  }
}

testOpenAIServiceIntegration();