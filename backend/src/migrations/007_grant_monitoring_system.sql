-- Migration 007: Grant Monitoring and Alert System
-- Create tables for automated grant monitoring and notifications

-- Monitoring Rules Table
CREATE TABLE IF NOT EXISTS monitoring_rules (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('keyword_match', 'category_filter', 'amount_range', 'deadline_proximity', 'ai_similarity', 'custom_criteria')),
    criteria JSONB NOT NULL DEFAULT '{}',
    notification_settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant Alerts Table
CREATE TABLE IF NOT EXISTS grant_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    rule_id INTEGER NOT NULL REFERENCES monitoring_rules(id) ON DELETE CASCADE,
    grant_id VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('new_grant', 'deadline_reminder', 'criteria_match', 'ai_recommendation')),
    match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
    match_reasons JSONB NOT NULL DEFAULT '[]',
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels JSONB DEFAULT '[]',
    user_action VARCHAR(20) CHECK (user_action IN ('dismissed', 'saved', 'applied', 'viewed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE
);

-- Monitoring Jobs Table (for tracking scheduled jobs)
CREATE TABLE IF NOT EXISTS monitoring_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('new_grants_check', 'deadline_reminder', 'criteria_evaluation', 'ai_similarity_scan')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
    rules_processed INTEGER DEFAULT 0,
    grants_evaluated INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,
    errors_encountered JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Queue Table (for managing email/push notifications)
CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES grant_alerts(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('email', 'push', 'sms')),
    recipient VARCHAR(255) NOT NULL, -- email address, device token, phone number
    subject VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
    push_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (push_frequency IN ('immediate', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME, -- e.g., '22:00'
    quiet_hours_end TIME,   -- e.g., '08:00'
    timezone VARCHAR(50) DEFAULT 'UTC',
    max_alerts_per_day INTEGER DEFAULT 10,
    priority_threshold DECIMAL(3,2) DEFAULT 0.5 CHECK (priority_threshold >= 0 AND priority_threshold <= 1),
    categories_enabled TEXT[] DEFAULT '{}',
    categories_disabled TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert Analytics Table (for tracking user engagement and rule effectiveness)
CREATE TABLE IF NOT EXISTS alert_analytics (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES grant_alerts(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    rule_id INTEGER NOT NULL REFERENCES monitoring_rules(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'viewed', 'dismissed', 'saved', 'applied', 'expired')),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_seconds INTEGER, -- Time from alert creation to action
    session_id VARCHAR(255),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Scheduled Monitoring Tasks Table
CREATE TABLE IF NOT EXISTS scheduled_monitoring_tasks (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL UNIQUE,
    task_type VARCHAR(50) NOT NULL,
    schedule_expression VARCHAR(100) NOT NULL, -- Cron-like expression
    is_enabled BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_user_id ON monitoring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_active ON monitoring_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_type ON monitoring_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_last_triggered ON monitoring_rules(last_triggered DESC);

CREATE INDEX IF NOT EXISTS idx_grant_alerts_user_id ON grant_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_rule_id ON grant_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_grant_id ON grant_alerts(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_type ON grant_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_created_at ON grant_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_expires_at ON grant_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_user_action ON grant_alerts(user_action);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_unread ON grant_alerts(user_id, created_at) WHERE user_action IS NULL;

CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_status ON monitoring_jobs(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_type ON monitoring_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_next_run ON monitoring_jobs(next_run_at) WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_alert_analytics_user_id ON alert_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_analytics_rule_id ON alert_analytics(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_analytics_event_type ON alert_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_alert_analytics_timestamp ON alert_analytics(event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_monitoring_tasks(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_monitoring_tasks(next_run_at) WHERE is_enabled = TRUE;

-- Functions and Triggers

-- Function to automatically clean up expired alerts
CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete alerts that expired more than 30 days ago
    DELETE FROM grant_alerts 
    WHERE expires_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up related analytics data
    DELETE FROM alert_analytics 
    WHERE event_timestamp < NOW() - INTERVAL '90 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update rule statistics
CREATE OR REPLACE FUNCTION update_rule_effectiveness()
RETURNS TRIGGER AS $$
BEGIN
    -- Update rule trigger count and last triggered time
    IF NEW.user_action IS NOT NULL AND OLD.user_action IS NULL THEN
        -- User took action on this alert
        UPDATE monitoring_rules 
        SET 
            trigger_count = trigger_count + 1,
            last_triggered = NOW(),
            updated_at = NOW()
        WHERE id = NEW.rule_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track rule effectiveness
DROP TRIGGER IF EXISTS trigger_update_rule_effectiveness ON grant_alerts;
CREATE TRIGGER trigger_update_rule_effectiveness
    AFTER UPDATE ON grant_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_rule_effectiveness();

-- Function to automatically record alert analytics
CREATE OR REPLACE FUNCTION record_alert_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Record alert creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO alert_analytics (alert_id, user_id, rule_id, event_type, event_timestamp)
        VALUES (NEW.id, NEW.user_id, NEW.rule_id, 'created', NEW.created_at);
        
        RETURN NEW;
    END IF;
    
    -- Record user actions
    IF TG_OP = 'UPDATE' AND NEW.user_action IS NOT NULL AND OLD.user_action IS NULL THEN
        INSERT INTO alert_analytics (
            alert_id, 
            user_id, 
            rule_id, 
            event_type, 
            event_timestamp,
            response_time_seconds
        )
        VALUES (
            NEW.id, 
            NEW.user_id, 
            NEW.rule_id, 
            NEW.user_action, 
            NOW(),
            EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically record analytics
DROP TRIGGER IF EXISTS trigger_record_alert_analytics_insert ON grant_alerts;
CREATE TRIGGER trigger_record_alert_analytics_insert
    AFTER INSERT ON grant_alerts
    FOR EACH ROW
    EXECUTE FUNCTION record_alert_analytics();

DROP TRIGGER IF EXISTS trigger_record_alert_analytics_update ON grant_alerts;
CREATE TRIGGER trigger_record_alert_analytics_update
    AFTER UPDATE ON grant_alerts
    FOR EACH ROW
    EXECUTE FUNCTION record_alert_analytics();

-- Function to schedule next monitoring job runs
CREATE OR REPLACE FUNCTION schedule_next_monitoring_run()
RETURNS TRIGGER AS $$
BEGIN
    -- When a job completes, schedule the next run based on job type
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        CASE NEW.job_type
            WHEN 'new_grants_check' THEN
                NEW.next_run_at := NOW() + INTERVAL '1 hour';
            WHEN 'deadline_reminder' THEN
                NEW.next_run_at := NOW() + INTERVAL '4 hours';
            WHEN 'ai_similarity_scan' THEN
                NEW.next_run_at := NOW() + INTERVAL '6 hours';
            ELSE
                NEW.next_run_at := NOW() + INTERVAL '2 hours';
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to schedule next job runs
DROP TRIGGER IF EXISTS trigger_schedule_next_run ON monitoring_jobs;
CREATE TRIGGER trigger_schedule_next_run
    BEFORE UPDATE ON monitoring_jobs
    FOR EACH ROW
    EXECUTE FUNCTION schedule_next_monitoring_run();

-- Views for analytics and reporting

-- User Alert Summary View
CREATE OR REPLACE VIEW user_alert_summary AS
SELECT 
    user_id,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN alert_type = 'new_grant' THEN 1 END) as new_grant_alerts,
    COUNT(CASE WHEN alert_type = 'deadline_reminder' THEN 1 END) as deadline_alerts,
    COUNT(CASE WHEN alert_type = 'ai_recommendation' THEN 1 END) as ai_recommendation_alerts,
    COUNT(CASE WHEN user_action IS NOT NULL THEN 1 END) as actions_taken,
    COUNT(CASE WHEN user_action = 'dismissed' THEN 1 END) as dismissed_count,
    COUNT(CASE WHEN user_action = 'applied' THEN 1 END) as applied_count,
    AVG(match_score) as avg_match_score,
    MAX(created_at) as last_alert_at,
    DATE_TRUNC('day', created_at) as alert_date
FROM grant_alerts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE_TRUNC('day', created_at)
ORDER BY alert_date DESC;

-- Rule Performance View
CREATE OR REPLACE VIEW rule_performance AS
SELECT 
    mr.id,
    mr.name,
    mr.rule_type,
    mr.user_id,
    mr.trigger_count,
    COUNT(ga.id) as alerts_generated,
    COUNT(CASE WHEN ga.user_action IS NOT NULL THEN 1 END) as user_responses,
    COUNT(CASE WHEN ga.user_action = 'applied' THEN 1 END) as applications_triggered,
    AVG(ga.match_score) as avg_match_score,
    AVG(EXTRACT(EPOCH FROM (aa.event_timestamp - ga.created_at))) as avg_response_time_seconds,
    (COUNT(CASE WHEN ga.user_action IS NOT NULL THEN 1 END)::FLOAT / 
     NULLIF(COUNT(ga.id), 0)) as engagement_rate
FROM monitoring_rules mr
LEFT JOIN grant_alerts ga ON mr.id = ga.rule_id
LEFT JOIN alert_analytics aa ON ga.id = aa.alert_id AND aa.event_type IN ('viewed', 'saved', 'applied')
WHERE mr.created_at >= NOW() - INTERVAL '90 days'
GROUP BY mr.id, mr.name, mr.rule_type, mr.user_id, mr.trigger_count
ORDER BY engagement_rate DESC, alerts_generated DESC;

-- System Monitoring Dashboard View
CREATE OR REPLACE VIEW monitoring_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM monitoring_rules WHERE is_active = TRUE) as active_rules,
    (SELECT COUNT(*) FROM grant_alerts WHERE created_at >= CURRENT_DATE) as alerts_today,
    (SELECT COUNT(*) FROM grant_alerts WHERE created_at >= CURRENT_DATE AND user_action IS NOT NULL) as actions_today,
    (SELECT COUNT(*) FROM monitoring_jobs WHERE status = 'running') as running_jobs,
    (SELECT COUNT(*) FROM notification_queue WHERE status = 'pending') as pending_notifications,
    (SELECT AVG(match_score) FROM grant_alerts WHERE created_at >= CURRENT_DATE) as avg_match_score_today,
    (SELECT COUNT(DISTINCT user_id) FROM grant_alerts WHERE created_at >= CURRENT_DATE) as active_users_today;

-- Insert default scheduled monitoring tasks
INSERT INTO scheduled_monitoring_tasks (task_name, task_type, schedule_expression, next_run_at) VALUES
('new_grants_hourly', 'new_grants_check', '0 0 * * * *', NOW() + INTERVAL '1 hour'),
('deadline_reminders_4h', 'deadline_reminder', '0 0 */4 * * *', NOW() + INTERVAL '4 hours'),
('ai_similarity_6h', 'ai_similarity_scan', '0 0 */6 * * *', NOW() + INTERVAL '6 hours'),
('cleanup_expired_daily', 'cleanup_expired', '0 0 2 * * *', NOW() + INTERVAL '1 day')
ON CONFLICT (task_name) DO NOTHING;

-- Grant necessary permissions (uncomment and adjust for your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_rules TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON grant_alerts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_jobs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_queue TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_notification_preferences TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON alert_analytics TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_monitoring_tasks TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;