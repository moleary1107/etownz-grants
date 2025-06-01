import { BaseRepository } from '../services/database'

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
  source?: string
  categories?: string[]
  eligibility_criteria?: Record<string, any>
  required_documents?: string[]
  application_process?: string
  contact_info?: Record<string, any>
  is_active?: boolean
  crawled_at?: Date
  created_at?: Date
  updated_at?: Date
}

export interface DiscoveredGrant {
  id: string
  source_id: string
  job_id: string
  external_id?: string
  title: string
  description?: string
  provider?: string
  url?: string
  amount_text?: string
  amount_min?: number
  amount_max?: number
  currency?: string
  deadline?: Date
  deadline_text?: string
  categories?: string[]
  location_restrictions?: string[]
  document_urls?: string[]
  eligibility_text?: string
  eligibility_criteria?: Record<string, any>
  confidence_score?: number
  processing_status?: string
  processed_at?: Date
  grant_id?: string
  created_at?: Date
  updated_at?: Date
}

export interface GrantFilters {
  search?: string
  categories?: string[]
  funder?: string
  deadline_from?: Date
  deadline_to?: Date
  amount_min?: number
  amount_max?: number
  location?: string
  is_active?: boolean
  limit?: number
  offset?: number
  sort_by?: 'deadline' | 'amount' | 'created_at' | 'title'
  sort_order?: 'ASC' | 'DESC'
}

export interface EligibilityMatch {
  id: string
  grant_id: string
  org_id: string
  match_score: number
  matching_criteria: Record<string, any>
  ai_analysis?: string
  recommendation?: string
  is_notified?: boolean
  notified_at?: Date
  created_at?: Date
  updated_at?: Date
}

export class GrantsRepository extends BaseRepository {
  
