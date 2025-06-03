#!/bin/bash

echo "Debugging Production Environment & Dashboard"
echo "============================================"
echo ""

echo "1. Checking production environment variables..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Environment file contents (masked):"
if [ -f .env ]; then
    grep -E "(OPENAI|PINECONE|DATABASE)" .env | sed 's/=.*/=***MASKED***/'
else
    echo "❌ .env file not found"
fi

echo ""
echo "Backend container environment (masked):"
docker exec root-backend-1 printenv | grep -E "(OPENAI|PINECONE|DATABASE|NODE_ENV)" | sed 's/=.*/=***MASKED***/' | head -10

echo ""
echo "Docker container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Current git commit:"
git log --oneline -1

echo ""
echo "Backend logs (last 20 lines):"
docker logs root-backend-1 --tail=20 2>&1 | grep -E "(error|Error|ERROR|Started|listening)" || echo "No relevant logs"
EOF

echo ""
echo "2. Checking if we need to deploy latest code..."
echo ""
echo "Local git status:"
git status --porcelain

echo ""
echo "Local vs remote commits:"
git log --oneline -5

echo ""
echo "3. Testing API endpoints to see exact error responses..."
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)

echo ""
echo "Testing AI health with full response:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/health | python3 -m json.tool

echo ""
echo "4. Testing dashboard page directly..."
echo ""
echo "Dashboard page status code:"
curl -s -I https://grants.etownz.com/dashboard | head -1

echo ""
echo "Testing if frontend can reach backend API:"
curl -s https://grants.etownz.com/api/grants | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅ Frontend to backend connection working')
    print(f'Response type: {type(data)}')
    print(f'Keys: {list(data.keys()) if isinstance(data, dict) else \"Not a dict\"}')
except Exception as e:
    print(f'❌ Frontend to backend connection failed: {e}')
    raw = sys.stdin.read()
    print(f'Raw response: {raw[:200]}...')
"

echo ""
echo "5. Check if frontend environment is configured correctly..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Frontend container logs:"
docker logs root-frontend-1 --tail=10 2>&1 | head -10

echo ""
echo "Frontend environment check:"
docker exec root-frontend-1 printenv | grep -E "(API_URL|BACKEND|NEXT)" | head -5 || echo "No frontend env vars found"
EOF

echo ""
echo "6. Manual deployment test..."
read -p "Do you want to manually pull latest code and redeploy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying latest code to production..."
    ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Pulling latest code..."
git pull origin main

echo "Current commit after pull:"
git log --oneline -1

echo "Restarting services..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

echo "Waiting for services to start..."
sleep 15

echo "Service status:"
docker-compose -f docker-compose.prod.yml ps
EOF

    echo ""
    echo "Testing after deployment..."
    sleep 5
    
    # Get new token
    TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@etownz.com","password":"admin123"}')

    TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)
    
    echo "AI health after deployment:"
    curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/health | python3 -m json.tool
fi