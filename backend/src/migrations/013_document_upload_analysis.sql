-- Migration 013: Document Upload and Analysis System
-- Creates tables for document management and AI-powered analysis

-- Document upload tracking
CREATE TABLE IF NOT EXISTS document_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_status VARCHAR(50) DEFAULT 'uploaded' CHECK (upload_status IN ('uploading', 'uploaded', 'processing', 'completed', 'failed')),
    processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document processing jobs for real-time tracking
CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('text_extraction', 'ai_analysis', 'compliance_check', 'requirement_extraction')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    result_data JSONB,
    ai_model_used VARCHAR(100),
    processing_time_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced document analysis results (extends existing table)
ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS document_upload_id UUID REFERENCES document_uploads(id) ON DELETE CASCADE;
ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS real_time_processing BOOLEAN DEFAULT false;
ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS processing_job_id UUID REFERENCES document_processing_jobs(id) ON DELETE SET NULL;

-- Document requirements extracted by AI
CREATE TABLE IF NOT EXISTS document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
    requirement_type VARCHAR(100) NOT NULL,
    requirement_text TEXT NOT NULL,
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    importance_level VARCHAR(20) DEFAULT 'medium' CHECK (importance_level IN ('low', 'medium', 'high', 'critical')),
    section_reference TEXT,
    ai_extracted BOOLEAN DEFAULT true,
    human_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document compliance gaps identified by AI
CREATE TABLE IF NOT EXISTS document_compliance_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES document_requirements(id) ON DELETE CASCADE,
    gap_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    suggested_action TEXT,
    ai_confidence NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_uploads_user_id ON document_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_application_id ON document_uploads(application_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_status ON document_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_document_id ON document_processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_status ON document_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_document_requirements_document_id ON document_requirements(document_id);
CREATE INDEX IF NOT EXISTS idx_document_compliance_gaps_document_id ON document_compliance_gaps(document_id);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_uploads_updated_at 
    BEFORE UPDATE ON document_uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();