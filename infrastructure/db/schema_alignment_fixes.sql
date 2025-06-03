-- Schema Alignment Fixes for Production
-- This file aligns the local schema with what's actually in production
-- Run this locally to match production structure

-- 1. Fix grants table to match production (single amount field instead of min/max)
-- First, check if we need to modify the table
DO $$
BEGIN
    -- If amount_min and amount_max exist but amount doesn't, fix it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grants' AND column_name = 'amount_min') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grants' AND column_name = 'amount') THEN
        
        -- Add amount column
        ALTER TABLE grants ADD COLUMN amount NUMERIC(12,2);
        
        -- Copy data from amount_max (or average of min/max)
        UPDATE grants SET amount = COALESCE(amount_max, amount_min, 0);
        
        -- Drop the old columns
        ALTER TABLE grants DROP COLUMN amount_min;
        ALTER TABLE grants DROP COLUMN amount_max;
    END IF;
END $$;

-- 2. Fix organizations table to match production (email instead of contact_email)
DO $$
BEGIN
    -- If contact_email exists but email doesn't, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'contact_email') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'email') THEN
        
        ALTER TABLE organizations RENAME COLUMN contact_email TO email;
    END IF;
    
    -- Also ensure phone column exists (not contact_phone)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'contact_phone') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'phone') THEN
        
        ALTER TABLE organizations RENAME COLUMN contact_phone TO phone;
    END IF;
    
    -- Add tax_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'tax_id') THEN
        ALTER TABLE organizations ADD COLUMN tax_id VARCHAR(50);
    END IF;
END $$;

-- 3. Ensure eligibility_criteria is TEXT[] array, not JSONB (to match code expectations)
DO $$
BEGIN
    -- Check if eligibility_criteria is JSONB
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grants' 
        AND column_name = 'eligibility_criteria' 
        AND data_type = 'jsonb'
    ) THEN
        -- First add a temporary column
        ALTER TABLE grants ADD COLUMN eligibility_criteria_temp TEXT[];
        
        -- Convert JSONB to TEXT array (assuming it has a 'requirements' key)
        UPDATE grants 
        SET eligibility_criteria_temp = 
            CASE 
                WHEN eligibility_criteria->>'requirements' IS NOT NULL 
                THEN ARRAY(SELECT jsonb_array_elements_text(eligibility_criteria->'requirements'))
                ELSE ARRAY[]::TEXT[]
            END;
        
        -- Drop old column and rename new one
        ALTER TABLE grants DROP COLUMN eligibility_criteria;
        ALTER TABLE grants RENAME COLUMN eligibility_criteria_temp TO eligibility_criteria;
    END IF;
END $$;

-- 4. Add profile_data column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_data') THEN
        ALTER TABLE users ADD COLUMN profile_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 5. Ensure status column exists on grants table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grants' AND column_name = 'status') THEN
        ALTER TABLE grants ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;