-- Migration 006: Application Assistance and Smart Forms System
-- Create tables for AI-powered application assistance

-- Application Templates Table
CREATE TABLE IF NOT EXISTS application_templates (
    id SERIAL PRIMARY KEY,
    grant_id UUID NOT NULL,
    template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('form', 'narrative', 'budget', 'technical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sections JSONB NOT NULL DEFAULT '[]',
    required_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    optional_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    validation_rules JSONB NOT NULL DEFAULT '[]',
    ai_guidance JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- Application Drafts Table
CREATE TABLE IF NOT EXISTS application_drafts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    grant_id UUID NOT NULL,
    template_id INTEGER REFERENCES application_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'in_review', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    form_data JSONB NOT NULL DEFAULT '{}',
    ai_suggestions JSONB NOT NULL DEFAULT '[]',
    validation_results JSONB NOT NULL DEFAULT '[]',
    last_ai_review TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- AI Suggestions Table (for detailed tracking)
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id SERIAL PRIMARY KEY,
    draft_id INTEGER NOT NULL REFERENCES application_drafts(id) ON DELETE CASCADE,
    section_id VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('content', 'structure', 'improvement', 'error_fix', 'auto_complete')),
    original_text TEXT,
    suggested_text TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    implemented BOOLEAN DEFAULT FALSE,
    user_feedback VARCHAR(20) CHECK (user_feedback IN ('accepted', 'rejected', 'modified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application Assistance Sessions Table (for tracking AI interactions)
CREATE TABLE IF NOT EXISTS assistance_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    draft_id INTEGER REFERENCES application_drafts(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('smart_form', 'content_generation', 'validation', 'auto_complete', 'writing_assistance')),
    request_data JSONB NOT NULL DEFAULT '{}',
    response_data JSONB NOT NULL DEFAULT '{}',
    processing_time_ms INTEGER,
    ai_model VARCHAR(50),
    tokens_used INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Generation History Table
CREATE TABLE IF NOT EXISTS content_generation_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    draft_id INTEGER REFERENCES application_drafts(id) ON DELETE CASCADE,
    section_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    generated_content TEXT NOT NULL,
    alternative_versions JSONB DEFAULT '[]',
    user_modifications TEXT,
    quality_score DECIMAL(3,2),
    word_count INTEGER,
    readability_score DECIMAL(5,2),
    tone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart Form Templates Cache Table (for performance)
CREATE TABLE IF NOT EXISTS smart_form_cache (
    id SERIAL PRIMARY KEY,
    grant_id UUID NOT NULL,
    organization_hash VARCHAR(64) NOT NULL, -- Hash of organization profile for caching
    template_data JSONB NOT NULL,
    pre_filled_data JSONB NOT NULL,
    success_probability DECIMAL(3,2),
    estimated_completion_time INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(grant_id, organization_hash),
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- Application Analytics Table
CREATE TABLE IF NOT EXISTS application_analytics (
    id SERIAL PRIMARY KEY,
    draft_id INTEGER NOT NULL REFERENCES application_drafts(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    metric_metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_templates_grant_id ON application_templates(grant_id);
CREATE INDEX IF NOT EXISTS idx_application_templates_type ON application_templates(template_type);

CREATE INDEX IF NOT EXISTS idx_application_drafts_user_id ON application_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_application_drafts_grant_id ON application_drafts(grant_id);
CREATE INDEX IF NOT EXISTS idx_application_drafts_status ON application_drafts(status);
CREATE INDEX IF NOT EXISTS idx_application_drafts_updated_at ON application_drafts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_draft_id ON ai_suggestions(draft_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_section_id ON ai_suggestions(section_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_confidence ON ai_suggestions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_implemented ON ai_suggestions(implemented);

CREATE INDEX IF NOT EXISTS idx_assistance_sessions_user_id ON assistance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assistance_sessions_draft_id ON assistance_sessions(draft_id);
CREATE INDEX IF NOT EXISTS idx_assistance_sessions_type ON assistance_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_assistance_sessions_created_at ON assistance_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_generation_user_id ON content_generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_draft_id ON content_generation_history(draft_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_section ON content_generation_history(section_id);

CREATE INDEX IF NOT EXISTS idx_smart_form_cache_grant_id ON smart_form_cache(grant_id);
CREATE INDEX IF NOT EXISTS idx_smart_form_cache_expires ON smart_form_cache(expires_at);


-- Functions for maintaining application analytics
CREATE OR REPLACE FUNCTION update_draft_completion_percentage()
RETURNS TRIGGER AS $$
DECLARE
    template_record RECORD;
    total_fields INTEGER;
    completed_fields INTEGER;
    completion_pct INTEGER;
BEGIN
    -- Get the template for this draft
    SELECT * INTO template_record 
    FROM application_templates 
    WHERE id = NEW.template_id;
    
    IF template_record IS NOT NULL THEN
        -- Calculate total fields
        total_fields := array_length(template_record.required_fields, 1) + 
                       array_length(template_record.optional_fields, 1);
        
        -- Count completed fields in form_data
        completed_fields := (
            SELECT COUNT(*)
            FROM jsonb_each_text(NEW.form_data) AS fields(key, value)
            WHERE value IS NOT NULL AND trim(value) != ''
        );
        
        -- Calculate percentage
        IF total_fields > 0 THEN
            completion_pct := ROUND((completed_fields::DECIMAL / total_fields) * 100);
        ELSE
            completion_pct := 0;
        END IF;
        
        -- Update the completion percentage if it changed
        IF completion_pct != NEW.completion_percentage THEN
            NEW.completion_percentage := completion_pct;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update completion percentage
DROP TRIGGER IF EXISTS trigger_update_completion_percentage ON application_drafts;
CREATE TRIGGER trigger_update_completion_percentage
    BEFORE UPDATE ON application_drafts
    FOR EACH ROW
    WHEN (OLD.form_data IS DISTINCT FROM NEW.form_data)
    EXECUTE FUNCTION update_draft_completion_percentage();

-- Function to clean expired smart form cache
CREATE OR REPLACE FUNCTION clean_expired_smart_form_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM smart_form_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to record assistance session metrics
CREATE OR REPLACE FUNCTION record_assistance_metrics(
    p_user_id VARCHAR(255),
    p_draft_id INTEGER,
    p_session_type VARCHAR(50),
    p_processing_time INTEGER,
    p_tokens_used INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO assistance_sessions (
        user_id, 
        draft_id, 
        session_type, 
        processing_time_ms, 
        tokens_used,
        request_data,
        response_data
    ) VALUES (
        p_user_id, 
        p_draft_id, 
        p_session_type, 
        p_processing_time, 
        p_tokens_used,
        '{}',
        '{}'
    );
END;
$$ LANGUAGE plpgsql;

-- Views for analytics and reporting
CREATE OR REPLACE VIEW application_progress_summary AS
SELECT 
    ad.id,
    ad.user_id,
    ad.grant_id,
    ad.title,
    ad.status,
    ad.completion_percentage,
    g.title as grant_title,
    g.deadline,
    COUNT(ais.id) as ai_suggestions_count,
    COUNT(CASE WHEN ais.implemented THEN 1 END) as implemented_suggestions,
    MAX(ad.updated_at) as last_updated,
    EXTRACT(DAYS FROM (g.deadline - NOW())) as days_until_deadline
FROM application_drafts ad
LEFT JOIN grants g ON ad.grant_id = g.id
LEFT JOIN ai_suggestions ais ON ad.id = ais.draft_id
GROUP BY ad.id, g.id, g.title, g.deadline;

CREATE OR REPLACE VIEW user_assistance_analytics AS
SELECT 
    user_id,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT draft_id) as unique_applications,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(tokens_used) as total_tokens_used,
    COUNT(CASE WHEN session_type = 'content_generation' THEN 1 END) as content_generations,
    COUNT(CASE WHEN session_type = 'validation' THEN 1 END) as validations,
    COUNT(CASE WHEN session_type = 'auto_complete' THEN 1 END) as auto_completions,
    DATE_TRUNC('day', created_at) as session_date
FROM assistance_sessions
WHERE success = true
GROUP BY user_id, DATE_TRUNC('day', created_at)
ORDER BY session_date DESC;

-- Insert some sample application templates for common grant types
INSERT INTO application_templates (grant_id, template_type, title, description, sections, required_fields, optional_fields, validation_rules, ai_guidance)
SELECT 
    g.id,
    'form',
    'Standard Grant Application Template',
    'Comprehensive application template for general grants',
    '[
        {
            "id": "project_title",
            "title": "Project Title",
            "description": "Brief, descriptive title for your project",
            "section_type": "text",
            "required": true,
            "max_length": 200,
            "order_index": 1,
            "help_text": "Create a compelling title that clearly describes your project"
        },
        {
            "id": "project_summary",
            "title": "Executive Summary",
            "description": "High-level overview of your project",
            "section_type": "narrative",
            "required": true,
            "max_length": 1000,
            "min_length": 200,
            "order_index": 2,
            "help_text": "Summarize your project goals, methodology, and expected outcomes"
        },
        {
            "id": "problem_statement",
            "title": "Problem Statement",
            "description": "Clearly define the problem you are addressing",
            "section_type": "narrative",
            "required": true,
            "max_length": 1500,
            "order_index": 3
        },
        {
            "id": "methodology",
            "title": "Methodology",
            "description": "Detailed approach and methods",
            "section_type": "narrative",
            "required": true,
            "max_length": 2000,
            "order_index": 4
        },
        {
            "id": "budget_total",
            "title": "Total Budget",
            "description": "Total project budget requested",
            "section_type": "number",
            "required": true,
            "order_index": 5
        },
        {
            "id": "timeline",
            "title": "Project Timeline",
            "description": "Key milestones and timeline",
            "section_type": "narrative",
            "required": true,
            "max_length": 1000,
            "order_index": 6
        }
    ]'::jsonb,
    ARRAY['project_title', 'project_summary', 'problem_statement', 'methodology', 'budget_total', 'timeline'],
    ARRAY['additional_info', 'references', 'appendices'],
    '[
        {
            "field_name": "project_title",
            "rule_type": "max_length",
            "parameters": {"max_length": 200},
            "error_message": "Project title must be 200 characters or less",
            "severity": "error"
        },
        {
            "field_name": "project_summary",
            "rule_type": "min_length",
            "parameters": {"min_length": 200},
            "error_message": "Executive summary must be at least 200 characters",
            "severity": "error"
        }
    ]'::jsonb,
    '[
        {
            "section_id": "project_summary",
            "guidance_type": "writing_tips",
            "content": "Start with a compelling hook, clearly state your objectives, and highlight the potential impact",
            "priority": 1,
            "context_sensitive": true
        },
        {
            "section_id": "problem_statement",
            "guidance_type": "best_practices",
            "content": "Use data and evidence to support the significance of the problem",
            "priority": 1,
            "context_sensitive": true
        }
    ]'::jsonb
FROM grants g
WHERE NOT EXISTS (
    SELECT 1 FROM application_templates at 
    WHERE at.grant_id = g.id
)
LIMIT 5; -- Only create templates for first 5 grants without templates

-- Grant permissions (uncomment and adjust for your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON application_templates TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON application_drafts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_suggestions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON assistance_sessions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON content_generation_history TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON smart_form_cache TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON application_analytics TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;