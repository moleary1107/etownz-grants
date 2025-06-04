#!/bin/bash

echo "Checking Final Result"
echo "===================="
echo ""

echo "1. Checking backend status on server..."
ssh root@165.227.149.136 << 'EOF'
echo "Backend container status:"
docker ps | grep backend

echo ""
echo "Backend logs (last 10 lines):"
docker logs etownz-grants-backend-1 --tail=10 2>&1 | head -10
EOF

echo ""
echo "2. Testing login with rebuilt backend..."

for i in {1..5}; do
    echo ""
    echo "Attempt $i:"
    
    TOKEN_RESPONSE=$(curl -s -X POST https://grants.etownz.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@etownz.com","password":"admin123"}')

    echo $TOKEN_RESPONSE | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    user = data.get('user', {})
    
    print('Login response user fields:')
    for key, value in user.items():
        if key == 'name':
            print(f'  ⭐ {key}: \"{value}\"')
        else:
            print(f'     {key}: {value}')
    
    if 'name' in user and user['name']:
        first_name = user['name'].split(' ')[0]
        print()
        print(f'✅ SUCCESS! Name field exists: \"{user[\"name\"]}\"')
        print(f'✅ First name would be: \"{first_name}\"')
        print()
        print('🎉 THE DASHBOARD SHOULD NOW WORK!')
        print('The JavaScript \"split\" error should be resolved.')
        sys.exit(0)
    else:
        print()
        print(f'❌ Name field still missing (attempt {$i})')
except Exception as e:
    print(f'❌ Error: {e}')
" && break || echo "Waiting 10 seconds before retry..." && sleep 10
done

echo ""
echo "================================================"
echo "🌐 Dashboard URL: https://grants.etownz.com/dashboard"
echo "🔑 Login Credentials:"
echo "   Email: admin@etownz.com"
echo "   Password: admin123"
echo ""
echo "🔄 Try with a HARD REFRESH:"
echo "   Chrome/Edge: Ctrl+F5 or Shift+F5"
echo "   Mac: Cmd+Shift+R"
echo "   Or open in incognito/private mode"
echo "================================================"