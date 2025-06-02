#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

console.log('🔧 Testing Production API Connections...\n');

// Test environment variables
console.log('📊 Environment Variables:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('- PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('- FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing');

async function testConnections() {
  const results = {
    openai: false,
    pinecone: false,
    firecrawl: false,
    database: false
  };

  // Test OpenAI
  try {
    console.log('\n🤖 Testing OpenAI Connection...');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Test with a simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Test connection. Reply with just "OK".' }],
      max_tokens: 5
    });
    
    if (response.choices && response.choices[0]) {
      console.log('✅ OpenAI: Connected successfully');
      results.openai = true;
    }
  } catch (error) {
    console.log('❌ OpenAI: Connection failed -', error.message);
  }

  // Test Pinecone
  try {
    console.log('\n🌲 Testing Pinecone Connection...');
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    
    // Test by listing indexes
    const indexes = await pinecone.listIndexes();
    console.log('✅ Pinecone: Connected successfully');
    console.log(`   Found ${indexes.indexes?.length || 0} indexes`);
    results.pinecone = true;
  } catch (error) {
    console.log('❌ Pinecone: Connection failed -', error.message);
  }

  // Test Firecrawl
  try {
    console.log('\n🔥 Testing Firecrawl Connection...');
    const FirecrawlApp = require('@mendable/firecrawl-js').default;
    const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    
    // Test with a simple scrape
    const response = await firecrawl.scrapeUrl('https://example.com', {
      formats: ['markdown'],
      timeout: 5000
    });
    
    if (response && response.success) {
      console.log('✅ Firecrawl: Connected successfully');
      results.firecrawl = true;
    }
  } catch (error) {
    console.log('❌ Firecrawl: Connection failed -', error.message);
  }

  // Test Database
  try {
    console.log('\n🗄️  Testing Database Connection...');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const result = await pool.query('SELECT NOW() as timestamp');
    if (result.rows && result.rows[0]) {
      console.log('✅ Database: Connected successfully');
      console.log(`   Server time: ${result.rows[0].timestamp}`);
      results.database = true;
    }
    
    await pool.end();
  } catch (error) {
    console.log('❌ Database: Connection failed -', error.message);
  }

  // Summary
  console.log('\n📊 Connection Test Summary:');
  console.log('================================');
  const total = Object.keys(results).length;
  const successful = Object.values(results).filter(Boolean).length;
  
  Object.entries(results).forEach(([service, connected]) => {
    const status = connected ? '✅' : '❌';
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
    console.log(`${status} ${serviceName}`);
  });
  
  console.log('================================');
  console.log(`✅ ${successful}/${total} services connected successfully`);
  
  if (successful === total) {
    console.log('🎉 All production connections are working!');
    process.exit(0);
  } else {
    console.log('⚠️  Some connections failed. Check the errors above.');
    process.exit(1);
  }
}

testConnections().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});