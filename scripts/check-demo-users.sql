-- Check if demo users exist in production database
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    o.name as organization,
    u.created_at,
    CASE 
        WHEN u.password_hash IS NULL THEN 'NO PASSWORD'
        WHEN u.password_hash = '' THEN 'EMPTY PASSWORD'
        ELSE 'HAS PASSWORD'
    END as password_status
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email IN (
    'admin1@demo.etownz.com',
    'admin2@demo.etownz.com',
    'admin3@demo.etownz.com',
    'manager1@techcorp.demo',
    'manager2@healthinc.demo',
    'manager3@eduorg.demo',
    'user1@startup.demo',
    'user2@smallbiz.demo',
    'user3@creative.demo',
    'viewer1@nonprofit.demo',
    'viewer2@community.demo',
    'viewer3@research.demo'
)
ORDER BY u.role, u.email;