#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🔍 Testing environment variable loading...');

// Test 1: Check .env file exists and content
const envPath = path.resolve(__dirname, '.env');
console.log(`📁 .env file path: ${envPath}`);
console.log(`📁 .env file exists: ${fs.existsSync(envPath)}`);

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const openaiLine = lines.find(line => line.startsWith('OPENAI_API_KEY='));
  console.log(`🔑 OpenAI line in .env: ${openaiLine?.substring(0, 30)}...`);
  
  if (openaiLine) {
    const keyValue = openaiLine.split('=')[1];
    console.log(`🔑 Raw key length: ${keyValue?.length}`);
    console.log(`🔑 Raw key start: ${keyValue?.substring(0, 20)}`);
  }
}

// Test 2: Try different dotenv loading methods
console.log('\n🧪 Testing dotenv loading methods...');

// Method 1: Default dotenv
delete process.env.OPENAI_API_KEY;
require('dotenv').config();
console.log(`Method 1 - Default: ${process.env.OPENAI_API_KEY?.length} chars, starts with: ${process.env.OPENAI_API_KEY?.substring(0, 10)}`);

// Method 2: Explicit path
delete process.env.OPENAI_API_KEY;
require('dotenv').config({ path: envPath });
console.log(`Method 2 - Explicit path: ${process.env.OPENAI_API_KEY?.length} chars, starts with: ${process.env.OPENAI_API_KEY?.substring(0, 10)}`);

// Method 3: Override
delete process.env.OPENAI_API_KEY;
require('dotenv').config({ path: envPath, override: true });
console.log(`Method 3 - Override: ${process.env.OPENAI_API_KEY?.length} chars, starts with: ${process.env.OPENAI_API_KEY?.substring(0, 10)}`);

// Test 3: Manual parsing
console.log('\n🔧 Manual .env parsing...');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const envVars = {};
  
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      envVars[key.trim()] = value;
    }
  });
  
  console.log(`Manual parsing - OPENAI_API_KEY: ${envVars.OPENAI_API_KEY?.length} chars, starts with: ${envVars.OPENAI_API_KEY?.substring(0, 10)}`);
}