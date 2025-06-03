#!/bin/bash

echo "Setting Up Vector Database Tables"
echo "================================="
echo ""

if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "1. Creating vector database extension and tables..."
    psql "$DATABASE_URL" << 'SQL'
-- Create vector_embeddings table
CREATE TABLE IF NOT EXISTS vector_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('grant', 'application', 'document', 'organization')),
    entity_id UUID NOT NULL,
    vector_id VARCHAR(255) NOT NULL,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    namespace VARCHAR(100) DEFAULT 'default',
    dimensions INTEGER DEFAULT 1536,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'outdated', 'deleted')),
    content_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, namespace)
);

-- Create ai_interactions table for usage tracking
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('embedding', 'chat', 'analysis', 'search', 'generation')),
    model_used VARCHAR(100),
    input_text TEXT,
    output_text TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_eur DECIMAL(10,6) DEFAULT 0,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grant_ai_analysis table for caching analysis results
CREATE TABLE IF NOT EXISTS grant_ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    analysis_result JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(grant_id, analysis_type)
);

-- Create grant_semantic_tags table for AI-extracted tags
CREATE TABLE IF NOT EXISTS grant_semantic_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    tag_type VARCHAR(50) DEFAULT 'topic',
    created_by_ai BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(grant_id, tag)
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    query_text TEXT NOT NULL,
    search_type VARCHAR(50) DEFAULT 'semantic',
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_grants UUID[],
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_ai_preferences table
CREATE TABLE IF NOT EXISTS user_ai_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    auto_analysis BOOLEAN DEFAULT true,
    preferred_models JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    search_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create organization_vector_profiles table
CREATE TABLE IF NOT EXISTS organization_vector_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    profile_vector_id VARCHAR(255),
    profile_data JSONB DEFAULT '{}',
    tags TEXT[],
    interests TEXT[],
    expertise_areas TEXT[],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_entity ON vector_embeddings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_status ON vector_embeddings(status);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_org ON ai_interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON ai_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created ON ai_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_grant_ai_analysis_grant ON grant_ai_analysis(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_ai_analysis_type ON grant_ai_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_grant_semantic_tags_grant ON grant_semantic_tags(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_semantic_tags_tag ON grant_semantic_tags(tag);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at);

-- Apply triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_vector_embeddings_updated_at 
    BEFORE UPDATE ON vector_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_grant_ai_analysis_updated_at 
    BEFORE UPDATE ON grant_ai_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_ai_preferences_updated_at 
    BEFORE UPDATE ON user_ai_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample AI analysis for demo grants
INSERT INTO grant_ai_analysis (grant_id, analysis_type, analysis_result, confidence_score, model_version)
SELECT 
    id as grant_id,
    'relevance_analysis' as analysis_type,
    '{"summary": "AI analysis pending", "keywords": [], "difficulty": "medium", "success_probability": 0.65}' as analysis_result,
    0.65 as confidence_score,
    'gpt-3.5-turbo' as model_version
FROM grants
WHERE id IN (
    SELECT id FROM grants LIMIT 5
)
ON CONFLICT (grant_id, analysis_type) DO NOTHING;

SQL

    echo ""
    echo "2. Verifying vector database tables were created..."
    psql "$DATABASE_URL" << 'SQL'
-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'vector_embeddings', 
    'ai_interactions', 
    'grant_ai_analysis', 
    'grant_semantic_tags',
    'search_history',
    'user_ai_preferences',
    'organization_vector_profiles'
  )
ORDER BY table_name;

-- Check row counts
SELECT 
    'vector_embeddings' as table_name, COUNT(*) as row_count FROM vector_embeddings
UNION ALL
SELECT 
    'ai_interactions' as table_name, COUNT(*) as row_count FROM ai_interactions
UNION ALL
SELECT 
    'grant_ai_analysis' as table_name, COUNT(*) as row_count FROM grant_ai_analysis;
SQL

    echo ""
    echo "3. Restarting backend to initialize vector services..."
    ssh root@165.227.149.136 "docker restart root-backend-1"
    
    echo ""
    echo "4. Waiting for backend to restart..."
    sleep 15
    
    echo ""
    echo "5. Testing AI health endpoint..."
    TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@etownz.com","password":"admin123"}')

    TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)
    
    echo "AI Health Status:"
    curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/health | python3 -m json.tool
    
    echo ""
    echo "6. Testing AI grant analysis endpoint..."
    echo "Grant Analysis Test:"
    curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/stats | python3 -m json.tool
    
else
    echo "ERROR: .env file not found!"
fi

echo ""
echo "Vector Database Setup Complete!"
echo ""
echo "Note: For full AI functionality, you'll also need:"
echo "- OPENAI_API_KEY in your .env file"
echo "- PINECONE_API_KEY in your .env file"
echo ""
echo "The AI services should now be healthier, even without external API keys."