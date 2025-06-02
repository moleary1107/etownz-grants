-- Migration: Add Vector Database Support and AI Integration
-- Created: 2024-02-06
-- Purpose: Enable vector embeddings, AI interactions tracking, and semantic search capabilities

-- Vector embeddings tracking table
-- This table tracks which entities have been processed and stored as vectors in Pinecone
CREATE TABLE IF NOT EXISTS vector_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'grant', 'application', 'document', 'organization'
    entity_id UUID NOT NULL,
    vector_id VARCHAR(255) NOT NULL UNIQUE, -- Pinecone vector ID
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    namespace VARCHAR(100) NOT NULL DEFAULT 'default',
    dimensions INTEGER NOT NULL DEFAULT 1536,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'outdated', 'deleted'
    content_hash VARCHAR(64), -- SHA-256 hash of content to detect changes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one vector per entity per namespace
    UNIQUE(entity_type, entity_id, namespace)
);

-- AI interaction logging table
-- Track all AI API calls for usage monitoring and cost tracking
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'embedding', 'chat', 'analysis', 'search', 'generation'
    model_used VARCHAR(100) NOT NULL,
    input_text TEXT,
    output_text TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost_cents INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}', -- Additional context (grant_id, search_filters, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant semantic analysis results
-- Store AI analysis results for grants to avoid re-processing
CREATE TABLE IF NOT EXISTS grant_ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    analysis_type VARCHAR(50) NOT NULL, -- 'eligibility', 'compatibility', 'requirements'
    analysis_result JSONB NOT NULL,
    confidence_score DECIMAL(5,2) DEFAULT 0.0, -- 0.00 to 100.00
    model_used VARCHAR(100) NOT NULL,
    analysis_version VARCHAR(20) DEFAULT '1.0', -- Track analysis algorithm versions
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one current analysis per grant/org/type combination
    UNIQUE(grant_id, organization_id, analysis_type, is_current) DEFERRABLE INITIALLY DEFERRED
);

-- Grant semantic tags and categories
-- AI-extracted tags for better searchability and categorization
CREATE TABLE IF NOT EXISTS grant_semantic_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_category VARCHAR(50), -- 'sector', 'technology', 'stage', 'location', 'theme'
    confidence_score DECIMAL(5,2) DEFAULT 0.0,
    extraction_method VARCHAR(50) DEFAULT 'ai_generated', -- 'ai_generated', 'manual', 'crawled'
    model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate tags per grant
    UNIQUE(grant_id, tag_name, tag_category)
);

-- Search history and analytics
-- Track user search behavior for improving recommendations
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    search_type VARCHAR(50) NOT NULL, -- 'keyword', 'semantic', 'ai_assisted'
    query_text TEXT NOT NULL,
    filters_applied JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    results_clicked INTEGER DEFAULT 0,
    session_id VARCHAR(100), -- Group related searches
    search_duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences for AI features
-- Store user preferences for personalized AI recommendations
CREATE TABLE IF NOT EXISTS user_ai_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    preference_type VARCHAR(50) NOT NULL, -- 'search_style', 'recommendation_frequency', 'ai_assistance_level'
    preference_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One preference per type per user
    UNIQUE(user_id, preference_type)
);

