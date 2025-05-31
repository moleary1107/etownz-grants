export interface DemoUser {
  id: string
  email: string
  password: string // Plain text for demo purposes
  name: string
  role: 'super_admin' | 'organization_admin' | 'grant_writer' | 'viewer'
  organizationId?: string
  avatar?: string
  verified: boolean
  lastLogin?: Date
}

export interface DemoOrganization {
  id: string
  name: string
  description?: string
  location: string
  sector: string
  size: string
  website?: string
  logo?: string
  verified: boolean
  createdAt: Date
}

export interface DemoGrant {
  id: string
  title: string
  description: string
  provider: string
  providerType: 'government' | 'council' | 'eu' | 'foundation'
  amount: {
    min: number
    max: number
    currency: string
  }
  deadline: Date
  location: string
  eligibility: string[]
  category: string
  url: string
  isActive: boolean
  createdAt: Date
}

export interface DemoApplication {
  id: string
  userId: string
  grantId: string
  organizationId: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  submittedDate?: Date
  lastModified: Date
  progress: number
  notes?: string
  fundingAmount: number
}

// Demo Organizations
export const DEMO_ORGANIZATIONS: DemoOrganization[] = [
  {
    id: 'org-1',
    name: 'TechStart Ireland',
    description: 'Innovative technology startup focused on AI solutions for healthcare',
    location: 'Dublin',
    sector: 'Technology',
    size: '11-50',
    website: 'https://techstart.ie',
    verified: true,
    createdAt: new Date('2023-06-15')
  },
  {
    id: 'org-2',
    name: 'Dublin Community Center',
    description: 'Non-profit organization providing community services and education programs',
    location: 'Dublin',
    sector: 'Non-Profit',
    size: '1-10',
    website: 'https://dublincc.ie',
    verified: true,
    createdAt: new Date('2022-03-20')
  },
  {
    id: 'org-3',
    name: 'Cork Research Institute',
    description: 'Leading research institution specializing in renewable energy and sustainability',
    location: 'Cork',
    sector: 'Research',
    size: '51-200',
    website: 'https://corkresearch.ie',
    verified: true,
    createdAt: new Date('2021-09-10')
  },
  {
    id: 'org-4',
    name: 'Green Earth Initiative',
    description: 'Environmental organization working on climate action and sustainable development',
    location: 'Galway',
    sector: 'Environment',
    size: '11-50',
    website: 'https://greenearth.ie',
    verified: false,
    createdAt: new Date('2023-11-05')
  }
]

// Demo Users with different roles
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-1',
    email: 'admin@etownz.com',
    password: 'admin123',
    name: 'Sarah Administrator',
    role: 'super_admin',
    verified: true,
    lastLogin: new Date('2024-01-26')
  },
  {
    id: 'user-2',
    email: 'john@techstart.ie',
    password: 'techstart123',
    name: 'John Smith',
    role: 'organization_admin',
    organizationId: 'org-1',
    verified: true,
    lastLogin: new Date('2024-01-25')
  },
  {
    id: 'user-3',
    email: 'mary@dublincc.ie',
    password: 'community123',
    name: 'Mary O\'Connor',
    role: 'organization_admin',
    organizationId: 'org-2',
    verified: true,
    lastLogin: new Date('2024-01-24')
  },
  {
    id: 'user-4',
    email: 'david@corkresearch.ie',
    password: 'research123',
    name: 'David Walsh',
    role: 'grant_writer',
    organizationId: 'org-3',
    verified: true,
    lastLogin: new Date('2024-01-23')
  },
  {
    id: 'user-5',
    email: 'emma@greenearth.ie',
    password: 'green123',
    name: 'Emma Murphy',
    role: 'grant_writer',
    organizationId: 'org-4',
    verified: true,
    lastLogin: new Date('2024-01-22')
  },
  {
    id: 'user-6',
    email: 'viewer@example.com',
    password: 'viewer123',
    name: 'Tom Viewer',
    role: 'viewer',
    organizationId: 'org-1',
    verified: true,
    lastLogin: new Date('2024-01-21')
  }
]

