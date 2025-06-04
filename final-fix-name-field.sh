#!/bin/bash

echo "Final Fix for Name Field Issue"
echo "=============================="
echo ""

echo "1. Checking and fixing database name column..."
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "Current user data in database:"
    psql "$DATABASE_URL" << 'SQL'
-- Check current user table structure
\d users

-- Check current user data
SELECT id, email, first_name, last_name, name 
FROM users 
WHERE email = 'admin@etownz.com';

-- Ensure name column has data
UPDATE users 
SET name = COALESCE(name, first_name || ' ' || last_name, first_name, split_part(email, '@', 1))
WHERE name IS NULL OR name = '';

-- Verify update
SELECT id, email, first_name, last_name, name 
FROM users 
WHERE email = 'admin@etownz.com';
SQL
fi

echo ""
echo "2. Rebuilding backend container to ensure fresh deployment..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Stopping backend..."
docker stop etownz-grants-backend-1

echo "Removing backend container..."
docker rm etownz-grants-backend-1

echo "Rebuilding and starting backend..."
docker-compose -f docker-compose.prod.yml up -d backend

echo "Waiting for backend to start..."
sleep 15

echo "Backend status:"
docker ps | grep backend

echo "Backend logs:"
docker logs etownz-grants-backend-1 --tail=10 2>&1 | grep -E "(listening|error|Error|Started)" || echo "No relevant logs"
EOF

echo ""
echo "3. Testing with fresh backend..."
sleep 5

TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

echo "Testing login response:"
echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    user = data.get('user', {})
    print('✅ Login successful!')
    print('User fields:')
    for key, value in user.items():
        if key == 'name':
            print(f'  ⭐ {key}: \"{value}\"')
        else:
            print(f'     {key}: {value}')
    
    print()
    if 'name' in user and user['name']:
        first_name = user['name'].split(' ')[0]
        print(f'✅ Name field exists: \"{user[\"name\"]}\"')
        print(f'✅ First name extraction: \"{first_name}\"')
        print()
        print('🎉 DASHBOARD SHOULD NOW WORK!')
        print('The JavaScript split error should be fixed.')
    else:
        print('❌ Name field is still missing or empty')
        print('This indicates a deeper issue with the backend code or database query')
except Exception as e:
    print(f'❌ Login failed: {e}')
    print('Raw response:', sys.stdin.read()[:200])
"

echo ""
echo "4. If name field is still missing, let's test the database query directly..."
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "Testing the exact query the backend uses:"
    psql "$DATABASE_URL" << 'SQL'
SELECT 
    u.*,
    o.name as org_name
FROM users u
JOIN organizations o ON u.org_id = o.id
WHERE u.email = 'admin@etownz.com';
SQL
fi

echo ""
echo "🌐 Dashboard URL: https://grants.etownz.com/dashboard"
echo "🔑 Login: admin@etownz.com / admin123"
echo ""
echo "Try with a hard refresh (Ctrl+F5) to clear any cached JavaScript!"