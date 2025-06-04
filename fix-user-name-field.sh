#!/bin/bash

echo "Fixing User Name Field Issue"
echo "============================"
echo ""

# First, let's see what the current user object looks like
echo "1. Testing current user data structure..."
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

echo "Current user object from login:"
echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    user = data.get('user', {})
    print('User object fields:')
    for key, value in user.items():
        print(f'  {key}: {value}')
    print()
    print('Checking name field:')
    if 'name' in user:
        print(f'  name: \"{user[\"name\"]}\"')
    else:
        print('  name: MISSING!')
        
    if 'first_name' in user and 'last_name' in user:
        full_name = f'{user[\"first_name\"]} {user[\"last_name\"]}'
        print(f'  Constructed name: \"{full_name}\"')
        print(f'  First name only: \"{user[\"first_name\"]}\"')
except Exception as e:
    print(f'Error: {e}')
"

echo ""
echo "2. Checking database to see user fields..."

if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "Database user fields for admin user:"
    psql "$DATABASE_URL" << 'SQL'
SELECT id, email, first_name, last_name, role,
       CASE 
           WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
           THEN first_name || ' ' || last_name
           WHEN first_name IS NOT NULL 
           THEN first_name
           ELSE email
       END as constructed_name
FROM users 
WHERE email = 'admin@etownz.com';
SQL

    echo ""
    echo "3. Adding/updating name column in database..."
    psql "$DATABASE_URL" << 'SQL'
-- Add name column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update the name column for all users
UPDATE users 
SET name = CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
    THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL 
    THEN first_name
    ELSE split_part(email, '@', 1)
END
WHERE name IS NULL OR name = '';

-- Verify the update
SELECT email, first_name, last_name, name, role 
FROM users 
WHERE email IN ('admin@etownz.com', 'john@techstart.ie', 'david@corkresearch.ie')
ORDER BY email;
SQL

else
    echo "ERROR: .env file not found!"
fi

echo ""
echo "4. Restarting backend to pick up changes..."
ssh root@165.227.149.136 "docker restart etownz-grants-backend-1"

echo ""
echo "5. Waiting for backend to restart..."
sleep 10

echo ""
echo "6. Testing login with updated user data..."
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

echo "Updated user object:"
echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    user = data.get('user', {})
    print('User fields after update:')
    for key, value in user.items():
        print(f'  {key}: {value}')
    
    print()
    if 'name' in user and user['name']:
        print(f'✅ name field exists: \"{user[\"name\"]}\"')
        print(f'✅ first name: \"{user[\"name\"].split(\" \")[0]}\"')
    else:
        print('❌ name field still missing or empty')
except Exception as e:
    print(f'Error: {e}')
"

echo ""
echo "7. Testing other demo users..."
for email in "john@techstart.ie" "david@corkresearch.ie"
do
    echo ""
    echo "Testing $email:"
    curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\",\"password\":\"techstart123\"}" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    user = data.get('user', {})
    name = user.get('name', 'NO NAME')
    print(f'  Name: \"{name}\"')
    if name != 'NO NAME':
        print(f'  First name: \"{name.split(\" \")[0]}\"')
except Exception as e:
    print(f'  Error: {e}')
" 2>/dev/null || echo "  Login failed for $email"
done

echo ""
echo "Dashboard should now work without the 'split' error!"
echo "🌐 Try: https://grants.etownz.com/dashboard"
echo "🔑 Login: admin@etownz.com / admin123"