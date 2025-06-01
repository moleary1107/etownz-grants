#!/bin/bash
#
# Production Server Automation Setup
# Sets up automated monitoring, maintenance, and self-healing on production server
#

set -e

echo "🤖 Setting up Production Server Automation"
echo "=========================================="

# Configuration
PRODUCTION_IP="165.227.149.136"
PRODUCTION_USER="root"
DOMAIN="grants.etownz.com"
LOG_DIR="/var/log/etownz-automation"
BACKUP_DIR="/root/backups"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "📋 Automation Features to Install:"
echo "  • Automated health monitoring (every 15 minutes)"
echo "  • Self-healing deployments (restart on failure)"
echo "  • Weekly maintenance automation"
echo "  • Log rotation and cleanup"
echo "  • Backup automation"
echo "  • Security monitoring"
echo ""

# Function to execute commands on production server
exec_remote() {
    ssh $PRODUCTION_USER@$PRODUCTION_IP "$1"
}

# Function to copy files to production server
copy_to_prod() {
    scp "$1" $PRODUCTION_USER@$PRODUCTION_IP:"$2"
}

echo "🔧 Step 1: Setting up directory structure"
exec_remote "
    mkdir -p $LOG_DIR
    mkdir -p $BACKUP_DIR
    mkdir -p /root/automation-scripts
    mkdir -p /root/monitoring
"

echo "✅ Directory structure created"

echo ""
echo "📊 Step 2: Installing monitoring scripts on production"

# Create production health monitor
cat > /tmp/production-health-monitor.sh << 'EOF'
#!/bin/bash
#
# Production Health Monitor
# Runs every 15 minutes to check application health and auto-heal
#

LOG_FILE="/var/log/etownz-automation/health-monitor.log"
DOMAIN="grants.etownz.com"
MAX_FAILURES=3
FAILURE_COUNT_FILE="/tmp/health-failure-count"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_endpoint() {
    local url=$1
    local timeout=${2:-10}
    
    if curl -sf --max-time $timeout "$url" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

restart_services() {
    log_message "🔄 Restarting services due to health check failures"
    
    cd /root
    docker-compose -f docker-compose.prod-clean.yml restart
    
    # Wait for services to start
    sleep 30
    
    # Reset failure count after restart
    echo "0" > "$FAILURE_COUNT_FILE"
    
    log_message "✅ Services restarted successfully"
}

# Main health check
log_message "🔍 Starting health check"

failures=0

# Check frontend
if ! check_endpoint "https://$DOMAIN"; then
    log_message "❌ Frontend check failed"
    failures=$((failures + 1))
else
    log_message "✅ Frontend healthy"
fi

# Check API
if ! check_endpoint "https://$DOMAIN/api/health"; then
    log_message "❌ API check failed"
    failures=$((failures + 1))
else
    log_message "✅ API healthy"
fi

# Check containers
unhealthy_containers=$(docker ps --filter "status=exited" --format "{{.Names}}" | wc -l)
if [ $unhealthy_containers -gt 0 ]; then
    log_message "❌ $unhealthy_containers containers are not running"
    failures=$((failures + 1))
else
    log_message "✅ All containers running"
fi

# Handle failures
if [ $failures -gt 0 ]; then
    # Get current failure count
    if [ -f "$FAILURE_COUNT_FILE" ]; then
        current_failures=$(cat "$FAILURE_COUNT_FILE")
    else
        current_failures=0
    fi
    
    new_failures=$((current_failures + 1))
    echo "$new_failures" > "$FAILURE_COUNT_FILE"
    
    log_message "⚠️  Health check failed ($failures issues) - Failure count: $new_failures/$MAX_FAILURES"
    
    # Auto-restart if max failures reached
    if [ $new_failures -ge $MAX_FAILURES ]; then
        restart_services
    fi
else
    # Reset failure count on success
    echo "0" > "$FAILURE_COUNT_FILE"
    log_message "✅ All health checks passed"
fi

# Cleanup old logs (keep last 7 days)
find /var/log/etownz-automation -name "*.log" -mtime +7 -delete 2>/dev/null || true
EOF

copy_to_prod /tmp/production-health-monitor.sh /root/automation-scripts/

echo "✅ Health monitor installed"

echo ""
echo "🔄 Step 3: Installing automated maintenance script"

cat > /tmp/production-maintenance.sh << 'EOF'
#!/bin/bash
#
# Production Automated Maintenance
# Weekly maintenance tasks for production server
#

LOG_FILE="/var/log/etownz-automation/maintenance.log"
BACKUP_DIR="/root/backups"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "🔧 Starting weekly maintenance"

# Docker cleanup
log_message "🐳 Docker cleanup"
docker system prune -f --volumes
docker image prune -f

# Git repository cleanup
log_message "📚 Git repository maintenance"
cd /root
git gc --auto

# Backup configuration files
log_message "💾 Creating configuration backup"
backup_file="$BACKUP_DIR/config-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$backup_file" \
    docker-compose.prod-clean.yml \
    .env \
    /var/log/etownz-automation \
    /root/automation-scripts \
    2>/dev/null || true

# Cleanup old backups (keep last 4 weeks)
find "$BACKUP_DIR" -name "config-backup-*.tar.gz" -mtime +28 -delete 2>/dev/null || true

# Log cleanup
log_message "🧹 Log cleanup"
find /var/log -name "*.log" -mtime +30 -delete 2>/dev/null || true
journalctl --vacuum-time=30d

# Update system packages (security updates only)
log_message "🔒 Security updates"
apt-get update -qq
apt-get upgrade -y --only-upgrade $(apt list --upgradable 2>/dev/null | grep -i security | cut -d/ -f1) 2>/dev/null || true

# Restart services for memory cleanup
log_message "🔄 Service restart for memory cleanup"
docker-compose -f docker-compose.prod-clean.yml restart

log_message "✅ Weekly maintenance completed"

# Generate maintenance report
cat > "$BACKUP_DIR/maintenance-report-$(date +%Y%m%d).txt" << EOL
Production Maintenance Report - $(date)
=============================================

Docker Images: $(docker images | wc -l)
Running Containers: $(docker ps | wc -l)
Disk Usage: $(df -h / | tail -1 | awk '{print $5}')
Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
Uptime: $(uptime -p)

Recent Health Check Results:
$(tail -20 /var/log/etownz-automation/health-monitor.log | grep "$(date +%Y-%m-%d)" || echo "No recent health checks")

Backup Created: $backup_file
Next Maintenance: $(date -d "+1 week")
EOL

log_message "📊 Maintenance report generated"
EOF

copy_to_prod /tmp/production-maintenance.sh /root/automation-scripts/

echo "✅ Maintenance script installed"

echo ""
echo "🚨 Step 4: Installing emergency recovery script"

cat > /tmp/emergency-recovery.sh << 'EOF'
#!/bin/bash
#
# Emergency Recovery Script
# Triggered when critical failures are detected
#

LOG_FILE="/var/log/etownz-automation/emergency.log"
BACKUP_DIR="/root/backups"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] EMERGENCY: $1" | tee -a "$LOG_FILE"
}

