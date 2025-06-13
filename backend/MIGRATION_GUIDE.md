# Database Migration Guide

## Overview

This guide outlines the enhanced database migration system for the eTownz Grants Platform, designed to prevent migration failures and ensure reliable database schema evolution.

## Migration System Components

### 1. Enhanced Migration Runner (`enhanced-migration-runner.ts`)
- **Dependency validation** before execution
- **Automatic rollback generation** for common operations
- **Backup creation** before migrations
- **Dry run capability** for testing
- **Comprehensive error handling**

### 2. Migration Validator (`migration-validator.ts`)
- **Dependency analysis** and validation
- **Foreign key constraint checking**
- **Table/column existence verification**
- **Migration order optimization**

### 3. Testing Framework (`migration.test.ts`)
- **Automated migration testing**
- **Rollback verification**
- **Error scenario testing**
- **Performance testing**

## Best Practices

### 1. Migration File Structure

```sql
-- Migration ###: Brief Description
-- Purpose: Detailed explanation of what this migration does
-- Dependencies: List any required tables/columns
-- Rollback: Describe rollback strategy

-- Create tables in dependency order
CREATE TABLE parent_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Add constraints after table creation
CREATE TABLE child_table (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER,
    data TEXT
);

-- Add foreign keys as separate statements
ALTER TABLE child_table 
ADD CONSTRAINT fk_child_parent 
FOREIGN KEY (parent_id) REFERENCES parent_table(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_child_parent_id ON child_table(parent_id);

-- ROLLBACK:
-- DROP INDEX IF EXISTS idx_child_parent_id;
-- ALTER TABLE child_table DROP CONSTRAINT IF EXISTS fk_child_parent;
-- DROP TABLE IF EXISTS child_table CASCADE;
-- DROP TABLE IF EXISTS parent_table CASCADE;
-- END ROLLBACK
```

### 2. Naming Conventions

- **Migration files**: `NNN_descriptive_name.sql` (e.g., `007_grant_monitoring_system.sql`)
- **Tables**: `snake_case` (e.g., `grant_alerts`, `user_preferences`)
- **Indexes**: `idx_table_columns` (e.g., `idx_grants_deadline`)
- **Constraints**: `fk_child_parent` or `chk_table_column`

### 3. Dependency Management

#### ✅ DO:
- Check table existence before referencing: `IF EXISTS`
- Use conditional constraints for optional dependencies
- Order migrations by dependencies
- Include dependency comments in migration files

#### ❌ DON'T:
- Create circular dependencies
- Reference tables from future migrations
- Assume tables exist without checking

### 4. Safe Migration Patterns

#### Creating Tables with Foreign Keys:
```sql
-- 1. Create parent table first
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- 2. Create child table without constraints
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    bio TEXT
);

-- 3. Add constraints after both tables exist
ALTER TABLE user_profiles 
ADD CONSTRAINT fk_user_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

#### Conditional Dependencies:
```sql
-- Only add constraint if referenced table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grants') THEN
        ALTER TABLE grant_alerts 
        ADD CONSTRAINT fk_grant_alerts_grant_id 
        FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE;
    END IF;
END $$;
```

#### Safe Column Addition:
```sql
-- Add column with default value to avoid null constraints
ALTER TABLE existing_table 
ADD COLUMN new_column VARCHAR(255) DEFAULT 'default_value';

-- Update default value if needed
UPDATE existing_table SET new_column = 'computed_value' WHERE condition;

-- Remove default if not needed
ALTER TABLE existing_table ALTER COLUMN new_column DROP DEFAULT;
```

## Usage Instructions

### 1. Creating a New Migration

```bash
# Create migration file with proper naming
touch src/migrations/024_new_feature.sql

# Follow the template structure
# Include proper comments and rollback SQL
```

### 2. Validating Migrations

```bash
# Validate all migrations before running
npm run migration validate

# Check specific migration dependencies
npx ts-node src/scripts/migration-validator.ts
```

### 3. Running Migrations

```bash
# Check migration status
npm run migration status

# Dry run (test without applying)
npm run migration run --dry-run

# Run with validation and backup
npm run migration run --validate --backup

# Run migrations (production)
npm run migrate
```

### 4. Rolling Back Migrations

```bash
# Rollback specific migration
npm run migration rollback 024_new_feature.sql

# Check what would be rolled back
npm run migration rollback 024_new_feature.sql --dry-run
```

## Common Issues and Solutions

### 1. Foreign Key Constraint Errors

**Problem**: `foreign key constraint cannot be implemented`

**Solutions**:
- Ensure referenced table exists before creating constraint
- Use conditional constraint creation
- Create tables in dependency order

```sql
-- Bad
CREATE TABLE child (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES non_existent_table(id)
);

