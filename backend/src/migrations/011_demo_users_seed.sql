-- Migration: 011_demo_users_seed.sql
-- Insert demo users and organizations for testing
-- This includes the credentials needed for production testing

-- First, clean up any existing sample data
DELETE FROM users WHERE email IN ('admin@sampletech.ie', 'director@artscentre.ie');
DELETE FROM organizations WHERE name IN ('Sample Tech Startup', 'Community Arts Centre');

-- Insert demo organizations
INSERT INTO organizations (id, name, description, website, contact_email, contact_phone, profile_data) VALUES 
-- TechStart Ireland
('550e8400-e29b-41d4-a716-446655440000', 'TechStart Ireland', 'Innovative technology startup focused on AI solutions for healthcare', 'https://techstart.ie', 'john@techstart.ie', '+353-1-555-0101', 
 '{"password_hash": "$2a$10$J5mEtSqfE4GPSS6M24Ljgu4c5rVQOWaF0.XiWAHY8K5ICJgLXAlr2"}'),

-- Dublin Community Center
('550e8400-e29b-41d4-a716-446655440001', 'Dublin Community Center', 'Non-profit organization providing community services and education programs', 'https://dublincc.ie', 'mary@dublincc.ie', '+353-1-555-0102',
 '{"password_hash": "$2a$10$AQXQ.XO2evFxCEEXyoESk.VES.FT7VBh8CZ3x.Jh/5SkqDBuSxLw6"}'),

-- Cork Research Institute
('550e8400-e29b-41d4-a716-446655440002', 'Cork Research Institute', 'Leading research institution specializing in renewable energy and sustainability', 'https://corkresearch.ie', 'david@corkresearch.ie', '+353-21-555-0103',
 '{"password_hash": "$2a$10$pCOP/Hgybo53YzyxX7Ern.XhVls2ZwE3kRIEQA2EHa/2Vfd8IZrKu"}'),

-- Green Earth Initiative
('550e8400-e29b-41d4-a716-446655440003', 'Green Earth Initiative', 'Environmental organization working on climate action and sustainable development', 'https://greenearth.ie', 'emma@greenearth.ie', '+353-91-555-0104',
 '{"password_hash": "$2a$10$jlJRMGwE885APGUE.sSnqeve7AXTNam2uX6EHODBrkpiROyoPid1q"}');

-- Insert demo users
INSERT INTO users (id, org_id, email, first_name, last_name, role, is_active) VALUES 
-- Super Admin
('550e8400-e29b-41d4-a716-446655440010', NULL, 'admin@etownz.com', 'Sarah', 'Administrator', 'super_admin', true),

-- Organization Admins
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'john@techstart.ie', 'John', 'Smith', 'organization_admin', true),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'mary@dublincc.ie', 'Mary', 'O''Connor', 'organization_admin', true),

-- Grant Writers
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'david@corkresearch.ie', 'David', 'Walsh', 'grant_writer', true),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440003', 'emma@greenearth.ie', 'Emma', 'Murphy', 'grant_writer', true),

-- Viewer
('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440000', 'viewer@example.com', 'Tom', 'Viewer', 'viewer', true);

-- Create super admin organization for global admin
INSERT INTO organizations (id, name, description, contact_email, profile_data) VALUES 
('550e8400-e29b-41d4-a716-446655440099', 'eTownz System Administration', 'System administration organization', 'admin@etownz.com',
 '{"password_hash": "$2a$10$tcfpC5l/R71KaFj4gEGxnOOFCW7vEptw6/oTf8Y7b47AQXItra9Wm"}');

-- Update super admin to have org_id
UPDATE users SET org_id = '550e8400-e29b-41d4-a716-446655440099' WHERE email = 'admin@etownz.com';

-- Insert notification preferences for all demo users
INSERT INTO notification_preferences (user_id, email_notifications, push_notifications, deadline_reminders, new_grants, submission_updates, weekly_digest) VALUES 
('550e8400-e29b-41d4-a716-446655440010', true, true, true, true, true, true),
('550e8400-e29b-41d4-a716-446655440011', true, true, true, true, true, true),
('550e8400-e29b-41d4-a716-446655440012', true, true, true, true, true, true),
('550e8400-e29b-41d4-a716-446655440013', true, true, true, true, true, true),
('550e8400-e29b-41d4-a716-446655440014', true, true, true, true, true, true),
('550e8400-e29b-41d4-a716-446655440015', true, false, true, true, false, false);

