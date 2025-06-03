#!/bin/bash

echo "Testing Dashboard API Endpoints"
echo "==============================="
echo ""

# First, let's get a valid token
echo "1. Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Got token: ${TOKEN:0:50}..."
echo ""

# Test key dashboard endpoints
echo "2. Testing dashboard API endpoints with token..."

echo ""
echo "Testing /api/grants:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants | python3 -m json.tool | head -20

echo ""
echo "Testing /api/grants route (should return grants list):"
GRANTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants)
echo $GRANTS_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'Grants endpoint status: SUCCESS')
    print(f'Number of grants: {len(data) if isinstance(data, list) else \"Not a list\"}')
    if isinstance(data, list) and len(data) > 0:
        print(f'First grant title: {data[0].get(\"title\", \"No title\")}')
except:
    print('Grants endpoint status: ERROR')
    print(sys.stdin.read())
"

echo ""
echo "Testing /api/ai/health:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/health | python3 -m json.tool

echo ""
echo "Testing /api/scraping/stats:"
curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/scraping/stats | python3 -m json.tool

echo ""
echo "3. Checking if frontend is properly built..."
echo "Frontend manifest check:"
curl -s -I https://grants.etownz.com/_next/app-build-manifest.json | head -5

echo ""
echo "4. Testing the specific URL that's causing issues..."
echo "Dashboard page status:"
curl -s -I https://grants.etownz.com/dashboard | head -5

echo ""
echo "5. Let's check what the dashboard page actually returns..."
echo "Dashboard HTML snippet:"
curl -s https://grants.etownz.com/dashboard | head -10