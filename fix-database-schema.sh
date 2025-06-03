#!/bin/bash

echo "Fixing Database Schema for Password Authentication"
echo "================================================="
echo ""

if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "WARNING: This will modify your production database!"
    read -p "Do you want to proceed? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    
    echo ""
    echo "1. Adding password_hash column to users table..."
    psql "$DATABASE_URL" << 'SQL'
-- Add password_hash column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Also add name column by combining first_name and last_name
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update name column with existing data
UPDATE users 
SET name = COALESCE(first_name || ' ' || last_name, email)
WHERE name IS NULL;

-- Show the updated structure
\d users
SQL

    echo ""
    echo "2. Creating demo organization with proper structure..."
    psql "$DATABASE_URL" << 'SQL'
-- Create demo organization
INSERT INTO organizations (id, name, contact_email)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'eTownz Demo Admin', 
    'admin@demo.etownz.com'
)
ON CONFLICT (id) DO UPDATE SET 
    name = 'eTownz Demo Admin',
    contact_email = 'admin@demo.etownz.com';
SQL

    echo ""
    echo "3. Creating demo admin user..."
    psql "$DATABASE_URL" << 'SQL'
-- Create demo admin user with bcrypt hash for 'Demo2025!'
INSERT INTO users (
    id, 
    org_id,
    email, 
    password_hash, 
    name,
    first_name,
    last_name,
    role
)
VALUES (
    '00000000-0000-0000-0001-000000000001', 
    '00000000-0000-0000-0000-000000000001',
    'admin1@demo.etownz.com', 
    '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6',
    'Admin User 1',
    'Admin',
    'User 1',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET 
    email = 'admin1@demo.etownz.com',
    password_hash = '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6',
    name = 'Admin User 1',
    role = 'admin';

-- Verify user was created
SELECT id, email, role, name, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as password_status
FROM users 
WHERE email = 'admin1@demo.etownz.com';
SQL

    echo ""
    echo "4. Restarting backend..."
    ssh root@165.227.149.136 "docker restart root-backend-1"
    
    echo ""
    echo "5. Waiting for backend to restart..."
    sleep 5
    
    echo ""
    echo "6. Testing login..."
    curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' | python3 -m json.tool
    
else
    echo "ERROR: .env file not found!"
fi

echo ""
echo "Done! Try logging in at https://grants.etownz.com/auth/login"
echo "Email: admin1@demo.etownz.com"
echo "Password: Demo2025!"