-- Organization vector profiles
-- Store organization embeddings for improved matching
CREATE TABLE IF NOT EXISTS organization_vector_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    profile_type VARCHAR(50) NOT NULL, -- 'description', 'capabilities', 'history', 'composite'
    vector_id VARCHAR(255) NOT NULL, -- Pinecone vector ID
    content_source TEXT, -- What was used to generate this profile
    embedding_model VARCHAR(100) NOT NULL,
    profile_version VARCHAR(20) DEFAULT '1.0',
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One current profile per type per organization
    UNIQUE(organization_id, profile_type, is_current) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_entity ON vector_embeddings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_status ON vector_embeddings(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_namespace ON vector_embeddings(namespace);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_org ON ai_interactions(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON ai_interactions(interaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_success ON ai_interactions(success, created_at);

CREATE INDEX IF NOT EXISTS idx_grant_ai_analysis_grant ON grant_ai_analysis(grant_id, is_current);
CREATE INDEX IF NOT EXISTS idx_grant_ai_analysis_org ON grant_ai_analysis(organization_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_grant_ai_analysis_confidence ON grant_ai_analysis(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_grant_semantic_tags_grant ON grant_semantic_tags(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_semantic_tags_category ON grant_semantic_tags(tag_category, tag_name);
CREATE INDEX IF NOT EXISTS idx_grant_semantic_tags_confidence ON grant_semantic_tags(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_org ON search_history(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_type ON search_history(search_type, created_at);

CREATE INDEX IF NOT EXISTS idx_user_ai_preferences_user ON user_ai_preferences(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_organization_vector_profiles_org ON organization_vector_profiles(organization_id, is_current);

-- Add AI-related columns to existing tables
ALTER TABLE grants ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false;
ALTER TABLE grants ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE grants ADD COLUMN IF NOT EXISTS semantic_hash VARCHAR(64); -- For change detection

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_assistance_used BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_generation_metadata JSONB DEFAULT '{}';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS semantic_score DECIMAL(5,2); -- AI-calculated quality score

ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_embedding_id VARCHAR(255); -- Reference to vector

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_profile_generated BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_profile_updated_at TIMESTAMP WITH TIME ZONE;

-- Create view for vector embedding status
CREATE OR REPLACE VIEW vector_embedding_status AS
SELECT 
    ve.entity_type,
    ve.entity_id,
    ve.vector_id,
    ve.embedding_model,
    ve.namespace,
    ve.status,
    ve.created_at,
    ve.updated_at,
    CASE 
        WHEN ve.entity_type = 'grant' THEN g.title
        WHEN ve.entity_type = 'organization' THEN o.name
        WHEN ve.entity_type = 'document' THEN d.filename
        ELSE 'Unknown'
    END as entity_name,
    CASE 
        WHEN ve.entity_type = 'grant' THEN g.updated_at
        WHEN ve.entity_type = 'organization' THEN o.updated_at
        WHEN ve.entity_type = 'document' THEN d.updated_at
        ELSE NULL
    END as entity_updated_at
FROM vector_embeddings ve
LEFT JOIN grants g ON ve.entity_type = 'grant' AND ve.entity_id = g.id
LEFT JOIN organizations o ON ve.entity_type = 'organization' AND ve.entity_id = o.id
LEFT JOIN documents d ON ve.entity_type = 'document' AND ve.entity_id = d.id;

-- Create view for AI usage analytics
CREATE OR REPLACE VIEW ai_usage_analytics AS
SELECT 
    ai.organization_id,
    o.name as organization_name,
    ai.interaction_type,
    ai.model_used,
    COUNT(*) as interaction_count,
    SUM(ai.total_tokens) as total_tokens,
    SUM(ai.estimated_cost_cents) as total_cost_cents,
    AVG(ai.response_time_ms) as avg_response_time_ms,
    SUM(CASE WHEN ai.success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate,
    DATE_TRUNC('day', ai.created_at) as date
FROM ai_interactions ai
LEFT JOIN organizations o ON ai.organization_id = o.id
GROUP BY ai.organization_id, o.name, ai.interaction_type, ai.model_used, DATE_TRUNC('day', ai.created_at);

-- Create function to update vector embedding status
CREATE OR REPLACE FUNCTION update_vector_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER trigger_vector_embeddings_updated_at
    BEFORE UPDATE ON vector_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_embedding_timestamp();

CREATE TRIGGER trigger_grant_ai_analysis_updated_at
    BEFORE UPDATE ON grant_ai_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_embedding_timestamp();

CREATE TRIGGER trigger_organization_vector_profiles_updated_at
    BEFORE UPDATE ON organization_vector_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_embedding_timestamp();

CREATE TRIGGER trigger_user_ai_preferences_updated_at
    BEFORE UPDATE ON user_ai_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_embedding_timestamp();

-- Insert default AI preferences for existing users
INSERT INTO user_ai_preferences (user_id, organization_id, preference_type, preference_value)
SELECT 
    u.id as user_id,
    u.org_id as organization_id,
    'search_style' as preference_type,
    '{"semantic_search": true, "ai_recommendations": true, "auto_analysis": false}'::jsonb as preference_value
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_ai_preferences uap 
    WHERE uap.user_id = u.id AND uap.preference_type = 'search_style'
);

-- Create function to calculate semantic similarity (placeholder for future use)
CREATE OR REPLACE FUNCTION calculate_semantic_similarity(text1 TEXT, text2 TEXT)
RETURNS DECIMAL(5,4) AS $$
BEGIN
    -- Placeholder function - would integrate with vector similarity calculation
    -- In practice, this would call out to the vector database
    RETURN 0.0;
END;
$$ LANGUAGE plpgsql;

-- Add comment with migration info
COMMENT ON TABLE vector_embeddings IS 'Tracks entities that have been processed and stored as vector embeddings in Pinecone';
COMMENT ON TABLE ai_interactions IS 'Logs all AI API interactions for usage monitoring and cost tracking';
COMMENT ON TABLE grant_ai_analysis IS 'Stores AI analysis results for grants to avoid re-processing';
COMMENT ON TABLE grant_semantic_tags IS 'AI-extracted semantic tags for improved grant categorization';
COMMENT ON TABLE search_history IS 'Tracks user search behavior for analytics and personalization';
COMMENT ON TABLE user_ai_preferences IS 'User preferences for AI-powered features';
COMMENT ON TABLE organization_vector_profiles IS 'Vector embeddings representing organization profiles';

-- Migration completed successfully
SELECT 'Vector database support migration completed successfully' as migration_status;