// Demo Grants
export const DEMO_GRANTS: DemoGrant[] = [
  {
    id: 'grant-1',
    title: 'Enterprise Ireland R&D Fund',
    description: 'Funding for research and development projects that have clear commercial potential and involve a level of technical innovation. This fund supports companies to develop innovative products, services, and processes.',
    provider: 'Enterprise Ireland',
    providerType: 'government',
    amount: { min: 25000, max: 250000, currency: 'EUR' },
    deadline: new Date('2024-03-15'),
    location: 'Ireland',
    eligibility: ['SME', 'Startup', 'Research Institution'],
    category: 'Research & Development',
    url: 'https://www.enterprise-ireland.com/en/research-innovation/companies/',
    isActive: true,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'grant-2',
    title: 'Dublin City Council Community Grant',
    description: 'Supporting community groups and organizations in Dublin with funding for local initiatives and projects that benefit the local community.',
    provider: 'Dublin City Council',
    providerType: 'council',
    amount: { min: 500, max: 15000, currency: 'EUR' },
    deadline: new Date('2024-02-28'),
    location: 'Dublin',
    eligibility: ['Community Group', 'Non-Profit', 'Social Enterprise'],
    category: 'Community Development',
    url: 'https://www.dublincity.ie/residential/community/community-grants',
    isActive: true,
    createdAt: new Date('2024-01-02')
  },
  {
    id: 'grant-3',
    title: 'SFI Discover Programme',
    description: 'Science Foundation Ireland programme supporting public engagement with STEM research and education to increase awareness and understanding of science.',
    provider: 'Science Foundation Ireland',
    providerType: 'government',
    amount: { min: 1000, max: 50000, currency: 'EUR' },
    deadline: new Date('2024-04-30'),
    location: 'Ireland',
    eligibility: ['Research Institution', 'University', 'Non-Profit'],
    category: 'Education & STEM',
    url: 'https://www.sfi.ie/funding/sfi-discover/',
    isActive: true,
    createdAt: new Date('2024-01-03')
  },
  {
    id: 'grant-4',
    title: 'Horizon Europe - EIC Accelerator',
    description: 'European Innovation Council support for high-risk, high-impact innovation with significant market potential. Supporting breakthrough technologies and disruptive innovations.',
    provider: 'European Commission',
    providerType: 'eu',
    amount: { min: 500000, max: 2500000, currency: 'EUR' },
    deadline: new Date('2024-06-05'),
    location: 'EU',
    eligibility: ['SME', 'Startup'],
    category: 'Innovation',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en',
    isActive: true,
    createdAt: new Date('2024-01-04')
  },
  {
    id: 'grant-5',
    title: 'Ireland Funds Young Entrepreneur Grant',
    description: 'Supporting young entrepreneurs in Ireland with seed funding for innovative business ideas that have potential for growth and job creation.',
    provider: 'The Ireland Funds',
    providerType: 'foundation',
    amount: { min: 5000, max: 25000, currency: 'EUR' },
    deadline: new Date('2024-05-15'),
    location: 'Ireland',
    eligibility: ['Entrepreneur', 'Startup', 'Young Professional'],
    category: 'Entrepreneurship',
    url: 'https://irelandfunds.org/',
    isActive: true,
    createdAt: new Date('2024-01-05')
  },
  {
    id: 'grant-6',
    title: 'Cork County Council Arts Grant',
    description: 'Funding for individual artists and arts organizations in Cork County to support creative projects and cultural initiatives.',
    provider: 'Cork County Council',
    providerType: 'council',
    amount: { min: 1000, max: 10000, currency: 'EUR' },
    deadline: new Date('2024-03-31'),
    location: 'Cork',
    eligibility: ['Individual Artist', 'Arts Organization', 'Cultural Group'],
    category: 'Arts & Culture',
    url: 'https://www.corkcoco.ie/en/arts-culture/arts-grants',
    isActive: true,
    createdAt: new Date('2024-01-06')
  },
  {
    id: 'grant-7',
    title: 'INTERREG Atlantic Area Programme',
    description: 'EU cross-border cooperation programme supporting projects that address common challenges in the Atlantic Area through transnational cooperation.',
    provider: 'INTERREG Atlantic Area',
    providerType: 'eu',
    amount: { min: 100000, max: 1000000, currency: 'EUR' },
    deadline: new Date('2024-07-20'),
    location: 'EU Atlantic Area',
    eligibility: ['Public Organization', 'Research Institution', 'NGO'],
    category: 'Regional Development',
    url: 'https://www.atlanticarea.eu/',
    isActive: true,
    createdAt: new Date('2024-01-07')
  },
  {
    id: 'grant-8',
    title: 'Environmental Protection Agency Research Grant',
    description: 'Supporting research projects that address environmental challenges and contribute to sustainable development in Ireland.',
    provider: 'Environmental Protection Agency',
    providerType: 'government',
    amount: { min: 30000, max: 150000, currency: 'EUR' },
    deadline: new Date('2024-08-15'),
    location: 'Ireland',
    eligibility: ['Research Institution', 'University', 'Environmental Organization'],
    category: 'Environment',
    url: 'https://www.epa.ie/our-services/research/',
    isActive: true,
    createdAt: new Date('2024-01-08')
  }
]

// Demo Applications
export const DEMO_APPLICATIONS: DemoApplication[] = [
  {
    id: 'app-1',
    userId: 'user-2',
    grantId: 'grant-1',
    organizationId: 'org-1',
    status: 'submitted',
    submittedDate: new Date('2024-01-20'),
    lastModified: new Date('2024-01-20'),
    progress: 100,
    notes: 'Strong technical proposal submitted. Awaiting review.',
    fundingAmount: 75000
  },
  {
    id: 'app-2',
    userId: 'user-3',
    grantId: 'grant-2',
    organizationId: 'org-2',
    status: 'approved',
    submittedDate: new Date('2024-01-15'),
    lastModified: new Date('2024-02-10'),
    progress: 100,
    notes: 'Approved! Funding confirmed for community center project.',
    fundingAmount: 8500
  },
  {
    id: 'app-3',
    userId: 'user-4',
    grantId: 'grant-3',
    organizationId: 'org-3',
    status: 'draft',
    lastModified: new Date('2024-01-25'),
    progress: 45,
    notes: 'Working on budget section and partnership agreements.',
    fundingAmount: 25000
  },
  {
    id: 'app-4',
    userId: 'user-2',
    grantId: 'grant-4',
    organizationId: 'org-1',
    status: 'under_review',
    submittedDate: new Date('2024-01-10'),
    lastModified: new Date('2024-01-10'),
    progress: 100,
    notes: 'Under evaluation by expert panel. Expecting feedback in March.',
    fundingAmount: 1500000
  },
  {
    id: 'app-5',
    userId: 'user-5',
    grantId: 'grant-5',
    organizationId: 'org-4',
    status: 'draft',
    lastModified: new Date('2024-01-18'),
    progress: 20,
    notes: 'Initial draft started. Need to complete business plan section.',
    fundingAmount: 12000
  },
  {
    id: 'app-6',
    userId: 'user-4',
    grantId: 'grant-8',
    organizationId: 'org-3',
    status: 'submitted',
    submittedDate: new Date('2024-01-22'),
    lastModified: new Date('2024-01-22'),
    progress: 100,
    notes: 'Environmental research proposal submitted focusing on renewable energy.',
    fundingAmount: 80000
  }
]