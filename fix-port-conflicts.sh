#!/bin/bash

echo "Fixing Port Conflicts and Redeploying"
echo "====================================="
echo ""

ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "1. Stopping ALL Docker containers..."
docker stop $(docker ps -q) 2>/dev/null || echo "No running containers"

echo ""
echo "2. Removing ALL containers..."
docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

echo ""
echo "3. Checking what's using the ports..."
echo "Port 3001 (frontend):"
lsof -i :3001 || echo "Port 3001 is free"

echo "Port 8000 (backend):"
lsof -i :8000 || echo "Port 8000 is free"

echo "Port 6379 (redis):"
lsof -i :6379 || echo "Port 6379 is free"

echo ""
echo "4. Starting fresh services..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "5. Waiting for services to start..."
sleep 25

echo ""
echo "6. Checking service status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "7. Checking logs for any startup issues:"
echo "Backend logs:"
docker logs root-backend-1 --tail=10 2>&1 | grep -E "(listening|error|Error|Started)" || echo "No relevant backend logs"

echo ""
echo "Frontend logs:"
docker logs root-frontend-1 --tail=10 2>&1 | grep -E "(Ready|error|Error|Started)" || echo "No relevant frontend logs"
EOF

echo ""
echo "Testing services after restart..."
sleep 5

# Test authentication
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Authentication still failing"
    echo "Response: $TOKEN_RESPONSE"
else
    echo "✅ Authentication working"
    
    # Test grants API
    echo ""
    echo "Testing grants API:"
    curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'✅ Grants API: {len(data.get(\"grants\", []))} grants')
except Exception as e:
    print(f'❌ Grants API error: {e}')
"
fi

echo ""
echo "🎯 Dashboard URL: https://grants.etownz.com/dashboard"
echo "🔑 Login: admin@etownz.com / admin123"
echo ""
echo "Try the dashboard now with a hard refresh (Ctrl+F5)!"