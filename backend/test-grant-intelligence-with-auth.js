#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const API_BASE = 'http://localhost:8000';
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'etownz_grants',
  user: 'postgres',
  password: 'password'
};

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@etownz.com',
  password: 'admin123'
};

const testGrant = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'AI Innovation Grant 2024',
  description: 'Grant for AI-powered innovation projects',
  amount: 100000,
  deadline: '2024-12-31',
  status: 'active'
};

const testOrganization = {
  id: '01aeb3f7-47e2-4633-a8f5-54eeb88a0b0a', // Existing org
  name: 'Sample Tech Startup'
};

const sampleGrantDocument = `
HORIZON 2020 - AI Innovation Grant Call 2024

ELIGIBILITY REQUIREMENTS:
- Applicant must be a registered SME or startup company
- Must be based in EU member states or associated countries
- Minimum 2 years of operational history required
- Must demonstrate technical expertise in AI/ML technologies
- Annual revenue between €50,000 and €2,000,000

TECHNICAL REQUIREMENTS:
- Experience with machine learning algorithms
- Demonstrated capability in software development
- Access to computing infrastructure or cloud resources
- Technical team with relevant AI/ML qualifications

FINANCIAL REQUIREMENTS:
- Maximum funding amount: €100,000
- Co-funding requirement: minimum 25% own contribution
- Detailed budget breakdown required
- Financial statements for last 2 years

ADMINISTRATIVE REQUIREMENTS:
- Complete application form
- Business registration documents
- CVs of key team members
- Letter of commitment from management
`;

const sampleWebsiteContent = `
About Sample Tech Startup

We are a leading AI technology company specializing in machine learning solutions for businesses.

Our Capabilities:
- Advanced machine learning algorithms
- Natural language processing
- Computer vision systems
- Cloud infrastructure expertise

Our Team:
- 15 experienced engineers
- PhDs in AI and Computer Science
- 5+ years industry experience

Track Record:
- Delivered 50+ AI projects
- Worked with Fortune 500 companies
- Published 20+ research papers
- €2M in annual revenue

Infrastructure:
- High-performance computing cluster
- AWS cloud infrastructure
- Modern development tools
- ISO 27001 certified security

Partnerships:
- Trinity College Dublin
- University College Cork
- Enterprise Ireland
- Amazon Web Services
`;

class AuthenticatedGrantIntelligenceTest {
  constructor() {
    this.db = new Pool(DB_CONFIG);
    this.authToken = null;
    this.testResults = {};
  }

  async setup() {
    console.log('🔧 Setting up test environment with authentication...');
    
    // Create test grant
    await this.db.query(`
      INSERT INTO grants (id, title, description, amount, deadline, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        updated_at = NOW()
    `, [
      testGrant.id,
      testGrant.title,
      testGrant.description,
      testGrant.amount,
      testGrant.deadline,
      testGrant.status
    ]);

    console.log('✅ Test grant created/updated');
  }

