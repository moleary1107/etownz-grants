-- Migration 005: User Preferences and Learning System
-- Create tables for user preferences, interactions, and recommendation system

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    preference_type VARCHAR(50) NOT NULL CHECK (preference_type IN ('category', 'funder_type', 'amount_range', 'location', 'keyword')),
    preference_value VARCHAR(255) NOT NULL,
    weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, preference_type, preference_value)
);

-- User Interactions Table
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    grant_id VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'apply', 'share', 'dismiss')),
    context JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint (assumes grants table exists)
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- User Recommendation Cache Table (for performance)
CREATE TABLE IF NOT EXISTS user_recommendation_cache (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    grant_id VARCHAR(255) NOT NULL,
    score DECIMAL(5,4) NOT NULL,
    reasoning JSONB NOT NULL,
    explanation TEXT[],
    context VARCHAR(50), -- 'dashboard', 'search', 'email', 'mobile'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, grant_id, context),
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- User Learning Metrics Table (aggregated data for performance)
CREATE TABLE IF NOT EXISTS user_learning_metrics (
    user_id VARCHAR(255) PRIMARY KEY,
    total_interactions INTEGER DEFAULT 0,
    favorite_categories TEXT[],
    avg_grant_amount DECIMAL(12,2),
    preferred_funders TEXT[],
    success_rate DECIMAL(3,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type_value ON user_preferences(preference_type, preference_value);
CREATE INDEX IF NOT EXISTS idx_user_preferences_weight ON user_preferences(weight DESC);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_grant_id ON user_interactions(grant_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_grant ON user_interactions(user_id, grant_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON user_recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires ON user_recommendation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_score ON user_recommendation_cache(score DESC);

-- Functions for maintaining learning metrics
CREATE OR REPLACE FUNCTION update_user_learning_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update learning metrics when interactions change
    INSERT INTO user_learning_metrics (
        user_id,
        total_interactions,
        last_updated
    )
    VALUES (
        NEW.user_id,
        1,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_interactions = user_learning_metrics.total_interactions + 1,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update learning metrics
DROP TRIGGER IF EXISTS trigger_update_learning_metrics ON user_interactions;
CREATE TRIGGER trigger_update_learning_metrics
    AFTER INSERT ON user_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_learning_metrics();

-- Function to clean expired recommendation cache
CREATE OR REPLACE FUNCTION clean_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_recommendation_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add some initial data for testing (if needed)
-- Note: This would typically be handled by the application, not migration

-- Views for analytics
CREATE OR REPLACE VIEW user_preference_summary AS
SELECT 
    user_id,
    preference_type,
    COUNT(*) as preference_count,
    AVG(weight) as avg_weight,
    MAX(updated_at) as last_updated
FROM user_preferences
GROUP BY user_id, preference_type;

CREATE OR REPLACE VIEW user_interaction_summary AS
SELECT 
    user_id,
    interaction_type,
    COUNT(*) as interaction_count,
    MAX(timestamp) as last_interaction
FROM user_interactions
GROUP BY user_id, interaction_type;

-- Grant this to the application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_interactions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_recommendation_cache TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_learning_metrics TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;