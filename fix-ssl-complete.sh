#!/bin/bash

echo "Complete SSL Fix and Backend Restart"
echo "==================================="
echo ""

ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "1. First, let's stop and remove the orphaned backend container..."
docker stop etownz-grants-backend-1 2>/dev/null || echo "Backend not running"
docker rm etownz-grants-backend-1 2>/dev/null || echo "Backend container not found"

echo ""
echo "2. Let's verify the docker-compose.prod.yml has NODE_TLS_REJECT_UNAUTHORIZED..."
if grep -q "NODE_TLS_REJECT_UNAUTHORIZED" docker-compose.prod.yml; then
    echo "✅ NODE_TLS_REJECT_UNAUTHORIZED is already in docker-compose.prod.yml"
else
    echo "❌ NODE_TLS_REJECT_UNAUTHORIZED missing, adding it now..."
    # Update the backend service to include the environment variable
    sed -i '/backend:/,/^[[:space:]]*[[:a-z]]/{
        /image:/a\    environment:\n      - NODE_ENV=production\n      - NODE_TLS_REJECT_UNAUTHORIZED=0
    }' docker-compose.prod.yml
fi

echo ""
echo "3. Starting all services fresh..."
docker-compose -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "4. Waiting for services to start..."
sleep 20

echo ""
echo "5. Checking all services are running..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "6. Checking backend environment variables..."
docker exec etownz-grants-backend-1 printenv | grep -E "(NODE_TLS|NODE_ENV|DATABASE_URL)" | head -5

echo ""
echo "7. Testing database connection from backend..."
docker exec etownz-grants-backend-1 node -e "
console.log('Testing database connection...');
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW() as time', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Database connected at:', res.rows[0].time);
  }
  pool.end();
});
"

echo ""
echo "8. Checking backend logs for any remaining errors..."
docker logs etownz-grants-backend-1 --tail=15 2>&1 | grep -E "(listening|Started|Database connected|error|Error)" || echo "No relevant logs"
EOF

echo ""
echo "9. Final authentication test..."
sleep 5

# Test login
TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}')

echo "Authentication result:"
echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'user' in data and 'token' in data:
        user = data['user']
        print('✅ LOGIN SUCCESSFUL!')
        print()
        print('User object received:')
        for key, value in user.items():
            if key == 'name':
                print(f'  ⭐ {key}: \"{value}\" ← THIS IS THE KEY FIELD!')
            else:
                print(f'     {key}: {value}')
        
        print()
        if 'name' in user and user['name']:
            print(f'🎉 SUCCESS! Name field is present: \"{user[\"name\"]}\"')
            print(f'🎉 First name would be: \"{user[\"name\"].split(\" \")[0]}\"')
            print()
            print('✨ THE DASHBOARD SHOULD NOW WORK! ✨')
        else:
            print('⚠️  Name field is missing from user object')
            print('    The dashboard will still have the split error')
    else:
        print(f'❌ Login failed: {data.get(\"error\", \"Unknown error\")}')
        if 'details' in data:
            print(f'   Details: {data[\"details\"]}')
except Exception as e:
    print(f'❌ Error: {e}')
    print('Raw response:', TOKEN_RESPONSE[:200])
"

echo ""
echo "10. Testing other endpoints..."
# Test health
echo "Health check:"
curl -s https://grants.etownz.com/api/health | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'  Status: {data.get(\"status\")}')
print(f'  Database: {data.get(\"database\", {}).get(\"status\")}')
" 2>/dev/null || echo "  ❌ Health check failed"

# Test grants
echo ""
echo "Grants API:"
curl -s https://grants.etownz.com/api/grants | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'grants' in data:
    print(f'  ✅ Working: {len(data[\"grants\"])} grants')
else:
    print('  ❌ Unexpected response format')
" 2>/dev/null || echo "  ❌ Grants API failed"

echo ""
echo "================================================"
echo "🎯 FINAL STATUS"
echo "================================================"
echo ""
echo "The SSL fix has been applied and services restarted."
echo ""
echo "🌐 Dashboard URL: https://grants.etownz.com/dashboard"
echo "🔑 Login Credentials:"
echo "   Email: admin@etownz.com"
echo "   Password: admin123"
echo ""
echo "🔄 IMPORTANT: Clear your browser cache!"
echo "   - Hard refresh: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "   - Or use incognito/private mode"
echo ""
echo "If the name field is still missing, we need to check"
echo "the backend code deployment status."
echo "================================================"