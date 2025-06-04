#!/bin/bash

echo "Deploying Name Field Fix"
echo "========================"
echo ""

echo "1. Committing changes locally..."
git add backend/src/routes/auth.ts backend/src/repositories/usersRepository.ts
git commit -m "fix: add name field to user response to fix dashboard split error"
git push origin main

echo ""
echo "2. Deploying to production..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Pulling latest changes..."
git pull origin main

echo "Restarting backend only (faster than full restart)..."
docker restart etownz-grants-backend-1

echo "Waiting for backend to restart..."
sleep 10

echo "Backend status:"
docker ps | grep backend
EOF

echo ""
echo "3. Testing the fix..."
sleep 5

TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

echo "User object from login response:"
echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    user = data.get('user', {})
    print('User fields:')
    for key, value in user.items():
        print(f'  {key}: {value}')
    
    print()
    if 'name' in user and user['name']:
        print(f'✅ name field: \"{user[\"name\"]}\"')
        print(f'✅ first name: \"{user[\"name\"].split(\" \")[0]}\"')
        print()
        print('The dashboard should now work without the split error!')
    else:
        print('❌ name field still missing')
except Exception as e:
    print(f'Error: {e}')
"

echo ""
echo "🎯 Dashboard should now work: https://grants.etownz.com/dashboard"
echo "🔑 Login: admin@etownz.com / admin123"
echo ""
echo "Do a hard refresh (Ctrl+F5) to clear any cached JavaScript!"