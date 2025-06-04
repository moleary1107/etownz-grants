#!/bin/bash

echo "Force Backend Rebuild and Deploy"
echo "================================"
echo ""

echo "1. Making a small change to force Docker rebuild..."
echo "// Force rebuild $(date)" >> backend/src/routes/auth.ts

echo ""
echo "2. Committing and pushing changes..."
git add backend/src/routes/auth.ts
git commit -m "fix: force backend rebuild to include name field in API response"
git push origin main

echo ""
echo "3. Force rebuild on production server..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Pulling latest changes..."
git pull origin main

echo "Stopping and removing backend..."
docker stop etownz-grants-backend-1
docker rm etownz-grants-backend-1

echo "Removing backend image to force fresh build..."
docker rmi registry.digitalocean.com/etownz-grants-container/backend:latest || echo "Image not found locally"

echo "Building fresh backend image..."
docker build -t registry.digitalocean.com/etownz-grants-container/backend:latest ./backend

echo "Starting backend with fresh image..."
docker run -d --name etownz-grants-backend-1 \
  --network etownz-grants_default \
  -p 8000:8000 \
  --env-file .env \
  registry.digitalocean.com/etownz-grants-container/backend:latest

echo "Waiting for backend to start..."
sleep 20

echo "Backend status:"
docker ps | grep backend

echo "Backend logs:"
docker logs etownz-grants-backend-1 --tail=20
EOF

echo ""
echo "4. Testing with rebuilt backend..."
sleep 5

for i in {1..3}; do
    echo ""
    echo "Test attempt $i:"
    
    TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@etownz.com","password":"admin123"}')

    echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    user = data.get('user', {})
    
    if 'name' in user and user['name']:
        print(f'✅ SUCCESS! name field: \"{user[\"name\"]}\"')
        print(f'✅ First name: \"{user[\"name\"].split(\" \")[0]}\"')
        print()
        print('🎉 DASHBOARD SHOULD NOW WORK!')
        sys.exit(0)
    else:
        print(f'❌ Still missing name field')
        print('Available fields:', list(user.keys()))
except Exception as e:
    print(f'❌ Login failed: {e}')
" && break || echo "Retrying in 5 seconds..." && sleep 5
done

echo ""
echo "🌐 Dashboard URL: https://grants.etownz.com/dashboard"
echo "🔑 Login: admin@etownz.com / admin123"
echo ""
echo "If the name field is working, the dashboard should load without errors!"
echo "Do a hard refresh (Ctrl+F5) to clear cached JavaScript."