  async findGrants(filters: GrantFilters = {}): Promise<Grant[]> {
    let query = `
      SELECT g.*, 
             COUNT(*) OVER() as total_count
      FROM grants g
      WHERE g.is_active = true
    `
    const params: any[] = []
    let paramIndex = 1

    // Add search filter
    if (filters.search) {
      query += ` AND (
        g.title ILIKE $${paramIndex} OR 
        g.description ILIKE $${paramIndex} OR 
        g.funder ILIKE $${paramIndex}
      )`
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    // Add category filter
    if (filters.categories && filters.categories.length > 0) {
      query += ` AND g.categories && $${paramIndex}`
      params.push(filters.categories)
      paramIndex++
    }

    // Add funder filter
    if (filters.funder) {
      query += ` AND g.funder ILIKE $${paramIndex}`
      params.push(`%${filters.funder}%`)
      paramIndex++
    }

    // Add deadline filters
    if (filters.deadline_from) {
      query += ` AND g.deadline >= $${paramIndex}`
      params.push(filters.deadline_from)
      paramIndex++
    }

    if (filters.deadline_to) {
      query += ` AND g.deadline <= $${paramIndex}`
      params.push(filters.deadline_to)
      paramIndex++
    }

    // Add amount filters
    if (filters.amount_min) {
      query += ` AND (g.amount_min >= $${paramIndex} OR g.amount_max >= $${paramIndex})`
      params.push(filters.amount_min)
      paramIndex++
    }

    if (filters.amount_max) {
      query += ` AND (g.amount_max <= $${paramIndex} OR g.amount_min <= $${paramIndex})`
      params.push(filters.amount_max)
      paramIndex++
    }

    // Add sorting
    const sortBy = filters.sort_by || 'created_at'
    const sortOrder = filters.sort_order || 'DESC'
    query += ` ORDER BY g.${sortBy} ${sortOrder}`

    // Add pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(filters.limit)
      paramIndex++
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`
      params.push(filters.offset)
      paramIndex++
    }

    const result = await this.db.query(query, params)
    return result.rows
  }

  async findGrantById(id: string): Promise<Grant | null> {
    return this.findById<Grant>('grants', id)
  }

  async createGrant(grant: Omit<Grant, 'id' | 'created_at' | 'updated_at'>): Promise<Grant> {
    return this.create<Grant>('grants', grant)
  }

  async updateGrant(id: string, grant: Partial<Grant>): Promise<Grant | null> {
    return this.update<Grant>('grants', id, grant)
  }

  async deleteGrant(id: string): Promise<boolean> {
    return this.delete('grants', id)
  }

  async findDiscoveredGrants(
    sourceId?: string,
    jobId?: string,
    status?: string
  ): Promise<DiscoveredGrant[]> {
    let query = 'SELECT * FROM discovered_grants WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (sourceId) {
      query += ` AND source_id = $${paramIndex}`
      params.push(sourceId)
      paramIndex++
    }

    if (jobId) {
      query += ` AND job_id = $${paramIndex}`
      params.push(jobId)
      paramIndex++
    }

    if (status) {
      query += ` AND processing_status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    query += ' ORDER BY created_at DESC'

    const result = await this.db.query(query, params)
    return result.rows
  }

  async createDiscoveredGrant(grant: Omit<DiscoveredGrant, 'id' | 'created_at' | 'updated_at'>): Promise<DiscoveredGrant> {
    return this.create<DiscoveredGrant>('discovered_grants', grant)
  }

  async updateDiscoveredGrant(id: string, grant: Partial<DiscoveredGrant>): Promise<DiscoveredGrant | null> {
    return this.update<DiscoveredGrant>('discovered_grants', id, grant)
  }

  async processDiscoveredGrant(discoveredGrantId: string): Promise<Grant | null> {
    return this.db.transaction(async (client) => {
      // Get the discovered grant
      const discoveredResult = await client.query(
        'SELECT * FROM discovered_grants WHERE id = $1',
        [discoveredGrantId]
      )

      if (discoveredResult.rows.length === 0) {
        throw new Error('Discovered grant not found')
      }

      const discovered = discoveredResult.rows[0]

      // Check if this grant already exists (based on external_id and source)
      const existingResult = await client.query(
        'SELECT * FROM grants WHERE url = $1 OR title = $2',
        [discovered.url, discovered.title]
      )

      let grant: Grant

      if (existingResult.rows.length > 0) {
        // Update existing grant
        const existing = existingResult.rows[0]
        const updateResult = await client.query(`
          UPDATE grants SET
            description = COALESCE($1, description),
            deadline = COALESCE($2, deadline),
            funder = COALESCE($3, funder),
            amount_min = COALESCE($4, amount_min),
            amount_max = COALESCE($5, amount_max),
            categories = COALESCE($6, categories),
            eligibility_criteria = COALESCE($7, eligibility_criteria),
            crawled_at = NOW(),
            updated_at = NOW()
          WHERE id = $8
          RETURNING *
        `, [
          discovered.description,
          discovered.deadline,
          discovered.provider,
          discovered.amount_min,
          discovered.amount_max,
          discovered.categories,
          discovered.eligibility_criteria,
          existing.id
        ])
        grant = updateResult.rows[0]
      } else {
        // Create new grant
        const insertResult = await client.query(`
          INSERT INTO grants (
            title, description, deadline, funder, amount_min, amount_max,
            currency, url, source, categories, eligibility_criteria, crawled_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          RETURNING *
        `, [
          discovered.title,
          discovered.description,
          discovered.deadline,
          discovered.provider,
          discovered.amount_min,
          discovered.amount_max,
          discovered.currency || 'EUR',
          discovered.url,
          'crawler',
          discovered.categories,
          discovered.eligibility_criteria
        ])
        grant = insertResult.rows[0]
      }

      // Update discovered grant status
      await client.query(`
        UPDATE discovered_grants SET
          processing_status = 'processed',
          processed_at = NOW(),
          grant_id = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [grant.id, discoveredGrantId])

      return grant
    })
  }

  async findEligibilityMatches(orgId: string): Promise<Array<EligibilityMatch & { grant: Grant }>> {
    const query = `
      SELECT 
        gem.*,
        g.title, g.description, g.deadline, g.funder, g.amount_min, g.amount_max,
        g.url, g.categories, g.eligibility_criteria
      FROM grant_eligibility_matches gem
      JOIN grants g ON gem.grant_id = g.id
      WHERE gem.org_id = $1
      ORDER BY gem.match_score DESC, gem.created_at DESC
    `

    const result = await this.db.query(query, [orgId])
    return result.rows.map(row => ({
      id: row.id,
      grant_id: row.grant_id,
      org_id: row.org_id,
      match_score: row.match_score,
      matching_criteria: row.matching_criteria,
      ai_analysis: row.ai_analysis,
      recommendation: row.recommendation,
      is_notified: row.is_notified,
      notified_at: row.notified_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      grant: {
        id: row.grant_id,
        title: row.title,
        description: row.description,
        deadline: row.deadline,
        funder: row.funder,
        amount_min: row.amount_min,
        amount_max: row.amount_max,
        url: row.url,
        categories: row.categories,
        eligibility_criteria: row.eligibility_criteria
      } as Grant
    }))
  }

  async createEligibilityMatch(match: Omit<EligibilityMatch, 'id' | 'created_at' | 'updated_at'>): Promise<EligibilityMatch> {
    return this.create<EligibilityMatch>('grant_eligibility_matches', match)
  }

  async updateEligibilityMatch(id: string, match: Partial<EligibilityMatch>): Promise<EligibilityMatch | null> {
    return this.update<EligibilityMatch>('grant_eligibility_matches', id, match)
  }

  async markMatchAsNotified(matchId: string): Promise<void> {
    await this.db.query(
      'UPDATE grant_eligibility_matches SET is_notified = true, notified_at = NOW() WHERE id = $1',
      [matchId]
    )
  }

  async getGrantStats(): Promise<{
    total: number
    active: number
    expired: number
    recent: number
  }> {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE deadline < NOW()) as expired,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent
      FROM grants
    `)

    return result.rows[0]
  }
}