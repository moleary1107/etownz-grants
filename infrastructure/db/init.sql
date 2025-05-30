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

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON grants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();