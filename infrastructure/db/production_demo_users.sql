-- Production Demo Users for eTownz Grants Platform
-- Generated: 2025-06-03
-- Each user has the default password: Demo2025!

-- Create demo organizations first
-- Password hash for 'Demo2025!': $2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa
INSERT INTO organizations (id, name, website, description, address, phone, email, tax_id, is_active, profile_data) VALUES
('org-demo-1', 'Dublin Tech Hub', 'https://dublintechhub.ie', 'Technology innovation center', '123 Tech Street, Dublin 2', '+353 1 234 5678', 'info@dublintechhub.ie', 'IE1234567T', true, '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}'),
('org-demo-2', 'Cork Arts Council', 'https://corkartscouncil.ie', 'Supporting arts and culture in Cork', '456 Culture Lane, Cork', '+353 21 234 5678', 'info@corkartscouncil.ie', 'IE2345678A', true, '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}'),
('org-demo-3', 'Galway Green Initiative', 'https://galwaygreen.ie', 'Environmental sustainability organization', '789 Green Road, Galway', '+353 91 234 5678', 'info@galwaygreen.ie', 'IE3456789G', true, '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}'),
('org-demo-null', 'eTownz Platform Admin', 'https://etownz.com', 'Platform administration', '1 Admin Street, Dublin', '+353 1 999 9999', 'admin@etownz.com', 'IE9999999A', true, '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}')
ON CONFLICT (id) DO NOTHING;

-- Password hash for 'Demo2025!' (bcrypt)
-- Note: Since we're using the demo fallback authentication, the password_hash is stored in organization.profile_data

-- Super Admin Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active, created_at, profile_data) VALUES
('user-sa-1', 'org-demo-null', 'sarah.admin@etownz.com', 'Sarah', 'Administrator', 'super_admin', true, NOW(), '{}'),
('user-sa-2', 'org-demo-null', 'michael.super@etownz.com', 'Michael', 'Supervisor', 'super_admin', true, NOW(), '{}'),
('user-sa-3', 'org-demo-null', 'emma.master@etownz.com', 'Emma', 'Master', 'super_admin', true, NOW(), '{}')
ON CONFLICT (id) DO NOTHING;

-- Organization Admin Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active, created_at) VALUES
('user-oa-1', 'org-demo-1', 'john.manager@dublintechhub.ie', 'John', 'Manager', 'organization_admin', true, NOW()),
('user-oa-2', 'org-demo-2', 'mary.director@corkartscouncil.ie', 'Mary', 'Director', 'organization_admin', true, NOW()),
('user-oa-3', 'org-demo-3', 'peter.coordinator@galwaygreen.ie', 'Peter', 'Coordinator', 'organization_admin', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Grant Writer Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active, created_at) VALUES
('user-gw-1', 'org-demo-1', 'alice.writer@dublintechhub.ie', 'Alice', 'Writer', 'grant_writer', true, NOW()),
('user-gw-2', 'org-demo-2', 'robert.author@corkartscouncil.ie', 'Robert', 'Author', 'grant_writer', true, NOW()),
('user-gw-3', 'org-demo-3', 'sophie.composer@galwaygreen.ie', 'Sophie', 'Composer', 'grant_writer', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Viewer Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active, created_at) VALUES
('user-vw-1', 'org-demo-1', 'david.viewer@dublintechhub.ie', 'David', 'Viewer', 'viewer', true, NOW()),
('user-vw-2', 'org-demo-2', 'lisa.observer@corkartscouncil.ie', 'Lisa', 'Observer', 'viewer', true, NOW()),
('user-vw-3', 'org-demo-3', 'mark.reader@galwaygreen.ie', 'Mark', 'Reader', 'viewer', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Add some sample grants for testing
INSERT INTO grants (id, title, description, funder, amount, deadline, eligibility_criteria, application_process, required_documents, status, categories, created_at) VALUES
('grant-demo-1', 'Technology Innovation Fund 2025', 'Supporting innovative tech startups in Ireland', 'Enterprise Ireland', 50000.00, '2025-12-31', ARRAY['Irish registered company', 'Less than 5 years old', 'Technology focused'], 'Online application through Enterprise Ireland portal', ARRAY['Business plan', 'Financial projections', 'Team CVs'], 'active', ARRAY['Technology', 'Innovation', 'Startup'], NOW()),
('grant-demo-2', 'Arts & Culture Development Grant', 'Supporting arts organizations and cultural initiatives', 'Arts Council Ireland', 25000.00, '2025-09-30', ARRAY['Registered arts organization', 'Community benefit focus', 'Irish-based'], 'Submit proposal via Arts Council website', ARRAY['Project proposal', 'Budget breakdown', 'Previous work samples'], 'active', ARRAY['Arts', 'Culture', 'Community'], NOW()),
('grant-demo-3', 'Green Energy Initiative Fund', 'Funding for renewable energy and sustainability projects', 'SEAI', 100000.00, '2025-06-30', ARRAY['Environmental focus', 'Measurable impact', 'Irish entity'], 'Detailed application with environmental impact assessment', ARRAY['Environmental assessment', 'Technical specifications', 'Implementation timeline'], 'active', ARRAY['Environment', 'Energy', 'Sustainability'], NOW())
ON CONFLICT (id) DO NOTHING;