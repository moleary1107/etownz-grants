-- Simple Grant Sources Table Creation
-- Creates table to persist grant source configurations from crawler service

CREATE TABLE IF NOT EXISTS grant_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_crawled TIMESTAMP WITH TIME ZONE,
    crawl_settings JSONB DEFAULT '{}',
    crawl_schedule VARCHAR(20) DEFAULT 'manual',
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    job_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE grant_sources IS 'Persistent storage for grant source configurations and status';
COMMENT ON TABLE job_queue IS 'Reliable job queue for scheduled crawling and processing tasks';