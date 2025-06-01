-- Initialize eTownz Grants Database
-- This script runs when PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address JSONB,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'member',
    auth_provider VARCHAR(50) DEFAULT 'email',
    auth_provider_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grants table
CREATE TABLE grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    funder VARCHAR(255),
    funder_type VARCHAR(100),
    amount_min DECIMAL(12,2),
    amount_max DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    url TEXT,
    source VARCHAR(100),
    categories TEXT[],
    eligibility_criteria JSONB DEFAULT '{}',
    required_documents TEXT[],
    application_process TEXT,
    contact_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    crawled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant applications/submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    application_data JSONB DEFAULT '{}',
    generated_content JSONB DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE,
    deadline_reminder_sent BOOLEAN DEFAULT false,
    result VARCHAR(50),
    result_reason TEXT,
    result_received_at TIMESTAMP WITH TIME ZONE,
    feedback JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document storage
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(100),
    file_size INTEGER,
    storage_path TEXT,
    extracted_text TEXT,
    document_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    service VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    tokens_used INTEGER DEFAULT 0,
    cost_eur DECIMAL(10,4) DEFAULT 0,
    request_data JSONB DEFAULT '{}',
    response_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions and billing
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    monthly_token_limit INTEGER,
    monthly_grants_limit INTEGER,
    tokens_used_this_month INTEGER DEFAULT 0,
    grants_used_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    deadline_reminders BOOLEAN DEFAULT true,
    new_grants BOOLEAN DEFAULT true,
    submission_updates BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant favorites/bookmarks
CREATE TABLE grant_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, grant_id)
);

-- Create indexes for performance
CREATE INDEX idx_grants_deadline ON grants(deadline);
CREATE INDEX idx_grants_funder ON grants(funder);
CREATE INDEX idx_grants_active ON grants(is_active);
CREATE INDEX idx_grants_categories ON grants USING GIN(categories);
CREATE INDEX idx_submissions_org_id ON submissions(org_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_deadline ON submissions(created_at);
CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_api_usage_org_id ON api_usage(org_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);

-- Insert some sample data for development
INSERT INTO organizations (name, description, contact_email) VALUES 
('Sample Tech Startup', 'A technology startup focused on AI solutions', 'contact@sampletech.ie'),
('Community Arts Centre', 'Local arts organization supporting community creativity', 'info@artscentre.ie');

INSERT INTO users (org_id, email, first_name, last_name, role) VALUES 
((SELECT id FROM organizations WHERE name = 'Sample Tech Startup'), 'admin@sampletech.ie', 'John', 'Smith', 'admin'),
((SELECT id FROM organizations WHERE name = 'Community Arts Centre'), 'director@artscentre.ie', 'Sarah', 'Johnson', 'admin');

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant sources for crawling
CREATE TABLE grant_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    source_type VARCHAR(50) DEFAULT 'website',
    country VARCHAR(2) DEFAULT 'IE',
    language VARCHAR(5) DEFAULT 'en',
    crawl_frequency VARCHAR(20) DEFAULT 'daily',
    last_crawled_at TIMESTAMP WITH TIME ZONE,
    next_crawl_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    crawl_settings JSONB DEFAULT '{
        "depth": 2,
        "includePatterns": [],
        "excludePatterns": [],
        "followPdfs": true,
        "followDocx": true,
        "respectRobotsTxt": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crawl jobs for tracking scraping progress
CREATE TABLE crawl_jobs (
    id VARCHAR(255) PRIMARY KEY,
    source_id UUID REFERENCES grant_sources(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    stats JSONB DEFAULT '{
        "pagesProcessed": 0,
        "grantsDiscovered": 0,
        "grantsUpdated": 0,
        "documentsProcessed": 0
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crawl logs for detailed job tracking
CREATE TABLE crawl_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(255) REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    url TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discovered grants from crawling (before processing)
CREATE TABLE discovered_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES grant_sources(id) ON DELETE CASCADE,
    job_id VARCHAR(255) REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    title TEXT NOT NULL,
    description TEXT,
    provider VARCHAR(255),
    url TEXT,
    amount_text TEXT,
    amount_min DECIMAL(12,2),
    amount_max DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    deadline TIMESTAMP WITH TIME ZONE,
    deadline_text TEXT,
    categories TEXT[],
    location_restrictions TEXT[],
    document_urls TEXT[],
    eligibility_text TEXT,
    eligibility_criteria JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    processing_status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    grant_id UUID REFERENCES grants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_id, external_id)
);

-- Grant eligibility matches for organizations
CREATE TABLE grant_eligibility_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    match_score DECIMAL(3,2) NOT NULL,
    matching_criteria JSONB DEFAULT '{}',
    ai_analysis TEXT,
    recommendation VARCHAR(20) DEFAULT 'consider',
    is_notified BOOLEAN DEFAULT false,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(grant_id, org_id)
);

-- Webhook configurations
CREATE TABLE webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT ARRAY['new_grant_match', 'deadline_reminder'],
    is_active BOOLEAN DEFAULT true,
    secret_key VARCHAR(255),
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook deliveries for tracking
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_config_id UUID REFERENCES webhook_configs(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    response_status INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance analytics
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant discovery metrics
CREATE TABLE discovery_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    source_id UUID REFERENCES grant_sources(id),
    org_id UUID REFERENCES organizations(id),
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, source_id, org_id, metric_type)
);

-- Additional indexes for crawler tables
CREATE INDEX idx_grant_sources_active ON grant_sources(is_active);
CREATE INDEX idx_grant_sources_next_crawl ON grant_sources(next_crawl_at);
CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX idx_crawl_jobs_started_at ON crawl_jobs(started_at);
CREATE INDEX idx_crawl_logs_job_id ON crawl_logs(job_id);
CREATE INDEX idx_crawl_logs_level ON crawl_logs(level);
CREATE INDEX idx_discovered_grants_status ON discovered_grants(processing_status);
CREATE INDEX idx_discovered_grants_confidence ON discovered_grants(confidence_score);
CREATE INDEX idx_eligibility_matches_score ON grant_eligibility_matches(match_score);
CREATE INDEX idx_eligibility_matches_notified ON grant_eligibility_matches(is_notified);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_date ON analytics_events(created_at);
CREATE INDEX idx_discovery_metrics_date ON discovery_metrics(date);

-- Insert sample grant sources
INSERT INTO grant_sources (name, url, description, source_type, country) VALUES 
('LocalGov.ie Grants', 'https://www.localgov.ie/grants-and-funding', 'Irish local government grants and funding opportunities', 'website', 'IE'),
('Enterprise Ireland', 'https://www.enterprise-ireland.com/en/funding-supports/', 'Enterprise Ireland funding supports for businesses', 'website', 'IE'),
('Science Foundation Ireland', 'https://www.sfi.ie/funding/', 'Research and innovation funding from SFI', 'website', 'IE'),
('Citizens Information', 'https://www.citizensinformation.ie/en/money-and-tax/financial-support/', 'Government financial support schemes', 'website', 'IE');

-- Apply triggers to new tables
CREATE TRIGGER update_grant_sources_updated_at BEFORE UPDATE ON grant_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crawl_jobs_updated_at BEFORE UPDATE ON crawl_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discovered_grants_updated_at BEFORE UPDATE ON discovered_grants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grant_eligibility_matches_updated_at BEFORE UPDATE ON grant_eligibility_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_configs_updated_at BEFORE UPDATE ON webhook_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON grants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();