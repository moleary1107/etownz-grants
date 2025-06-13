-- Migration 016: Budget Optimization System
-- Creates tables for AI-powered budget optimization and analysis

-- Table to store budget optimization requests and results
CREATE TABLE IF NOT EXISTS budget_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    project_scope JSONB NOT NULL,
    funding_rules JSONB NOT NULL,
    original_budget JSONB DEFAULT '[]'::jsonb,
    optimized_budget JSONB NOT NULL,
    analysis_results JSONB DEFAULT '{}'::jsonb,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
    total_original_amount DECIMAL(12,2) DEFAULT 0.00,
    total_optimized_amount DECIMAL(12,2) NOT NULL,
    saved_amount DECIMAL(12,2) DEFAULT 0.00,
    optimization_type VARCHAR(50) DEFAULT 'full_optimization',
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER
);

-- Table to store budget templates for different grant types
CREATE TABLE IF NOT EXISTS budget_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100) NOT NULL,
    funding_body VARCHAR(255) NOT NULL,
    grant_scheme VARCHAR(255),
    budget_range_min DECIMAL(12,2) NOT NULL,
    budget_range_max DECIMAL(12,2) NOT NULL,
    template_categories JSONB NOT NULL,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store historical budget data for learning
CREATE TABLE IF NOT EXISTS historical_budget_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    funding_body VARCHAR(255) NOT NULL,
    grant_scheme VARCHAR(255) NOT NULL,
    project_type VARCHAR(100) NOT NULL,
    total_budget DECIMAL(12,2) NOT NULL,
    budget_categories JSONB NOT NULL,
    success_status BOOLEAN NOT NULL,
    evaluation_score DECIMAL(5,2),
    feedback TEXT,
    project_duration INTEGER, -- in months
    team_size INTEGER,
    organization_type VARCHAR(100),
    year INTEGER NOT NULL,
    country VARCHAR(2) DEFAULT 'IE',
    industry VARCHAR(100),
    data_source VARCHAR(100) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding real[] -- For vector similarity search (1536 dimensions)
);

