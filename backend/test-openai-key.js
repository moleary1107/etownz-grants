#!/usr/bin/env node

const axios = require('axios');

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key-placeholder';

async function testOpenAIKey() {
  console.log('🔑 Testing OpenAI API Key...');
  console.log(`Key format: ${OPENAI_API_KEY.substring(0, 20)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 10)}`);
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "Hello World" if this API key is working.' }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ OpenAI API Key is working!');
    console.log(`Response: ${response.data.choices[0].message.content}`);
    console.log(`Model used: ${response.data.model}`);
    console.log(`Usage: ${response.data.usage.total_tokens} tokens`);
    
    return true;
  } catch (error) {
    console.error('❌ OpenAI API Key test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        console.error('🔐 API key is invalid or expired');
      } else if (error.response.status === 429) {
        console.error('⏰ Rate limit exceeded or quota reached');
      } else if (error.response.status === 403) {
        console.error('🚫 Access forbidden - check billing and usage limits');
      }
    } else {
      console.error(error.message);
    }
    
    return false;
  }
}

testOpenAIKey();