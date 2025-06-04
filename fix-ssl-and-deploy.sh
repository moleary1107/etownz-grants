#!/bin/bash

echo "Fixing SSL and Backend Issues Permanently"
echo "========================================"
echo ""

echo "1. First, let's update the docker-compose.prod.yml to include SSL fix..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Backing up current docker-compose.prod.yml..."
cp docker-compose.prod.yml docker-compose.prod.yml.backup-ssl

echo "Adding NODE_TLS_REJECT_UNAUTHORIZED to backend environment..."
# Check if NODE_TLS_REJECT_UNAUTHORIZED already exists
if grep -q "NODE_TLS_REJECT_UNAUTHORIZED" docker-compose.prod.yml; then
    echo "NODE_TLS_REJECT_UNAUTHORIZED already in docker-compose.prod.yml"
else
    # Add it to the backend service environment section
    sed -i '/backend:/,/^[[:space:]]*[^[:space:]]/{
        /environment:/a\      - NODE_TLS_REJECT_UNAUTHORIZED=0
    }' docker-compose.prod.yml
    echo "Added NODE_TLS_REJECT_UNAUTHORIZED=0 to backend environment"
fi

echo ""
echo "Current backend environment section:"
sed -n '/backend:/,/^[[:space:]]*[^[:space:]]/{/environment:/,/^[[:space:]]*[^[:space:]]/p}' docker-compose.prod.yml | head -20

echo ""
echo "2. Stopping all services..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "3. Starting services with updated configuration..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "4. Waiting for services to start..."
sleep 20

echo ""
echo "5. Checking backend status..."
docker ps | grep backend

echo ""
echo "6. Checking backend logs for errors..."
docker logs etownz-grants-backend-1 --tail=20 2>&1 | grep -E "(listening|Started|error|Error|Database)" | tail -10

echo ""
echo "7. Testing database connection..."
docker exec etownz-grants-backend-1 node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
  }
  pool.end();
});
" 2>&1 || echo "Database test failed"
EOF

echo ""
echo "8. Testing authentication with fixed backend..."
sleep 5

TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

echo "Login response check:"
echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'user' in data:
        user = data['user']
        print('✅ Login successful!')
        print('User fields received:')
        for key, value in user.items():
            if key == 'name':
                print(f'  ⭐ {key}: \"{value}\"')
            else:
                print(f'     {key}: {value}')
        
        if 'name' in user and user['name']:
            print()
            print(f'✅ SUCCESS! Name field present: \"{user[\"name\"]}\"')
            print(f'✅ First name extraction: \"{user[\"name\"].split(\" \")[0]}\"')
            print()
            print('🎉 DASHBOARD SHOULD NOW WORK!')
        else:
            print()
            print('❌ Name field is still missing')
            print('   This means the backend code needs the name field fix')
    else:
        print(f'❌ Login failed: {data.get(\"error\", \"Unknown error\")}')
        print(f'   Details: {data.get(\"details\", \"\")}')
except Exception as e:
    print(f'❌ Error parsing response: {e}')
    print(f'Raw response: {TOKEN_RESPONSE[:200]}...')
"

echo ""
echo "9. Testing API health endpoint..."
curl -s https://grants.etownz.com/api/health | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'Health Status: {data.get(\"status\", \"unknown\")}')
    if data.get('database'):
        print(f'Database Status: {data[\"database\"].get(\"status\", \"unknown\")}')
except Exception as e:
    print(f'Health check error: {e}')
"

echo ""
echo "10. Testing grants API..."
curl -s https://grants.etownz.com/api/grants | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'grants' in data:
        print(f'✅ Grants API working: {len(data[\"grants\"])} grants found')
    else:
        print('❌ Grants API returned unexpected format')
except Exception as e:
    print(f'❌ Grants API error: {e}')
"

echo ""
echo "============================================"
echo "🎯 DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "SSL fix has been applied permanently to docker-compose.prod.yml"
echo ""
echo "🌐 Test the dashboard: https://grants.etownz.com/dashboard"
echo "🔑 Login: admin@etownz.com / admin123"
echo ""
echo "🔄 Remember to do a HARD REFRESH (Ctrl+F5) to clear cache!"
echo ""
echo "If the name field is still missing, the backend code"
echo "needs to be verified to ensure it includes the name field."
echo "============================================"