-- Table to store budget analysis results
CREATE TABLE IF NOT EXISTS budget_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optimization_id UUID REFERENCES budget_optimizations(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL, -- 'compliance', 'optimization', 'comparison', 'risk'
    analysis_data JSONB NOT NULL,
    score DECIMAL(5,2),
    warnings JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced applications table with budget optimization tracking
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS budget_optimization_id UUID REFERENCES budget_optimizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS budget_status VARCHAR(20) DEFAULT 'draft' CHECK (budget_status IN ('draft', 'optimized', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS budget_confidence_score DECIMAL(3,2) CHECK (budget_confidence_score >= 0.00 AND budget_confidence_score <= 1.00),
ADD COLUMN IF NOT EXISTS last_budget_optimization TIMESTAMP WITH TIME ZONE;

-- Enhanced grants table with funding rules
ALTER TABLE grants 
ADD COLUMN IF NOT EXISTS funding_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS budget_template_id UUID REFERENCES budget_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS typical_budget_range JSONB DEFAULT '{"min": 0, "max": 0}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_user ON budget_optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_application ON budget_optimizations(application_id);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_created_at ON budget_optimizations(created_at);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_status ON budget_optimizations(status);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_type ON budget_optimizations(optimization_type);

CREATE INDEX IF NOT EXISTS idx_budget_templates_project_type ON budget_templates(project_type);
CREATE INDEX IF NOT EXISTS idx_budget_templates_funding_body ON budget_templates(funding_body);
CREATE INDEX IF NOT EXISTS idx_budget_templates_public ON budget_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_budget_templates_range ON budget_templates(budget_range_min, budget_range_max);

CREATE INDEX IF NOT EXISTS idx_historical_budget_funding_body ON historical_budget_data(funding_body);
CREATE INDEX IF NOT EXISTS idx_historical_budget_project_type ON historical_budget_data(project_type);
CREATE INDEX IF NOT EXISTS idx_historical_budget_success ON historical_budget_data(success_status);
CREATE INDEX IF NOT EXISTS idx_historical_budget_year ON historical_budget_data(year);
CREATE INDEX IF NOT EXISTS idx_historical_budget_amount ON historical_budget_data(total_budget);
-- Note: Using standard GIN index for array similarity instead of pgvector
CREATE INDEX IF NOT EXISTS idx_historical_budget_embedding ON historical_budget_data USING gin (embedding);

CREATE INDEX IF NOT EXISTS idx_budget_analyses_optimization ON budget_analyses(optimization_id);
CREATE INDEX IF NOT EXISTS idx_budget_analyses_type ON budget_analyses(analysis_type);

CREATE INDEX IF NOT EXISTS idx_applications_budget_status ON applications(budget_status);
CREATE INDEX IF NOT EXISTS idx_applications_budget_optimization ON applications(budget_optimization_id);

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_budget_optimization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_budget_optimizations_updated_at
    BEFORE UPDATE ON budget_optimizations
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_optimization_timestamp();

CREATE TRIGGER trigger_budget_templates_updated_at
    BEFORE UPDATE ON budget_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_optimization_timestamp();

-- Create function to automatically update grant application budget status
CREATE OR REPLACE FUNCTION update_grant_budget_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the related grant application
    UPDATE applications 
    SET 
        budget_optimization_id = NEW.id,
        budget_status = CASE 
            WHEN NEW.status = 'completed' AND NEW.confidence_score >= 0.8 THEN 'optimized'
            WHEN NEW.status = 'failed' THEN 'draft'
            ELSE budget_status
        END,
        budget_confidence_score = NEW.confidence_score,
        last_budget_optimization = NEW.processed_at
    WHERE id = NEW.application_id
    AND NEW.application_id IS NOT NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grant_budget_status
    AFTER INSERT OR UPDATE ON budget_optimizations
    FOR EACH ROW
    EXECUTE FUNCTION update_grant_budget_status();

-- Create function to calculate budget statistics
CREATE OR REPLACE FUNCTION calculate_budget_statistics(user_uuid UUID)
RETURNS TABLE (
    total_optimizations BIGINT,
    avg_confidence NUMERIC,
    total_savings NUMERIC,
    avg_savings NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_optimizations,
        AVG(bo.confidence_score) as avg_confidence,
        SUM(bo.saved_amount) as total_savings,
        AVG(bo.saved_amount) as avg_savings,
        (COUNT(CASE WHEN bo.confidence_score >= 0.8 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100) as success_rate
    FROM budget_optimizations bo
    WHERE bo.user_id = user_uuid
    AND bo.created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Insert default budget templates for common Irish grant schemes
INSERT INTO budget_templates (name, description, project_type, funding_body, grant_scheme, budget_range_min, budget_range_max, template_categories, is_public, is_verified) VALUES 
(
    'Enterprise Ireland R&D Grant Template',
    'Standard budget template for Enterprise Ireland R&D grants',
    'research',
    'Enterprise Ireland',
    'Innovation Partnership Programme',
    25000,
    200000,
    '[
        {"name": "Personnel", "percentage": 60, "justification": "Research staff and project management", "isRequired": true},
        {"name": "Equipment", "percentage": 25, "justification": "Research equipment and software", "isRequired": true},
        {"name": "Materials", "percentage": 10, "justification": "Research materials and consumables", "isRequired": false},
        {"name": "Travel", "percentage": 5, "justification": "Conference attendance and collaboration", "isRequired": false}
    ]'::jsonb,
    true,
    true
),
(
    'SFI Research Grant Template',
    'Science Foundation Ireland research grant budget template',
    'research',
    'Science Foundation Ireland',
    'Investigator Programme',
    100000,
    1000000,
    '[
        {"name": "Personnel", "percentage": 65, "justification": "Principal investigator and research team", "isRequired": true},
        {"name": "Equipment", "percentage": 20, "justification": "Specialized research equipment", "isRequired": true},
        {"name": "Materials", "percentage": 8, "justification": "Laboratory materials and supplies", "isRequired": false},
        {"name": "Travel", "percentage": 7, "justification": "International collaboration and conferences", "isRequired": false}
    ]'::jsonb,
    true,
    true
),
(
    'IRC Postdoc Fellowship Template',
    'Irish Research Council postdoctoral fellowship template',
    'research',
    'Irish Research Council',
    'Government of Ireland Postdoctoral Fellowship',
    40000,
    60000,
    '[
        {"name": "Personnel", "percentage": 75, "justification": "Postdoctoral researcher salary", "isRequired": true},
        {"name": "Research Expenses", "percentage": 15, "justification": "Research materials and equipment", "isRequired": true},
        {"name": "Travel", "percentage": 10, "justification": "Conference attendance and research visits", "isRequired": false}
    ]'::jsonb,
    true,
    true
),
(
    'Horizon Europe RIA Template',
    'Research and Innovation Action under Horizon Europe',
    'innovation',
    'European Commission',
    'Horizon Europe',
    1000000,
    10000000,
    '[
        {"name": "Personnel", "percentage": 50, "justification": "Research and innovation team", "isRequired": true},
        {"name": "Equipment", "percentage": 20, "justification": "Research infrastructure", "isRequired": true},
        {"name": "Subcontracting", "percentage": 15, "justification": "External expertise and services", "isRequired": false},
        {"name": "Other Direct Costs", "percentage": 10, "justification": "Travel, materials, dissemination", "isRequired": false},
        {"name": "Indirect Costs", "percentage": 5, "justification": "Overhead costs", "isRequired": true}
    ]'::jsonb,
    true,
    true
);

-- Insert sample historical budget data for learning
INSERT INTO historical_budget_data (title, funding_body, grant_scheme, project_type, total_budget, budget_categories, success_status, evaluation_score, year, organization_type) VALUES 
(
    'AI-Powered Medical Diagnostics Research',
    'Enterprise Ireland',
    'Innovation Partnership Programme',
    'research',
    150000,
    '[
        {"name": "Personnel", "amount": 90000, "percentage": 60},
        {"name": "Equipment", "amount": 37500, "percentage": 25},
        {"name": "Materials", "amount": 15000, "percentage": 10},
        {"name": "Travel", "amount": 7500, "percentage": 5}
    ]'::jsonb,
    true,
    85.5,
    2023,
    'SME'
),
(
    'Sustainable Energy Storage Solutions',
    'Science Foundation Ireland',
    'Investigator Programme',
    'research',
    500000,
    '[
        {"name": "Personnel", "amount": 325000, "percentage": 65},
        {"name": "Equipment", "amount": 100000, "percentage": 20},
        {"name": "Materials", "amount": 40000, "percentage": 8},
        {"name": "Travel", "amount": 35000, "percentage": 7}
    ]'::jsonb,
    true,
    92.3,
    2023,
    'University'
);

