-- Migration 027: Review & Approval System
-- Creates comprehensive review and approval workflow system

-- Review workflows define approval processes
CREATE TABLE IF NOT EXISTS review_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'application', 'document', 'budget', 'compliance'
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    required_approvers INTEGER DEFAULT 1,
    sequential_approval BOOLEAN DEFAULT false, -- true for sequential, false for parallel
    auto_approval_rules JSONB DEFAULT '{}', -- conditions for auto-approval
    escalation_rules JSONB DEFAULT '{}', -- escalation conditions and actions
    notification_settings JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Review stages define steps in approval process
CREATE TABLE IF NOT EXISTS review_stages (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES review_workflows(id) ON DELETE CASCADE,
    stage_order INTEGER NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    stage_description TEXT,
    required_approvers INTEGER DEFAULT 1,
    approver_roles TEXT[] DEFAULT '{}', -- roles that can approve this stage
    approver_users INTEGER[] DEFAULT '{}', -- specific users who can approve
    conditions JSONB DEFAULT '{}', -- conditions to reach this stage
    actions JSONB DEFAULT '{}', -- actions to take when stage completes
    timeout_hours INTEGER, -- auto-escalate after timeout
    is_final BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Review requests track items going through approval
CREATE TABLE IF NOT EXISTS review_requests (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES review_workflows(id),
    entity_type VARCHAR(50) NOT NULL, -- 'application', 'document', etc.
    entity_id INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected', 'cancelled'
    current_stage_id INTEGER REFERENCES review_stages(id),
    metadata JSONB DEFAULT '{}', -- additional context data
    submitted_by INTEGER REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    auto_approved BOOLEAN DEFAULT false,
    rejection_reason TEXT,
    final_decision VARCHAR(20), -- 'approved', 'rejected'
    decision_metadata JSONB DEFAULT '{}'
);

-- Individual approvals within a review request
CREATE TABLE IF NOT EXISTS review_approvals (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES review_requests(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES review_stages(id),
    approver_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'delegated'
    decision VARCHAR(20), -- 'approve', 'reject', 'request_changes'
    comments TEXT,
    attachments JSONB DEFAULT '[]',
    conditions_met JSONB DEFAULT '{}',
    delegated_to INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comments and communication within reviews
CREATE TABLE IF NOT EXISTS review_comments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES review_requests(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    comment_type VARCHAR(50) DEFAULT 'comment', -- 'comment', 'question', 'clarification', 'system'
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    mentions INTEGER[] DEFAULT '{}', -- user IDs mentioned in comment
    is_internal BOOLEAN DEFAULT false, -- internal comments not visible to submitter
    parent_id INTEGER REFERENCES review_comments(id), -- for threaded comments
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- History log for all review actions
CREATE TABLE IF NOT EXISTS review_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES review_requests(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    stage_changed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Approval delegates for temporary delegation
CREATE TABLE IF NOT EXISTS approval_delegates (
    id SERIAL PRIMARY KEY,
    delegator_id INTEGER REFERENCES users(id),
    delegate_id INTEGER REFERENCES users(id),
    workflow_id INTEGER REFERENCES review_workflows(id),
    stage_id INTEGER REFERENCES review_stages(id), -- null for all stages
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Review templates for common approval scenarios
CREATE TABLE IF NOT EXISTS review_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    workflow_template JSONB NOT NULL, -- template for creating workflows
    stage_templates JSONB NOT NULL, -- templates for stages
    organization_id INTEGER REFERENCES organizations(id),
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Review metrics and analytics
CREATE TABLE IF NOT EXISTS review_metrics (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES review_workflows(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    approved_requests INTEGER DEFAULT 0,
    rejected_requests INTEGER DEFAULT 0,
    avg_approval_time_hours DECIMAL(10,2),
    bottleneck_stages JSONB DEFAULT '[]',
    efficiency_score DECIMAL(5,2),
    user_performance JSONB DEFAULT '{}',
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_workflows_org ON review_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_review_workflows_type ON review_workflows(type);
CREATE INDEX IF NOT EXISTS idx_review_requests_workflow ON review_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_entity ON review_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_request ON review_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_approver ON review_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_request ON review_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_review_history_request ON review_history(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegates_delegator ON approval_delegates(delegator_id);
CREATE INDEX IF NOT EXISTS idx_review_metrics_workflow ON review_metrics(workflow_id);

-- Create function to update review request status
CREATE OR REPLACE FUNCTION update_review_request_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    -- If status changed, log to history
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO review_history (request_id, action, description, old_status, new_status, stage_changed)
        VALUES (NEW.id, 'status_change', 'Review request status changed', OLD.status, NEW.status, false);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for review request updates
DROP TRIGGER IF EXISTS trigger_review_request_status ON review_requests;
CREATE TRIGGER trigger_review_request_status
    BEFORE UPDATE ON review_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_review_request_status();

-- Insert default review workflow templates
INSERT INTO review_templates (name, category, workflow_template, stage_templates, is_public, created_at) VALUES 
(
    'Grant Application Review',
    'applications',
    '{
        "name": "Grant Application Review",
        "type": "application",
        "required_approvers": 2,
        "sequential_approval": true,
        "auto_approval_rules": {
            "max_amount": 5000,
            "trusted_applicants": true
        }
    }',
    '[
        {
            "stage_name": "Initial Review",
            "stage_order": 1,
            "required_approvers": 1,
            "approver_roles": ["reviewer", "program_manager"],
            "timeout_hours": 48
        },
        {
            "stage_name": "Final Approval",
            "stage_order": 2,
            "required_approvers": 1,
            "approver_roles": ["admin", "director"],
            "timeout_hours": 72,
            "is_final": true
        }
    ]',
    true,
    NOW()
),
(
    'Document Approval',
    'documents',
    '{
        "name": "Document Approval",
        "type": "document",
        "required_approvers": 1,
        "sequential_approval": false,
        "auto_approval_rules": {
            "file_size_mb": 10,
            "trusted_uploaders": true
        }
    }',
    '[
        {
            "stage_name": "Document Review",
            "stage_order": 1,
            "required_approvers": 1,
            "approver_roles": ["reviewer", "admin"],
            "timeout_hours": 24,
            "is_final": true
        }
    ]',
    true,
    NOW()
),
(
    'Budget Change Approval',
    'budget',
    '{
        "name": "Budget Change Approval",
        "type": "budget",
        "required_approvers": 2,
        "sequential_approval": true,
        "auto_approval_rules": {
            "change_percentage": 10,
            "max_amount_change": 1000
        }
    }',
    '[
        {
            "stage_name": "Finance Review",
            "stage_order": 1,
            "required_approvers": 1,
            "approver_roles": ["finance_manager"],
            "timeout_hours": 24
        },
        {
            "stage_name": "Executive Approval",
            "stage_order": 2,
            "required_approvers": 1,
            "approver_roles": ["admin", "executive"],
            "timeout_hours": 48,
            "is_final": true
        }
    ]',
    true,
    NOW()
);

-- Add review-related columns to existing tables
ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_request_id INTEGER REFERENCES review_requests(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_request_id INTEGER REFERENCES review_requests(id);

-- Add notification preferences for reviews
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_notification_preferences JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "digest_frequency": "daily",
    "urgent_only": false
}';

COMMENT ON TABLE review_workflows IS 'Define approval workflows with stages and rules';
COMMENT ON TABLE review_stages IS 'Individual stages within approval workflows';
COMMENT ON TABLE review_requests IS 'Items submitted for review and approval';
COMMENT ON TABLE review_approvals IS 'Individual approval decisions within requests';
COMMENT ON TABLE review_comments IS 'Comments and communication during review process';
COMMENT ON TABLE review_history IS 'Audit log of all review actions and status changes';
COMMENT ON TABLE approval_delegates IS 'Temporary delegation of approval authority';
COMMENT ON TABLE review_templates IS 'Reusable templates for common approval workflows';
COMMENT ON TABLE review_metrics IS 'Analytics and performance metrics for review processes';