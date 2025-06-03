// This file contains the type fixes for firecrawlService.ts
// Add these properties to the DiscoveredGrant interface or create a mapping type

export interface DiscoveredGrantRaw {
  id: string
  sourceId: string
  sourceUrl: string
  title: string
  description: string
  provider: string
  providerType: 'government' | 'council' | 'eu' | 'foundation' | 'private'
  
  // Properties used in firecrawlService that need mapping
  externalId?: string
  url?: string
  amountText?: string
  currency?: string
  deadlineText?: string
  categories?: string[]
  locationRestrictions?: string[]
  eligibilityText?: string
  eligibilityCriteria?: string[]
  confidenceScore?: number
  
  // Standard properties
  amount: {
    min?: number
    max?: number
    currency: string
    description?: string
  }
  deadline?: Date
  location: string
  eligibility: any[]
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

// Mapping function to convert raw to typed
export function mapRawToDiscoveredGrant(raw: DiscoveredGrantRaw): any {
  return {
    ...raw,
    // Map the properties that have different names
    sourceUrl: raw.url || raw.sourceUrl,
    category: raw.categories?.[0] || raw.category,
    deadline: raw.deadline || (raw.deadlineText ? new Date(raw.deadlineText) : undefined),
    eligibility: raw.eligibilityCriteria || raw.eligibility || [],
    // Remove properties that don't belong in final type
    externalId: undefined,
    url: undefined,
    amountText: undefined,
    deadlineText: undefined,
    categories: undefined,
    locationRestrictions: undefined,
    eligibilityText: undefined,
    eligibilityCriteria: undefined,
    confidenceScore: undefined
  }
}