-- Create views for budget optimization insights
CREATE OR REPLACE VIEW budget_optimization_summary AS
SELECT 
    bo.id,
    bo.user_id,
    bo.project_scope->>'title' as project_title,
    bo.project_scope->>'projectType' as project_type,
    bo.funding_rules->>'fundingBody' as funding_body,
    bo.total_optimized_amount,
    bo.saved_amount,
    bo.confidence_score,
    bo.status,
    bo.created_at,
    (
        SELECT COUNT(*) 
        FROM budget_analyses ba 
        WHERE ba.optimization_id = bo.id 
        AND ba.analysis_type = 'compliance'
        AND ba.score >= 80
    ) as compliance_score_count
FROM budget_optimizations bo;

CREATE OR REPLACE VIEW successful_budget_patterns AS
SELECT 
    hbd.project_type,
    hbd.funding_body,
    AVG(hbd.total_budget) as avg_budget,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hbd.total_budget) as median_budget,
    AVG(hbd.evaluation_score) as avg_score,
    COUNT(*) as sample_size,
    (hbd.budget_categories->0->>'percentage')::DECIMAL as avg_personnel_percentage,
    (hbd.budget_categories->1->>'percentage')::DECIMAL as avg_equipment_percentage
FROM historical_budget_data hbd
WHERE hbd.success_status = true
AND hbd.evaluation_score >= 75
GROUP BY hbd.project_type, hbd.funding_body
HAVING COUNT(*) >= 3;

-- Add helpful comments
COMMENT ON TABLE budget_optimizations IS 'Stores AI-powered budget optimization requests and results';
COMMENT ON TABLE budget_templates IS 'Pre-defined budget templates for different grant types and funding bodies';
COMMENT ON TABLE historical_budget_data IS 'Historical successful grant budget data for machine learning';
COMMENT ON TABLE budget_analyses IS 'Detailed analysis results for budget optimizations';

COMMENT ON COLUMN budget_optimizations.confidence_score IS 'AI confidence score for the optimization (0-1)';
COMMENT ON COLUMN budget_optimizations.saved_amount IS 'Amount saved through optimization';
COMMENT ON COLUMN budget_templates.success_rate IS 'Historical success rate for this template';
COMMENT ON COLUMN historical_budget_data.embedding IS 'Vector embedding for similarity search';

-- Grant appropriate permissions (adjust based on your user role system)
-- GRANT SELECT, INSERT, UPDATE ON budget_optimizations TO grant_user;
-- GRANT SELECT ON budget_templates TO grant_user;
-- GRANT SELECT ON historical_budget_data TO grant_user;