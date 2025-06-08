const OpenAI = require('openai');
require('dotenv').config();

async function testOpenAIDirect() {
  try {
    console.log('Testing OpenAI Client Directly');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const simple = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Write a short paragraph about innovation.' }],
      max_tokens: 100
    });
    console.log('✅ Simple prompt succeeded');
    console.log('Content:', simple.choices[0].message.content.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('❌ OpenAI direct test failed:', error.message);
    if (error.message.includes('ByteString')) {
      console.error('🔍 This is the same ByteString error we saw in the template service');
    }
  }
}

testOpenAIDirect();