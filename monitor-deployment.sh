#!/bin/bash

echo "Monitoring GitHub Actions Deployment"
echo "==================================="
echo ""

echo "🔄 Current deployment is in progress..."
echo ""
echo "Check the live logs at:"
echo "https://github.com/moleary1107/etownz-grants/actions"
echo ""

# Wait a bit for the deployment to progress
echo "Waiting 30 seconds for deployment to progress..."
sleep 30

echo ""
echo "Checking deployment status..."
curl -s "https://api.github.com/repos/moleary1107/etownz-grants/actions/runs?per_page=1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'workflow_runs' in data and data['workflow_runs']:
    run = data['workflow_runs'][0]
    print(f'Status: {run[\"status\"]}')
    print(f'Conclusion: {run.get(\"conclusion\", \"in progress\")}')
    
    if run['conclusion'] == 'success':
        print('✅ Deployment successful!')
    elif run['conclusion'] == 'failure':
        print('❌ Deployment failed')
        print('Check logs at:', run['html_url'])
    else:
        print('🔄 Still in progress...')
"

echo ""
echo "Checking production server for latest changes..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants
echo "Latest commit on production:"
git log --oneline -1
echo ""
echo "Docker containers status:"
docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}"
EOF

echo ""
echo "Testing production endpoints..."
./check-production-health.sh

echo ""
echo "=================================="
echo "If the deployment is still running:"
echo "1. Check: https://github.com/moleary1107/etownz-grants/actions"
echo "2. Look for the 'Simple Deploy to Production' workflow"
echo "3. Click on it to see detailed logs"
echo ""
echo "Common failure points:"
echo "- Building Docker images (might take 5-10 minutes)"
echo "- Pushing to registry (needs DIGITALOCEAN_ACCESS_TOKEN)"
echo "- SSH deployment (needs correct SERVER_SSH_KEY)"
echo "=================================="