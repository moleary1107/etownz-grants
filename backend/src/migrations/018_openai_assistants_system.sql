-- OpenAI Assistants System Migration
-- This migration creates tables for managing OpenAI Assistants integration

BEGIN;

-- Table for storing OpenAI Assistant configurations
CREATE TABLE openai_assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_key VARCHAR(50) UNIQUE NOT NULL,
    assistant_id VARCHAR(100) NOT NULL, -- OpenAI Assistant ID
    name VARCHAR(255) NOT NULL,
    model VARCHAR(50) NOT NULL,
    instructions TEXT NOT NULL,
    tools JSONB DEFAULT '[]'::jsonb,
    file_ids TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for managing OpenAI conversation threads
CREATE TABLE openai_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(100) UNIQUE NOT NULL, -- OpenAI Thread ID
    assistant_id VARCHAR(100) NOT NULL, -- References openai_assistants.assistant_id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grant_application_id UUID REFERENCES grant_applications(id) ON DELETE CASCADE,
    title VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking assistant interactions and usage
CREATE TABLE openai_assistant_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(100) NOT NULL, -- References openai_threads.thread_id
    assistant_id VARCHAR(100) NOT NULL, -- OpenAI Assistant ID
    run_id VARCHAR(100), -- OpenAI Run ID
    interaction_type VARCHAR(50) NOT NULL, -- 'section_generation', 'compliance_check', 'budget_optimization', etc.
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    confidence_score DECIMAL(3,2),
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    cost_estimate DECIMAL(10,4), -- Estimated cost in dollars
    model_used VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for assistant usage analytics
CREATE TABLE assistant_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assistant_key VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    interactions_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10,4) DEFAULT 0,
    avg_confidence DECIMAL(3,2),
    avg_rating DECIMAL(3,2),
    avg_processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, assistant_key, date)
);

-- Table for assistant file uploads and management
CREATE TABLE assistant_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id VARCHAR(100) UNIQUE NOT NULL, -- OpenAI File ID
    assistant_key VARCHAR(50), -- Which assistant this file belongs to
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    purpose VARCHAR(50) DEFAULT 'assistants', -- OpenAI file purpose
    upload_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grant_application_id UUID REFERENCES grant_applications(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table for tracking assistant conversation history
CREATE TABLE assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(100) NOT NULL, -- References openai_threads.thread_id
    message_id VARCHAR(100) UNIQUE NOT NULL, -- OpenAI Message ID
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    file_ids TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for assistant performance metrics
CREATE TABLE assistant_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_key VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20),
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assistant_key, metric_name, date, hour)
);

-- Create indexes for performance optimization
CREATE INDEX idx_openai_assistants_key ON openai_assistants(assistant_key);
CREATE INDEX idx_openai_assistants_status ON openai_assistants(status);

CREATE INDEX idx_openai_threads_user ON openai_threads(user_id);
CREATE INDEX idx_openai_threads_assistant ON openai_threads(assistant_id);
CREATE INDEX idx_openai_threads_grant ON openai_threads(grant_application_id);
CREATE INDEX idx_openai_threads_status ON openai_threads(status);
CREATE INDEX idx_openai_threads_created ON openai_threads(created_at);

CREATE INDEX idx_assistant_interactions_thread ON openai_assistant_interactions(thread_id);
CREATE INDEX idx_assistant_interactions_assistant ON openai_assistant_interactions(assistant_id);
CREATE INDEX idx_assistant_interactions_type ON openai_assistant_interactions(interaction_type);
CREATE INDEX idx_assistant_interactions_created ON openai_assistant_interactions(created_at);
CREATE INDEX idx_assistant_interactions_tokens ON openai_assistant_interactions(tokens_used);

CREATE INDEX idx_usage_analytics_user_date ON assistant_usage_analytics(user_id, date);
CREATE INDEX idx_usage_analytics_assistant_date ON assistant_usage_analytics(assistant_key, date);

CREATE INDEX idx_assistant_files_assistant ON assistant_files(assistant_key);
CREATE INDEX idx_assistant_files_user ON assistant_files(upload_user_id);
CREATE INDEX idx_assistant_files_status ON assistant_files(status);

CREATE INDEX idx_assistant_messages_thread ON assistant_messages(thread_id);
CREATE INDEX idx_assistant_messages_role ON assistant_messages(role);
CREATE INDEX idx_assistant_messages_created ON assistant_messages(created_at);

CREATE INDEX idx_performance_metrics_assistant_date ON assistant_performance_metrics(assistant_key, date);
CREATE INDEX idx_performance_metrics_name ON assistant_performance_metrics(metric_name);

