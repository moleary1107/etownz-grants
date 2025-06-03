#!/bin/bash

echo "Running Demo Users Migration on Production"
echo "=========================================="
echo ""

if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "1. Running migration 011_demo_users_seed.sql..."
    psql "$DATABASE_URL" < backend/src/migrations/011_demo_users_seed.sql
    
    echo ""
    echo "2. Verifying demo users were created..."
    psql "$DATABASE_URL" << 'SQL'
-- Check organizations with passwords
SELECT 
    id, 
    name, 
    contact_email,
    CASE WHEN profile_data->>'password_hash' IS NOT NULL THEN 'HAS PASSWORD' ELSE 'NO PASSWORD' END as password_status
FROM organizations 
WHERE name IN ('TechStart Ireland', 'Dublin Community Center', 'Cork Research Institute', 'Green Earth Initiative', 'eTownz System Administration')
ORDER BY name;

-- Check demo users
SELECT 
    u.email, 
    u.first_name || ' ' || u.last_name as name,
    u.role,
    o.name as organization
FROM users u
LEFT JOIN organizations o ON u.org_id = o.id
WHERE u.email IN ('admin@etownz.com', 'john@techstart.ie', 'mary@dublincc.ie', 'david@corkresearch.ie', 'emma@greenearth.ie', 'viewer@example.com')
ORDER BY u.email;
SQL

    echo ""
    echo "3. Testing login with the demo credentials..."
    
    echo "Testing admin@etownz.com with password 'admin123':"
    curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@etownz.com","password":"admin123"}' | python3 -m json.tool
    
    echo ""
    echo "Testing john@techstart.ie with password 'techstart123':"
    curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"john@techstart.ie","password":"techstart123"}' | python3 -m json.tool
    
    echo ""
    echo "Testing david@corkresearch.ie with password 'research123':"
    curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"david@corkresearch.ie","password":"research123"}' | python3 -m json.tool
    
else
    echo "ERROR: .env file not found!"
fi

echo ""
echo "Demo User Credentials:"
echo "====================="
echo "admin@etownz.com - admin123 (Super Admin)"
echo "john@techstart.ie - techstart123 (Organization Admin)"
echo "mary@dublincc.ie - community123 (Organization Admin)"
echo "david@corkresearch.ie - research123 (Grant Writer)"
echo "emma@greenearth.ie - green123 (Grant Writer)"
echo "viewer@example.com - viewer123 (Viewer - uses TechStart org credentials)"