-- Insert demo grants
INSERT INTO grants (id, title, description, funder, funder_type, amount_min, amount_max, deadline, url, categories, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440100', 'Enterprise Ireland R&D Fund', 'Funding for research and development projects that have clear commercial potential and involve a level of technical innovation. This fund supports companies to develop innovative products, services, and processes.', 'Enterprise Ireland', 'government', 25000.00, 250000.00, '2024-03-15 23:59:59+00', 'https://www.enterprise-ireland.com/en/research-innovation/companies/', ARRAY['Research & Development'], true),

('550e8400-e29b-41d4-a716-446655440101', 'Dublin City Council Community Grant', 'Supporting community groups and organizations in Dublin with funding for local initiatives and projects that benefit the local community.', 'Dublin City Council', 'council', 500.00, 15000.00, '2024-02-28 23:59:59+00', 'https://www.dublincity.ie/residential/community/community-grants', ARRAY['Community Development'], true),

('550e8400-e29b-41d4-a716-446655440102', 'SFI Discover Programme', 'Science Foundation Ireland programme supporting public engagement with STEM research and education to increase awareness and understanding of science.', 'Science Foundation Ireland', 'government', 1000.00, 50000.00, '2024-04-30 23:59:59+00', 'https://www.sfi.ie/funding/sfi-discover/', ARRAY['Education & STEM'], true),

('550e8400-e29b-41d4-a716-446655440103', 'Horizon Europe - EIC Accelerator', 'European Innovation Council support for high-risk, high-impact innovation with significant market potential. Supporting breakthrough technologies and disruptive innovations.', 'European Commission', 'eu', 500000.00, 2500000.00, '2024-06-05 23:59:59+00', 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en', ARRAY['Innovation'], true),

('550e8400-e29b-41d4-a716-446655440104', 'Ireland Funds Young Entrepreneur Grant', 'Supporting young entrepreneurs in Ireland with seed funding for innovative business ideas that have potential for growth and job creation.', 'The Ireland Funds', 'foundation', 5000.00, 25000.00, '2024-05-15 23:59:59+00', 'https://irelandfunds.org/', ARRAY['Entrepreneurship'], true),

('550e8400-e29b-41d4-a716-446655440105', 'Cork County Council Arts Grant', 'Funding for individual artists and arts organizations in Cork County to support creative projects and cultural initiatives.', 'Cork County Council', 'council', 1000.00, 10000.00, '2024-03-31 23:59:59+00', 'https://www.corkcoco.ie/en/arts-culture/arts-grants', ARRAY['Arts & Culture'], true),

('550e8400-e29b-41d4-a716-446655440106', 'INTERREG Atlantic Area Programme', 'EU cross-border cooperation programme supporting projects that address common challenges in the Atlantic Area through transnational cooperation.', 'INTERREG Atlantic Area', 'eu', 100000.00, 1000000.00, '2024-07-20 23:59:59+00', 'https://www.atlanticarea.eu/', ARRAY['Regional Development'], true),

('550e8400-e29b-41d4-a716-446655440107', 'Environmental Protection Agency Research Grant', 'Supporting research projects that address environmental challenges and contribute to sustainable development in Ireland.', 'Environmental Protection Agency', 'government', 30000.00, 150000.00, '2024-08-15 23:59:59+00', 'https://www.epa.ie/our-services/research/', ARRAY['Environment'], true);

-- Insert demo applications/submissions
INSERT INTO submissions (id, grant_id, org_id, user_id, title, status, application_data, submitted_at) VALUES 
('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'AI Healthcare Innovation Project', 'submitted', '{"funding_amount": 75000, "project_duration": "18 months"}', '2024-01-20 10:00:00+00'),

('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'Community Education Hub', 'approved', '{"funding_amount": 8500, "project_duration": "12 months"}', '2024-01-15 09:00:00+00'),

('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', 'STEM Outreach Programme', 'draft', '{"funding_amount": 25000, "project_duration": "24 months"}', NULL),

('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'Revolutionary Medical Device', 'under_review', '{"funding_amount": 1500000, "project_duration": "36 months"}', '2024-01-10 14:00:00+00'),

('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', 'Green Tech Startup Initiative', 'draft', '{"funding_amount": 12000, "project_duration": "12 months"}', NULL),

('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', 'Renewable Energy Research', 'submitted', '{"funding_amount": 80000, "project_duration": "24 months"}', '2024-01-22 11:00:00+00');

-- Password mapping for demo users:
-- admin@etownz.com: admin123
-- john@techstart.ie: techstart123  
-- mary@dublincc.ie: community123
-- david@corkresearch.ie: research123
-- emma@greenearth.ie: green123
-- viewer@example.com: viewer123 (uses TechStart organization credentials)