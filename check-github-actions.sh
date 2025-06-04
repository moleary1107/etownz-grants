#!/bin/bash

echo "Checking GitHub Actions Configuration"
echo "===================================="
echo ""

echo "1. Checking latest GitHub Actions run..."
curl -s "https://api.github.com/repos/moleary1107/etownz-grants/actions/runs?per_page=1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'workflow_runs' in data and data['workflow_runs']:
    run = data['workflow_runs'][0]
    print(f'Latest run: {run[\"name\"]}')
    print(f'Status: {run[\"status\"]}')
    print(f'Conclusion: {run.get(\"conclusion\", \"in progress\")}')
    print(f'URL: {run[\"html_url\"]}')
else:
    print('No workflow runs found')
"

echo ""
echo "2. Checking GitHub secrets (via API - won't show values)..."
echo "Required secrets:"
echo "  - SERVER_IP (should be: 165.227.149.136)"
echo "  - SERVER_SSH_KEY (your SSH private key)"
echo "  - DIGITALOCEAN_ACCESS_TOKEN (your DO token)"

echo ""
echo "3. Testing SSH connection from local machine..."
echo "Testing SSH to production server:"
if ssh -o BatchMode=yes -o ConnectTimeout=5 root@165.227.149.136 "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ Local SSH connection works"
else
    echo "❌ Local SSH connection failed"
fi

echo ""
echo "4. Checking if the SSH key format is correct..."
echo ""
echo "The SERVER_SSH_KEY in GitHub secrets should:"
echo "  - Include the full private key"
echo "  - Start with '-----BEGIN RSA PRIVATE KEY-----' or '-----BEGIN OPENSSH PRIVATE KEY-----'"
echo "  - End with '-----END RSA PRIVATE KEY-----' or '-----END OPENSSH PRIVATE KEY-----'"
echo "  - Include all line breaks"

echo ""
echo "5. Checking authorized_keys on server..."
ssh root@165.227.149.136 << 'EOF' 2>/dev/null || echo "Could not connect to check"
echo "Number of authorized keys on server:"
wc -l ~/.ssh/authorized_keys
echo ""
echo "Key fingerprints in authorized_keys:"
ssh-keygen -l -f ~/.ssh/authorized_keys 2>/dev/null | head -5
EOF

echo ""
echo "6. Common SSH key issues in GitHub Actions:"
echo ""
echo "❌ Common problems:"
echo "  1. Key format issues (missing newlines)"
echo "  2. Wrong key type (using public instead of private)"
echo "  3. Key not in authorized_keys on server"
echo "  4. Incorrect SERVER_IP value"
echo ""
echo "✅ To fix:"
echo "  1. Make sure you copied the PRIVATE key (not .pub)"
echo "  2. Include all headers and footers"
echo "  3. Preserve line breaks when pasting"
echo ""
echo "7. Testing with a simple SSH command..."
echo ""
echo "You can test your key locally by creating a file with the key:"
echo "  1. Save your private key to a file: test-key"
echo "  2. chmod 600 test-key"
echo "  3. ssh -i test-key root@165.227.149.136 'echo success'"
echo ""
echo "If that works locally, the same key should work in GitHub Actions."