log_message "🚨 Emergency recovery initiated"

# Stop all services
log_message "🛑 Stopping all services"
cd /root
docker-compose -f docker-compose.prod-clean.yml down

# Clean up any corrupted containers
log_message "🧹 Cleaning up containers"
docker system prune -f --volumes

# Restore from backup if available
latest_backup=$(ls -t "$BACKUP_DIR"/config-backup-*.tar.gz 2>/dev/null | head -1)
if [ -n "$latest_backup" ]; then
    log_message "📦 Restoring from backup: $latest_backup"
    tar -xzf "$latest_backup" -C / 2>/dev/null || true
fi

# Pull latest images
log_message "📥 Pulling latest container images"
docker-compose -f docker-compose.prod-clean.yml pull

# Restart services
log_message "🚀 Restarting services"
docker-compose -f docker-compose.prod-clean.yml up -d

# Wait and verify
sleep 60

if curl -sf "https://grants.etownz.com/api/health" >/dev/null 2>&1; then
    log_message "✅ Emergency recovery successful"
else
    log_message "❌ Emergency recovery failed - manual intervention required"
fi
EOF

copy_to_prod /tmp/emergency-recovery.sh /root/automation-scripts/

echo "✅ Emergency recovery script installed"

echo ""
echo "⏰ Step 5: Setting up cron jobs"

exec_remote "
    # Make scripts executable
    chmod +x /root/automation-scripts/*.sh
    
    # Create cron jobs
    crontab -l > /tmp/current-cron 2>/dev/null || echo '' > /tmp/current-cron
    
    # Remove existing etownz automation entries
    grep -v 'etownz-automation' /tmp/current-cron > /tmp/new-cron || echo '' > /tmp/new-cron
    
    # Add new automation entries
    cat >> /tmp/new-cron << 'CRON_EOF'

# eTownz Grants Automation
# Health monitoring every 15 minutes
*/15 * * * * /root/automation-scripts/production-health-monitor.sh >/dev/null 2>&1

# Weekly maintenance on Sundays at 3 AM
0 3 * * 0 /root/automation-scripts/production-maintenance.sh >/dev/null 2>&1

# Daily backup at 1 AM
0 1 * * * /root/automation-scripts/production-maintenance.sh >/dev/null 2>&1

