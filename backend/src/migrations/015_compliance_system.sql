-- Migration 015: Compliance System
-- Creates tables for AI-powered compliance checking and rule management

-- Table to store compliance rules for different grant schemes
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_scheme_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    rule_category VARCHAR(50) NOT NULL DEFAULT 'general',
    rule_description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'major', 'minor')),
    automated_check BOOLEAN DEFAULT true,
    check_query JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Table to store compliance check results
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES compliance_rules(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pass', 'fail', 'warning')),
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0.00 AND ai_confidence <= 1.00),
    details JSONB DEFAULT '{}'::jsonb,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_used VARCHAR(50),
    tokens_used INTEGER,
    processing_time_ms INTEGER
);

-- Enhanced applications table with compliance tracking
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS compliance_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_compliance_check TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'passed', 'failed', 'warning'));

-- Enhanced grant_sections table with AI metadata
-- SKIPPED: grant_sections table does not exist in current schema
-- ALTER TABLE grant_sections 
-- ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
-- ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0.00 AND ai_confidence <= 1.00),
-- ADD COLUMN IF NOT EXISTS human_edited BOOLEAN DEFAULT false,
-- ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
-- ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;

-- Enhanced ai_interactions table for compliance tracking
ALTER TABLE ai_interactions 
ADD COLUMN IF NOT EXISTS interaction_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_rules_grant_scheme ON compliance_rules(grant_scheme_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_category ON compliance_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_severity ON compliance_rules(severity);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_application ON compliance_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_rule ON compliance_checks(rule_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_checked_at ON compliance_checks(checked_at);

CREATE INDEX IF NOT EXISTS idx_applications_compliance_status ON applications(compliance_status);
CREATE INDEX IF NOT EXISTS idx_applications_compliance_score ON applications(compliance_score);

-- SKIPPED: grant_sections table does not exist
-- CREATE INDEX IF NOT EXISTS idx_grant_sections_ai_generated ON grant_sections(ai_generated);
-- CREATE INDEX IF NOT EXISTS idx_grant_sections_application_type ON grant_sections(application_id, section_type);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_type_success ON ai_interactions(interaction_type, success);

-- Insert default compliance rules for common Irish grant schemes
INSERT INTO compliance_rules (grant_scheme_id, rule_category, rule_description, severity, automated_check, check_query)
VALUES 
    -- General rules that apply to most schemes (using NULL for grant_scheme_id to make them universal)
    (NULL, 'content', 'Executive summary must be between 200-500 words', 'major', true, '{"section": "executive_summary", "min_words": 200, "max_words": 500}'),
    (NULL, 'content', 'Methodology section must be at least 500 words', 'major', true, '{"section": "methodology", "min_words": 500}'),
    (NULL, 'content', 'Impact section must be between 300-1000 words', 'major', true, '{"section": "impact", "min_words": 300, "max_words": 1000}'),
    (NULL, 'content', 'Budget justification is required for all categories', 'critical', true, '{"section": "budget_justification", "required": true}'),
    (NULL, 'budget', 'Personnel costs should not exceed 60% of total budget', 'minor', true, '{"category": "personnel", "max_percentage": 60}'),
    (NULL, 'budget', 'Equipment costs should include detailed justification', 'major', true, '{"category": "equipment", "requires_justification": true}'),
    (NULL, 'eligibility', 'Organization must have been operating for at least 2 years', 'critical', true, '{"min_years_operation": 2}'),
    (NULL, 'documentation', 'All required supporting documents must be uploaded', 'critical', true, '{"required_documents": ["financial_statements", "project_plan"]}'),
    (NULL, 'format', 'All sections must be completed before submission', 'critical', true, '{"required_sections": ["executive_summary", "methodology", "budget", "impact"]}'),
    (NULL, 'compliance', 'Application must demonstrate innovation or significant advancement', 'major', false, '{"requires_manual_review": true}');

-- Create a function to automatically update compliance scores
CREATE OR REPLACE FUNCTION update_compliance_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate compliance score based on recent checks
    UPDATE applications 
    SET 
        compliance_score = (
            SELECT COALESCE(
                100 - (
                    COALESCE(SUM(CASE WHEN cc.status = 'fail' AND cr.severity = 'critical' THEN 20 ELSE 0 END), 0) +
                    COALESCE(SUM(CASE WHEN cc.status = 'fail' AND cr.severity = 'major' THEN 10 ELSE 0 END), 0) +
                    COALESCE(SUM(CASE WHEN cc.status = 'fail' AND cr.severity = 'minor' THEN 5 ELSE 0 END), 0)
                ), 0
            )
            FROM compliance_checks cc
            LEFT JOIN compliance_rules cr ON cc.rule_id = cr.id
            WHERE cc.application_id = NEW.application_id
            AND cc.checked_at = (
                SELECT MAX(checked_at) 
                FROM compliance_checks 
                WHERE application_id = NEW.application_id
            )
        ),
        last_compliance_check = NEW.checked_at,
        compliance_status = CASE 
            WHEN EXISTS (
                SELECT 1 FROM compliance_checks cc 
                JOIN compliance_rules cr ON cc.rule_id = cr.id 
                WHERE cc.application_id = NEW.application_id 
                AND cc.status = 'fail' 
                AND cr.severity = 'critical'
                AND cc.checked_at = NEW.checked_at
            ) THEN 'failed'
            WHEN EXISTS (
                SELECT 1 FROM compliance_checks cc 
                JOIN compliance_rules cr ON cc.rule_id = cr.id 
                WHERE cc.application_id = NEW.application_id 
                AND cc.status = 'fail' 
                AND cr.severity = 'major'
                AND cc.checked_at = NEW.checked_at
            ) THEN 'warning'
            ELSE 'passed'
        END
    WHERE id = NEW.application_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update compliance scores
DROP TRIGGER IF EXISTS trigger_update_compliance_score ON compliance_checks;
CREATE TRIGGER trigger_update_compliance_score
    AFTER INSERT ON compliance_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_score();

-- Create a function to automatically calculate word counts
CREATE OR REPLACE FUNCTION update_word_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update word counts
-- SKIPPED: grant_sections table does not exist
-- DROP TRIGGER IF EXISTS trigger_update_word_count ON grant_sections;
-- CREATE TRIGGER trigger_update_word_count
--     BEFORE INSERT OR UPDATE OF content ON grant_sections
--     FOR EACH ROW
--     EXECUTE FUNCTION update_word_count();

-- Create a view for compliance dashboard statistics
CREATE OR REPLACE VIEW compliance_dashboard_stats AS
SELECT 
    ga.user_id,
    COUNT(DISTINCT ga.id) as total_applications,
    COUNT(DISTINCT CASE WHEN ga.compliance_status = 'passed' THEN ga.id END) as passed_applications,
    COUNT(DISTINCT CASE WHEN ga.compliance_status = 'failed' THEN ga.id END) as failed_applications,
    COUNT(DISTINCT CASE WHEN ga.compliance_status = 'warning' THEN ga.id END) as warning_applications,
    AVG(ga.compliance_score) as average_compliance_score,
    COUNT(cc.id) as total_checks_performed,
    COUNT(CASE WHEN cc.status = 'fail' AND cr.severity = 'critical' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN cc.status = 'fail' AND cr.severity = 'major' THEN 1 END) as major_issues,
    COUNT(CASE WHEN cc.status = 'fail' AND cr.severity = 'minor' THEN 1 END) as minor_issues
FROM applications ga
LEFT JOIN compliance_checks cc ON ga.id = cc.application_id
LEFT JOIN compliance_rules cr ON cc.rule_id = cr.id
WHERE ga.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ga.user_id;

-- Add helpful comments
COMMENT ON TABLE compliance_rules IS 'Stores compliance rules and requirements for different grant schemes';
COMMENT ON TABLE compliance_checks IS 'Stores results of AI-powered compliance checks for grant applications';
COMMENT ON COLUMN compliance_rules.check_query IS 'JSON configuration for automated rule checking';
COMMENT ON COLUMN compliance_checks.details IS 'Detailed information about the compliance check result';
COMMENT ON VIEW compliance_dashboard_stats IS 'Aggregated compliance statistics for dashboard display';

-- Grant permissions (adjust as needed for your user roles)
-- GRANT SELECT, INSERT, UPDATE ON compliance_rules TO grant_admin;
-- GRANT SELECT, INSERT ON compliance_checks TO grant_user;
-- GRANT SELECT ON compliance_dashboard_stats TO grant_user;