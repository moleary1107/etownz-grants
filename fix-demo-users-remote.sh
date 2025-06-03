#!/bin/bash

echo "Fix Demo Users on Production"
echo "============================"
echo ""
echo "This script will ensure demo users are properly set up"
echo ""

SERVER="root@165.227.149.136"

read -p "Do you want to proceed with fixing demo users? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Connecting to server..."
echo ""

ssh $SERVER << 'EOF'
cd /root/etownz-grants

echo "1. First, let's check current status:"
USER_COUNT=$(docker-compose -f docker-compose.prod.yml exec db psql -U postgres etownz_grants -t -c "SELECT COUNT(*) FROM users WHERE email LIKE '%demo%';" 2>/dev/null | tr -d ' ')
echo "Current demo users in database: $USER_COUNT"

if [ "$USER_COUNT" -eq "0" ] || [ -z "$USER_COUNT" ]; then
    echo ""
    echo "2. No demo users found. Creating them now..."
    
    # First, ensure the SQL file exists
    if [ ! -f "infrastructure/db/production_demo_users_fixed.sql" ]; then
        echo "Creating demo users SQL file..."
        cat > infrastructure/db/production_demo_users_fixed.sql << 'SQL'
-- Production Demo Users with Organizations
-- Password for all users: Demo2025!

-- First, create organizations if they don't exist
INSERT INTO organizations (id, name, email, type, size, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'eTownz Demo Admin', 'admin@demo.etownz.com', 'government', 'small', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', 'TechCorp Demo', 'contact@techcorp.demo', 'commercial', 'medium', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000003', 'HealthInc Demo', 'contact@healthinc.demo', 'commercial', 'large', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000004', 'EduOrg Demo', 'contact@eduorg.demo', 'educational', 'medium', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000005', 'StartupHub Demo', 'contact@startup.demo', 'commercial', 'small', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000006', 'SmallBiz Demo', 'contact@smallbiz.demo', 'commercial', 'small', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000007', 'CreativeStudio Demo', 'contact@creative.demo', 'commercial', 'small', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000008', 'NonProfit Demo', 'contact@nonprofit.demo', 'non_profit', 'small', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000009', 'CommunityOrg Demo', 'contact@community.demo', 'non_profit', 'medium', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000010', 'ResearchInst Demo', 'contact@research.demo', 'educational', 'large', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo users with bcrypt hashed password for 'Demo2025!'
INSERT INTO users (id, email, password_hash, name, role, organization_id, created_at, updated_at)
VALUES 
    -- Admin users
    ('00000000-0000-0000-0001-000000000001', 'admin1@demo.etownz.com', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Admin User 1', 'admin', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
    ('00000000-0000-0000-0001-000000000002', 'admin2@demo.etownz.com', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Admin User 2', 'admin', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
    ('00000000-0000-0000-0001-000000000003', 'admin3@demo.etownz.com', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Admin User 3', 'admin', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
    
    -- Manager users
    ('00000000-0000-0000-0002-000000000001', 'manager1@techcorp.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Tech Manager 1', 'manager', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
    ('00000000-0000-0000-0002-000000000002', 'manager2@healthinc.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Health Manager 2', 'manager', '00000000-0000-0000-0000-000000000003', NOW(), NOW()),
    ('00000000-0000-0000-0002-000000000003', 'manager3@eduorg.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Edu Manager 3', 'manager', '00000000-0000-0000-0000-000000000004', NOW(), NOW()),
    
    -- Regular users
    ('00000000-0000-0000-0003-000000000001', 'user1@startup.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Startup User 1', 'user', '00000000-0000-0000-0000-000000000005', NOW(), NOW()),
    ('00000000-0000-0000-0003-000000000002', 'user2@smallbiz.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'SmallBiz User 2', 'user', '00000000-0000-0000-0000-000000000006', NOW(), NOW()),
    ('00000000-0000-0000-0003-000000000003', 'user3@creative.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Creative User 3', 'user', '00000000-0000-0000-0000-000000000007', NOW(), NOW()),
    
    -- Viewer users
    ('00000000-0000-0000-0004-000000000001', 'viewer1@nonprofit.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'NonProfit Viewer 1', 'viewer', '00000000-0000-0000-0000-000000000008', NOW(), NOW()),
    ('00000000-0000-0000-0004-000000000002', 'viewer2@community.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Community Viewer 2', 'viewer', '00000000-0000-0000-0000-000000000009', NOW(), NOW()),
    ('00000000-0000-0000-0004-000000000003', 'viewer3@research.demo', '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 'Research Viewer 3', 'viewer', '00000000-0000-0000-0000-000000000010', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
SQL
    fi
    
    # Apply the SQL
    echo "Applying demo users SQL..."
    docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres etownz_grants < infrastructure/db/production_demo_users_fixed.sql
    
    echo ""
    echo "3. Verifying demo users were created:"
    docker-compose -f docker-compose.prod.yml exec db psql -U postgres etownz_grants -c "SELECT email, role FROM users WHERE email LIKE '%demo%' ORDER BY role, email;"
else
    echo ""
    echo "2. Demo users already exist. Checking their status:"
    docker-compose -f docker-compose.prod.yml exec db psql -U postgres etownz_grants -c "SELECT email, role, CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as status FROM users WHERE email LIKE '%demo%' ORDER BY role, email;"
fi

echo ""
echo "4. Restarting backend to ensure it picks up any changes:"
docker-compose -f docker-compose.prod.yml restart backend

echo ""
echo "5. Waiting for backend to be ready..."
sleep 10

echo ""
echo "6. Testing login with admin1@demo.etownz.com:"
curl -s -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k | python3 -m json.tool || echo "Login test failed"

echo ""
echo "Done! Demo users should now be working."
EOF