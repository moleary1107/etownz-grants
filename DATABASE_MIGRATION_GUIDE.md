# Database Migration System

This document explains how the robust database migration system works to prevent table missing issues.

## How It Works

### 1. Automatic Migrations
- **Backend startup**: Runs all pending migrations automatically
- **Migration tracking**: Keeps track of executed migrations in `migration_history` table
- **Safe execution**: Uses transactions and rollback on errors
- **Idempotent**: Safe to run multiple times

### 2. Migration Files Location
```
backend/src/migrations/
├── 005_user_preferences_system.sql
├── 006_application_assistance_system.sql
├── 007_grant_monitoring_system.sql
├── 008_predictive_analytics_system.sql
├── 010_enhanced_grant_fields.sql
├── 011_demo_users_seed.sql
├── 012_ai_transparency_tracking.sql
├── 013_document_upload_analysis.sql
├── 014_progressive_form_system.sql
├── 015_compliance_system.sql
├── 016_budget_optimization_system.sql
├── 017_rag_knowledge_base_system.sql
├── 018_openai_assistants_system.sql
├── 019_partner_coordination_system.sql
├── 020_ai_cost_management_system.sql ← Fixes ai_cost_thresholds error
├── 021_ai_load_balancer_system.sql
└── 022_ai_monitoring_system.sql
```

### 3. Startup Process
```bash
1. Backend container starts
2. start-with-migrations.sh runs
3. Waits for database connection
4. Runs run-migrations.js
5. Executes pending migrations
6. Starts the Node.js server
```

## Adding New Migrations

### 1. Create Migration File
```sql
-- 023_new_feature.sql
CREATE TABLE IF NOT EXISTS new_feature_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Use Sequential Numbering
- Always increment the number: `023_`, `024_`, etc.
- Use descriptive names: `023_user_roles_system.sql`

### 3. Make Migrations Idempotent
```sql
-- Good: Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS my_table (...);

-- Good: Use conditional logic
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_columns WHERE table_name = 'users' AND column_name = 'new_field') THEN
        ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
    END IF;
END $$;
```

## Troubleshooting

### 1. Check Migration Status
```bash
# Connect to database
docker-compose exec postgres psql -U etownz -d etownz_grants

# Check executed migrations
SELECT * FROM migration_history ORDER BY executed_at;

# Check if specific table exists
\dt ai_cost_thresholds
```

### 2. Manual Migration Execution
```bash
# Run migrations manually
docker-compose exec backend node /app/src/scripts/run-migrations.js
```

### 3. Reset Migration History (Emergency)
```sql
-- CAUTION: This will re-run all migrations
DELETE FROM migration_history WHERE filename = '020_ai_cost_management_system.sql';
```

### 4. Common Issues

#### Backend Crashes with "relation does not exist"
- **Cause**: New code expects tables that don't exist
- **Solution**: Create migration file for missing tables
- **Prevention**: Always create migrations before deploying code changes

#### Migration Stuck
- **Cause**: Database connection issues or syntax errors
- **Solution**: Check logs and fix migration SQL
- **Prevention**: Test migrations locally first

## Best Practices

### 1. Development Workflow
```bash
1. Add new database features → Create migration
2. Test migration locally → Verify it works
3. Commit migration with code → Keep them together
4. Deploy → Migrations run automatically
```

### 2. Migration Guidelines
- **Always backward compatible**: Don't break existing functionality
- **Small incremental changes**: One feature per migration
- **Test thoroughly**: Run migrations on copy of production data
- **Document breaking changes**: Add comments explaining complex migrations

### 3. Rollback Strategy
```sql
-- Include rollback instructions in comments
-- ROLLBACK: DROP TABLE IF EXISTS new_feature_table;
CREATE TABLE IF NOT EXISTS new_feature_table (...);
```

## Production Deployment

### Automatic Process
1. **Push to main** → Triggers GitHub Actions
2. **Build Docker images** → Includes latest migrations
3. **Start containers** → Runs migrations automatically
4. **Health checks** → Verifies everything works

### Manual Override
```bash
# If auto-migrations fail, run manually
docker-compose exec backend sh -c "
    cd /app && 
    node src/scripts/run-migrations.js
"
```

## Monitoring

### 1. Check Migration Logs
```bash
# View backend startup logs
docker-compose logs backend | grep -i migration
```

### 2. Verify Tables Exist
```bash
# List all tables
docker-compose exec postgres psql -U etownz -d etownz_grants -c "\dt"

# Check specific AI tables
docker-compose exec postgres psql -U etownz -d etownz_grants -c "
    SELECT tablename FROM pg_tables 
    WHERE tablename LIKE 'ai_%' 
    ORDER BY tablename;
"
```

## Emergency Procedures

### 1. Backend Won't Start (Missing Tables)
```bash
# Create missing table manually
docker-compose exec postgres psql -U etownz -d etownz_grants -c "
    CREATE TABLE IF NOT EXISTS ai_cost_thresholds (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        limit_amount DECIMAL(10,4) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
"

# Restart backend
docker-compose restart backend
```

### 2. Complete Reset (Last Resort)
```bash
# WARNING: This destroys all data
docker-compose down --volumes
docker-compose up -d
```

This system ensures that:
- ✅ **No more missing table errors**
- ✅ **Automatic schema updates**
- ✅ **Safe migration execution**
- ✅ **Easy troubleshooting**
- ✅ **Prevents future issues**