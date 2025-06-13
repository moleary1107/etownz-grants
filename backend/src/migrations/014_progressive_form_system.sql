-- Migration 014: Progressive Form Disclosure System
-- Creates tables for form analytics, field visibility rules, and AI-driven form optimization

-- Form session tracking for analytics
CREATE TABLE IF NOT EXISTS form_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    application_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'application_form',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    abandoned_at TIMESTAMP WITH TIME ZONE,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    time_spent_seconds INTEGER DEFAULT 0,
    fields_completed INTEGER DEFAULT 0,
    fields_total INTEGER DEFAULT 0,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Field interaction tracking
CREATE TABLE IF NOT EXISTS form_field_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES form_sessions(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('focus', 'blur', 'change', 'submit', 'validation_error', 'ai_assist')),
    field_value TEXT,
    time_spent_seconds INTEGER DEFAULT 0,
    validation_errors TEXT[],
    ai_suggestions_shown BOOLEAN DEFAULT false,
    ai_assistance_used BOOLEAN DEFAULT false,
    interaction_order INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Progressive disclosure rules
CREATE TABLE IF NOT EXISTS form_disclosure_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_scheme_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    trigger_field VARCHAR(100) NOT NULL,
    trigger_condition JSONB NOT NULL, -- { "operator": "equals", "value": "research", "logic": "and" }
    target_fields TEXT[] NOT NULL, -- Array of field names to show/hide
    action VARCHAR(20) NOT NULL CHECK (action IN ('show', 'hide', 'require', 'optional')),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- AI-driven field recommendations
CREATE TABLE IF NOT EXISTS form_field_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES form_sessions(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('show_next', 'skip_optional', 'provide_help', 'suggest_value', 'validate_input')),
    recommendation_text TEXT,
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    ai_model_used VARCHAR(50),
    user_action VARCHAR(50), -- 'accepted', 'rejected', 'ignored'
    shown_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Form completion optimization metrics
CREATE TABLE IF NOT EXISTS form_optimization_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_scheme_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    date_period DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    abandoned_sessions INTEGER DEFAULT 0,
    avg_completion_time_seconds INTEGER DEFAULT 0,
    avg_fields_completed INTEGER DEFAULT 0,
    most_abandoned_fields TEXT[],
    ai_assistance_usage_rate NUMERIC(5,2) DEFAULT 0,
    user_satisfaction_score NUMERIC(3,2),
    conversion_rate NUMERIC(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(grant_scheme_id, date_period)
);

-- Field visibility state tracking
CREATE TABLE IF NOT EXISTS form_field_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES form_sessions(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    is_visible BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    shown_at TIMESTAMP WITH TIME ZONE,
    hidden_at TIMESTAMP WITH TIME ZONE,
    visibility_reason VARCHAR(100), -- 'rule_triggered', 'ai_recommendation', 'user_action', 'default'
    rule_id UUID REFERENCES form_disclosure_rules(id) ON DELETE SET NULL,
    recommendation_id UUID REFERENCES form_field_recommendations(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_sessions_user_id ON form_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_sessions_grant_id ON form_sessions(grant_id);
CREATE INDEX IF NOT EXISTS idx_form_sessions_completed ON form_sessions(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_field_interactions_session_id ON form_field_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_form_field_interactions_field_name ON form_field_interactions(field_name);
CREATE INDEX IF NOT EXISTS idx_form_field_interactions_timestamp ON form_field_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_form_disclosure_rules_grant_scheme ON form_disclosure_rules(grant_scheme_id);
CREATE INDEX IF NOT EXISTS idx_form_disclosure_rules_trigger_field ON form_disclosure_rules(trigger_field);
CREATE INDEX IF NOT EXISTS idx_form_field_recommendations_session_id ON form_field_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_form_field_visibility_session_id ON form_field_visibility(session_id);
CREATE INDEX IF NOT EXISTS idx_form_optimization_metrics_grant_scheme ON form_optimization_metrics(grant_scheme_id);

-- Default disclosure rules for common grant types
INSERT INTO form_disclosure_rules (grant_scheme_id, rule_name, trigger_field, trigger_condition, target_fields, action, priority, metadata) VALUES
(NULL, 'Research Project Fields', 'project_type', '{"operator": "equals", "value": "research"}', ARRAY['methodology', 'research_team', 'publications_plan'], 'show', 100, '{"description": "Show research-specific fields when project type is research"}'),
(NULL, 'Commercial Project Fields', 'project_type', '{"operator": "equals", "value": "commercial"}', ARRAY['market_analysis', 'revenue_model', 'competitive_advantage'], 'show', 100, '{"description": "Show commercial fields for business projects"}'),
(NULL, 'Large Budget Fields', 'requested_amount', '{"operator": "greater_than", "value": 100000}', ARRAY['detailed_budget', 'financial_management', 'audit_requirements'], 'show', 90, '{"description": "Show detailed financial fields for large budget requests"}'),
(NULL, 'Partnership Fields', 'has_partners', '{"operator": "equals", "value": true}', ARRAY['partner_details', 'collaboration_agreement', 'ip_management'], 'show', 95, '{"description": "Show partnership fields when collaboration is involved"}'),
(NULL, 'Environmental Impact', 'project_category', '{"operator": "contains", "value": "environment"}', ARRAY['environmental_impact', 'sustainability_metrics', 'carbon_footprint'], 'show', 85, '{"description": "Show environmental fields for green projects"}');

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_form_disclosure_rules_updated_at 
    BEFORE UPDATE ON form_disclosure_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();