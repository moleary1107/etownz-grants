-- Migration: AI Transparency and Interaction Tracking
-- Purpose: Add tables to track AI interactions, confidence scores, and user feedback

-- AI interaction tracking for all AI-generated content
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'content_generation', 'document_analysis', 'compliance_check', etc.
    prompt_text TEXT,
    response_text TEXT,
    model_used VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-generated content tracking with versioning
CREATE TABLE ai_generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id UUID NOT NULL REFERENCES ai_interactions(id) ON DELETE CASCADE,
    application_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL, -- 'project_description', 'technical_approach', etc.
    content_text TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'text', 'bullet_points', 'table', etc.
    confidence_score DECIMAL(3,2) NOT NULL,
    reasoning TEXT, -- AI's explanation of how it generated the content
    sources TEXT[], -- Array of sources/references used
    human_edited BOOLEAN DEFAULT false,
    human_approved BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance check results
CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    grant_scheme_id UUID REFERENCES grants(id),
    check_type VARCHAR(50) NOT NULL, -- 'eligibility', 'budget', 'documentation', etc.
    overall_score DECIMAL(5,2),
    issues JSONB DEFAULT '[]'::jsonb, -- Array of compliance issues
    recommendations JSONB DEFAULT '[]'::jsonb, -- Array of improvement suggestions
    ai_model_used VARCHAR(50),
    confidence_score DECIMAL(3,2),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Document analysis results
CREATE TABLE document_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50), -- 'pdf', 'docx', 'xlsx', etc.
    file_path VARCHAR(500),
    file_size INTEGER,
    analysis_type VARCHAR(50) NOT NULL, -- 'requirement_extraction', 'compliance_check', 'content_summary'
    extracted_text TEXT,
    key_requirements JSONB DEFAULT '[]'::jsonb,
    compliance_score DECIMAL(5,2),
    summary TEXT,
    insights JSONB DEFAULT '{}'::jsonb,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    ai_model_used VARCHAR(50),
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes for efficient queries
CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_application_id ON ai_interactions(application_id);
CREATE INDEX idx_ai_interactions_type ON ai_interactions(interaction_type);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at DESC);

CREATE INDEX idx_ai_content_interaction_id ON ai_generated_content(interaction_id);
CREATE INDEX idx_ai_content_application_id ON ai_generated_content(application_id);
CREATE INDEX idx_ai_content_section ON ai_generated_content(section_name);

CREATE INDEX idx_compliance_checks_application_id ON compliance_checks(application_id);
CREATE INDEX idx_compliance_checks_type ON compliance_checks(check_type);
CREATE INDEX idx_compliance_checks_checked_at ON compliance_checks(checked_at DESC);

CREATE INDEX idx_document_analysis_application_id ON document_analysis(application_id);
CREATE INDEX idx_document_analysis_type ON document_analysis(analysis_type);
CREATE INDEX idx_document_analysis_status ON document_analysis(processing_status);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_interactions_updated_at BEFORE UPDATE ON ai_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_content_updated_at BEFORE UPDATE ON ai_generated_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_analysis_updated_at BEFORE UPDATE ON document_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some useful views for reporting
CREATE VIEW ai_usage_summary AS
SELECT 
    user_id,
    DATE_TRUNC('day', created_at) as date,
    interaction_type,
    COUNT(*) as interaction_count,
    SUM(tokens_used) as total_tokens,
    AVG(confidence_score) as avg_confidence,
    AVG(user_rating) as avg_rating
FROM ai_interactions 
WHERE status = 'completed'
GROUP BY user_id, DATE_TRUNC('day', created_at), interaction_type;

CREATE VIEW compliance_summary AS
SELECT 
    application_id,
    COUNT(*) as total_checks,
    AVG(overall_score) as avg_score,
    COUNT(CASE WHEN overall_score >= 80 THEN 1 END) as passing_checks,
    MAX(checked_at) as last_check
FROM compliance_checks 
WHERE status = 'completed'
GROUP BY application_id;