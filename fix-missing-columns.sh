#!/bin/bash

echo "Fixing Missing Database Columns"
echo "==============================="
echo ""

if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "1. Adding missing ai_processed column to grants table..."
    psql "$DATABASE_URL" << 'SQL'
-- Add missing ai_processed column
ALTER TABLE grants 
ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false;

-- Update existing grants to have ai_processed = false
UPDATE grants SET ai_processed = false WHERE ai_processed IS NULL;

-- Show the updated grants table structure
\d grants
SQL

    echo ""
    echo "2. Restarting backend to clear any cached errors..."
    ssh root@165.227.149.136 "docker restart root-backend-1"
    
    echo ""
    echo "3. Waiting for backend to restart..."
    sleep 10
    
    echo ""
    echo "4. Testing AI health endpoint..."
    TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@etownz.com","password":"admin123"}')

    TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)
    
    curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/ai/health | python3 -m json.tool
    
    echo ""
    echo "5. Testing grants API one more time..."
    curl -s -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'✅ Grants API: {len(data.get(\"grants\", []))} grants found')
    print(f'✅ Structure: {list(data.keys())}')
except Exception as e:
    print(f'❌ Error: {e}')
"

else
    echo "ERROR: .env file not found!"
fi

echo ""
echo "Dashboard should now work properly!"
echo "Try refreshing: https://grants.etownz.com/dashboard"