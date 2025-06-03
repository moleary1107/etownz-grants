-- Migration: Enhanced Grant Fields for Better Matching and Management
-- Purpose: Add missing critical fields identified in requirements analysis

-- Add grant coverage percentage (e.g., 70%, 100%)
ALTER TABLE grants 
ADD COLUMN IF NOT EXISTS coverage_percentage INTEGER DEFAULT 100,
ADD CONSTRAINT check_coverage_percentage CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100);

-- Add drawdown and completion dates
ALTER TABLE grants
ADD COLUMN IF NOT EXISTS drawdown_dates JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS completion_deadline DATE,
ADD COLUMN IF NOT EXISTS payment_schedule TEXT;

-- Removed eTownz themes as per requirements

-- Add detailed required documents structure
ALTER TABLE grants
ADD COLUMN IF NOT EXISTS required_documents_detailed JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50) DEFAULT 'platform',
ADD COLUMN IF NOT EXISTS submission_instructions TEXT,
ADD COLUMN IF NOT EXISTS full_document_url TEXT;

-- Add additional business fields
ALTER TABLE grants
ADD COLUMN IF NOT EXISTS total_fund_budget DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS location_specific TEXT[],
ADD COLUMN IF NOT EXISTS is_rolling_deadline BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS application_tips TEXT;


-- Create consultant/provider directory table for future use
CREATE TABLE IF NOT EXISTS provider_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(200) NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- 'consultant', 'trainer', 'contractor', etc.
  specializations TEXT[],
  categories TEXT[], -- Use standard categories instead of themes
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website_url TEXT,
  standard_rates JSONB DEFAULT '{}',
  quick_quote_enabled BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create newsletter subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'weekly', -- 'weekly', 'daily', 'monthly'
  categories_filter TEXT[],
  amount_min INTEGER,
  amount_max INTEGER,
  locations_filter TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_grants_coverage ON grants(coverage_percentage);
CREATE INDEX IF NOT EXISTS idx_grants_submission_method ON grants(submission_method);
CREATE INDEX IF NOT EXISTS idx_grants_completion_deadline ON grants(completion_deadline);
CREATE INDEX IF NOT EXISTS idx_grants_location_specific ON grants USING GIN(location_specific);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(is_active, frequency);
CREATE INDEX IF NOT EXISTS idx_provider_categories ON provider_directory USING GIN(categories);