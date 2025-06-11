/**
 * Grants Service Client
 * Frontend utility for interacting with grants APIs
 */

export interface Grant {
  id: string
  title: string
  description?: string
  summary?: string
  deadline?: Date
  funder?: string
  funder_type?: string
  amount_min?: number
  amount_max?: number
  currency?: string
  url?: string
  categories?: string[]
  eligibility_criteria?: Record<string, any>
  required_documents?: string[]
  application_process?: string
  contact_info?: Record<string, any>
  is_active?: boolean
  created_at?: Date
  updated_at?: Date
}

export interface GrantFilters {
  search?: string
  funder?: string
  categories?: string[]
  amount_min?: number
  amount_max?: number
  deadline_from?: Date
  deadline_to?: Date
  sort_by?: 'deadline' | 'amount' | 'created_at' | 'title'
  sort_order?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}

export interface GrantsResponse {
  grants: Grant[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface GrantStats {
  total: number
  active: number
  expired: number
  recent: number
}

class GrantsService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://grants.etownz.com/api' 
      : 'http://localhost:8001'
  }

  /**
   * Get grants with filtering and pagination
   */
  async getGrants(filters: GrantFilters = {}): Promise<GrantsResponse> {
    // Build query parameters
    const params = new URLSearchParams()
    
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.funder) params.append('funder', filters.funder)
    if (filters.categories?.length) params.append('categories', filters.categories.join(','))
    if (filters.amount_min) params.append('amount_min', filters.amount_min.toString())
    if (filters.amount_max) params.append('amount_max', filters.amount_max.toString())
    if (filters.deadline_from) params.append('deadline_from', filters.deadline_from.toISOString().split('T')[0])
    if (filters.deadline_to) params.append('deadline_to', filters.deadline_to.toISOString().split('T')[0])
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.sort_order) params.append('sort_order', filters.sort_order)

    const response = await fetch(`${this.baseUrl}/grants?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to fetch grants: ${response.status}`)
    }

    const data = await response.json()
    
    // Convert date strings back to Date objects
    data.grants = data.grants.map((grant: any) => ({
      ...grant,
      deadline: grant.deadline ? new Date(grant.deadline) : undefined,
      created_at: grant.created_at ? new Date(grant.created_at) : undefined,
      updated_at: grant.updated_at ? new Date(grant.updated_at) : undefined
    }))

    return data
  }

  /**
   * Get a single grant by ID
   */
  async getGrant(id: string): Promise<Grant> {
    const response = await fetch(`${this.baseUrl}/grants/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to fetch grant: ${response.status}`)
    }

    const grant = await response.json()
    
    // Convert date strings back to Date objects
    return {
      ...grant,
      deadline: grant.deadline ? new Date(grant.deadline) : undefined,
      created_at: grant.created_at ? new Date(grant.created_at) : undefined,
      updated_at: grant.updated_at ? new Date(grant.updated_at) : undefined
    }
  }

  /**
   * Get grant statistics
   */
  async getStats(): Promise<GrantStats> {
    const response = await fetch(`${this.baseUrl}/grants/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to fetch grant stats: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Search grants (traditional text search)
   */
  async searchGrants(query: string, filters: GrantFilters = {}): Promise<GrantsResponse> {
    return this.getGrants({
      ...filters,
      search: query
    })
  }

  /**
   * Get grants by category
   */
  async getGrantsByCategory(category: string, filters: GrantFilters = {}): Promise<GrantsResponse> {
    return this.getGrants({
      ...filters,
      categories: [category]
    })
  }

  /**
   * Get grants by funder
   */
  async getGrantsByFunder(funder: string, filters: GrantFilters = {}): Promise<GrantsResponse> {
    return this.getGrants({
      ...filters,
      funder
    })
  }

  /**
   * Get upcoming deadline grants
   */
  async getUpcomingDeadlines(days: number = 30, filters: GrantFilters = {}): Promise<GrantsResponse> {
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)

    return this.getGrants({
      ...filters,
      deadline_from: today,
      deadline_to: futureDate,
      sort_by: 'deadline',
      sort_order: 'ASC'
    })
  }

  /**
   * Get recently added grants
   */
  async getRecentGrants(days: number = 7, filters: GrantFilters = {}): Promise<GrantsResponse> {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - days)

    // Note: This would need a created_at filter in the backend
    return this.getGrants({
      ...filters,
      sort_by: 'created_at',
      sort_order: 'DESC'
    })
  }

  /**
   * Format grant amount for display
   */
  formatAmount(grant: Grant): string {
    if (!grant.amount_min && !grant.amount_max) return 'Amount not specified'
    
    const currency = grant.currency === 'EUR' ? '€' : '$'
    
    if (grant.amount_min === grant.amount_max) {
      return `${currency}${grant.amount_min?.toLocaleString()}`
    }
    
    if (grant.amount_min && grant.amount_max) {
      return `${currency}${grant.amount_min.toLocaleString()} - ${currency}${grant.amount_max.toLocaleString()}`
    }
    
    if (grant.amount_min) {
      return `From ${currency}${grant.amount_min.toLocaleString()}`
    }
    
    if (grant.amount_max) {
      return `Up to ${currency}${grant.amount_max.toLocaleString()}`
    }
    
    return 'Amount not specified'
  }

  /**
   * Get days until deadline
   */
  getDaysUntilDeadline(deadline: Date): number {
    const today = new Date()
    const diffTime = deadline.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if grant deadline is urgent (within 7 days)
   */
  isUrgentDeadline(deadline: Date): boolean {
    return this.getDaysUntilDeadline(deadline) <= 7
  }

  /**
   * Get grant status based on deadline
   */
  getGrantStatus(grant: Grant): 'active' | 'urgent' | 'expired' | 'unknown' {
    if (!grant.deadline) return 'unknown'
    if (!grant.is_active) return 'expired'
    
    const daysLeft = this.getDaysUntilDeadline(grant.deadline)
    
    if (daysLeft < 0) return 'expired'
    if (daysLeft <= 7) return 'urgent'
    return 'active'
  }
}

// Export singleton instance
export const grantsService = new GrantsService()

// Export class for testing
export { GrantsService }