const OpenAI = require('openai');

async function testOpenAIDirect() {
  try {
    console.log('🧪 Testing OpenAI Client Directly');
    console.log('==================================');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Test 1: Simple ASCII-only prompt
    console.log('\n1. Testing simple ASCII prompt...');
    const simple = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Write a short paragraph about innovation.' }],
      max_tokens: 100
    });
    console.log('✅ Simple prompt succeeded');
    console.log('Content:', simple.choices[0].message.content.substring(0, 100) + '...');
    
    console.log('\n🎉 Direct OpenAI test passed\!');
    
  } catch (error) {
    console.error('❌ OpenAI direct test failed:', error.message);
    if (error.message.includes('ByteString')) {
      console.error('🔍 This is the same ByteString error we saw in the template service');
    }
  }
}

// Load environment
require('dotenv').config();

// Run test
testOpenAIDirect();
EOF < /dev/null