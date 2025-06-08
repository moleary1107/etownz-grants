-- Grant Intelligence and Analysis System
-- Phase 2A: AI-powered grant requirement extraction and compliance checking

-- Grant requirements extracted from documents
CREATE TABLE IF NOT EXISTS grant_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
  requirement_type VARCHAR(50) NOT NULL, -- eligibility, technical, financial, administrative
  category VARCHAR(100), -- organization_type, location, sector, experience, etc.
  requirement_text TEXT NOT NULL,
  mandatory BOOLEAN DEFAULT true,
  weight NUMERIC(3,2) DEFAULT 1.0, -- importance weight for scoring
  extracted_criteria JSONB DEFAULT '[]', -- specific criteria points
  validation_rules JSONB DEFAULT '{}', -- automated validation rules
  source_section VARCHAR(255), -- where in the grant doc this came from
  confidence_score NUMERIC(3,2) DEFAULT 0.0,
  extracted_by VARCHAR(50) DEFAULT 'ai', -- ai, manual, hybrid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization intelligence from scraped data
CREATE TABLE IF NOT EXISTS organization_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  data_source VARCHAR(100) NOT NULL, -- website, document, linkedin, etc.
  source_url TEXT,
  intelligence_type VARCHAR(50), -- capabilities, expertise, track_record, facilities
  extracted_data JSONB NOT NULL,
  summary TEXT,
  keywords TEXT[],
  relevance_tags TEXT[],
  confidence_score NUMERIC(3,2) DEFAULT 0.0,
  last_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant compliance assessments
CREATE TABLE IF NOT EXISTS grant_compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
  overall_score NUMERIC(5,2) DEFAULT 0.0, -- 0-100
  eligibility_status VARCHAR(50), -- eligible, not_eligible, partially_eligible
  compliance_results JSONB DEFAULT '{}', -- detailed requirement-by-requirement results
  gaps_identified JSONB DEFAULT '[]', -- areas where org doesn't meet requirements
  recommendations JSONB DEFAULT '[]', -- AI suggestions to improve compliance
  strengths JSONB DEFAULT '[]', -- areas where org exceeds requirements
  assessment_metadata JSONB DEFAULT '{}',
  assessed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant scoring matrix
CREATE TABLE IF NOT EXISTS grant_scoring_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES grant_requirements(id) ON DELETE CASCADE,
  score NUMERIC(5,2) DEFAULT 0.0, -- 0-100
  max_score NUMERIC(5,2) DEFAULT 100.0,
  weight NUMERIC(3,2) DEFAULT 1.0,
  evidence TEXT,
  evidence_source VARCHAR(255),
  scoring_notes TEXT,
  automated_score BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant matching suggestions
CREATE TABLE IF NOT EXISTS grant_matching_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2) DEFAULT 0.0, -- 0-100
  match_reasons JSONB DEFAULT '[]',
  missing_requirements JSONB DEFAULT '[]',
  improvement_suggestions JSONB DEFAULT '[]',
  priority_level VARCHAR(20) DEFAULT 'medium', -- high, medium, low
  suggested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  applied BOOLEAN DEFAULT false
);

-- Organization capability mapping
CREATE TABLE IF NOT EXISTS organization_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  capability_type VARCHAR(100) NOT NULL, -- technical, research, infrastructure, etc.
  capability_name VARCHAR(255) NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  evidence_documents JSONB DEFAULT '[]',
  verified BOOLEAN DEFAULT false,
  verification_source VARCHAR(255),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, capability_type, capability_name)
);

-- Grant document analysis queue
CREATE TABLE IF NOT EXISTS grant_document_analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
  document_url TEXT,
  document_type VARCHAR(50), -- call_document, guidelines, faq, etc.
  analysis_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  analysis_type VARCHAR(50), -- requirements, criteria, deadlines, etc.
  extracted_data JSONB DEFAULT '{}',
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_grant_requirements_grant_id ON grant_requirements(grant_id);
CREATE INDEX idx_grant_requirements_type ON grant_requirements(requirement_type);
CREATE INDEX idx_grant_requirements_mandatory ON grant_requirements(mandatory);

CREATE INDEX idx_organization_intelligence_org_id ON organization_intelligence(organization_id);
CREATE INDEX idx_organization_intelligence_type ON organization_intelligence(intelligence_type);
CREATE INDEX idx_organization_intelligence_source ON organization_intelligence(data_source);

CREATE INDEX idx_grant_compliance_grant_org ON grant_compliance_assessments(grant_id, organization_id);
CREATE INDEX idx_grant_compliance_status ON grant_compliance_assessments(eligibility_status);
CREATE INDEX idx_grant_compliance_score ON grant_compliance_assessments(overall_score);

CREATE INDEX idx_grant_scoring_grant_org ON grant_scoring_matrix(grant_id, organization_id);
CREATE INDEX idx_grant_scoring_requirement ON grant_scoring_matrix(requirement_id);

CREATE INDEX idx_grant_matching_org ON grant_matching_suggestions(organization_id);
CREATE INDEX idx_grant_matching_score ON grant_matching_suggestions(match_score);
CREATE INDEX idx_grant_matching_priority ON grant_matching_suggestions(priority_level);

CREATE INDEX idx_org_capabilities_org ON organization_capabilities(organization_id);
CREATE INDEX idx_org_capabilities_type ON organization_capabilities(capability_type);

CREATE INDEX idx_grant_doc_queue_status ON grant_document_analysis_queue(analysis_status);
CREATE INDEX idx_grant_doc_queue_grant ON grant_document_analysis_queue(grant_id);