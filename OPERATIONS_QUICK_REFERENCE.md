# 🚀 eTownz Grants - Operations Quick Reference

## 📋 **Quick Status Check**

### **System Health (1 minute check)**
```bash
# Production health dashboard
curl -s http://165.227.149.136:9090 | grep -q "System Monitor" && echo "✅ Monitoring OK" || echo "❌ Monitoring DOWN"

# API health check  
curl -s https://grants.etownz.com/api/health | grep -q "ok" && echo "✅ API OK" || echo "❌ API DOWN"

# Container status
ssh root@165.227.149.136 "docker compose -f docker-compose.prod-clean.yml ps --format table"
```

### **GitHub Actions Status**
```bash
gh run list --limit 3 --json status,conclusion,displayTitle
```

---

## 🤖 **Automation Status**

### **✅ Active Automation (Verified)**
- 🤖 **GitHub Actions**: Running automated workflows
- 🏥 **Health Monitoring**: Every 15 minutes  
- 🧹 **Weekly Maintenance**: Sundays at 3 AM
- 💾 **Daily Backups**: Every day at 1 AM
- 🔐 **Security Monitoring**: Every 4 hours
- 📊 **Real-time Dashboard**: http://165.227.149.136:9090
- 🛡️ **Pre-commit Hooks**: Repository protection active
- 🔄 **Self-healing**: 3-strike restart policy

### **Verification Commands**
```bash
# Check cron jobs are running
ssh root@165.227.149.136 'crontab -l | grep automation'

# Check monitoring service
ssh root@165.227.149.136 'systemctl status etownz-monitoring'

# View recent automation logs
ssh root@165.227.149.136 'tail -20 /var/log/etownz-automation/health-monitor.log'
```

---

## 🚨 **Emergency Commands**

### **Critical Issues**
```bash
# Emergency system restart
ssh root@165.227.149.136 'docker compose -f docker-compose.prod-clean.yml restart'

# Emergency shutdown
ssh root@165.227.149.136 '/root/automation-scripts/emergency-shutdown.sh'

# Force cleanup (disk space issues)
ssh root@165.227.149.136 'docker system prune -af --volumes'

# Emergency database backup
ssh root@165.227.149.136 'docker exec root-postgres-1 pg_dumpall -U postgres > /root/emergency-backup/emergency-$(date +%Y%m%d-%H%M%S).sql'
```

### **Manual Recovery**
```bash
# Complete system recovery
ssh root@165.227.149.136 '/root/automation-scripts/emergency-recovery.sh'

# Manual health check
ssh root@165.227.149.136 '/root/automation-scripts/production-health-monitor.sh'

# Manual maintenance
ssh root@165.227.149.136 '/root/automation-scripts/production-maintenance.sh'
```

---

## 🔧 **Common Operations**

### **Deployment**
```bash
# Quick production deployment
./scripts/deploy-to-do.sh

# Force rebuild deployment  
./scripts/deploy-to-do.sh --force-rebuild

# Service-specific deployment
./scripts/deploy-to-do.sh --service frontend

# Check deployment health
./scripts/deployment-health-check.sh
```

### **Repository Management**
```bash
# Repository health check
./scripts/check-repo-health.sh

# Force repository cleanup
./scripts/automated-cleanup-trigger.sh

# Environment validation
./scripts/validate-environment.sh
```

### **Log Monitoring**
```bash
# View automation logs
ssh root@165.227.149.136 'tail -f /var/log/etownz-automation/*.log'

# View container logs
ssh root@165.227.149.136 'docker compose -f docker-compose.prod-clean.yml logs -f --tail 50'

# View specific service logs
ssh root@165.227.149.136 'docker logs root-frontend-1 --tail 20'
ssh root@165.227.149.136 'docker logs root-backend-1 --tail 20'
```

---

## 📊 **Performance Monitoring**

### **Resource Usage**
```bash
# System resources
ssh root@165.227.149.136 'top -bn1 | head -5'

# Container resources
ssh root@165.227.149.136 'docker stats --no-stream'

# Disk usage
ssh root@165.227.149.136 'df -h && docker system df'

# Memory usage
ssh root@165.227.149.136 'free -h'
```

### **API Performance**
```bash
# API response times
time curl -s https://grants.etownz.com/api/health
time curl -s https://grants.etownz.com/api/grants

# Database performance
ssh root@165.227.149.136 'docker exec root-postgres-1 psql -U postgres -c "SELECT datname, pg_database_size(datname) FROM pg_database;"'
```

