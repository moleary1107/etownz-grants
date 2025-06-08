-- Migration 026: Organization Enhancements for Template System
-- Add missing organization_type column and work with existing organization_capabilities table

-- Add organization_type column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100);

-- The organization_capabilities table already exists with a different schema
-- Add columns we need if they don't exist
ALTER TABLE organization_capabilities 
ADD COLUMN IF NOT EXISTS proficiency_level VARCHAR(50) DEFAULT 'intermediate';

ALTER TABLE organization_capabilities 
ADD COLUMN IF NOT EXISTS years_experience INTEGER;

ALTER TABLE organization_capabilities 
ADD COLUMN IF NOT EXISTS certifications TEXT[];

-- Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_capabilities_org_id ON organization_capabilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_capabilities_type ON organization_capabilities(capability_type);
CREATE INDEX IF NOT EXISTS idx_organization_capabilities_name ON organization_capabilities(capability_name);

-- Add some common organization types as enum-like constraints (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_type_check' AND table_name = 'organizations'
    ) THEN
        ALTER TABLE organizations 
        ADD CONSTRAINT organization_type_check 
        CHECK (organization_type IS NULL OR organization_type IN (
            'non_profit',
            'for_profit',
            'government',
            'academic',
            'research_institute',
            'startup',
            'sme',
            'enterprise',
            'cooperative',
            'social_enterprise',
            'charity',
            'foundation',
            'other'
        ));
    END IF;
END $$;

-- Update existing organizations with default type if needed
UPDATE organizations 
SET organization_type = 'other' 
WHERE organization_type IS NULL;

-- Insert sample capabilities for demo organizations (only if they don't exist)
INSERT INTO organization_capabilities (organization_id, capability_type, capability_name, description, proficiency_level, years_experience)
SELECT 
    o.id,
    'technical',
    'Software Development',
    'Full-stack software development capabilities',
    'advanced',
    5
FROM organizations o
WHERE o.name = 'Sample Tech Startup'
  AND NOT EXISTS (
    SELECT 1 FROM organization_capabilities oc 
    WHERE oc.organization_id = o.id AND oc.capability_name = 'Software Development'
  );

INSERT INTO organization_capabilities (organization_id, capability_type, capability_name, description, proficiency_level, years_experience)
SELECT 
    o.id,
    'operational',
    'Community Engagement',
    'Strong community outreach and engagement programs',
    'expert',
    10
FROM organizations o
WHERE o.name = 'Community Arts Centre'
  AND NOT EXISTS (
    SELECT 1 FROM organization_capabilities oc 
    WHERE oc.organization_id = o.id AND oc.capability_name = 'Community Engagement'
  );

INSERT INTO organization_capabilities (organization_id, capability_type, capability_name, description, proficiency_level, years_experience)
SELECT 
    o.id,
    'technical',
    'AI/Machine Learning',
    'Artificial intelligence and machine learning expertise',
    'advanced',
    3
FROM organizations o
WHERE o.name = 'Sample Tech Startup'
  AND NOT EXISTS (
    SELECT 1 FROM organization_capabilities oc 
    WHERE oc.organization_id = o.id AND oc.capability_name = 'AI/Machine Learning'
  );

INSERT INTO organization_capabilities (organization_id, capability_type, capability_name, description, proficiency_level, years_experience)
SELECT 
    o.id,
    'creative',
    'Arts Programming',
    'Developing and managing arts programs and exhibitions',
    'expert',
    15
FROM organizations o
WHERE o.name = 'Community Arts Centre'
  AND NOT EXISTS (
    SELECT 1 FROM organization_capabilities oc 
    WHERE oc.organization_id = o.id AND oc.capability_name = 'Arts Programming'
  );

-- Update organization types for demo data
UPDATE organizations 
SET organization_type = 'startup'
WHERE name = 'Sample Tech Startup';

UPDATE organizations 
SET organization_type = 'non_profit'
WHERE name = 'Community Arts Centre';