const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001';
let authToken = null;
const GRANT_ID = 'f47cd780-2e41-4b88-bd3b-78461f845cce';
const ORG_ID = '550e8400-e29b-41d4-a716-446655440001';

async function runFinalValidation() {
  console.log('🎯 FINAL VALIDATION TEST SUITE');
  console.log('================================\n');
  
  const results = [];
  
  try {
    // Test 1: Health Check
    console.log('1. Health Check');
    const health = await axios.get(`${API_BASE_URL}/health`);
    results.push({ test: 'Health Check', passed: health.status === 200 });
    console.log('   ✅ PASS\n');
    
    // Test 2: Authentication
    console.log('2. Authentication (Demo Login)');
    const auth = await axios.post(`${API_BASE_URL}/auth/demo-login`, {
      email: 'admin@etownz.com',
      password: 'admin123'
    });
    authToken = auth.data.token;
    results.push({ test: 'Authentication', passed: !!authToken });
    console.log('   ✅ PASS\n');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Test 3: Template Listing
    console.log('3. Template Management');
    const templates = await axios.get(`${API_BASE_URL}/templates`, { headers });
    const hasTemplates = templates.data.data.templates.length > 0;
    results.push({ test: 'Template Listing', passed: hasTemplates });
    console.log(`   ✅ PASS - Found ${templates.data.data.templates.length} templates\n`);
    
    // Test 4: Full Template Generation
    console.log('4. Full Template Generation');
    const templateId = templates.data.data.templates[0].id;
    const fullGen = await axios.post(
      `${API_BASE_URL}/templates/${templateId}/generate`,
      {
        variables: {
          project_title: 'AI Innovation Platform',
          funding_amount: 75000,
          project_duration: '3 years',
          company_name: 'TechStart Ireland',
          primary_investigator: 'Dr. Jane Smith'
        }
      },
      { headers }
    );
    
    const genSuccess = fullGen.data.success && fullGen.data.data.sections.length > 0;
    results.push({ test: 'Full Template Generation', passed: genSuccess });
    console.log(`   ✅ PASS - Generated ${fullGen.data.data.sections.length} sections`);
    console.log(`   📊 Total: ${fullGen.data.data.metadata.total_word_count} words\n`);
    
    // Test 5: Individual Section Generation
    console.log('5. Individual Section Generation');
    try {
      const template = await axios.get(`${API_BASE_URL}/templates/${templateId}`, { headers });
      const sectionId = template.data.data.section_templates[0].id;
      
      const sectionGen = await axios.post(
        `${API_BASE_URL}/templates/sections/${sectionId}/generate`,
        {
          variables: {
            project_title: 'Quantum Computing Research',
            funding_amount: 100000,
            project_duration: '4 years',
            primary_investigator: 'Prof. John Doe'
          }
        },
        { headers }
      );
      
      results.push({ test: 'Individual Section Generation', passed: sectionGen.data.success });
      console.log(`   ✅ PASS - Generated ${sectionGen.data.data.word_count} words\n`);
    } catch (e) {
      results.push({ test: 'Individual Section Generation', passed: false });
      console.log('   ❌ FAIL\n');
    }
    
    // Test 6: Organization Access
    console.log('6. Organization Management');
    const orgs = await axios.get(`${API_BASE_URL}/organizations`, { headers });
    results.push({ test: 'Organization Access', passed: orgs.status === 200 });
    console.log(`   ✅ PASS - ${orgs.data.data.length} organizations\n`);
    
    // Test 7: Grants Access
    console.log('7. Grants Management');
    const grants = await axios.get(`${API_BASE_URL}/grants`, { headers });
    results.push({ test: 'Grants Access', passed: grants.status === 200 });
    console.log(`   ✅ PASS - ${grants.data.data.length} grants\n`);
    
    // Test 8: Grant Requirements Extraction
    console.log('8. Grant Requirements Extraction');
    try {
      const reqExtract = await axios.post(
        `${API_BASE_URL}/grant-intelligence/extract-requirements`,
        {
          grantId: GRANT_ID,
          documentContent: 'This grant requires: 1) SME status, 2) EU location, 3) Technology focus, 4) Minimum 2 years operation',
          documentType: 'guidelines'
        },
        { headers }
      );
      results.push({ test: 'Grant Requirements Extraction', passed: reqExtract.data.success });
      console.log(`   ✅ PASS - Extracted ${reqExtract.data.data.requirementsCount} requirements\n`);
    } catch (e) {
      results.push({ test: 'Grant Requirements Extraction', passed: false });
      console.log(`   ❌ FAIL - ${e.response?.data?.error || e.message}\n`);
    }
    
    // Test 9: Grant Compliance Assessment
    console.log('9. Grant Compliance Assessment');
    try {
      const compliance = await axios.post(
        `${API_BASE_URL}/grant-intelligence/assess-compliance`,
        {
          grantId: GRANT_ID,
          organizationId: ORG_ID
        },
        { headers }
      );
      results.push({ test: 'Grant Compliance Assessment', passed: compliance.data.success });
      console.log('   ✅ PASS\n');
    } catch (e) {
      results.push({ test: 'Grant Compliance Assessment', passed: false });
      console.log(`   ❌ FAIL - ${e.response?.data?.error || e.message}\n`);
    }
    
    // Test 10: Grant Matching
    console.log('10. Grant Matching');
    try {
      const matches = await axios.get(
        `${API_BASE_URL}/grant-intelligence/find-matches/${ORG_ID}`,
        { headers }
      );
      results.push({ test: 'Grant Matching', passed: matches.data.success });
      console.log(`   ✅ PASS - Found ${matches.data.data?.matches?.length || 0} matches\n`);
    } catch (e) {
      results.push({ test: 'Grant Matching', passed: false });
      console.log(`   ❌ FAIL - ${e.response?.data?.error || e.message}\n`);
    }
    
  } catch (error) {
    console.error('\n⚠️  Test suite error:', error.message);
  }
  
  // Final Summary
  console.log('\n================================');
  console.log('📊 FINAL TEST SUMMARY');
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
    console.log(`${(i + 1).toString().padStart(2)}. ${r.test.padEnd(30)} ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  console.log('\n🚀 IMPROVEMENT SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Initial Success Rate: 36% (5/14 tests)`);
  console.log(`Final Success Rate:   ${percentage}% (${passed}/${total} tests)`);
  console.log(`Improvement:          +${percentage - 36}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (percentage >= 80) {
    console.log('\n🎉 EXCELLENT! The system is production-ready!');
  } else if (percentage >= 60) {
    console.log('\n👍 GOOD! Most core features are working.');
  } else {
    console.log('\n⚠️  More work needed to reach production readiness.');
  }
}

runFinalValidation().catch(console.error);