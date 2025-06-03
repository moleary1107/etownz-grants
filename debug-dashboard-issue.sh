#!/bin/bash

echo "Debugging Dashboard API Issue"
echo "============================="
echo ""

# Get token
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)

echo "1. Testing the exact API call the dashboard makes..."
echo ""

# Test the grants API that the dashboard calls
echo "Frontend API route (/api/grants):"
FRONTEND_API_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants)
echo "$FRONTEND_API_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅ Frontend API Response Structure:')
    print(f'  Type: {type(data)}')
    if isinstance(data, dict):
        print(f'  Keys: {list(data.keys())}')
        if 'grants' in data:
            print(f'  grants type: {type(data[\"grants\"])}')
            print(f'  grants length: {len(data[\"grants\"]) if isinstance(data[\"grants\"], list) else \"Not a list\"}')
        if 'pagination' in data:
            print(f'  pagination: {data[\"pagination\"]}')
    else:
        print(f'  ❌ Expected object, got {type(data)}')
except Exception as e:
    print(f'❌ JSON Parse Error: {e}')
    print('Raw response:')
    print(sys.stdin.read()[:500])
"

echo ""
echo "2. Testing specific dashboard endpoints..."

# Test the AI health endpoint (which was showing errors)
echo ""
echo "AI health endpoint:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/health | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('AI Health Status:')
    print(f'  Status: {data.get(\"status\", \"unknown\")}')
    if 'errors' in data and data['errors']:
        print(f'  Errors: {data[\"errors\"]}')
except:
    print('❌ AI health endpoint failed')
"

echo ""
echo "3. Checking backend connectivity from frontend..."

# Test if the frontend can reach the backend properly
echo ""
echo "Testing backend connectivity:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/health | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅ Backend health check passed')
    print(f'  Environment: {data.get(\"environment\", \"unknown\")}')
    print(f'  Database: {data.get(\"database\", {}).get(\"status\", \"unknown\")}')
except:
    print('❌ Backend health check failed')
"

echo ""
echo "4. Check if there are any database column errors..."

# Check backend logs for any database issues
ssh root@165.227.149.136 << 'EOF'
echo "Recent backend logs (looking for errors):"
docker logs root-backend-1 --tail=20 2>&1 | grep -E "(error|Error|ERROR|column.*does not exist)" || echo "No recent errors found"
EOF

echo ""
echo "5. Restart the backend container to clear any cached errors..."
ssh root@165.227.149.136 "docker restart root-backend-1"

echo ""
echo "Waiting for backend to restart..."
sleep 10

echo ""
echo "6. Test API again after restart..."
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅ API working after restart')
    print(f'  Grants count: {len(data.get(\"grants\", []))}')
except Exception as e:
    print(f'❌ Still failing: {e}')
"