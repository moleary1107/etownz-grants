-- AI Editor System Database Migration
-- Enhances existing grants/applications system with AI-powered collaborative editing capabilities

-- First ensure applications table exists (create if missing)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Application details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'under_review', 'approved', 'rejected'
    
    -- Application content (sections)
    sections JSONB DEFAULT '{}', -- Store section content as JSON
    
    -- Metadata
    deadline TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on applications
CREATE INDEX IF NOT EXISTS idx_applications_grant ON applications(grant_id);
CREATE INDEX IF NOT EXISTS idx_applications_org ON applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Editor sessions for tracking collaborative editing
CREATE TABLE IF NOT EXISTS editor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- 'executive_summary', 'methodology', 'budget', etc.
    title VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    collaborators UUID[] DEFAULT '{}', -- Array of user IDs with access
    
    -- Editor state and content
    editor_state JSONB, -- Lexical editor state
    content_text TEXT, -- Plain text version for search
    content_html TEXT, -- Rendered HTML version
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    
    -- Auto-save and versioning
    auto_save_enabled BOOLEAN DEFAULT TRUE,
    last_saved_at TIMESTAMP WITH TIME ZONE,
    save_version INTEGER DEFAULT 1,
    
    -- Session status
    is_active BOOLEAN DEFAULT TRUE,
    locked_by UUID REFERENCES users(id), -- For collaborative editing locks
    locked_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI content suggestions for the editor
CREATE TABLE IF NOT EXISTS ai_content_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES editor_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Suggestion details
    suggestion_type VARCHAR(50) NOT NULL, -- 'insertion', 'replacement', 'enhancement', 'structure'
    content_position INTEGER, -- Character position in editor
    original_text TEXT, -- Text being replaced/enhanced
    suggested_text TEXT NOT NULL,
    reasoning TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Context and sources
    context_data JSONB DEFAULT '{}',
    source_type VARCHAR(50) DEFAULT 'ai_generation', -- 'vector_search', 'pattern_match', 'ai_generation'
    source_references TEXT[], -- IDs of similar content that inspired suggestion
    similar_examples JSONB,
    
    -- Lifecycle tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'modified', 'expired'
    user_action VARCHAR(20), -- 'accepted', 'rejected', 'modified', 'ignored'
    user_modification TEXT, -- If user modified the suggestion
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI editor interactions for learning and cost tracking
CREATE TABLE IF NOT EXISTS ai_editor_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES editor_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Interaction context
    interaction_type VARCHAR(50) NOT NULL, -- 'suggestion', 'generation', 'chat', 'semantic_search', 'analysis'
    input_content TEXT,
    cursor_position INTEGER,
    section_context VARCHAR(50),
    
    -- AI processing details
    model_used VARCHAR(50),
    prompt_template VARCHAR(100),
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    cost_cents INTEGER,
    
    -- Output and feedback
    ai_response TEXT,
    confidence_score DECIMAL(3,2),
    user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'partially_helpful'
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    
    -- Learning data
    context_metadata JSONB DEFAULT '{}',
    success_metrics JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI chat messages for editor assistance
