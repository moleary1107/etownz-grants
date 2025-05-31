export interface GrantSource {
  id: string
  name: string
  url: string
  description?: string
  category: 'government' | 'council' | 'eu' | 'foundation' | 'private'
  location: string
  isActive: boolean
  crawlSettings: CrawlSettings
  lastCrawled?: Date
  nextCrawl?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CrawlSettings {
  depth: number // How many levels deep to crawl
  followPdfs: boolean // Extract content from PDFs
  followDocx: boolean // Extract content from Word documents
  includePatterns: string[] // URL patterns to include
  excludePatterns: string[] // URL patterns to exclude
  scheduleType: 'manual' | 'daily' | 'weekly' | 'monthly'
  scheduleInterval?: number // Custom interval in hours
}

export interface DiscoveredGrant {
  id: string
  sourceId: string
  sourceUrl: string
  title: string
  description: string
  provider: string
  providerType: 'government' | 'council' | 'eu' | 'foundation' | 'private'
  amount: {
    min?: number
    max?: number
    currency: string
    description?: string
  }
  deadline?: Date
  location: string
  eligibility: EligibilityRequirement[]
  category: string
  tags: string[]
  applicationUrl?: string
  documentUrls: string[]
  extractedContent: string
  aiSummary?: string
  eligibilityScore?: number
  isActive: boolean
  discoveredAt: Date
  lastUpdated: Date
}

export interface EligibilityRequirement {
  type: 'sector' | 'size' | 'location' | 'age' | 'revenue' | 'employees' | 'custom'
  condition: 'equals' | 'contains' | 'min' | 'max' | 'between' | 'in' | 'not_in'
  value: string | number | string[] | number[]
  description: string
}

export interface OrganizationProfile {
  id: string
  name: string
  sector: string
  location: string
  size: string // '1-10', '11-50', etc.
  yearEstablished?: number
  annualRevenue?: number
  employeeCount?: number
  description: string
  keywords: string[]
  preferences: GrantPreferences
}

export interface GrantPreferences {
  categories: string[]
  minAmount?: number
  maxAmount?: number
  locations: string[]
  sectors: string[]
  alertSettings: {
    email: boolean
    inApp: boolean
    frequency: 'immediate' | 'daily' | 'weekly'
  }
}

export interface EligibilityMatch {
  grantId: string
  organizationId: string
  overallScore: number
  matches: EligibilityScore[]
  reasons: string[]
  recommendations: string[]
  aiAnalysis?: string
  matchedAt: Date
}

export interface EligibilityScore {
  requirement: EligibilityRequirement
  score: number // 0-100
  reasoning: string
  matched: boolean
}

export interface CrawlJob {
  id: string
  sourceId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startedAt?: Date
  completedAt?: Date
  error?: string
  stats: {
    pagesProcessed: number
    grantsDiscovered: number
    grantsUpdated: number
    documentsProcessed: number
  }
  logs: CrawlLog[]
}

export interface CrawlLog {
  timestamp: Date
  level: 'info' | 'warning' | 'error'
  message: string
  url?: string
  details?: any
}