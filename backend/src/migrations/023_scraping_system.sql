-- Migration: Scraping System
-- Creates tables for enhanced scraping functionality with vector database integration

-- Scraped grants table for storing AI-extracted grants
CREATE TABLE IF NOT EXISTS scraped_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    source_url TEXT NOT NULL,
    amount_min DECIMAL(12,2),
    amount_max DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'EUR',
    deadline TIMESTAMP WITH TIME ZONE,
    eligibility JSONB DEFAULT '[]',
    categories JSONB DEFAULT '[]',
    grant_type VARCHAR(20) DEFAULT 'other' CHECK (grant_type IN ('national', 'regional', 'local', 'energy', 'research', 'business', 'arts', 'other')),
    contact_email TEXT,
    contact_phone TEXT,
    organization TEXT,
    location TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    added_to_vector_db BOOLEAN DEFAULT FALSE,
    vector_db_added_at TIMESTAMP WITH TIME ZONE,
    job_id UUID,
    extracted_from JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending grant reviews table for grants that need manual review
CREATE TABLE IF NOT EXISTS pending_grant_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_data JSONB NOT NULL,
    processed_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    reviewer_id UUID REFERENCES users(id),
    source_url TEXT,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Uploaded documents table for manual document uploads
CREATE TABLE IF NOT EXISTS uploaded_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'docx', 'doc', 'txt', 'url')),
    file_path TEXT,
    file_size INTEGER,
    grants_extracted INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    job_id UUID,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced firecrawl jobs table (extend existing or create if not exists)
CREATE TABLE IF NOT EXISTS enhanced_scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL,
    job_type VARCHAR(30) NOT NULL CHECK (job_type IN ('full_crawl', 'targeted_scrape', 'document_harvest', 'link_discovery', 'manual_url', 'manual_document')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    stats JSONB DEFAULT '{}',
    grant_categories JSONB DEFAULT '[]',
    configuration JSONB DEFAULT '{}',
    added_to_vector_db BOOLEAN DEFAULT FALSE,
    manual_input JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant statistics table for caching aggregated stats
CREATE TABLE IF NOT EXISTS grant_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_type VARCHAR(50) NOT NULL,
    stat_key VARCHAR(100) NOT NULL,
    stat_value INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stat_type, stat_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraped_grants_source_url ON scraped_grants(source_url);
CREATE INDEX IF NOT EXISTS idx_scraped_grants_grant_type ON scraped_grants(grant_type);
CREATE INDEX IF NOT EXISTS idx_scraped_grants_vector_db ON scraped_grants(added_to_vector_db);
CREATE INDEX IF NOT EXISTS idx_scraped_grants_confidence ON scraped_grants(confidence_score);
CREATE INDEX IF NOT EXISTS idx_scraped_grants_created ON scraped_grants(created_at);
CREATE INDEX IF NOT EXISTS idx_scraped_grants_job_id ON scraped_grants(job_id);

CREATE INDEX IF NOT EXISTS idx_pending_reviews_status ON pending_grant_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_pending_reviews_created ON pending_grant_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_reviews_confidence ON pending_grant_reviews(confidence_score);

CREATE INDEX IF NOT EXISTS idx_uploaded_docs_status ON uploaded_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_uploaded_docs_type ON uploaded_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_docs_created ON uploaded_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_docs_job_id ON uploaded_documents(job_id);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON enhanced_scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_type ON enhanced_scraping_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created ON enhanced_scraping_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_vector_db ON enhanced_scraping_jobs(added_to_vector_db);

CREATE INDEX IF NOT EXISTS idx_grant_stats_type_key ON grant_statistics(stat_type, stat_key);
CREATE INDEX IF NOT EXISTS idx_grant_stats_calculated ON grant_statistics(calculated_at);

-- Function to update grant statistics
CREATE OR REPLACE FUNCTION update_grant_statistics()
RETURNS VOID AS $$
BEGIN
    -- Update scraped grants statistics
    INSERT INTO grant_statistics (stat_type, stat_key, stat_value, calculated_at)
    VALUES ('scraped_grants', 'total', (SELECT COUNT(*) FROM scraped_grants), NOW())
    ON CONFLICT (stat_type, stat_key) 
    DO UPDATE SET stat_value = EXCLUDED.stat_value, calculated_at = EXCLUDED.calculated_at;
    
    INSERT INTO grant_statistics (stat_type, stat_key, stat_value, calculated_at)
    VALUES ('scraped_grants', 'added_to_vector_db', (SELECT COUNT(*) FROM scraped_grants WHERE added_to_vector_db = TRUE), NOW())
    ON CONFLICT (stat_type, stat_key) 
    DO UPDATE SET stat_value = EXCLUDED.stat_value, calculated_at = EXCLUDED.calculated_at;
    
    -- Update by grant type
    INSERT INTO grant_statistics (stat_type, stat_key, stat_value, calculated_at)
    SELECT 'scraped_grants_by_type', grant_type, COUNT(*), NOW()
    FROM scraped_grants 
    GROUP BY grant_type
    ON CONFLICT (stat_type, stat_key) 
    DO UPDATE SET stat_value = EXCLUDED.stat_value, calculated_at = EXCLUDED.calculated_at;
    
    -- Update job statistics
    INSERT INTO grant_statistics (stat_type, stat_key, stat_value, calculated_at)
    SELECT 'scraping_jobs', status, COUNT(*), NOW()
    FROM enhanced_scraping_jobs 
    GROUP BY status
    ON CONFLICT (stat_type, stat_key) 
    DO UPDATE SET stat_value = EXCLUDED.stat_value, calculated_at = EXCLUDED.calculated_at;
    
    -- Update document statistics
    INSERT INTO grant_statistics (stat_type, stat_key, stat_value, calculated_at)
    VALUES ('uploaded_documents', 'total', (SELECT COUNT(*) FROM uploaded_documents), NOW())
    ON CONFLICT (stat_type, stat_key) 
    DO UPDATE SET stat_value = EXCLUDED.stat_value, calculated_at = EXCLUDED.calculated_at;
    
    INSERT INTO grant_statistics (stat_type, stat_key, stat_value, calculated_at)
    VALUES ('uploaded_documents', 'processed', (SELECT COUNT(*) FROM uploaded_documents WHERE processing_status = 'completed'), NOW())
    ON CONFLICT (stat_type, stat_key) 
    DO UPDATE SET stat_value = EXCLUDED.stat_value, calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraped_grants_updated_at 
    BEFORE UPDATE ON scraped_grants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploaded_documents_updated_at 
    BEFORE UPDATE ON uploaded_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_scraping_jobs_updated_at 
    BEFORE UPDATE ON enhanced_scraping_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add grants table metadata column if it doesn't exist (for vector DB tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grants' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE grants ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Initial statistics calculation
SELECT update_grant_statistics();

COMMENT ON TABLE scraped_grants IS 'AI-extracted grants from web scraping operations';
COMMENT ON TABLE pending_grant_reviews IS 'Grants requiring manual review before integration';
COMMENT ON TABLE uploaded_documents IS 'Manually uploaded documents for grant extraction';
COMMENT ON TABLE enhanced_scraping_jobs IS 'Enhanced scraping job tracking with detailed metadata';
COMMENT ON TABLE grant_statistics IS 'Cached statistics for scraping dashboard performance';