#!/bin/bash

echo "Deploying Latest Code to Production"
echo "==================================="
echo ""

echo "1. Pushing any local changes first..."
git add .
git status

read -p "Commit and push local changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "fix: add production debugging and vector database setup scripts"
    git push origin main
    echo "✅ Changes pushed to main"
else
    echo "⚠️ Skipping local commit"
fi

echo ""
echo "2. Deploying to production server..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Current commit before pull:"
git log --oneline -1

echo ""
echo "Pulling latest code..."
git pull origin main

echo ""
echo "Current commit after pull:"
git log --oneline -1

echo ""
echo "Stopping all services..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "Removing old containers to force rebuild..."
docker system prune -f

echo ""
echo "Starting services with fresh build..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services to start..."
sleep 20

echo ""
echo "Checking service status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Backend startup logs:"
docker logs root-backend-1 --tail=15 2>&1 | grep -E "(listening|Started|Ready|Error|error)" || echo "No startup logs found"

echo ""
echo "Frontend startup logs:"
docker logs root-frontend-1 --tail=10 2>&1 | grep -E "(Ready|Started|Error|error)" || echo "No frontend logs found"
EOF

echo ""
echo "3. Testing after deployment..."
sleep 10

# Test authentication
echo ""
echo "Testing authentication..."
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed"
    echo "Response: $TOKEN_RESPONSE"
else
    echo "✅ Authentication successful"
fi

# Test core APIs
echo ""
echo "Testing core APIs..."
echo "Grants API:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'✅ SUCCESS: {len(data.get(\"grants\", []))} grants')
except Exception as e:
    print(f'❌ ERROR: {e}')
"

echo ""
echo "AI Health:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/health | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    status = data.get('status', 'unknown')
    errors = data.get('errors', [])
    print(f'Status: {status}')
    if errors:
        print(f'Errors: {errors}')
except Exception as e:
    print(f'ERROR: {e}')
"

echo ""
echo "4. Dashboard should now be working!"
echo ""
echo "🌐 Try the dashboard: https://grants.etownz.com/dashboard"
echo "🔑 Login: admin@etownz.com / admin123"
echo ""
echo "If you still see JavaScript errors, try:"
echo "1. Hard refresh (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Clear browser cache"
echo "3. Open in incognito/private mode"