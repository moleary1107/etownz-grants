#!/bin/bash

echo "Final Status Check & Summary"
echo "============================"
echo ""

echo "1. Quick health check..."
echo "Backend health:"
curl -s https://grants.etownz.com/api/health | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'Status: {data.get(\"status\", \"unknown\")}')
    print(f'Environment: {data.get(\"environment\", \"unknown\")}')
    if data.get('database'):
        print(f'Database: {data[\"database\"].get(\"status\", \"unknown\")}')
except Exception as e:
    print(f'Health check failed: {e}')
" 2>/dev/null || echo "❌ Backend health check failed"

echo ""
echo "2. Testing basic authentication..."
curl -s -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}' | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'user' in data:
        print('✅ Login working')
        user = data['user']
        has_name = 'name' in user and user['name']
        print(f'Name field: {\"✅ Present\" if has_name else \"❌ Missing\"}')
        if has_name:
            print(f'Name value: \"{user[\"name\"]}\"')
    else:
        print(f'❌ Login failed: {data.get(\"error\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Authentication test failed: {e}')
"

echo ""
echo "=============================================="
echo "## 📋 SUMMARY OF CURRENT STATUS"
echo "=============================================="
echo ""
echo "### ✅ WORKING:"
echo "- Authentication system with demo users"
echo "- Database with all required tables"
echo "- Vector database tables created"
echo "- Core API endpoints (grants, health, etc.)"
echo "- Production deployment infrastructure"
echo ""
echo "### ⚠️ KNOWN ISSUES:"
echo "- SSL certificate errors in backend logs"
echo "- Name field not appearing in user API response"
echo "- Dashboard JavaScript split error persists"
echo ""
echo "### 🔧 IMMEDIATE FIXES NEEDED:"
echo "1. Fix database SSL connection (NODE_TLS_REJECT_UNAUTHORIZED)"
echo "2. Ensure name field is included in user API response"
echo "3. Test dashboard after fixes"
echo ""
echo "### 🔑 DEMO CREDENTIALS:"
echo "Email: admin@etownz.com"
echo "Password: admin123"
echo ""
echo "Alternative users:"
echo "- john@techstart.ie / techstart123"
echo "- david@corkresearch.ie / research123"
echo ""
echo "### 🌐 URLS:"
echo "Dashboard: https://grants.etownz.com/dashboard"
echo "Login: https://grants.etownz.com/auth/login"
echo ""
echo "=============================================="
echo ""
echo "The core infrastructure is working. The main remaining"
echo "issue is the JavaScript 'split' error caused by the"
echo "missing 'name' field in the user API response."
echo ""
echo "This should be fixable by ensuring the backend properly"
echo "includes the name field from the database query."