-- Good
CREATE TABLE parent (id SERIAL PRIMARY KEY);
CREATE TABLE child (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER
);
ALTER TABLE child ADD CONSTRAINT fk_child_parent 
FOREIGN KEY (parent_id) REFERENCES parent(id);
```

### 2. Table Already Exists Errors

**Problem**: `relation already exists`

**Solutions**:
- Use `CREATE TABLE IF NOT EXISTS`
- Check existing schema before migration
- Include conflict resolution in migration

```sql
-- Good
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255)
);

-- Handle existing columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'new_column'
    ) THEN
        ALTER TABLE users ADD COLUMN new_column TEXT;
    END IF;
END $$;
```

### 3. Data Type Incompatibility

**Problem**: Column type changes fail with existing data

**Solutions**:
- Create new column with new type
- Migrate data with transformation
- Drop old column and rename new one

```sql
-- Safe type change
ALTER TABLE users ADD COLUMN email_new VARCHAR(255);
UPDATE users SET email_new = email::VARCHAR(255);
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_new TO email;
```

## Emergency Procedures

### 1. Migration Failure Recovery

```bash
# 1. Check current state
npm run migration status

# 2. Create backup if not already done
pg_dump $DATABASE_URL > emergency_backup.sql

# 3. Identify failed migration
npm run migration validate

# 4. Fix migration file or dependencies
# Edit src/migrations/xxx_failed_migration.sql

# 5. Retry migration
npm run migration run --validate
```

### 2. Rollback Emergency

```bash
# 1. Rollback specific problematic migration
npm run migration rollback problematic_migration.sql

# 2. If rollback fails, restore from backup
psql $DATABASE_URL < backup_file.sql

# 3. Mark migrations as completed if needed
UPDATE migration_history SET executed_at = NOW() 
WHERE filename = 'fixed_migration.sql';
```

## Monitoring and Maintenance

### 1. Regular Health Checks

```bash
# Weekly migration validation
npm run migration validate

# Check for orphaned constraints
SELECT conname FROM pg_constraint 
WHERE conrelid NOT IN (SELECT oid FROM pg_class);

# Monitor migration performance
SELECT filename, execution_time_ms 
FROM migration_history 
ORDER BY execution_time_ms DESC;
```

### 2. Migration Cleanup

```bash
# Remove test migrations (if any)
rm src/migrations/*_test_*.sql

# Clean up old backups (keep last 10)
ls -t backup-*.sql | tail -n +11 | xargs rm -f
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Database Migration Check
on: [pull_request]

jobs:
  migration-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Validate migrations
        run: npm run migration validate
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/test_db
          
      - name: Test migrations (dry run)
        run: npm run migration run --dry-run --validate
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/test_db
```

## Advanced Features

### 1. Custom Rollback SQL

Include manual rollback instructions for complex migrations:

```sql
-- ROLLBACK:
-- DELETE FROM table WHERE condition;
-- ALTER TABLE table DROP CONSTRAINT custom_constraint;
-- UPDATE table SET column = old_value WHERE condition;
-- END ROLLBACK
```

### 2. Data Migration Patterns

```sql
-- Data transformation migration
UPDATE users SET 
    full_name = CONCAT(first_name, ' ', last_name)
WHERE full_name IS NULL;

-- Batch processing for large tables
DO $$
DECLARE
    batch_size INTEGER := 1000;
    offset_val INTEGER := 0;
    affected_rows INTEGER;
BEGIN
    LOOP
        UPDATE large_table 
        SET processed = true 
        WHERE id >= offset_val 
        AND id < offset_val + batch_size 
        AND processed = false;
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        EXIT WHEN affected_rows = 0;
        
        offset_val := offset_val + batch_size;
        COMMIT;
    END LOOP;
END $$;
```

### 3. Migration Templates

Use these templates for common migration patterns:

- **New Feature**: `templates/new_feature_migration.sql`
- **Schema Change**: `templates/schema_change_migration.sql`
- **Data Migration**: `templates/data_migration.sql`
- **Index Addition**: `templates/index_migration.sql`

## Support and Troubleshooting

### Getting Help

1. **Check logs**: `tail -f logs/migration.log`
2. **Review validation**: `npm run migration validate`
3. **Test changes**: `npm run migration run --dry-run`
4. **Create issue**: Include migration file and error message

### Common Error Codes

- **42P01**: Relation does not exist (missing table)
- **42703**: Column does not exist 
- **23503**: Foreign key constraint violation
- **42P07**: Relation already exists
- **42601**: Syntax error in SQL

### Performance Tips

- **Batch large operations** to avoid long locks
- **Create indexes concurrently** when possible
- **Use transactions** for related operations
- **Monitor execution time** and optimize slow migrations

Remember: **Always test migrations thoroughly before production deployment!**