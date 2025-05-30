#!/bin/bash

# DigitalOcean Droplet Setup Script
set -e

echo "🔧 Setting up DigitalOcean Droplet for eTownz Grants..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DO_DROPLET_IP" ]; then
    echo "❌ DO_DROPLET_IP not set in .env file"
    echo "Please create your droplet first and add the IP to .env"
    exit 1
fi

echo "📡 Connecting to droplet at $DO_DROPLET_IP..."

# Setup droplet with required software
ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP << 'EOF'
    # Update system
    apt update && apt upgrade -y
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Install Nginx
    apt install -y nginx certbot python3-certbot-nginx
    
    # Create application directory
    mkdir -p /opt/etownz-grants
    
    # Install Node.js (for any build processes)
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Setup firewall
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw --force enable
    
    echo "✅ Droplet setup complete!"
EOF

# Copy initial configuration files
echo "📋 Copying configuration files..."
scp -i $DO_SSH_KEY_PATH docker-compose.prod.yml root@$DO_DROPLET_IP:/opt/etownz-grants/
scp -i $DO_SSH_KEY_PATH -r infrastructure/nginx/ root@$DO_DROPLET_IP:/opt/etownz-grants/

# Setup SSL certificate
echo "🔒 Setting up SSL certificate..."
ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP << EOF
    # Setup Nginx config for domain
    cat > /etc/nginx/sites-available/etownz-grants << 'NGINXCONF'
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXCONF

    # Enable site
    ln -sf /etc/nginx/sites-available/etownz-grants /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    
    # Get SSL certificate
    certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@etownz.com
EOF

echo "🎉 Droplet setup complete!"
echo "📝 Next steps:"
echo "   1. Update your DNS to point $DOMAIN_NAME to $DO_DROPLET_IP"
echo "   2. Update your .env file with actual API keys"
echo "   3. Run: ./scripts/deploy-to-do.sh"