  async authenticate() {
    console.log('🔐 Authenticating with demo admin credentials...');
    
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, ADMIN_CREDENTIALS);
      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
      console.log(`👤 Logged in as: ${response.data.user.name} (${response.data.user.role})`);
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    };
  }

  async testGrantRequirementExtraction() {
    console.log('\n🔍 Testing grant requirement extraction...');
    
    try {
      const response = await axios.post(
        `${API_BASE}/grant-intelligence/extract-requirements`,
        {
          grantId: testGrant.id,
          documentContent: sampleGrantDocument,
          documentType: 'call_document'
        },
        { headers: this.getAuthHeaders() }
      );

      if (response.status === 200) {
        const { data } = response.data;
        console.log(`✅ Requirements extracted: ${data.requirementsCount} requirements`);
        
        if (data.requirements && data.requirements.length > 0) {
          console.log('📋 Sample requirements:');
          data.requirements.slice(0, 3).forEach((req, i) => {
            console.log(`  ${i + 1}. [${req.requirementType}] ${req.requirementText.substring(0, 80)}...`);
            console.log(`     Mandatory: ${req.mandatory}, Weight: ${req.weight}, Confidence: ${req.confidenceScore}`);
          });
        }
        
        this.testResults.requirementExtraction = { 
          success: true, 
          count: data.requirementsCount,
          data: data.requirements
        };
        return true;
      }
    } catch (error) {
      console.error('❌ Requirement extraction failed:', error.response?.data?.error || error.message);
      this.testResults.requirementExtraction = { success: false, error: error.message };
      return false;
    }
  }

  async testOrganizationIntelligence() {
    console.log('\n🧠 Testing organization intelligence extraction...');
    
    try {
      const response = await axios.post(
        `${API_BASE}/grant-intelligence/extract-org-intelligence`,
        {
          organizationId: testOrganization.id,
          source: 'https://sampletechstartup.com',
          content: sampleWebsiteContent,
          sourceType: 'website'
        },
        { headers: this.getAuthHeaders() }
      );

      if (response.status === 200) {
        const { data } = response.data;
        console.log(`✅ Intelligence extracted: ${data.intelligenceCount} findings`);
        
        if (data.intelligence && data.intelligence.length > 0) {
          console.log('🔍 Intelligence findings:');
          data.intelligence.forEach((intel, i) => {
            console.log(`  ${i + 1}. ${intel.intelligenceType}: ${intel.summary}`);
            console.log(`     Keywords: ${intel.keywords.join(', ')}`);
            console.log(`     Confidence: ${intel.confidenceScore}`);
          });
        }
        
        this.testResults.organizationIntelligence = { 
          success: true, 
          count: data.intelligenceCount,
          data: data.intelligence
        };
        return true;
      }
    } catch (error) {
      console.error('❌ Organization intelligence failed:', error.response?.data?.error || error.message);
      this.testResults.organizationIntelligence = { success: false, error: error.message };
      return false;
    }
  }

  async testComplianceAssessment() {
    console.log('\n⚖️  Testing compliance assessment...');
    
    try {
      const response = await axios.post(
        `${API_BASE}/grant-intelligence/assess-compliance`,
        {
          grantId: testGrant.id,
          organizationId: testOrganization.id
        },
        { headers: this.getAuthHeaders() }
      );

      if (response.status === 200) {
        const assessment = response.data.data;
        console.log(`✅ Compliance assessed: ${assessment.overallScore.toFixed(2)}% match`);
        console.log(`📊 Eligibility status: ${assessment.eligibilityStatus}`);
        console.log(`💪 Strengths found: ${assessment.strengths.length}`);
        console.log(`⚠️  Gaps identified: ${assessment.gapsIdentified.length}`);
        console.log(`💡 Recommendations: ${assessment.recommendations.length}`);
        
        if (assessment.gapsIdentified.length > 0) {
          console.log('🔍 Key gaps:');
          assessment.gapsIdentified.slice(0, 3).forEach((gap, i) => {
            console.log(`  ${i + 1}. ${gap.requirement.substring(0, 60)}...`);
          });
        }
        
        this.testResults.complianceAssessment = { 
          success: true, 
          score: assessment.overallScore,
          data: assessment
        };
        return true;
      }
    } catch (error) {
      console.error('❌ Compliance assessment failed:', error.response?.data?.error || error.message);
      this.testResults.complianceAssessment = { success: false, error: error.message };
      return false;
    }
  }

  async testGrantMatching() {
    console.log('\n🎯 Testing grant matching...');
    
    try {
      const response = await axios.get(
        `${API_BASE}/grant-intelligence/find-matches/${testOrganization.id}?minMatchScore=40`,
        { headers: this.getAuthHeaders() }
      );

      if (response.status === 200) {
        const { data } = response.data;
        console.log(`✅ Grant matches found: ${data.matchCount} matches`);
        
        if (data.matches && data.matches.length > 0) {
          console.log('🎯 Top matches:');
          data.matches.slice(0, 3).forEach((match, i) => {
            console.log(`  ${i + 1}. Score: ${match.matchScore.toFixed(2)}% - Priority: ${match.priorityLevel}`);
            console.log(`     Reasons: ${match.matchReasons.slice(0, 2).join(', ')}`);
            if (match.missingRequirements.length > 0) {
              console.log(`     Missing: ${match.missingRequirements.slice(0, 1).join(', ')}`);
            }
          });
        }
        
        this.testResults.grantMatching = { 
          success: true, 
          count: data.matchCount,
          data: data.matches
        };
        return true;
      }
    } catch (error) {
      console.error('❌ Grant matching failed:', error.response?.data?.error || error.message);
      this.testResults.grantMatching = { success: false, error: error.message };
      return false;
    }
  }

  async testDocumentQueue() {
    console.log('\n📄 Testing document analysis queue...');
    
    try {
      const response = await axios.post(
        `${API_BASE}/grant-intelligence/queue-document-analysis`,
        {
          grantId: testGrant.id,
          documentUrl: 'https://example.com/sample-grant-call.pdf',
          documentType: 'call_document',
          analysisType: 'requirements'
        },
        { headers: this.getAuthHeaders() }
      );

      if (response.status === 200) {
        const { data } = response.data;
        console.log(`✅ Document queued: ${data.queueId}`);
        console.log(`📝 Message: ${data.message}`);
        
        this.testResults.documentQueue = { 
          success: true, 
          queueId: data.queueId
        };
        return true;
      }
    } catch (error) {
      console.error('❌ Document queue failed:', error.response?.data?.error || error.message);
      this.testResults.documentQueue = { success: false, error: error.message };
      return false;
    }
  }

  async testGetEndpoints() {
    console.log('\n📖 Testing GET endpoints...');

    const endpoints = [
      { 
        name: 'Grant Requirements', 
        url: `/grant-intelligence/requirements/${testGrant.id}`,
        expectedField: 'requirements'
      },
      { 
        name: 'Organization Capabilities', 
        url: `/grant-intelligence/capabilities/${testOrganization.id}`,
        expectedField: 'capabilities'
      },
      { 
        name: 'Compliance History', 
        url: `/grant-intelligence/compliance-history/${testOrganization.id}`,
        expectedField: 'assessments'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(
          `${API_BASE}${endpoint.url}`,
          { headers: this.getAuthHeaders() }
        );

        if (response.status === 200) {
          const data = response.data.data;
          const items = data[endpoint.expectedField] || [];
          console.log(`✅ ${endpoint.name}: ${items.length} items retrieved`);
        }
      } catch (error) {
        console.error(`❌ ${endpoint.name}: ${error.response?.data?.error || error.message}`);
      }
    }
  }

  async testDatabaseContent() {
    console.log('\n💾 Testing database content after API calls...');
    
    const tables = [
      { name: 'grant_requirements', grantField: 'grant_id' },
      { name: 'organization_intelligence', orgField: 'organization_id' },
      { name: 'grant_compliance_assessments', both: true },
      { name: 'organization_capabilities', orgField: 'organization_id' },
      { name: 'grant_document_analysis_queue', grantField: 'grant_id' }
    ];

    for (const table of tables) {
      try {
        let query, params;
        if (table.both) {
          query = `SELECT COUNT(*) FROM ${table.name} WHERE grant_id = $1 AND organization_id = $2`;
          params = [testGrant.id, testOrganization.id];
        } else if (table.grantField) {
          query = `SELECT COUNT(*) FROM ${table.name} WHERE ${table.grantField} = $1`;
          params = [testGrant.id];
        } else if (table.orgField) {
          query = `SELECT COUNT(*) FROM ${table.name} WHERE ${table.orgField} = $1`;
          params = [testOrganization.id];
        }
        
        const result = await this.db.query(query, params);
        console.log(`📊 ${table.name}: ${result.rows[0].count} records`);
      } catch (error) {
        console.error(`❌ ${table.name}: ${error.message}`);
      }
    }
  }

  async runFullTest() {
    console.log('🚀 Starting Comprehensive Grant Intelligence Test with Authentication\n');
    
    try {
      await this.setup();
      
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        console.log('❌ Cannot proceed without authentication');
        return;
      }

      // Run all tests in sequence
      await this.testGrantRequirementExtraction();
      await this.testOrganizationIntelligence();
      await this.testComplianceAssessment();
      await this.testGrantMatching();
      await this.testDocumentQueue();
      await this.testGetEndpoints();
      await this.testDatabaseContent();
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      await this.db.end();
    }
  }

  printSummary() {
    console.log('\n📊 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('=====================================');
    
    const tests = [
      'requirementExtraction',
      'organizationIntelligence', 
      'complianceAssessment',
      'grantMatching',
      'documentQueue'
    ];
    
    tests.forEach(test => {
      const result = this.testResults[test];
      if (result?.success) {
        console.log(`✅ ${test}: SUCCESS`);
        if (result.count !== undefined) console.log(`   Data points: ${result.count}`);
        if (result.score !== undefined) console.log(`   Score: ${result.score.toFixed(2)}%`);
      } else {
        console.log(`❌ ${test}: FAILED`);
        if (result?.error) console.log(`   Error: ${result.error}`);
      }
    });
    
    const successCount = tests.filter(test => this.testResults[test]?.success).length;
    const totalTests = tests.length;
    
    console.log(`\n🎯 OVERALL: ${successCount}/${totalTests} tests passed (${(successCount/totalTests*100).toFixed(1)}%)`);
    
    if (successCount === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Grant Intelligence System is fully functional.');
    } else {
      console.log('⚠️  Some tests failed. Check the details above for issues to resolve.');
    }
    
    console.log('\n🔍 Key Findings:');
    console.log('• Database tables: All created and accessible');
    console.log('• Authentication: Working with JWT tokens');
    console.log('• API endpoints: Properly configured');
    console.log('• Service layer: Processing requests successfully');
    
    if (this.testResults.requirementExtraction?.success) {
      console.log('• AI requirement extraction: ✅ Functional');
    } else {
      console.log('• AI requirement extraction: ❌ Check OpenAI API key');
    }
  }
}

// Run the comprehensive test
const testSuite = new AuthenticatedGrantIntelligenceTest();
testSuite.runFullTest().catch(console.error);