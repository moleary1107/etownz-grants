# GitHub Secrets Setup

To enable automatic deployment, add these secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:

## Required Secrets

### `DIGITALOCEAN_ACCESS_TOKEN`
Your DigitalOcean API token with read/write access to:
- Container Registry
- Droplets

### `SERVER_IP`
The IP address of your production server:
```
165.227.149.136
```

### `SERVER_SSH_KEY`
Your private SSH key to access the server. Generate one if needed:
```bash
ssh-keygen -t ed25519 -C "github-actions@etownz"
```

Then add the public key to your server:
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@165.227.149.136
```

## Deployment Process

Once these secrets are configured, every push to the `main` branch will:

1. Build Docker images
2. Push them to DigitalOcean Container Registry
3. SSH into the production server
4. Pull and deploy the latest images
5. Run database migrations
6. Restart all services

## Manual Deployment

If you need to deploy manually:
```bash
ssh root@165.227.149.136
cd /root
./deploy.sh
```