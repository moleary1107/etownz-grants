# Production Login Fix Guide

## Current Issue
The login page at https://grants.etownz.com/auth/login is returning 401 Unauthorized errors when trying to log in with demo credentials.

## Root Cause
The GitHub Actions deployment failed, so the latest code with demo user support hasn't been deployed to production yet.

## Solution Steps

### Option 1: Quick Fix - Add Demo Users to Database
Run this to check and fix demo users:
```bash
./check-demo-users-remote.sh
```

If demo users are missing, run:
```bash
./fix-demo-users-remote.sh
```

### Option 2: Full Manual Deployment
If you need to deploy all the latest code:
```bash
./manual-deploy.sh
```

### Option 3: Direct SSH Commands
If the scripts don't work, SSH directly:
```bash
ssh root@165.227.149.136
cd /root/etownz-grants
git pull origin main
./deploy.sh
```

## Demo User Credentials
All users have password: **Demo2025!**

- **Admin**: admin1@demo.etownz.com
- **Manager**: manager1@techcorp.demo  
- **User**: user1@startup.demo
- **Viewer**: viewer1@nonprofit.demo

## Browser Console Errors
The errors you're seeing are from browser extensions (password managers) and can be ignored:
- `FrameDoesNotExistError` - Browser extension issue
- `ERR_FILE_NOT_FOUND` - Extension trying to load files
- The only relevant error is: `POST https://grants.etownz.com/api/auth/login 401 (Unauthorized)`

## Verification
After running the fix, test login at:
https://grants.etownz.com/auth/login

Or test via command line:
```bash
node test-production-login.js
```

## GitHub Actions Fix (Long Term)
The deployment workflow is failing due to SSH authentication. To fix:
1. Ensure SERVER_SSH_KEY in GitHub secrets matches your server's authorized_keys
2. Ensure SERVER_IP is set to 165.227.149.136
3. Run `./scripts/setup-github-ssh-key.sh` to generate a new key pair if needed