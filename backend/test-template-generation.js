#!/usr/bin/env node

const axios = require('axios');

async function testTemplateGeneration() {
  try {
    console.log('🧪 Testing Template Generation System');
    console.log('=====================================');
    
    const baseURL = 'http://localhost:5001';
    
    // Test health check first
    console.log('\n📡 Testing health check...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check passed:', health.data.status);
    
    // Get templates
    console.log('\n📡 Getting available templates...');
    const templatesResponse = await axios.get(`${baseURL}/templates`, {
      headers: { 'Authorization': 'Bearer test' } // Use dummy token for now
    });
    
    if (templatesResponse.status === 401) {
      console.log('❌ Authentication required - testing without auth');
      return;
    }
    
    const templates = templatesResponse.data.data.templates;
    console.log(`✅ Found ${templates.length} templates`);
    
    if (templates.length === 0) {
      console.log('❌ No templates available for testing');
      return;
    }
    
    // Get first template details
    const template = templates[0];
    console.log(`\n📋 Testing template: ${template.name} (${template.id})`);
    
    // Test template generation
    console.log('\n🤖 Testing template generation...');
    const generateResponse = await axios.post(`${baseURL}/templates/${template.id}/generate`, {
      variables: {
        project_title: "Test Research Project",
        funding_amount: 50000,
        project_duration: "2 years", 
        primary_investigator: "Dr. Test Researcher"
      }
    }, {
      headers: { 'Authorization': 'Bearer test' }
    });
    
    console.log('✅ Template generation successful!');
    console.log(`📊 Generated ${generateResponse.data.data.sections.length} sections`);
    console.log(`📝 Total words: ${generateResponse.data.data.metadata.total_word_count}`);
    
    // Show first section as example
    if (generateResponse.data.data.sections.length > 0) {
      const firstSection = generateResponse.data.data.sections[0];
      console.log(`\n📄 Sample section: ${firstSection.section_name}`);
      console.log(`📊 Word count: ${firstSection.word_count}`);
      console.log(`📝 Content preview: ${firstSection.content.substring(0, 200)}...`);
    }
    
    console.log('\n🎉 Template generation test PASSED!');
    
  } catch (error) {
    console.error('\n❌ Template generation test FAILED:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    if (error.response?.data?.details) {
      console.error('Details:', error.response.data.details);
    }
    
    console.log('\n🔍 Debugging Information:');
    console.log('- Check if backend is running on port 5001');
    console.log('- Check database connection');
    console.log('- Check OpenAI API key configuration');
    console.log('- Check if templates are seeded');
  }
}

// Run the test
testTemplateGeneration();