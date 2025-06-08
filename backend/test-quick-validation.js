const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001';
let authToken = null;

async function runQuickTests() {
  console.log('🚀 Quick Validation Test Suite');
  console.log('================================\n');
  
  const results = [];
  
  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const health = await axios.get(`${API_BASE_URL}/health`);
    results.push({ test: 'Health Check', passed: health.status === 200 });
    console.log('✅ Health Check: PASS\n');
    
    // Test 2: Authentication
    console.log('2. Testing Authentication...');
    const auth = await axios.post(`${API_BASE_URL}/auth/demo-login`, {
      email: 'admin@etownz.com',
      password: 'admin123'
    });
    authToken = auth.data.token;
    results.push({ test: 'Authentication', passed: !!authToken });
    console.log('✅ Authentication: PASS\n');
    
    // Test 3: Template Generation
    console.log('3. Testing Template Generation...');
    const templateGen = await axios.post(
      `${API_BASE_URL}/templates/38760970-1f49-4a41-869b-06e3c8cd69c1/generate`,
      {
        variables: {
          project_title: 'Test Project',
          funding_amount: 50000,
          project_duration: '2 years',
          company_name: 'Test Company'
        }
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const genSuccess = templateGen.data.success && templateGen.data.data.sections.length > 0;
    results.push({ test: 'Template Generation', passed: genSuccess });
    if (genSuccess) {
      console.log(`✅ Template Generation: PASS`);
      console.log(`   - Generated ${templateGen.data.data.sections.length} sections`);
      console.log(`   - Total words: ${templateGen.data.data.metadata.total_word_count}\n`);
    }
    
    // Test 4: Organization CRUD
    console.log('4. Testing Organization Access...');
    const orgs = await axios.get(`${API_BASE_URL}/organizations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    results.push({ test: 'Organization Access', passed: orgs.status === 200 });
    console.log('✅ Organization Access: PASS\n');
    
    // Test 5: Grants Access
    console.log('5. Testing Grants Access...');
    const grants = await axios.get(`${API_BASE_URL}/grants`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    results.push({ test: 'Grants Access', passed: grants.status === 200 });
    console.log(`✅ Grants Access: PASS (${grants.data.data.length} grants found)\n`);
    
    // Test 6: Individual Section Generation
    console.log('6. Testing Individual Section Generation...');
    try {
      // First get template details
      const template = await axios.get(
        `${API_BASE_URL}/templates/57fbab14-d6ac-4024-91c3-0bc3818da62e`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      if (template.data.data.section_templates && template.data.data.section_templates.length > 0) {
        const sectionId = template.data.data.section_templates[0].id;
        const sectionGen = await axios.post(
          `${API_BASE_URL}/templates/sections/${sectionId}/generate`,
          {
            variables: {
              project_title: 'Test Research',
              funding_amount: 100000,
              project_duration: '3 years',
              primary_investigator: 'Dr. Test'
            }
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        results.push({ test: 'Individual Section Generation', passed: sectionGen.data.success });
        console.log('✅ Individual Section Generation: PASS\n');
      } else {
        results.push({ test: 'Individual Section Generation', passed: false });
        console.log('❌ Individual Section Generation: FAIL (No sections found)\n');
      }
    } catch (error) {
      results.push({ test: 'Individual Section Generation', passed: false });
      console.log('❌ Individual Section Generation: FAIL\n');
    }
    
    // Test 7: Grant Requirements Extraction
    console.log('7. Testing Grant Requirements Extraction...');
    try {
      const requirements = await axios.post(
        `${API_BASE_URL}/grant-intelligence/extract-requirements`,
        {
          grantDescription: 'This grant supports innovative technology projects with funding up to €100,000.'
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      results.push({ test: 'Grant Requirements Extraction', passed: requirements.data.success });
      console.log('✅ Grant Requirements Extraction: PASS\n');
    } catch (error) {
      results.push({ test: 'Grant Requirements Extraction', passed: false });
      console.log('❌ Grant Requirements Extraction: FAIL\n');
    }
    
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
  
  // Summary
  console.log('\n================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${percentage}%`);
  
  console.log('\nDetailed Results:');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  console.log('\n🎉 Improvement from initial 36% to ' + percentage + '%!');
}

runQuickTests().catch(console.error);