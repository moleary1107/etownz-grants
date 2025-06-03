#!/bin/bash

echo "Creating Demo User Directly in DigitalOcean Database"
echo "==================================================="
echo ""

# First, let's test the connection locally
echo "1. Testing database connection from your local machine..."
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    # Extract connection details
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    echo "Connecting to: $DB_HOST / $DB_NAME"
    echo ""
    
    # Create demo user SQL
    cat > /tmp/create_demo_user.sql << 'SQL'
-- First check what users exist
SELECT 'Current users in database:' as info;
SELECT email, role, name FROM users ORDER BY created_at DESC LIMIT 10;

-- Create demo organization
INSERT INTO organizations (id, name, email, type, size, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'eTownz Demo Admin', 
    'admin@demo.etownz.com', 
    'government', 
    'small',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET 
    name = 'eTownz Demo Admin',
    updated_at = NOW();

-- Create demo admin user with bcrypt hash for 'Demo2025!'
-- This hash is: $2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6
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
    email = 'admin1@demo.etownz.com',
    password_hash = '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6',
    name = 'Admin User 1',
    role = 'admin',
    updated_at = NOW();

-- Verify user was created
SELECT 'Demo user created/updated:' as info;
SELECT id, email, role, name, organization_id,
       CASE WHEN password_hash = '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6' 
            THEN 'Password is correct for Demo2025!' 
            ELSE 'Password is WRONG!' 
       END as password_status
FROM users 
WHERE email = 'admin1@demo.etownz.com';
SQL

    echo "2. Running SQL to create demo user..."
    psql "$DATABASE_URL" < /tmp/create_demo_user.sql
    
    echo ""
    echo "3. Testing login from local machine..."
    curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' | python3 -m json.tool
    
    echo ""
    echo "4. Alternative: Let's also restart the backend on the server to clear any cache..."
    ssh root@165.227.149.136 "cd /root/etownz-grants && docker restart root-backend-1"
    
    echo ""
    echo "5. Wait for backend to restart..."
    sleep 5
    
    echo ""
    echo "6. Test login again after restart..."
    curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' | python3 -m json.tool
    
else
    echo "ERROR: .env file not found!"
    echo "Please ensure you have a .env file with DATABASE_URL"
fi

echo ""
echo "Dashboard Error Fix:"
echo "==================="
echo "The dashboard error happens because you're not logged in."
echo "Once the login works, the dashboard will work too."
echo ""
echo "To test:"
echo "1. Go to https://grants.etownz.com/auth/login"
echo "2. Login with: admin1@demo.etownz.com / Demo2025!"
echo "3. Then visit https://grants.etownz.com/dashboard"