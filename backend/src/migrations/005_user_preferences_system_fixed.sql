-- Migration 005: User Preferences and Learning System (FIXED)
-- Create tables for user preferences, interactions, and recommendation system

-- Drop existing tables if they exist (to fix the type mismatch)
DROP TABLE IF EXISTS user_recommendation_cache CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_learning_metrics CASCADE;

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    preference_type VARCHAR(50) NOT NULL CHECK (preference_type IN ('category', 'funder_type', 'amount_range', 'location', 'keyword')),
    preference_value VARCHAR(255) NOT NULL,
    weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, preference_type, preference_value),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Interactions Table
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    grant_id UUID NOT NULL,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'apply', 'share', 'dismiss')),
    context JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- User Recommendation Cache Table (for performance)
CREATE TABLE IF NOT EXISTS user_recommendation_cache (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    grant_id UUID NOT NULL,
    score DECIMAL(5,4) NOT NULL,
    reasoning JSONB NOT NULL,
    explanation TEXT[],
    context VARCHAR(50), -- 'dashboard', 'search', 'email', 'mobile'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, grant_id, context),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- User Learning Metrics Table (aggregated data for performance)
CREATE TABLE IF NOT EXISTS user_learning_metrics (
    user_id UUID PRIMARY KEY,
    category_preferences JSONB DEFAULT '{}',
    funder_preferences JSONB DEFAULT '{}',
    amount_preferences JSONB DEFAULT '{}',
    interaction_stats JSONB DEFAULT '{}',
    model_version VARCHAR(20),
    last_calculation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_grant_id ON user_interactions(grant_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON user_recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires ON user_recommendation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_score ON user_recommendation_cache(score DESC);

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Create helper function to initialize user preferences
CREATE OR REPLACE FUNCTION initialize_user_preferences(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    -- Get user's organization information
    SELECT u.*, o.* INTO v_user_record
    FROM users u
    LEFT JOIN organizations o ON u.org_id = o.id
    WHERE u.id = p_user_id;
    
    -- Initialize basic preferences based on organization data
    IF v_user_record.categories IS NOT NULL THEN
        INSERT INTO user_preferences (user_id, preference_type, preference_value, weight)
        SELECT p_user_id, 'category', unnest(v_user_record.categories), 0.8
        ON CONFLICT (user_id, preference_type, preference_value) DO NOTHING;
    END IF;
    
    -- Initialize metrics entry
    INSERT INTO user_learning_metrics (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create view for user preference summary
CREATE OR REPLACE VIEW user_preference_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT up.id) as preference_count,
    COUNT(DISTINCT ui.id) as interaction_count,
    MAX(ui.timestamp) as last_interaction,
    COALESCE(ulm.model_version, 'v1.0') as model_version
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN user_interactions ui ON u.id = ui.user_id
LEFT JOIN user_learning_metrics ulm ON u.id = ulm.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, ulm.model_version;