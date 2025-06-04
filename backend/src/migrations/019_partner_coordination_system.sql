-- Partner Coordination System Migration
-- This migration creates tables for managing multi-partner grant collaborations

BEGIN;

-- Table for storing partner organizations
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(50) NOT NULL CHECK (
        organization_type IN ('academic', 'industry', 'nonprofit', 'sme', 'large_enterprise', 'government')
    ),
    country VARCHAR(3) NOT NULL, -- ISO country code
    website VARCHAR(255),
    description TEXT,
    established_year INTEGER,
    employee_count INTEGER,
    primary_contact VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    total_funding_received DECIMAL(15,2) DEFAULT 0,
    successful_projects INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    available_from DATE,
    capacity_percentage INTEGER DEFAULT 100 CHECK (capacity_percentage >= 0 AND capacity_percentage <= 100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for partner expertise areas
CREATE TABLE partner_expertise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    expertise_area VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (
        proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')
    ),
    years_experience INTEGER DEFAULT 0,
    certifications TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for partner capabilities
CREATE TABLE partner_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    capability VARCHAR(100) NOT NULL,
    description TEXT,
    capacity_rating INTEGER DEFAULT 3 CHECK (capacity_rating >= 1 AND capacity_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for partner languages
CREATE TABLE partner_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL, -- ISO language code
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (
        proficiency_level IN ('basic', 'intermediate', 'advanced', 'native')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for partner previous collaborations
CREATE TABLE partner_collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    collaboration_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    budget_amount DECIMAL(15,2),
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
    lessons_learned TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for multi-partner projects
CREATE TABLE collaboration_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    objectives TEXT[],
    required_expertise TEXT[],
    total_budget DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    duration_months INTEGER NOT NULL,
    expected_outcomes TEXT[],
    risk_factors TEXT[],
    geographic_requirements JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'planning' CHECK (
        status IN ('planning', 'partner_search', 'partner_selection', 'proposal_preparation', 'submitted', 'active', 'completed', 'cancelled')
    ),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for work packages
CREATE TABLE work_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES collaboration_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lead_partner_id UUID REFERENCES partners(id),
    budget DECIMAL(15,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    deliverables TEXT[],
    dependencies TEXT[],
    expertise_required TEXT[],
    start_month INTEGER DEFAULT 1,
    end_month INTEGER,
    status VARCHAR(50) DEFAULT 'planned' CHECK (
        status IN ('planned', 'active', 'completed', 'delayed', 'cancelled')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for work package participants
CREATE TABLE work_package_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('lead', 'participant', 'contributor')),
    effort_person_months DECIMAL(5,2) DEFAULT 0,
    budget_allocation DECIMAL(15,2) DEFAULT 0,
    responsibilities TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(work_package_id, partner_id)
);

-- Table for partnership plans
CREATE TABLE partnership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES collaboration_projects(id) ON DELETE CASCADE,
    work_packages JSONB NOT NULL,
    budget_allocation JSONB NOT NULL,
    timeline JSONB NOT NULL,
    governance_structure JSONB NOT NULL,
    communication_plan JSONB NOT NULL,
    compatibility_analysis JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft' CHECK (
        status IN ('draft', 'review', 'approved', 'active', 'archived')
    ),
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for partner matching scores and analysis
CREATE TABLE partner_matching (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES collaboration_projects(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    compatibility_score DECIMAL(5,2) NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    expertise_match_score DECIMAL(5,2) DEFAULT 0,
    geographic_fit_score DECIMAL(5,2) DEFAULT 0,
    experience_score DECIMAL(5,2) DEFAULT 0,
    availability_score DECIMAL(5,2) DEFAULT 0,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    matching_rationale TEXT,
    recommended_role VARCHAR(100),
    status VARCHAR(50) DEFAULT 'candidate' CHECK (
        status IN ('candidate', 'invited', 'interested', 'confirmed', 'declined', 'excluded')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, partner_id)
);

-- Table for communication tracking
CREATE TABLE partnership_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES collaboration_projects(id) ON DELETE CASCADE,
    from_partner_id UUID REFERENCES partners(id),
    to_partner_ids UUID[],
    communication_type VARCHAR(50) NOT NULL CHECK (
        communication_type IN ('email', 'meeting', 'document', 'call', 'presentation', 'workshop')
    ),
    subject VARCHAR(255),
    content TEXT,
    attachments TEXT[],
    meeting_date TIMESTAMP WITH TIME ZONE,
    action_items TEXT[],
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for collaboration milestones and progress tracking
CREATE TABLE collaboration_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES collaboration_projects(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES work_packages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    planned_date DATE NOT NULL,
    actual_date DATE,
    responsible_partner_id UUID REFERENCES partners(id),
    deliverables TEXT[],
    status VARCHAR(50) DEFAULT 'planned' CHECK (
        status IN ('planned', 'in_progress', 'completed', 'delayed', 'cancelled')
    ),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_partners_country ON partners(country);
CREATE INDEX idx_partners_type ON partners(organization_type);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_success_rate ON partners(success_rate);

CREATE INDEX idx_partner_expertise_area ON partner_expertise(expertise_area);
CREATE INDEX idx_partner_expertise_partner ON partner_expertise(partner_id);

CREATE INDEX idx_partner_capabilities_partner ON partner_capabilities(partner_id);
CREATE INDEX idx_partner_capabilities_capability ON partner_capabilities(capability);

CREATE INDEX idx_partner_languages_partner ON partner_languages(partner_id);
CREATE INDEX idx_partner_languages_code ON partner_languages(language_code);

CREATE INDEX idx_collaboration_projects_status ON collaboration_projects(status);
CREATE INDEX idx_collaboration_projects_created_by ON collaboration_projects(created_by);
CREATE INDEX idx_collaboration_projects_budget ON collaboration_projects(total_budget);

CREATE INDEX idx_work_packages_project ON work_packages(project_id);
CREATE INDEX idx_work_packages_lead_partner ON work_packages(lead_partner_id);
CREATE INDEX idx_work_packages_status ON work_packages(status);

CREATE INDEX idx_work_package_participants_wp ON work_package_participants(work_package_id);
CREATE INDEX idx_work_package_participants_partner ON work_package_participants(partner_id);

CREATE INDEX idx_partnership_plans_project ON partnership_plans(project_id);
CREATE INDEX idx_partnership_plans_status ON partnership_plans(status);

CREATE INDEX idx_partner_matching_project ON partner_matching(project_id);
CREATE INDEX idx_partner_matching_partner ON partner_matching(partner_id);
CREATE INDEX idx_partner_matching_score ON partner_matching(compatibility_score);

CREATE INDEX idx_partnership_communications_project ON partnership_communications(project_id);
CREATE INDEX idx_partnership_communications_type ON partnership_communications(communication_type);
CREATE INDEX idx_partnership_communications_date ON partnership_communications(created_at);

CREATE INDEX idx_collaboration_milestones_project ON collaboration_milestones(project_id);
CREATE INDEX idx_collaboration_milestones_wp ON collaboration_milestones(work_package_id);
CREATE INDEX idx_collaboration_milestones_status ON collaboration_milestones(status);
CREATE INDEX idx_collaboration_milestones_date ON collaboration_milestones(planned_date);

-- Create functions for analytics and reporting
CREATE OR REPLACE FUNCTION calculate_partner_success_rate(partner_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_projects INTEGER;
    successful_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_projects 
    FROM partner_collaborations 
    WHERE partner_id = partner_uuid;
    
    SELECT COUNT(*) INTO successful_projects 
    FROM partner_collaborations 
    WHERE partner_id = partner_uuid AND success_rating >= 4;
    
    IF total_projects = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (successful_projects::DECIMAL / total_projects::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_partner_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update success rate when collaboration is added/updated
    UPDATE partners 
    SET success_rate = calculate_partner_success_rate(NEW.partner_id),
        successful_projects = (
            SELECT COUNT(*) 
            FROM partner_collaborations 
            WHERE partner_id = NEW.partner_id AND success_rating >= 4
        ),
        updated_at = NOW()
    WHERE id = NEW.partner_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update partner metrics
CREATE TRIGGER trigger_update_partner_metrics
    AFTER INSERT OR UPDATE OF success_rating ON partner_collaborations
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_metrics();

-- Create views for common queries
CREATE VIEW partner_summary AS
SELECT 
    p.id,
    p.organization_name,
    p.organization_type,
    p.country,
    p.success_rate,
    p.total_funding_received,
    p.successful_projects,
    array_agg(DISTINCT pe.expertise_area) as expertise_areas,
    array_agg(DISTINCT pc.capability) as capabilities,
    array_agg(DISTINCT pl.language_code) as languages
FROM partners p
LEFT JOIN partner_expertise pe ON p.id = pe.partner_id
LEFT JOIN partner_capabilities pc ON p.id = pc.partner_id
LEFT JOIN partner_languages pl ON p.id = pl.partner_id
WHERE p.status = 'active'
GROUP BY p.id, p.organization_name, p.organization_type, p.country, 
         p.success_rate, p.total_funding_received, p.successful_projects;

CREATE VIEW project_partnership_status AS
SELECT 
    cp.id as project_id,
    cp.title,
    cp.status as project_status,
    COUNT(DISTINCT pm.partner_id) as potential_partners,
    COUNT(DISTINCT CASE WHEN pm.status = 'confirmed' THEN pm.partner_id END) as confirmed_partners,
    COUNT(DISTINCT wp.id) as work_packages,
    SUM(wp.budget) as total_wp_budget,
    cp.total_budget
FROM collaboration_projects cp
LEFT JOIN partner_matching pm ON cp.id = pm.project_id
LEFT JOIN work_packages wp ON cp.id = wp.project_id
GROUP BY cp.id, cp.title, cp.status, cp.total_budget;

CREATE VIEW work_package_allocation AS
SELECT 
    wp.id as work_package_id,
    wp.name as work_package_name,
    wp.project_id,
    p.organization_name as lead_partner,
    COUNT(wpp.partner_id) as participant_count,
    SUM(wpp.effort_person_months) as total_effort,
    SUM(wpp.budget_allocation) as allocated_budget,
    wp.budget as work_package_budget
FROM work_packages wp
LEFT JOIN partners p ON wp.lead_partner_id = p.id
LEFT JOIN work_package_participants wpp ON wp.id = wpp.work_package_id
GROUP BY wp.id, wp.name, wp.project_id, p.organization_name, wp.budget;

-- Insert sample data for testing
INSERT INTO partners (organization_name, organization_type, country, primary_contact, contact_email, success_rate) VALUES
('Trinity College Dublin', 'academic', 'IRL', 'Dr. Sarah Johnson', 'sarah.johnson@tcd.ie', 85.5),
('University of Barcelona', 'academic', 'ESP', 'Prof. Miguel Rodriguez', 'miguel.rodriguez@ub.edu', 78.2),
('Fraunhofer Institute', 'academic', 'DEU', 'Dr. Klaus Weber', 'klaus.weber@fraunhofer.de', 92.1),
('TechStart Solutions', 'sme', 'IRL', 'James O''Brien', 'james@techstart.ie', 67.3),
('Green Energy Innovations', 'industry', 'NLD', 'Anna van der Berg', 'anna@greeninnovations.nl', 71.8),
('European Research Consortium', 'nonprofit', 'BEL', 'Pierre Dubois', 'pierre@erc.eu', 88.9);

-- Insert sample expertise areas
INSERT INTO partner_expertise (partner_id, expertise_area, proficiency_level, years_experience) VALUES
((SELECT id FROM partners WHERE organization_name = 'Trinity College Dublin'), 'Artificial Intelligence', 'expert', 15),
((SELECT id FROM partners WHERE organization_name = 'Trinity College Dublin'), 'Machine Learning', 'expert', 12),
((SELECT id FROM partners WHERE organization_name = 'University of Barcelona'), 'Climate Science', 'expert', 20),
((SELECT id FROM partners WHERE organization_name = 'University of Barcelona'), 'Environmental Modeling', 'advanced', 18),
((SELECT id FROM partners WHERE organization_name = 'Fraunhofer Institute'), 'IoT Systems', 'expert', 10),
((SELECT id FROM partners WHERE organization_name = 'Fraunhofer Institute'), 'Sensor Networks', 'expert', 8),
((SELECT id FROM partners WHERE organization_name = 'TechStart Solutions'), 'Software Development', 'advanced', 6),
((SELECT id FROM partners WHERE organization_name = 'TechStart Solutions'), 'Mobile Applications', 'expert', 8),
((SELECT id FROM partners WHERE organization_name = 'Green Energy Innovations'), 'Renewable Energy', 'expert', 12),
((SELECT id FROM partners WHERE organization_name = 'Green Energy Innovations'), 'Smart Grids', 'advanced', 9),
((SELECT id FROM partners WHERE organization_name = 'European Research Consortium'), 'Project Management', 'expert', 25),
((SELECT id FROM partners WHERE organization_name = 'European Research Consortium'), 'EU Funding', 'expert', 30);

-- Insert sample languages
INSERT INTO partner_languages (partner_id, language_code, proficiency_level) VALUES
((SELECT id FROM partners WHERE organization_name = 'Trinity College Dublin'), 'en', 'native'),
((SELECT id FROM partners WHERE organization_name = 'Trinity College Dublin'), 'ga', 'intermediate'),
((SELECT id FROM partners WHERE organization_name = 'University of Barcelona'), 'es', 'native'),
((SELECT id FROM partners WHERE organization_name = 'University of Barcelona'), 'en', 'advanced'),
((SELECT id FROM partners WHERE organization_name = 'University of Barcelona'), 'ca', 'native'),
((SELECT id FROM partners WHERE organization_name = 'Fraunhofer Institute'), 'de', 'native'),
((SELECT id FROM partners WHERE organization_name = 'Fraunhofer Institute'), 'en', 'advanced'),
((SELECT id FROM partners WHERE organization_name = 'TechStart Solutions'), 'en', 'native'),
((SELECT id FROM partners WHERE organization_name = 'Green Energy Innovations'), 'nl', 'native'),
((SELECT id FROM partners WHERE organization_name = 'Green Energy Innovations'), 'en', 'advanced'),
((SELECT id FROM partners WHERE organization_name = 'European Research Consortium'), 'fr', 'native'),
((SELECT id FROM partners WHERE organization_name = 'European Research Consortium'), 'en', 'advanced'),
((SELECT id FROM partners WHERE organization_name = 'European Research Consortium'), 'de', 'intermediate');

-- Add comments for documentation
COMMENT ON TABLE partners IS 'Organizations that can participate in collaborative grant projects';
COMMENT ON TABLE partner_expertise IS 'Expertise areas and proficiency levels for each partner';
COMMENT ON TABLE partner_capabilities IS 'Specific capabilities and capacity ratings for partners';
COMMENT ON TABLE collaboration_projects IS 'Multi-partner collaborative grant projects';
COMMENT ON TABLE work_packages IS 'Individual work packages within collaborative projects';
COMMENT ON TABLE partnership_plans IS 'Complete collaboration plans including governance and communication';
COMMENT ON TABLE partner_matching IS 'AI-powered partner matching scores and analysis';

COMMIT;