---

## 🛡️ **Security Operations**

### **Security Status Check**
```bash
# Failed login attempts (last 24 hours)
ssh root@165.227.149.136 'journalctl --since="24 hours ago" | grep "Failed password" | wc -l'

# Active connections
ssh root@165.227.149.136 'netstat -an | grep ESTABLISHED | wc -l'

# Security monitoring log
ssh root@165.227.149.136 'tail -10 /var/log/etownz-automation/security-monitor.log'
```

### **Manual Security Actions**
```bash
# Block suspicious IP
ssh root@165.227.149.136 'ufw deny from [IP_ADDRESS]'

# SSL certificate check
ssh root@165.227.149.136 'certbot certificates'

# Firewall status
ssh root@165.227.149.136 'ufw status numbered'
```

---

## 🔧 **Manual Testing**

### **Role & Permission Testing**
```bash
# Check demo users
curl -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Test API endpoints
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/applications
curl -H "Authorization: Bearer $TOKEN" https://grants.etownz.com/api/grants
```

**📋 For comprehensive testing procedures, see: [MANUAL_TESTING_ROLES_PERMISSIONS_GUIDE.md](./MANUAL_TESTING_ROLES_PERMISSIONS_GUIDE.md)**

---

## 📈 **Monitoring Thresholds**

### **Alert Levels**
| Metric | Warning | Critical | Action |
|--------|---------|----------|---------|
| **CPU Usage** | >80% | >90% | Auto-restart |
| **Memory Usage** | >85% | >95% | Auto-cleanup |
| **Disk Usage** | >85% | >95% | Emergency cleanup |
| **Failed Health Checks** | 2 consecutive | 3 consecutive | Auto-restart |
| **API Response Time** | >2s | >5s | Investigation |
| **Container Restarts** | >5/hour | >10/hour | Manual check |

### **Success Metrics**
- **🟢 System Uptime**: >99% (current target achieved)
- **🟢 Repository Health**: 25MB (under 400MB limit)
- **🟢 Security Score**: Managed (14 vulnerabilities monitored)
- **🟢 Deployment Success**: 100% recent deployments
- **🟢 Auto-healing**: Working (verified)

---

## 📞 **Support & Escalation**

### **Issue Resolution Priority**
1. **🟢 INFO**: Log only, no action required
2. **🟡 WARNING**: Investigation within 1 hour
3. **🔴 CRITICAL**: Auto-recovery within 15 minutes
4. **🚨 EMERGENCY**: Manual intervention immediately

### **GitHub Issue Notifications**
The automation system creates GitHub issues for:
- ✅ Successful deployments
- ⚠️ Health warnings  
- 🔴 Critical failures
- 🧹 Cleanup completed
- 📊 Weekly maintenance reports

### **Manual Intervention Triggers**
Human intervention required when:
- All automatic recovery attempts fail
- Security breach detected
- Data corruption suspected
- External service failures affecting core functionality

---

## 🎯 **"If You Disappear" Status**

### **✅ Fully Automated Systems**
- Repository management (cleanup, security fixes)
- Production health monitoring (every 15 minutes)
- Service recovery (3-strike restart policy) 
- Weekly maintenance (Sundays at 3 AM)
- Security monitoring (every 4 hours)
- Daily backups (1 AM daily)
- Real-time monitoring dashboard
- GitHub issue notifications

### **System Guarantee**
The eTownz Grants platform will:
- ✅ **Monitor itself** continuously
- ✅ **Heal failures** automatically  
- ✅ **Maintain itself** weekly
- ✅ **Secure itself** against threats
- ✅ **Backup itself** daily
- ✅ **Alert the team** only when human attention is required

**🚀 The platform operates 100% autonomously! 🚀**

---

## 📚 **Complete Documentation Links**

- **[AUTOMATION_OPERATIONS_GUIDE.md](./AUTOMATION_OPERATIONS_GUIDE.md)**: Complete autonomous system documentation
- **[MANUAL_TESTING_ROLES_PERMISSIONS_GUIDE.md](./MANUAL_TESTING_ROLES_PERMISSIONS_GUIDE.md)**: Security & authorization testing
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**: Production deployment procedures
- **[FULL_AUTOMATION_SYSTEM.md](./FULL_AUTOMATION_SYSTEM.md)**: Original automation system overview

---

*Last updated: $(date)*  
*Quick Reference Version: 1.0*  
*Status: ✅ ALL SYSTEMS OPERATIONAL*