CREATE TABLE IF NOT EXISTS ai_editor_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES editor_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- NULL for AI messages
    
    -- Message content
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'markdown', 'code'
    
    -- AI metadata
    model_used VARCHAR(50),
    confidence DECIMAL(3,2),
    reasoning TEXT,
    token_usage INTEGER,
    cost_cents INTEGER,
    
    -- Interaction tracking
    is_read BOOLEAN DEFAULT FALSE,
    parent_message_id UUID REFERENCES ai_editor_chat_messages(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced grant requirements analysis for AI assistance
CREATE TABLE IF NOT EXISTS ai_grant_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    
    -- Extracted requirements
    requirements JSONB NOT NULL, -- Structured requirement data
    compliance_rules JSONB NOT NULL, -- Rules for automated checking
    success_patterns JSONB, -- Patterns from successful applications
    writing_guidelines JSONB, -- Style and format guidelines
    
    -- AI analysis metadata
    analysis_model VARCHAR(50),
    confidence_score DECIMAL(3,2),
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Version control for requirement updates
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES ai_grant_requirements(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(grant_id, section_type, version)
);

-- Content quality assessments
CREATE TABLE IF NOT EXISTS ai_content_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES editor_sessions(id) ON DELETE CASCADE,
    
    -- Assessment details
    content_hash VARCHAR(64) NOT NULL, -- SHA256 of assessed content
    section_type VARCHAR(50) NOT NULL,
    word_count INTEGER,
    
    -- Quality scores (0-100)
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
    completeness_score INTEGER CHECK (completeness_score >= 0 AND completeness_score <= 100),
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    impact_score INTEGER CHECK (impact_score >= 0 AND impact_score <= 100),
    
    -- Detailed feedback
    strengths TEXT[],
    weaknesses TEXT[],
    improvements JSONB, -- Structured improvement suggestions
    
    -- Benchmarking
    benchmark_comparison JSONB,
    similar_content_references TEXT[],
    
    -- Assessment metadata
    model_used VARCHAR(50),
    assessment_prompt VARCHAR(100),
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time collaboration tracking
CREATE TABLE IF NOT EXISTS editor_collaboration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES editor_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'join', 'leave', 'edit', 'cursor_move', 'comment', 'suggestion'
    event_data JSONB NOT NULL,
    cursor_position INTEGER,
    selection_range JSONB, -- {start: number, end: number}
    
    -- Collaboration metadata
    user_presence JSONB, -- Current user status and location
    concurrent_users UUID[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Editor auto-save states
CREATE TABLE IF NOT EXISTS editor_auto_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES editor_sessions(id) ON DELETE CASCADE,
    
    -- Save data
    editor_state JSONB NOT NULL,
    content_text TEXT,
    save_type VARCHAR(20) DEFAULT 'auto', -- 'auto', 'manual', 'collaborative'
    
    -- Save metadata
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    changes_summary TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_editor_sessions_application ON editor_sessions(application_id, section_type);
CREATE INDEX idx_editor_sessions_active ON editor_sessions(is_active, updated_at);
CREATE INDEX idx_editor_sessions_collaborators ON editor_sessions USING GIN(collaborators);

CREATE INDEX idx_ai_editor_suggestions_session ON ai_content_suggestions(session_id, status);
CREATE INDEX idx_ai_editor_suggestions_user ON ai_content_suggestions(user_id, status);
CREATE INDEX idx_ai_editor_suggestions_position ON ai_content_suggestions(session_id, content_position);
CREATE INDEX idx_ai_editor_suggestions_expires ON ai_content_suggestions(expires_at) WHERE status = 'pending';

CREATE INDEX idx_ai_editor_interactions_session ON ai_editor_interactions(session_id, interaction_type);
CREATE INDEX idx_ai_editor_interactions_user ON ai_editor_interactions(user_id, created_at);
CREATE INDEX idx_ai_editor_interactions_model ON ai_editor_interactions(model_used, created_at);

CREATE INDEX idx_ai_editor_chat_session ON ai_editor_chat_messages(session_id, created_at);
CREATE INDEX idx_ai_editor_chat_user ON ai_editor_chat_messages(user_id, created_at);
CREATE INDEX idx_ai_editor_chat_parent ON ai_editor_chat_messages(parent_message_id);

CREATE INDEX idx_ai_editor_requirements_grant ON ai_grant_requirements(grant_id, section_type, version);
CREATE INDEX idx_ai_editor_requirements_analysis ON ai_grant_requirements(last_analyzed_at);

CREATE INDEX idx_ai_editor_assessments_session ON ai_content_assessments(session_id, created_at);
CREATE INDEX idx_ai_editor_assessments_hash ON ai_content_assessments(content_hash);

CREATE INDEX idx_ai_editor_collaboration_session ON editor_collaboration_events(session_id, created_at);
CREATE INDEX idx_ai_editor_collaboration_user ON editor_collaboration_events(user_id, event_type);

CREATE INDEX idx_ai_editor_auto_saves_session ON editor_auto_saves(session_id, created_at);

-- Update triggers for maintaining updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_editor_sessions_updated_at 
    BEFORE UPDATE ON editor_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for expired suggestions
CREATE OR REPLACE FUNCTION cleanup_expired_suggestions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_content_suggestions 
    WHERE status = 'pending' AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active editor sessions for an application
CREATE OR REPLACE FUNCTION get_active_editor_sessions(app_id UUID)
RETURNS TABLE (
    session_id UUID,
    section_type VARCHAR(50),
    title VARCHAR(255),
    active_users UUID[],
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.id,
        es.section_type,
        es.title,
        es.collaborators,
        es.updated_at
    FROM editor_sessions es
    WHERE es.application_id = app_id 
    AND es.is_active = TRUE
    ORDER BY es.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get suggestions for a session
CREATE OR REPLACE FUNCTION get_session_suggestions(session_uuid UUID)
RETURNS TABLE (
    suggestion_id UUID,
    suggestion_type VARCHAR(50),
    content_position INTEGER,
    suggested_text TEXT,
    reasoning TEXT,
    confidence_score DECIMAL(3,2),
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        acs.id,
        acs.suggestion_type,
        acs.content_position,
        acs.suggested_text,
        acs.reasoning,
        acs.confidence_score,
        acs.status,
        acs.created_at
    FROM ai_content_suggestions acs
    WHERE acs.session_id = session_uuid 
    AND acs.status = 'pending'
    AND acs.expires_at > NOW()
    ORDER BY acs.content_position, acs.created_at;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE editor_sessions IS 'Tracks collaborative editing sessions for grant applications';
COMMENT ON TABLE ai_content_suggestions IS 'AI-generated suggestions for improving content';
COMMENT ON TABLE ai_editor_interactions IS 'Tracks all AI interactions for learning and cost management';
COMMENT ON TABLE ai_editor_chat_messages IS 'Chat messages between users and AI assistant';
COMMENT ON TABLE ai_grant_requirements IS 'AI-analyzed requirements and guidelines for grants';
COMMENT ON TABLE ai_content_assessments IS 'Quality assessments of content using AI';
COMMENT ON TABLE editor_collaboration_events IS 'Real-time collaboration events and user presence';
COMMENT ON TABLE editor_auto_saves IS 'Auto-saved states of editor sessions';