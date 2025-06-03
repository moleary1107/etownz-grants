-- Production Demo Users for eTownz Grants Platform
-- Generated: 2025-06-03
-- Each user has the default password: Demo2025!

-- Create demo organizations first
-- Note: Organizations table has 'contact_email' not 'email', and 'address' is JSONB
INSERT INTO organizations (id, name, website, description, contact_email, contact_phone, address, profile_data) VALUES
('11111111-1111-1111-1111-111111111111', 'Dublin Tech Hub', 'https://dublintechhub.ie', 'Technology innovation center', 'info@dublintechhub.ie', '+353 1 234 5678', '{"street": "123 Tech Street", "city": "Dublin", "postcode": "D02 XY45"}', '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}'),
('22222222-2222-2222-2222-222222222222', 'Cork Arts Council', 'https://corkartscouncil.ie', 'Supporting arts and culture in Cork', 'info@corkartscouncil.ie', '+353 21 234 5678', '{"street": "456 Culture Lane", "city": "Cork", "postcode": "T12 AB34"}', '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}'),
('33333333-3333-3333-3333-333333333333', 'Galway Green Initiative', 'https://galwaygreen.ie', 'Environmental sustainability organization', 'info@galwaygreen.ie', '+353 91 234 5678', '{"street": "789 Green Road", "city": "Galway", "postcode": "H91 CD56"}', '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}'),
('44444444-4444-4444-4444-444444444444', 'eTownz Platform Admin', 'https://etownz.com', 'Platform administration', 'admin@etownz.com', '+353 1 999 9999', '{"street": "1 Admin Street", "city": "Dublin", "postcode": "D01 XY99"}', '{"password_hash": "$2a$10$pt90JIxgKLNyjcGbuyegAOsLXDiSdV4YCrf3HPZyAIScBrrMFOtMa"}')
ON CONFLICT (id) DO NOTHING;

-- Super Admin Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'sarah.admin@etownz.com', 'Sarah', 'Administrator', 'super_admin', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'michael.super@etownz.com', 'Michael', 'Supervisor', 'super_admin', true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'emma.master@etownz.com', 'Emma', 'Master', 'super_admin', true)
ON CONFLICT (id) DO NOTHING;

-- Organization Admin Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'john.manager@dublintechhub.ie', 'John', 'Manager', 'organization_admin', true),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'mary.director@corkartscouncil.ie', 'Mary', 'Director', 'organization_admin', true),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'peter.coordinator@galwaygreen.ie', 'Peter', 'Coordinator', 'organization_admin', true)
ON CONFLICT (id) DO NOTHING;

-- Grant Writer Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active) VALUES
('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'alice.writer@dublintechhub.ie', 'Alice', 'Writer', 'grant_writer', true),
('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'robert.author@corkartscouncil.ie', 'Robert', 'Author', 'grant_writer', true),
('33333333-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'sophie.composer@galwaygreen.ie', 'Sophie', 'Composer', 'grant_writer', true)
ON CONFLICT (id) DO NOTHING;

-- Viewer Users (3)
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active) VALUES
('11111111-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'david.viewer@dublintechhub.ie', 'David', 'Viewer', 'viewer', true),
('22222222-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'lisa.observer@corkartscouncil.ie', 'Lisa', 'Observer', 'viewer', true),
('33333333-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'mark.reader@galwaygreen.ie', 'Mark', 'Reader', 'viewer', true)
ON CONFLICT (id) DO NOTHING;

-- Add some sample grants for testing
INSERT INTO grants (id, title, description, funder, amount, deadline, eligibility_criteria, application_process, required_documents, status, categories, created_at) VALUES
('aaaaaaaa-1111-1111-1111-111111111111', 'Technology Innovation Fund 2025', 'Supporting innovative tech startups in Ireland', 'Enterprise Ireland', 50000.00, '2025-12-31', ARRAY['Irish registered company', 'Less than 5 years old', 'Technology focused'], 'Online application through Enterprise Ireland portal', ARRAY['Business plan', 'Financial projections', 'Team CVs'], 'active', ARRAY['Technology', 'Innovation', 'Startup'], NOW()),
('bbbbbbbb-2222-2222-2222-222222222222', 'Arts & Culture Development Grant', 'Supporting arts organizations and cultural initiatives', 'Arts Council Ireland', 25000.00, '2025-09-30', ARRAY['Registered arts organization', 'Community benefit focus', 'Irish-based'], 'Submit proposal via Arts Council website', ARRAY['Project proposal', 'Budget breakdown', 'Previous work samples'], 'active', ARRAY['Arts', 'Culture', 'Community'], NOW()),
('cccccccc-3333-3333-3333-333333333333', 'Green Energy Initiative Fund', 'Funding for renewable energy and sustainability projects', 'SEAI', 100000.00, '2025-06-30', ARRAY['Environmental focus', 'Measurable impact', 'Irish entity'], 'Detailed application with environmental impact assessment', ARRAY['Environmental assessment', 'Technical specifications', 'Implementation timeline'], 'active', ARRAY['Environment', 'Energy', 'Sustainability'], NOW())
ON CONFLICT (id) DO NOTHING;