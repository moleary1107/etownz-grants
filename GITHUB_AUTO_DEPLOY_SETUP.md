# GitHub Auto-Deploy Setup

This guide helps you set up automatic deployment when pushing to the main branch.

## Prerequisites

1. SSH access to your production server (165.227.149.136)
2. Admin access to your GitHub repository

## Setup Steps

### 1. Generate SSH Key for GitHub Actions

On your **local machine**, generate a new SSH key specifically for GitHub Actions:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_actions_deploy -C "github-actions-deploy"
```

When prompted for a passphrase, **leave it empty** (press Enter twice).

### 2. Add Public Key to Production Server

Copy the public key to your clipboard:

```bash
cat ~/.ssh/github_actions_deploy.pub
```

Then add it to the production server:

```bash
ssh root@165.227.149.136
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

### 3. Add Private Key to GitHub Secrets

1. Copy the private key:
   ```bash
   cat ~/.ssh/github_actions_deploy
   ```

2. Go to your GitHub repository: https://github.com/moleary1107/etownz-grants

3. Navigate to: **Settings → Secrets and variables → Actions**

4. Click **New repository secret**

5. Create a secret named `SERVER_SSH_KEY` and paste the entire private key content, including:
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   [your key content]
   -----END OPENSSH PRIVATE KEY-----
   ```

### 4. (Optional) Set up Slack Notifications

If you want deployment notifications:

1. Create a Slack webhook URL at: https://api.slack.com/messaging/webhooks
2. Add it as a GitHub secret named `SLACK_WEBHOOK`

## How It Works

Once set up, the deployment process is automatic:

1. **You push to main** → GitHub Actions triggers
2. **Actions connects to server** via SSH using the key
3. **Server pulls latest code** from GitHub
4. **Docker builds new images** with timestamp tags
5. **Old containers stop** → New containers start
6. **Health checks run** to verify services
7. **Old images cleaned up** to save space
8. **You get notified** (if Slack is configured)

## Testing the Setup

1. Make a small change (like updating README.md)
2. Commit and push:
   ```bash
   git add README.md
   git commit -m "test: auto-deployment"
   git push origin main
   ```
3. Watch the deployment at: https://github.com/moleary1107/etownz-grants/actions

## What Gets Deployed

The workflow:
- Uses `docker-compose.prod-local.yml`
- Builds from source (not registry images)
- Tags images with timestamps
- Includes health checks
- Cleans up old images

## Troubleshooting

### SSH Key Issues

If you see "Host key verification failed":
```bash
ssh-keyscan -H 165.227.149.136 >> ~/.ssh/known_hosts
```

### Permission Denied

Ensure the SSH key has correct permissions:
```bash
chmod 600 ~/.ssh/github_actions_deploy
chmod 644 ~/.ssh/github_actions_deploy.pub
```

### Deployment Fails

Check the Actions logs:
1. Go to https://github.com/moleary1107/etownz-grants/actions
2. Click on the failed workflow
3. Review the error messages

Common issues:
- **Build fails**: Check Dockerfile syntax
- **Health check fails**: Service might need more time to start
- **Out of space**: Run `docker system prune -a` on server

## Manual Deployment (Fallback)

If auto-deploy fails, you can still deploy manually:

```bash
ssh root@165.227.149.136
cd /root/etownz-grants
./scripts/deploy-prod.sh
```

## Security Notes

- The SSH key is only for deployment (no passphrase)
- Consider restricting the key to specific commands
- Rotate keys periodically
- Monitor the Actions logs for suspicious activity

## Next Steps

After setup:
1. Every push to main auto-deploys
2. Monitor at: https://github.com/moleary1107/etownz-grants/actions
3. Check site after each deployment
4. Set up monitoring/alerts for production

Remember: With great automation comes great responsibility! 🚀