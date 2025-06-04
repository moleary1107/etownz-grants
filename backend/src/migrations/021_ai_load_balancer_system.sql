-- AI Load Balancer System Migration
-- Creates tables for AI provider management, load balancing, and scaling

-- AI Providers Table
CREATE TABLE IF NOT EXISTS ai_providers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    models JSONB NOT NULL,
    rate_limit JSONB NOT NULL,
    health_status JSONB NOT NULL,
    cost JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI providers
CREATE INDEX IF NOT EXISTS idx_ai_providers_type_active ON ai_providers (type, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_providers_priority_active ON ai_providers (priority, is_active);

-- AI Scaling Policies Table
CREATE TABLE IF NOT EXISTS ai_scaling_policies (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trigger_metric VARCHAR(50) NOT NULL,
    threshold DECIMAL(10,4) NOT NULL,
    scale_action VARCHAR(50) NOT NULL,
    cooldown_period INTEGER NOT NULL DEFAULT 300,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI scaling policies
CREATE INDEX IF NOT EXISTS idx_ai_scaling_metric_active ON ai_scaling_policies (trigger_metric, is_active);

-- AI Request Logs Table
CREATE TABLE IF NOT EXISTS ai_request_logs (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    cost DECIMAL(10,4) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    queue_time INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI request logs
CREATE INDEX IF NOT EXISTS idx_ai_logs_provider_timestamp ON ai_request_logs (provider_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status_timestamp ON ai_request_logs (status, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_logs_request_id ON ai_request_logs (request_id);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_ai_providers_updated_at ON ai_providers;
CREATE TRIGGER update_ai_providers_updated_at
    BEFORE UPDATE ON ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_scaling_policies_updated_at ON ai_scaling_policies;
CREATE TRIGGER update_ai_scaling_policies_updated_at
    BEFORE UPDATE ON ai_scaling_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default AI providers (inactive by default)
INSERT INTO ai_providers (id, name, type, endpoint, api_key, models, rate_limit, health_status, cost, priority, is_active)
VALUES 
    ('openai_default', 'OpenAI GPT', 'openai', 'https://api.openai.com/v1', 'sk-placeholder', 
     '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]'::jsonb,
     '{"requestsPerMinute": 500, "tokensPerMinute": 80000, "currentRequests": 0, "currentTokens": 0, "lastReset": "2024-01-01T00:00:00Z"}'::jsonb,
     '{"isHealthy": true, "lastCheck": "2024-01-01T00:00:00Z", "responseTime": 1000, "errorRate": 0, "uptime": 99.9}'::jsonb,
     '{"inputCostPer1MTokens": 5.00, "outputCostPer1MTokens": 15.00}'::jsonb,
     8, false),
    ('anthropic_default', 'Anthropic Claude', 'anthropic', 'https://api.anthropic.com/v1', 'sk-placeholder',
     '["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]'::jsonb,
     '{"requestsPerMinute": 300, "tokensPerMinute": 60000, "currentRequests": 0, "currentTokens": 0, "lastReset": "2024-01-01T00:00:00Z"}'::jsonb,
     '{"isHealthy": true, "lastCheck": "2024-01-01T00:00:00Z", "responseTime": 1200, "errorRate": 0, "uptime": 99.8}'::jsonb,
     '{"inputCostPer1MTokens": 3.00, "outputCostPer1MTokens": 15.00}'::jsonb,
     7, false)
ON CONFLICT (id) DO NOTHING;

-- Insert default scaling policies
INSERT INTO ai_scaling_policies (id, name, trigger_metric, threshold, scale_action, cooldown_period, is_active)
VALUES 
    ('error_rate_policy', 'High Error Rate Scale Down', 'error_rate', 5.0, 'switch_provider', 300, true),
    ('response_time_policy', 'High Latency Switch Provider', 'response_time', 5000.0, 'switch_provider', 180, true),
    ('queue_depth_policy', 'High Queue Depth Scale Up', 'queue_depth', 50.0, 'scale_up', 120, true),
    ('cost_policy', 'High Cost Rate Throttle', 'cost', 1000.0, 'throttle', 600, true)
ON CONFLICT (id) DO NOTHING;