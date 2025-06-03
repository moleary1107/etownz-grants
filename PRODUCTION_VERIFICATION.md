# Production Verification Guide

## Current Status (as of deployment push)

### ✅ What's Working:
1. **Server is accessible**: 165.227.149.136
2. **HTTPS is responding**: Returns 200 status
3. **Backend health check**: Database connected, production mode confirmed
4. **GitHub Actions**: deploy-simple.yml workflow is active

### ❌ What Needs Verification:
1. **Demo users login**: Currently returning "Invalid credentials"
2. **GitHub Actions deployment**: Check if SSH key is working

## Quick Verification Steps:

### 1. Check GitHub Actions Deployment
```bash
# Go to: https://github.com/moleary1107/etownz-grants/actions
# Look for "Simple Deploy to Production" workflow
# It should have been triggered by the recent commit
```

### 2. SSH to Server and Verify
```bash
ssh root@165.227.149.136

# Check if deployment ran
cd /root/etownz-grants
git log --oneline -1  # Should show latest commit

# Check Docker containers
docker-compose -f docker-compose.prod.yml ps

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend --tail=100 | grep -E "(Demo user|database|error)"

# Check if demo users exist in database
docker-compose -f docker-compose.prod.yml exec backend psql $DATABASE_URL -c "SELECT email, role FROM users WHERE email LIKE '%demo%';"
```

### 3. Manual Deployment (if GitHub Actions failed)
```bash
# On the server
cd /root/etownz-grants
git pull origin main
chmod +x deploy.sh
./deploy.sh
```

### 4. Test Login After Deployment
```bash
# From local machine
node test-production-login.js

# Or with curl
curl -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k
```

## Demo User Credentials
All demo users use password: `Demo2025!`

### Admin Users:
- admin1@demo.etownz.com
- admin2@demo.etownz.com
- admin3@demo.etownz.com

### Manager Users:
- manager1@techcorp.demo
- manager2@healthinc.demo
- manager3@eduorg.demo

### Regular Users:
- user1@startup.demo
- user2@smallbiz.demo
- user3@creative.demo

### Viewer Users:
- viewer1@nonprofit.demo
- viewer2@community.demo
- viewer3@research.demo

## Troubleshooting

### If demo users still don't work:
1. The database might need the demo users inserted
2. Run on server: `cd /root/etownz-grants && cat infrastructure/db/production_demo_users_fixed.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB`

### If deployment didn't run:
1. Check SERVER_SSH_KEY in GitHub secrets
2. Check SERVER_IP is set to 165.227.149.136
3. Manually run deployment script on server

## Next Steps:
1. Monitor https://github.com/moleary1107/etownz-grants/actions for deployment status
2. Once deployment completes, test login functionality
3. If issues persist, SSH to server and check logs