-- AI Monitoring System Migration
-- Creates tables for AI metrics collection, alerts, and performance monitoring

-- AI Metrics Table
CREATE TABLE IF NOT EXISTS ai_metrics (
    id VARCHAR(255) PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(20,8) NOT NULL,
    labels JSONB,
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI metrics
CREATE INDEX IF NOT EXISTS idx_ai_metrics_name_timestamp ON ai_metrics (metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_source_timestamp ON ai_metrics (source, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_timestamp ON ai_metrics (timestamp);

-- AI Alerts Table
CREATE TABLE IF NOT EXISTS ai_alerts (
    id VARCHAR(255) PRIMARY KEY,
    alert_name VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    condition_text TEXT NOT NULL,
    current_value DECIMAL(20,8) NOT NULL,
    threshold_value DECIMAL(20,8) NOT NULL,
    status VARCHAR(20) NOT NULL,
    fired_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP NULL,
    description TEXT,
    actions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI alerts
CREATE INDEX IF NOT EXISTS idx_ai_alerts_status_severity ON ai_alerts (status, severity);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_fired_at ON ai_alerts (fired_at);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_alert_name ON ai_alerts (alert_name);

-- AI Dashboard Cache Table
CREATE TABLE IF NOT EXISTS ai_dashboard_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI dashboard cache
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_dashboard_cache (expires_at);

-- AI Performance Snapshots Table (for historical performance tracking)
CREATE TABLE IF NOT EXISTS ai_performance_snapshots (
    id VARCHAR(255) PRIMARY KEY,
    snapshot_time TIMESTAMP NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    average_response_time INTEGER NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    active_providers INTEGER NOT NULL DEFAULT 0,
    healthy_providers INTEGER NOT NULL DEFAULT 0,
    queue_depth INTEGER NOT NULL DEFAULT 0,
    provider_metrics JSONB,
    model_metrics JSONB,
    operation_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI performance snapshots
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_time ON ai_performance_snapshots (snapshot_time);

-- Insert default alert rules
INSERT INTO ai_alerts (id, alert_name, severity, condition_text, current_value, threshold_value, status, fired_at, description, actions)
VALUES 
    ('high_error_rate', 'High AI Error Rate', 'critical', 'error_rate > 5', 0, 5, 'resolved', CURRENT_TIMESTAMP, 'AI error rate is above acceptable threshold', '["notify_team", "switch_provider"]'::jsonb),
    ('high_response_time', 'High AI Response Time', 'high', 'avg_response_time > 10000', 0, 10000, 'resolved', CURRENT_TIMESTAMP, 'AI response time is above acceptable threshold', '["check_providers", "optimize_queries"]'::jsonb),
    ('high_cost_rate', 'High AI Cost Rate', 'medium', 'cost_per_hour > 500', 0, 500, 'resolved', CURRENT_TIMESTAMP, 'AI cost rate is above budget threshold', '["review_usage", "optimize_models"]'::jsonb),
    ('provider_unhealthy', 'AI Provider Unhealthy', 'high', 'healthy_providers < 1', 1, 1, 'resolved', CURRENT_TIMESTAMP, 'Less than minimum healthy AI providers available', '["check_providers", "activate_backup"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert default metrics for baseline
INSERT INTO ai_metrics (id, metric_name, metric_type, value, labels, timestamp, source)
VALUES 
    ('init_requests_total', 'ai_requests_total', 'counter', 0, '{"service": "initialization"}'::jsonb, CURRENT_TIMESTAMP, 'monitoring_service'),
    ('init_cost_total', 'ai_cost_total', 'counter', 0, '{"service": "initialization"}'::jsonb, CURRENT_TIMESTAMP, 'monitoring_service'),
    ('init_providers_active', 'ai_providers_active', 'gauge', 0, '{"service": "initialization"}'::jsonb, CURRENT_TIMESTAMP, 'monitoring_service'),
    ('init_system_health', 'ai_system_health_score', 'gauge', 100, '{"service": "initialization"}'::jsonb, CURRENT_TIMESTAMP, 'monitoring_service')
ON CONFLICT (id) DO NOTHING;

-- Create function to clean up old metrics data
CREATE OR REPLACE FUNCTION cleanup_old_ai_metrics(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_metrics 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old cache entries
    DELETE FROM ai_dashboard_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean up old performance snapshots (keep more of these)
    DELETE FROM ai_performance_snapshots 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * (retention_days * 3);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to create performance snapshot
CREATE OR REPLACE FUNCTION create_ai_performance_snapshot()
RETURNS VOID AS $$
DECLARE
    snapshot_id VARCHAR(255);
    total_reqs INTEGER := 0;
    total_cost_val DECIMAL(10,4) := 0;
    avg_response INTEGER := 0;
    error_rate_val DECIMAL(5,4) := 0;
    active_provs INTEGER := 0;
    healthy_provs INTEGER := 0;
    queue_depth_val INTEGER := 0;
BEGIN
    -- Generate snapshot ID
    snapshot_id := 'snapshot_' || EXTRACT(epoch FROM CURRENT_TIMESTAMP)::VARCHAR || '_' || substring(md5(random()::text) from 1 for 8);
    
    -- Calculate metrics from recent data (last hour)
    SELECT 
        COUNT(*),
        COALESCE(SUM(cost), 0),
        COALESCE(AVG(response_time), 0),
        COALESCE(COUNT(*) FILTER (WHERE status = 'error') * 100.0 / NULLIF(COUNT(*), 0), 0)
    INTO total_reqs, total_cost_val, avg_response, error_rate_val
    FROM ai_request_logs 
    WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    -- Get provider counts
    SELECT 
        COUNT(*) FILTER (WHERE is_active = true),
        COUNT(*) FILTER (WHERE is_active = true AND (health_status->>'isHealthy')::boolean = true)
    INTO active_provs, healthy_provs
    FROM ai_providers;
    
    -- Insert snapshot
    INSERT INTO ai_performance_snapshots (
        id, snapshot_time, total_requests, total_cost, average_response_time,
        error_rate, active_providers, healthy_providers, queue_depth
    ) VALUES (
        snapshot_id, CURRENT_TIMESTAMP, total_reqs, total_cost_val, avg_response,
        error_rate_val, active_provs, healthy_provs, queue_depth_val
    );
    
END;
$$ LANGUAGE plpgsql;