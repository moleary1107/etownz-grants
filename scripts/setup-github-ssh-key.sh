#!/bin/bash

# Setup SSH key for GitHub Actions deployment
echo "=== GitHub Actions SSH Key Setup ==="
echo ""
echo "This script will help you create and configure SSH keys for GitHub Actions."
echo ""

# Generate SSH key
echo "1. Generating SSH key pair..."
ssh-keygen -t ed25519 -C "github-actions@etownz-grants" -f ~/.ssh/github-actions-etownz -N ""

echo ""
echo "2. SSH key generated successfully!"
echo ""
echo "3. Copy this PRIVATE KEY to GitHub Secrets as 'SERVER_SSH_KEY':"
echo "   (Include the BEGIN and END lines)"
echo ""
echo "========== COPY EVERYTHING BELOW =========="
cat ~/.ssh/github-actions-etownz
echo "========== COPY EVERYTHING ABOVE =========="
echo ""
echo "4. Press Enter to continue after copying the private key..."
read

echo ""
echo "5. Now adding the public key to your server..."
echo ""
echo "Run this command to add the public key to your server:"
echo ""
echo "ssh root@165.227.149.136 'mkdir -p ~/.ssh && echo \"$(cat ~/.ssh/github-actions-etownz.pub)\" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'"
echo ""
echo "6. Or manually add this public key to ~/.ssh/authorized_keys on your server:"
echo ""
cat ~/.ssh/github-actions-etownz.pub
echo ""
echo "=== Setup Instructions ==="
echo ""
echo "1. Go to: https://github.com/moleary1107/etownz-grants/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: SERVER_SSH_KEY"
echo "4. Value: Paste the private key from step 3"
echo "5. Click 'Add secret'"
echo ""
echo "Done! Your GitHub Actions should now be able to deploy."