-- Create functions for usage analytics
CREATE OR REPLACE FUNCTION update_assistant_usage_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO assistant_usage_analytics (
        user_id, 
        assistant_key, 
        date, 
        interactions_count, 
        tokens_used, 
        cost_estimate,
        avg_confidence,
        avg_processing_time_ms
    )
    SELECT 
        t.user_id,
        a.assistant_key,
        DATE(NEW.created_at),
        1,
        COALESCE(NEW.tokens_used, 0),
        COALESCE(NEW.cost_estimate, 0),
        NEW.confidence_score,
        COALESCE(NEW.processing_time_ms, 0)
    FROM openai_threads t
    JOIN openai_assistants a ON a.assistant_id = NEW.assistant_id
    WHERE t.thread_id = NEW.thread_id
    ON CONFLICT (user_id, assistant_key, date)
    DO UPDATE SET
        interactions_count = assistant_usage_analytics.interactions_count + 1,
        tokens_used = assistant_usage_analytics.tokens_used + COALESCE(NEW.tokens_used, 0),
        cost_estimate = assistant_usage_analytics.cost_estimate + COALESCE(NEW.cost_estimate, 0),
        avg_confidence = (
            assistant_usage_analytics.avg_confidence * (assistant_usage_analytics.interactions_count - 1) + 
            COALESCE(NEW.confidence_score, 0)
        ) / assistant_usage_analytics.interactions_count,
        avg_processing_time_ms = (
            assistant_usage_analytics.avg_processing_time_ms * (assistant_usage_analytics.interactions_count - 1) + 
            COALESCE(NEW.processing_time_ms, 0)
        ) / assistant_usage_analytics.interactions_count,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for usage analytics
CREATE TRIGGER trigger_update_assistant_usage_analytics
    AFTER INSERT ON openai_assistant_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_assistant_usage_analytics();

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_assistant_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up old interactions (keep last 90 days by default)
    DELETE FROM openai_assistant_interactions 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old messages for deleted threads
    DELETE FROM assistant_messages 
    WHERE thread_id NOT IN (SELECT thread_id FROM openai_threads);
    
    -- Clean up old analytics data (keep last 1 year)
    DELETE FROM assistant_usage_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '1 year';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert initial assistant configurations
INSERT INTO openai_assistants (assistant_key, assistant_id, name, model, instructions, tools) VALUES
('proposal_writer', 'temp_id_1', 'Grant Proposal Writer', 'gpt-4-turbo-preview', 
 'Expert grant proposal writer specializing in funding applications', '[{"type": "file_search"}, {"type": "code_interpreter"}]'),
('compliance_checker', 'temp_id_2', 'Grant Compliance Checker', 'gpt-4-turbo-preview',
 'Meticulous compliance specialist for grant requirements validation', '[{"type": "file_search"}]'),
('budget_analyst', 'temp_id_3', 'Grant Budget Analyst', 'gpt-4-turbo-preview',
 'Specialized budget analyst for grant financial planning', '[{"type": "file_search"}, {"type": "code_interpreter"}]'),
('requirements_analyzer', 'temp_id_4', 'Grant Requirements Analyzer', 'gpt-4-turbo-preview',
 'Expert at extracting and analyzing grant requirements', '[{"type": "file_search"}]'),
('impact_strategist', 'temp_id_5', 'Grant Impact Strategist', 'gpt-4-turbo-preview',
 'Strategic advisor for developing compelling impact narratives', '[{"type": "file_search"}, {"type": "code_interpreter"}]');

-- Create views for common queries
CREATE VIEW assistant_usage_summary AS
SELECT 
    a.assistant_key,
    a.name,
    COUNT(DISTINCT t.user_id) as unique_users,
    COUNT(i.id) as total_interactions,
    SUM(i.tokens_used) as total_tokens,
    SUM(i.cost_estimate) as total_cost,
    AVG(i.confidence_score) as avg_confidence,
    AVG(i.processing_time_ms) as avg_processing_time,
    AVG(i.user_rating) as avg_rating
FROM openai_assistants a
LEFT JOIN openai_threads t ON a.assistant_id = t.assistant_id
LEFT JOIN openai_assistant_interactions i ON t.thread_id = i.thread_id
WHERE a.status = 'active'
GROUP BY a.assistant_key, a.name;

CREATE VIEW daily_assistant_metrics AS
SELECT 
    DATE(created_at) as date,
    assistant_key,
    COUNT(*) as interactions,
    SUM(tokens_used) as tokens,
    SUM(cost_estimate) as cost,
    AVG(confidence_score) as avg_confidence,
    AVG(processing_time_ms) as avg_processing_time
FROM openai_assistant_interactions i
JOIN openai_assistants a ON i.assistant_id = a.assistant_id
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), assistant_key
ORDER BY date DESC, assistant_key;

-- Add comments for documentation
COMMENT ON TABLE openai_assistants IS 'Configuration and metadata for OpenAI Assistants';
COMMENT ON TABLE openai_threads IS 'Conversation threads between users and assistants';
COMMENT ON TABLE openai_assistant_interactions IS 'Individual interactions and their metrics';
COMMENT ON TABLE assistant_usage_analytics IS 'Aggregated usage analytics by user and assistant';
COMMENT ON TABLE assistant_files IS 'Files uploaded for assistant context';
COMMENT ON TABLE assistant_messages IS 'Individual messages in assistant conversations';
COMMENT ON TABLE assistant_performance_metrics IS 'Performance metrics for monitoring';

COMMIT;