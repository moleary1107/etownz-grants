-- RAG Knowledge Base System Migration
-- This migration creates the knowledge base tables for storing documents and managing embeddings

-- Create knowledge_base table for storing documents
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('grant', 'policy', 'guideline', 'application', 'knowledge')),
    source VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]'::jsonb,
    embedding_status VARCHAR(20) DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type ON knowledge_base(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding_status ON knowledge_base(embedding_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_updated_at ON knowledge_base(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base(source);

-- Create GIN index for tags JSONB field for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN(tags);

-- Create full-text search index for title and content
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search ON knowledge_base USING GIN(
    to_tsvector('english', title || ' ' || content)
);

-- Create embedding_usage_stats table for tracking embedding usage and costs
CREATE TABLE IF NOT EXISTS embedding_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('generate', 'search', 'batch_generate', 'similarity')),
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    processing_time_ms INTEGER,
    batch_size INTEGER DEFAULT 1,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for embedding usage stats
CREATE INDEX IF NOT EXISTS idx_embedding_usage_user_id ON embedding_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_usage_operation_type ON embedding_usage_stats(operation_type);
CREATE INDEX IF NOT EXISTS idx_embedding_usage_model ON embedding_usage_stats(model);
CREATE INDEX IF NOT EXISTS idx_embedding_usage_created_at ON embedding_usage_stats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embedding_usage_success ON embedding_usage_stats(success);

-- Create semantic_search_sessions table for tracking search sessions
CREATE TABLE IF NOT EXISTS semantic_search_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    filter_params JSONB DEFAULT '{}'::jsonb,
    results_count INTEGER NOT NULL DEFAULT 0,
    top_score DECIMAL(5, 4),
    avg_score DECIMAL(5, 4),
    processing_time_ms INTEGER,
    search_type VARCHAR(50) DEFAULT 'semantic' CHECK (search_type IN ('semantic', 'keyword', 'hybrid')),
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for semantic search sessions
CREATE INDEX IF NOT EXISTS idx_semantic_search_user_id ON semantic_search_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_search_created_at ON semantic_search_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_search_type ON semantic_search_sessions(search_type);
CREATE INDEX IF NOT EXISTS idx_semantic_search_results_count ON semantic_search_sessions(results_count);

-- Create document_chunks table for tracking chunk information (optional, for debugging/analytics)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
    pinecone_id VARCHAR(255) UNIQUE NOT NULL,
    chunk_index INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    character_count INTEGER NOT NULL DEFAULT 0,
    sentence_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- Create indexes for document chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_pinecone_id ON document_chunks(pinecone_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(chunk_index);

-- Create knowledge_base_analytics table for analytics and insights
CREATE TABLE IF NOT EXISTS knowledge_base_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('daily_searches', 'document_views', 'embeddings_generated', 'storage_usage')),
    metric_value BIGINT NOT NULL DEFAULT 0,
    additional_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, metric_type)
);

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_knowledge_base_analytics_date ON knowledge_base_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_analytics_metric_type ON knowledge_base_analytics(metric_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for knowledge_base table
DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update analytics
CREATE OR REPLACE FUNCTION increment_daily_metric(metric_name TEXT, increment_value BIGINT DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    INSERT INTO knowledge_base_analytics (date, metric_type, metric_value)
    VALUES (CURRENT_DATE, metric_name, increment_value)
    ON CONFLICT (date, metric_type)
    DO UPDATE SET 
        metric_value = knowledge_base_analytics.metric_value + increment_value,
        created_at = NOW();
END;
$$ language 'plpgsql';

-- Insert initial analytics data
INSERT INTO knowledge_base_analytics (date, metric_type, metric_value) 
VALUES 
    (CURRENT_DATE, 'daily_searches', 0),
    (CURRENT_DATE, 'document_views', 0),
    (CURRENT_DATE, 'embeddings_generated', 0),
    (CURRENT_DATE, 'storage_usage', 0)
ON CONFLICT (date, metric_type) DO NOTHING;

-- Create function to clean up old analytics data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS VOID AS $$
BEGIN
    DELETE FROM knowledge_base_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '90 days';
    
    DELETE FROM embedding_usage_stats 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM semantic_search_sessions 
    WHERE created_at < NOW() - INTERVAL '30 days' AND feedback_rating IS NULL;
END;
$$ language 'plpgsql';

-- Create some sample knowledge base entries for testing
INSERT INTO knowledge_base (title, content, type, source, category, tags) VALUES
(
    'Enterprise Ireland Research, Development & Innovation Grant',
    'Enterprise Ireland offers Research, Development & Innovation (RD&I) funding to help Irish companies develop new or significantly improved products, processes or services. The grant supports projects that demonstrate technical and commercial merit, with funding typically covering up to 45% of eligible project costs. Eligible costs include staff costs, materials, equipment, consultancy, and travel. Projects must be led by an Irish company and demonstrate clear commercial potential.',
    'grant',
    'enterprise-ireland-rdi',
    'Research & Development',
    '["enterprise-ireland", "research", "development", "innovation", "product-development"]'
),
(
    'Science Foundation Ireland Investigator Programme',
    'The SFI Investigator Programme supports excellent principal investigators to carry out research in areas of science, technology, engineering and mathematics that are aligned with national priorities. Awards typically range from €400,000 to €2.5 million over 5 years. The programme aims to enable researchers to build capacity and capability to compete for larger awards such as European Research Council grants.',
    'grant',
    'sfi-investigator',
    'Research & Development',
    '["sfi", "science-foundation-ireland", "research", "stem", "investigator"]'
),
(
    'Ireland Strategic Banking Corporation Loan Guarantee Scheme',
    'The Ireland Strategic Banking Corporation (ISBM) Loan Guarantee Scheme provides loan guarantees to financial institutions to encourage lending to SMEs. The scheme covers various sectors and supports working capital, asset purchase, and development finance. Loans can range from €25,000 to €3 million with terms up to 10 years.',
    'grant',
    'isbm-loan-guarantee',
    'Business Development',
    '["isbm", "loan-guarantee", "sme", "finance", "working-capital"]'
);

-- Add comments to tables for documentation
COMMENT ON TABLE knowledge_base IS 'Stores documents and content for the RAG knowledge base system';
COMMENT ON TABLE embedding_usage_stats IS 'Tracks embedding generation usage, costs, and performance metrics';
COMMENT ON TABLE semantic_search_sessions IS 'Logs semantic search queries and user feedback for improvement';
COMMENT ON TABLE document_chunks IS 'Stores metadata about document chunks stored in Pinecone vector database';
COMMENT ON TABLE knowledge_base_analytics IS 'Aggregated analytics data for knowledge base usage and performance';

COMMENT ON COLUMN knowledge_base.embedding_status IS 'Status of embedding generation: pending, processing, completed, or failed';
COMMENT ON COLUMN knowledge_base.tags IS 'JSON array of tags for categorization and filtering';
COMMENT ON COLUMN embedding_usage_stats.estimated_cost IS 'Estimated cost in USD for the embedding operation';
COMMENT ON COLUMN semantic_search_sessions.filter_params IS 'JSON object containing search filters applied';
COMMENT ON COLUMN document_chunks.pinecone_id IS 'Unique identifier for the chunk in Pinecone vector database';

-- Grant permissions (adjust based on your database user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_base TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON embedding_usage_stats TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON semantic_search_sessions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON document_chunks TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_base_analytics TO your_app_user;