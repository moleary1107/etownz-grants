-- Migration 007: Grant Monitoring and Alert System (Fixed)
-- Create tables for automated grant monitoring and notifications
-- Fixed to handle proper table creation order and dependencies

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

-- Grant Alerts Table (create first, before notification_queue references it)
CREATE TABLE IF NOT EXISTS grant_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    rule_id INTEGER NOT NULL,
    grant_id VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('new_grant', 'deadline_reminder', 'criteria_match', 'ai_recommendation')),
    match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
    match_reasons JSONB NOT NULL DEFAULT '[]',
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels JSONB DEFAULT '[]',
    user_action VARCHAR(20) CHECK (user_action IN ('dismissed', 'saved', 'applied', 'viewed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints after table creation
ALTER TABLE grant_alerts 
ADD CONSTRAINT fk_grant_alerts_rule_id 
FOREIGN KEY (rule_id) REFERENCES monitoring_rules(id) ON DELETE CASCADE;

-- Only add grants table reference if grants table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grants') THEN
        ALTER TABLE grant_alerts 
        ADD CONSTRAINT fk_grant_alerts_grant_id 
        FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE;
    END IF;
END $$;

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
    alert_id INTEGER NOT NULL,
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

-- Add foreign key constraint for notification_queue after grant_alerts exists
ALTER TABLE notification_queue 
ADD CONSTRAINT fk_notification_queue_alert_id 
FOREIGN KEY (alert_id) REFERENCES grant_alerts(id) ON DELETE CASCADE;

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
    alert_id INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    rule_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'viewed', 'dismissed', 'saved', 'applied', 'expired')),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_seconds INTEGER, -- Time from alert creation to action
    device_type VARCHAR(20), -- 'web', 'mobile', 'email'
    user_agent TEXT,
    ip_address INET
);

-- Add foreign key constraints for alert_analytics
ALTER TABLE alert_analytics 
ADD CONSTRAINT fk_alert_analytics_alert_id 
FOREIGN KEY (alert_id) REFERENCES grant_alerts(id) ON DELETE CASCADE;

ALTER TABLE alert_analytics 
ADD CONSTRAINT fk_alert_analytics_rule_id 
FOREIGN KEY (rule_id) REFERENCES monitoring_rules(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_user_id ON monitoring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_active ON monitoring_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_user_id ON grant_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_rule_id ON grant_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_grant_id ON grant_alerts(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_type ON grant_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_grant_alerts_expires ON grant_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_alert_analytics_alert_id ON alert_analytics(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_analytics_user_id ON alert_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_analytics_event_type ON alert_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_alert_analytics_timestamp ON alert_analytics(event_timestamp);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_monitoring_rules_updated_at ON monitoring_rules;
CREATE TRIGGER update_monitoring_rules_updated_at 
    BEFORE UPDATE ON monitoring_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grant_alerts_updated_at ON grant_alerts;
CREATE TRIGGER update_grant_alerts_updated_at 
    BEFORE UPDATE ON grant_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();