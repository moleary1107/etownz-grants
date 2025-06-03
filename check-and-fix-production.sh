#!/bin/bash

echo "Checking and Fixing Production"
echo "=============================="
echo ""

ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "1. First, let's see what's actually running:"
docker ps

echo ""
echo "2. Let's check the docker-compose.prod.yml syntax issue:"
grep -n "ports:" docker-compose.prod.yml
grep -A2 -B2 "redis:" docker-compose.prod.yml

echo ""
echo "3. Let's fix the docker-compose.prod.yml:"
# Restore from backup if it exists
if [ -f docker-compose.prod.yml.backup ]; then
    cp docker-compose.prod.yml.backup docker-compose.prod.yml
    echo "Restored from backup"
fi

echo ""
echo "4. Starting services using the original docker-compose:"
docker-compose -f docker-compose.prod.yml up -d postgres frontend backend

echo ""
echo "5. Wait for backend to be ready:"
sleep 10

echo ""
echo "6. Check what's running now:"
docker ps

echo ""
echo "7. Let's connect DIRECTLY to the DigitalOcean database and check/create users:"
# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
    
    echo "DATABASE_URL is set: ${DATABASE_URL:0:50}..."
    
    # Use a temporary container to connect to the database
    docker run --rm postgres:15 psql "$DATABASE_URL" << 'SQL'
-- Check if any users exist
SELECT COUNT(*) as total_users FROM users;

-- Check for demo users specifically
SELECT email, role, name, 
       CASE WHEN password_hash IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as pwd_status
FROM users 
WHERE email LIKE '%demo%' OR email LIKE '%admin%'
ORDER BY email;

-- Create the demo organization
INSERT INTO organizations (id, name, email, type, size, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'eTownz Demo Admin', 'admin@demo.etownz.com', 'government', 'small', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create or update the demo admin user
INSERT INTO users (id, email, password_hash, name, role, organization_id, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0001-000000000001', 
    'admin1@demo.etownz.com', 
    '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 
    'Admin User 1', 
    'admin', 
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET 
    password_hash = '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6',
    email = 'admin1@demo.etownz.com',
    name = 'Admin User 1',
    role = 'admin';

-- Verify the user was created/updated
SELECT id, email, role, name, 
       CASE WHEN password_hash = '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6' THEN 'PASSWORD_CORRECT' ELSE 'PASSWORD_WRONG' END as pwd_check
FROM users 
WHERE email = 'admin1@demo.etownz.com';
SQL
else
    echo "ERROR: .env file not found!"
fi

echo ""
echo "8. Test the login endpoint:"
curl -s -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k | python3 -m json.tool

echo ""
echo "9. Let's also check the backend logs to see what's happening:"
docker logs $(docker ps -q -f name=backend) --tail=30 2>&1 | grep -E "(Demo|demo|auth|login|Invalid|Database connected)" || echo "No relevant logs found"
EOF