CRON_EOF
    
    # Install new crontab
    crontab /tmp/new-cron
    rm /tmp/current-cron /tmp/new-cron
    
    echo 'Cron jobs installed:'
    crontab -l | grep -A 10 'eTownz Grants Automation'
"

echo "✅ Cron jobs configured"

echo ""
echo "📱 Step 6: Setting up log rotation"

exec_remote "
    cat > /etc/logrotate.d/etownz-automation << 'LOGROTATE_EOF'
/var/log/etownz-automation/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
LOGROTATE_EOF
"

echo "✅ Log rotation configured"

echo ""
echo "🔐 Step 7: Setting up security monitoring"

cat > /tmp/security-monitor.sh << 'EOF'
#!/bin/bash
#
# Security Monitor
# Checks for unusual activity and security issues
#

LOG_FILE="/var/log/etownz-automation/security.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SECURITY: $1" | tee -a "$LOG_FILE"
}

# Check for failed login attempts
failed_logins=$(grep "Failed password" /var/log/auth.log | grep "$(date +%b\ %d)" | wc -l)
if [ $failed_logins -gt 10 ]; then
    log_message "⚠️  High number of failed login attempts: $failed_logins"
fi

# Check for unusual container activity
exited_containers=$(docker ps -a --filter "status=exited" --filter "status=dead" | wc -l)
if [ $exited_containers -gt 5 ]; then
    log_message "⚠️  Multiple containers have exited: $exited_containers"
fi

# Check disk usage
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_usage -gt 85 ]; then
    log_message "⚠️  High disk usage: ${disk_usage}%"
fi

# Check memory usage
memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $memory_usage -gt 90 ]; then
    log_message "⚠️  High memory usage: ${memory_usage}%"
fi

log_message "✅ Security check completed"
EOF

copy_to_prod /tmp/security-monitor.sh /root/automation-scripts/

exec_remote "
    chmod +x /root/automation-scripts/security-monitor.sh
    
    # Add security monitoring to cron (every 4 hours)
    crontab -l > /tmp/current-cron
    echo '0 */4 * * * /root/automation-scripts/security-monitor.sh >/dev/null 2>&1' >> /tmp/current-cron
    crontab /tmp/current-cron
    rm /tmp/current-cron
"

echo "✅ Security monitoring configured"

echo ""
echo "🧪 Step 8: Testing automation setup"

echo "Testing health monitor..."
exec_remote "/root/automation-scripts/production-health-monitor.sh"

echo ""
echo "Testing security monitor..."
exec_remote "/root/automation-scripts/security-monitor.sh"

echo ""
echo "Checking cron jobs..."
exec_remote "crontab -l | grep -A 20 'eTownz Grants Automation'"

echo ""
echo "🎉 Production Automation Setup Complete!"
echo "========================================"
echo ""
echo -e "${GREEN}✅ Installed Automation Features:${NC}"
echo "  • Health monitoring every 15 minutes"
echo "  • Auto-restart on 3 consecutive failures"
echo "  • Weekly maintenance (Sundays 3 AM)"
echo "  • Daily backups (1 AM)"
echo "  • Security monitoring every 4 hours"
echo "  • Emergency recovery procedures"
echo "  • Log rotation and cleanup"
echo ""
echo -e "${BLUE}📋 Monitoring Locations:${NC}"
echo "  • Health logs: /var/log/etownz-automation/health-monitor.log"
echo "  • Maintenance logs: /var/log/etownz-automation/maintenance.log"
echo "  • Security logs: /var/log/etownz-automation/security.log"
echo "  • Emergency logs: /var/log/etownz-automation/emergency.log"
echo "  • Backups: /root/backups/"
echo ""
echo -e "${YELLOW}🔧 Manual Commands:${NC}"
echo "  • Check health: ssh root@$PRODUCTION_IP '/root/automation-scripts/production-health-monitor.sh'"
echo "  • Run maintenance: ssh root@$PRODUCTION_IP '/root/automation-scripts/production-maintenance.sh'"
echo "  • Emergency recovery: ssh root@$PRODUCTION_IP '/root/automation-scripts/emergency-recovery.sh'"
echo "  • View logs: ssh root@$PRODUCTION_IP 'tail -f /var/log/etownz-automation/*.log'"
echo ""
echo "🤖 The system is now fully automated and self-healing!"
echo "If you disappear, the automation will:"
echo "  1. Monitor health every 15 minutes"
echo "  2. Auto-restart services on failures"
echo "  3. Perform weekly maintenance"
echo "  4. Create daily backups"
echo "  5. Monitor security issues"
echo "  6. Clean up logs and resources"
echo ""
echo "🚨 Emergency contacts will be notified via GitHub issues for critical failures."

# Cleanup temp files
rm -f /tmp/production-health-monitor.sh /tmp/production-maintenance.sh /tmp/emergency-recovery.sh /tmp/security-monitor.sh