-- Migration 004: Organizations Table Creation
-- Create the base organizations table that other migrations reference

-- Create Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    contact_email VARCHAR(255),
    organization_type VARCHAR(50) DEFAULT 'research' CHECK (organization_type IN ('research', 'nonprofit', 'academic', 'government', 'private', 'foundation', 'startup', 'enterprise', 'other')),
    
    -- Address and location info
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ireland',
    postal_code VARCHAR(20),
    
    -- Organization details
    employee_count INTEGER,
    annual_revenue DECIMAL(15,2),
    founded_year INTEGER,
    
    -- Categories and focus areas
    categories TEXT[], -- Areas of work/research
    focus_areas TEXT[], -- Specific focus areas
    
    -- Contact information
    phone VARCHAR(50),
    linkedin_url VARCHAR(255),
    twitter_url VARCHAR(255),
    
    -- Status and metadata
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_verified ON organizations(is_verified);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);
CREATE INDEX IF NOT EXISTS idx_organizations_categories ON organizations USING GIN(categories);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_organizations_updated_at();

-- Insert some sample organizations for testing
INSERT INTO organizations (
    id,
    name, 
    description, 
    website, 
    contact_email, 
    organization_type,
    country,
    categories,
    focus_areas,
    is_verified
) VALUES 
    (
        gen_random_uuid(),
        'Trinity College Dublin',
        'Leading Irish university and research institution with a strong focus on innovation and research across multiple disciplines.',
        'https://www.tcd.ie',
        'research@tcd.ie',
        'academic',
        'Ireland',
        ARRAY['research', 'education', 'technology', 'healthcare'],
        ARRAY['artificial intelligence', 'biotechnology', 'sustainable energy', 'digital humanities'],
        TRUE
    ),
    (
        gen_random_uuid(),
        'University College Cork',
        'Research-intensive university with expertise in biotechnology, pharmaceuticals, and environmental sciences.',
        'https://www.ucc.ie',
        'research@ucc.ie',
        'academic',
        'Ireland',
        ARRAY['research', 'education', 'biotechnology', 'environment'],
        ARRAY['pharmaceutical research', 'environmental science', 'food technology'],
        TRUE
    ),
    (
        gen_random_uuid(),
        'Irish Cancer Society',
        'Leading charity dedicated to eliminating cancer as a life-threatening disease in Ireland.',
        'https://www.cancer.ie',
        'info@cancer.ie',
        'nonprofit',
        'Ireland',
        ARRAY['healthcare', 'research', 'charity'],
        ARRAY['cancer research', 'patient support', 'prevention programs'],
        TRUE
    ),
    (
        gen_random_uuid(),
        'Science Foundation Ireland',
        'National foundation for investment in scientific and engineering research.',
        'https://www.sfi.ie',
        'info@sfi.ie',
        'government',
        'Ireland',
        ARRAY['science', 'research', 'innovation', 'funding'],
        ARRAY['STEM research', 'technology transfer', 'industry collaboration'],
        TRUE
    ),
    (
        gen_random_uuid(),
        'NUIG Insight Centre',
        'Research centre for data analytics at NUI Galway.',
        'https://www.insight-centre.org',
        'info@insight-centre.org',
        'research',
        'Ireland',
        ARRAY['data science', 'AI', 'machine learning'],
        ARRAY['big data analytics', 'artificial intelligence', 'IoT'],
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- Create a helper function to validate organization URLs
CREATE OR REPLACE FUNCTION validate_organization_url(input_url TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return NULL if input is NULL or empty
    IF input_url IS NULL OR trim(input_url) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Clean the URL
    input_url := trim(input_url);
    
    -- Add https:// if no protocol is specified
    IF input_url !~ '^https?://' THEN
        input_url := 'https://' || input_url;
    END IF;
    
    RETURN input_url;
END;
$$ LANGUAGE plpgsql;