-- AI Cost Management System Migration
-- Creates tables for AI usage tracking, cost optimization, and threshold management

-- AI Usage Metrics Table
CREATE TABLE IF NOT EXISTS ai_usage_metrics (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255),
    service VARCHAR(50) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    endpoint VARCHAR(255),
    request_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI usage metrics
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_timestamp ON ai_usage_metrics (user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_timestamp ON ai_usage_metrics (organization_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_service_operation ON ai_usage_metrics (service, operation);
CREATE INDEX IF NOT EXISTS idx_ai_usage_status_timestamp ON ai_usage_metrics (status, timestamp);

-- AI Cost Thresholds Table
CREATE TABLE IF NOT EXISTS ai_cost_thresholds (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    type VARCHAR(20) NOT NULL,
    limit_amount DECIMAL(10,4) NOT NULL,
    current_usage DECIMAL(10,4) NOT NULL DEFAULT 0,
    reset_date TIMESTAMP NOT NULL,
    alert_threshold INTEGER NOT NULL DEFAULT 80,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI cost thresholds
CREATE INDEX IF NOT EXISTS idx_ai_thresholds_org_type_active ON ai_cost_thresholds (organization_id, type, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_thresholds_user_type_active ON ai_cost_thresholds (user_id, type, is_active);

-- AI Optimization Suggestions Table
CREATE TABLE IF NOT EXISTS ai_optimization_suggestions (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    potential_savings DECIMAL(10,4) NOT NULL,
    implementation_effort VARCHAR(20) NOT NULL,
    action_items JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    implemented_at TIMESTAMP NULL
);

-- Create indexes for AI optimization suggestions
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org_priority_status ON ai_optimization_suggestions (organization_id, priority, status);

-- Add some initial cost threshold templates
INSERT INTO ai_cost_thresholds (id, organization_id, user_id, type, limit_amount, reset_date, alert_threshold, is_active, notification_sent)
VALUES 
    ('default_daily_org', 'default', NULL, 'daily', 1000.00, CURRENT_TIMESTAMP + INTERVAL '1 day', 80, false, false),
    ('default_monthly_org', 'default', NULL, 'monthly', 10000.00, CURRENT_TIMESTAMP + INTERVAL '1 month', 80, false, false)
ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for ai_cost_thresholds
DROP TRIGGER IF EXISTS update_ai_cost_thresholds_updated_at ON ai_cost_thresholds;
CREATE TRIGGER update_ai_cost_thresholds_updated_at
    BEFORE UPDATE ON ai_cost_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();