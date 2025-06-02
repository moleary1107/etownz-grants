import { logger } from './logger'
import { DatabaseService } from './database'
import { OpenAIService } from './openaiService'
import { UserPreferencesService } from './userPreferencesService'
import { VectorDatabaseService } from './vectorDatabase'

export interface MonitoringRule {
  id: string
  user_id: string
  name: string
  description: string
  rule_type: 'keyword_match' | 'category_filter' | 'amount_range' | 'deadline_proximity' | 'ai_similarity' | 'custom_criteria'
  criteria: MonitoringCriteria
  notification_settings: NotificationSettings
  is_active: boolean
  last_triggered: Date | null
  trigger_count: number
  created_at: Date
  updated_at: Date
}

export interface MonitoringCriteria {
  keywords?: string[]
  categories?: string[]
  funders?: string[]
  amount_min?: number
  amount_max?: number
  location?: string[]
  deadline_days?: number // Alert X days before deadline
  similarity_threshold?: number // For AI similarity matching
  custom_filters?: Record<string, any>
  exclude_keywords?: string[]
  exclude_funders?: string[]
}

export interface NotificationSettings {
  email: boolean
  in_app: boolean
  push: boolean
  frequency: 'immediate' | 'daily' | 'weekly'
  delivery_time?: string // HH:MM format for scheduled notifications
  max_per_day?: number
  priority_threshold?: number // Only notify for matches above this score
}

export interface GrantAlert {
  id: string
  user_id: string
  rule_id: string
  grant_id: string
  alert_type: 'new_grant' | 'deadline_reminder' | 'criteria_match' | 'ai_recommendation'
  match_score: number
  match_reasons: string[]
  notification_sent: boolean
  notification_channels: string[]
  user_action?: 'dismissed' | 'saved' | 'applied' | 'viewed'
  expires_at: Date
  created_at: Date
  updated_at: Date
}

export interface MonitoringJob {
  id: string
  job_type: 'new_grants_check' | 'deadline_reminder' | 'criteria_evaluation' | 'ai_similarity_scan'
  status: 'pending' | 'running' | 'completed' | 'failed'
  rules_processed: number
  grants_evaluated: number
  alerts_generated: number
  errors_encountered: string[]
  started_at: Date | null
  completed_at: Date | null
  next_run_at: Date
  created_at: Date
}

export interface AlertSummary {
  user_id: string
  period: 'day' | 'week' | 'month'
  total_alerts: number
  new_grants: number
  deadline_reminders: number
  high_priority_matches: number
  avg_match_score: number
  top_categories: string[]
  dismissed_count: number
  action_taken_count: number
}

export interface MonitoringStats {
  active_rules: number
  total_alerts_today: number
  avg_response_time: number
  top_performing_rules: string[]
  alert_success_rate: number
  user_engagement_score: number
}

export class GrantMonitoringService {
  private db: DatabaseService
  private openai: OpenAIService
  private userPreferences: UserPreferencesService
  private vectorDb: VectorDatabaseService

  constructor(
    db: DatabaseService,
    openai: OpenAIService,
    userPreferences: UserPreferencesService,
    vectorDb: VectorDatabaseService
  ) {
    this.db = db
    this.openai = openai
    this.userPreferences = userPreferences
    this.vectorDb = vectorDb
  }

  /**
   * Create a new monitoring rule for a user
   */
  async createMonitoringRule(rule: Omit<MonitoringRule, 'id' | 'last_triggered' | 'trigger_count' | 'created_at' | 'updated_at'>): Promise<MonitoringRule> {
    try {
      logger.info('Creating monitoring rule', {
        userId: rule.user_id,
        ruleType: rule.rule_type,
        name: rule.name
      })

      // Validate rule criteria
      await this.validateRuleCriteria(rule.criteria, rule.rule_type)

      const result = await this.db.query(
        `INSERT INTO monitoring_rules (user_id, name, description, rule_type, criteria, notification_settings, is_active, last_triggered, trigger_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, 0, NOW(), NOW())
         RETURNING *`,
        [
          rule.user_id,
          rule.name,
          rule.description,
          rule.rule_type,
          JSON.stringify(rule.criteria),
          JSON.stringify(rule.notification_settings),
          rule.is_active
        ]
      )

      const createdRule = this.mapDatabaseRowToRule(result.rows[0])

      // If this is an AI similarity rule, create initial embedding
      if (rule.rule_type === 'ai_similarity') {
        await this.createRuleEmbedding(createdRule)
      }

      logger.info('Monitoring rule created successfully', {
        ruleId: createdRule.id,
        userId: rule.user_id
      })

      return createdRule
    } catch (error) {
      logger.error('Failed to create monitoring rule', {
        error: error instanceof Error ? error.message : String(error),
        userId: rule.user_id
      })
      throw error
    }
  }

  /**
   * Get all monitoring rules for a user
   */
  async getUserMonitoringRules(userId: string, activeOnly: boolean = false): Promise<MonitoringRule[]> {
    try {
      let query = 'SELECT * FROM monitoring_rules WHERE user_id = $1'
      const params = [userId]

      if (activeOnly) {
        query += ' AND is_active = TRUE'
      }

      query += ' ORDER BY created_at DESC'

      const result = await this.db.query(query, params)
      return result.rows.map(row => this.mapDatabaseRowToRule(row))
    } catch (error) {
      logger.error('Failed to get user monitoring rules', {
        error: error instanceof Error ? error.message : String(error),
        userId
      })
      throw error
    }
  }

  /**
   * Update an existing monitoring rule
   */
  async updateMonitoringRule(ruleId: string, updates: Partial<MonitoringRule>): Promise<MonitoringRule> {
    try {
      logger.info('Updating monitoring rule', { ruleId })

      const setClauses: string[] = []
      const values: any[] = []
      let paramIndex = 1

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'criteria' || key === 'notification_settings') {
          setClauses.push(`${key} = $${paramIndex}`)
          values.push(JSON.stringify(value))
        } else if (key !== 'id' && key !== 'created_at') {
          setClauses.push(`${key} = $${paramIndex}`)
          values.push(value)
        }
        paramIndex++
      })

      setClauses.push(`updated_at = NOW()`)

      const query = `
        UPDATE monitoring_rules 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `
      values.push(ruleId)

      const result = await this.db.query(query, values)
      
      if (result.rows.length === 0) {
        throw new Error('Monitoring rule not found')
      }

      return this.mapDatabaseRowToRule(result.rows[0])
    } catch (error) {
      logger.error('Failed to update monitoring rule', {
        error: error instanceof Error ? error.message : String(error),
        ruleId
      })
      throw error
    }
  }

  /**
   * Delete a monitoring rule
   */
  async deleteMonitoringRule(ruleId: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM monitoring_rules WHERE id = $1',
        [ruleId]
      )

      if (result.rowCount === 0) {
        throw new Error('Monitoring rule not found')
      }

      logger.info('Monitoring rule deleted', { ruleId })
    } catch (error) {
      logger.error('Failed to delete monitoring rule', {
        error: error instanceof Error ? error.message : String(error),
        ruleId
      })
      throw error
    }
  }

  /**
   * Run monitoring checks for new grants
   */
  async runNewGrantsMonitoring(): Promise<MonitoringJob> {
    try {
      logger.info('Starting new grants monitoring job')

      const job = await this.createMonitoringJob('new_grants_check')

      // Get all active monitoring rules
      const activeRules = await this.getActiveMonitoringRules()
      
      // Get newly added grants (within last 24 hours)
      const newGrants = await this.getNewGrants()

      let alertsGenerated = 0
      const errors: string[] = []

      for (const rule of activeRules) {
        try {
          const matchingGrants = await this.evaluateRuleAgainstGrants(rule, newGrants)
          
          for (const { grant, score, reasons } of matchingGrants) {
            const alert = await this.createGrantAlert({
              user_id: rule.user_id,
              rule_id: rule.id,
              grant_id: grant.id,
              alert_type: 'new_grant',
              match_score: score,
              match_reasons: reasons,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            })

            if (alert) {
              alertsGenerated++
              await this.sendNotification(alert, rule)
            }
          }

          // Update rule trigger count
          await this.updateRuleTriggerCount(rule.id)
        } catch (ruleError) {
          const errorMsg = `Failed to process rule ${rule.id}: ${ruleError instanceof Error ? ruleError.message : String(ruleError)}`
          errors.push(errorMsg)
          logger.error('Rule processing error', { ruleId: rule.id, error: errorMsg })
        }
      }

      const completedJob = await this.completeMonitoringJob(job.id, {
        rules_processed: activeRules.length,
        grants_evaluated: newGrants.length,
        alerts_generated: alertsGenerated,
        errors_encountered: errors
      })

      logger.info('New grants monitoring completed', {
        jobId: job.id,
        rulesProcessed: activeRules.length,
        grantsEvaluated: newGrants.length,
        alertsGenerated
      })

      return completedJob
    } catch (error) {
      logger.error('New grants monitoring failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Run deadline reminder monitoring
   */
  async runDeadlineReminders(): Promise<MonitoringJob> {
    try {
      logger.info('Starting deadline reminders job')

      const job = await this.createMonitoringJob('deadline_reminder')

      // Get rules with deadline proximity criteria
      const deadlineRules = await this.getDeadlineRules()
      
      let alertsGenerated = 0
      const errors: string[] = []

      for (const rule of deadlineRules) {
        try {
          const upcomingGrants = await this.getUpcomingDeadlineGrants(rule.criteria.deadline_days || 7)
          
          // Filter grants based on user's other criteria
          const relevantGrants = await this.evaluateRuleAgainstGrants(rule, upcomingGrants)

          for (const { grant, score, reasons } of relevantGrants) {
            // Check if we've already sent a reminder for this grant
            const existingAlert = await this.checkExistingDeadlineAlert(rule.user_id, grant.id)
            
            if (!existingAlert) {
              const daysUntilDeadline = Math.ceil((grant.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              
              const alert = await this.createGrantAlert({
                user_id: rule.user_id,
                rule_id: rule.id,
                grant_id: grant.id,
                alert_type: 'deadline_reminder',
                match_score: score,
                match_reasons: [...reasons, `Deadline in ${daysUntilDeadline} days`],
                expires_at: grant.deadline
              })

              if (alert) {
                alertsGenerated++
                await this.sendNotification(alert, rule)
              }
            }
          }

          await this.updateRuleTriggerCount(rule.id)
        } catch (ruleError) {
          const errorMsg = `Failed to process deadline rule ${rule.id}: ${ruleError instanceof Error ? ruleError.message : String(ruleError)}`
          errors.push(errorMsg)
        }
      }

      const completedJob = await this.completeMonitoringJob(job.id, {
        rules_processed: deadlineRules.length,
        grants_evaluated: 0, // Will be calculated from individual rule processing
        alerts_generated: alertsGenerated,
        errors_encountered: errors
      })

      logger.info('Deadline reminders completed', {
        jobId: job.id,
        alertsGenerated
      })

      return completedJob
    } catch (error) {
      logger.error('Deadline reminders failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Run AI-powered similarity monitoring
   */
  async runAISimilarityMonitoring(): Promise<MonitoringJob> {
    try {
      logger.info('Starting AI similarity monitoring job')

      const job = await this.createMonitoringJob('ai_similarity_scan')

      // Get rules with AI similarity criteria
      const aiRules = await this.getAISimilarityRules()
      
      // Get recent grants for similarity checking
      const recentGrants = await this.getRecentGrants(7) // Last 7 days

      let alertsGenerated = 0
      const errors: string[] = []

      for (const rule of aiRules) {
        try {
          // Get user's preference profile for enhanced matching
          const userProfile = await this.userPreferences.getUserProfile(rule.user_id)
          
          // Find semantically similar grants
          const similarGrants = await this.findSimilarGrants(rule, recentGrants, userProfile)

          for (const { grant, similarity, reasoning } of similarGrants) {
            if (similarity >= (rule.criteria.similarity_threshold || 0.7)) {
              const alert = await this.createGrantAlert({
                user_id: rule.user_id,
                rule_id: rule.id,
                grant_id: grant.id,
                alert_type: 'ai_recommendation',
                match_score: similarity,
                match_reasons: reasoning,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              })

              if (alert) {
                alertsGenerated++
                await this.sendNotification(alert, rule)
              }
            }
          }

          await this.updateRuleTriggerCount(rule.id)
        } catch (ruleError) {
          const errorMsg = `Failed to process AI rule ${rule.id}: ${ruleError instanceof Error ? ruleError.message : String(ruleError)}`
          errors.push(errorMsg)
        }
      }

      const completedJob = await this.completeMonitoringJob(job.id, {
        rules_processed: aiRules.length,
        grants_evaluated: recentGrants.length,
        alerts_generated: alertsGenerated,
        errors_encountered: errors
      })

      logger.info('AI similarity monitoring completed', {
        jobId: job.id,
        alertsGenerated
      })

      return completedJob
    } catch (error) {
      logger.error('AI similarity monitoring failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Get alerts for a user
   */
  async getUserAlerts(
    userId: string,
    options: {
      limit?: number
      offset?: number
      alertType?: string
      unreadOnly?: boolean
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{ alerts: GrantAlert[]; total: number }> {
    try {
      const {
        limit = 50,
        offset = 0,
        alertType,
        unreadOnly = false,
        startDate,
        endDate
      } = options

      let whereClause = 'WHERE user_id = $1'
      const params: any[] = [userId]
      let paramIndex = 2

      if (alertType) {
        whereClause += ` AND alert_type = $${paramIndex}`
        params.push(alertType)
        paramIndex++
      }

      if (unreadOnly) {
        whereClause += ` AND user_action IS NULL`
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`
        params.push(startDate)
        paramIndex++
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`
        params.push(endDate)
        paramIndex++
      }

      // Get total count
      const countResult = await this.db.query(
        `SELECT COUNT(*) as total FROM grant_alerts ${whereClause}`,
        params
      )
      const total = parseInt(countResult.rows[0].total)

      // Get paginated results
      const alertsResult = await this.db.query(
        `SELECT ga.*, g.title as grant_title, g.funder, g.deadline, g.amount_max 
         FROM grant_alerts ga
         LEFT JOIN grants g ON ga.grant_id = g.id
         ${whereClause}
         ORDER BY ga.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      )

      const alerts = alertsResult.rows.map(row => this.mapDatabaseRowToAlert(row))

      return { alerts, total }
    } catch (error) {
      logger.error('Failed to get user alerts', {
        error: error instanceof Error ? error.message : String(error),
        userId
      })
      throw error
    }
  }

  /**
   * Mark alert as read/acted upon
   */
  async updateAlertAction(alertId: string, action: 'dismissed' | 'saved' | 'applied' | 'viewed'): Promise<void> {
    try {
      await this.db.query(
        'UPDATE grant_alerts SET user_action = $1, updated_at = NOW() WHERE id = $2',
        [action, alertId]
      )

      logger.info('Alert action updated', { alertId, action })
    } catch (error) {
      logger.error('Failed to update alert action', {
        error: error instanceof Error ? error.message : String(error),
        alertId,
        action
      })
      throw error
    }
  }

  /**
   * Get monitoring statistics for analytics
   */
  async getMonitoringStats(userId?: string): Promise<MonitoringStats> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let userFilter = ''
      const params: any[] = [today]

      if (userId) {
        userFilter = 'AND mr.user_id = $2'
        params.push(userId)
      }

      const statsResult = await this.db.query(`
        SELECT 
          COUNT(DISTINCT mr.id) as active_rules,
          COUNT(DISTINCT CASE WHEN ga.created_at >= $1 THEN ga.id END) as total_alerts_today,
          AVG(EXTRACT(EPOCH FROM (ga.updated_at - ga.created_at))) as avg_response_time,
          COUNT(DISTINCT CASE WHEN ga.user_action IS NOT NULL THEN ga.id END)::FLOAT / 
            NULLIF(COUNT(DISTINCT ga.id), 0) as alert_success_rate
        FROM monitoring_rules mr
        LEFT JOIN grant_alerts ga ON mr.id = ga.rule_id
        WHERE mr.is_active = TRUE ${userFilter}
      `, params)

      const stats = statsResult.rows[0]

      // Get top performing rules
      const topRulesResult = await this.db.query(`
        SELECT mr.name, COUNT(ga.id) as alert_count
        FROM monitoring_rules mr
        LEFT JOIN grant_alerts ga ON mr.id = ga.rule_id
        WHERE mr.is_active = TRUE ${userFilter}
        GROUP BY mr.id, mr.name
        ORDER BY alert_count DESC
        LIMIT 5
      `, userId ? [userId] : [])

      return {
        active_rules: parseInt(stats.active_rules || '0'),
        total_alerts_today: parseInt(stats.total_alerts_today || '0'),
        avg_response_time: parseFloat(stats.avg_response_time || '0'),
        top_performing_rules: topRulesResult.rows.map(row => row.name),
        alert_success_rate: parseFloat(stats.alert_success_rate || '0'),
        user_engagement_score: this.calculateEngagementScore(stats)
      }
    } catch (error) {
      logger.error('Failed to get monitoring stats', {
        error: error instanceof Error ? error.message : String(error),
        userId
      })
      throw error
    }
  }

  // Private helper methods

  private async validateRuleCriteria(criteria: MonitoringCriteria, ruleType: string): Promise<void> {
    switch (ruleType) {
      case 'keyword_match':
        if (!criteria.keywords || criteria.keywords.length === 0) {
          throw new Error('Keywords are required for keyword_match rules')
        }
        break
      case 'amount_range':
        if (!criteria.amount_min && !criteria.amount_max) {
          throw new Error('At least one amount limit is required for amount_range rules')
        }
        break
      case 'deadline_proximity':
        if (!criteria.deadline_days) {
          throw new Error('Deadline days is required for deadline_proximity rules')
        }
        break
      case 'ai_similarity':
        if (!criteria.similarity_threshold) {
          criteria.similarity_threshold = 0.7 // Default threshold
        }
        break
    }
  }

  private mapDatabaseRowToRule(row: any): MonitoringRule {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      rule_type: row.rule_type,
      criteria: JSON.parse(row.criteria || '{}'),
      notification_settings: JSON.parse(row.notification_settings || '{}'),
      is_active: row.is_active,
      last_triggered: row.last_triggered,
      trigger_count: row.trigger_count,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  private mapDatabaseRowToAlert(row: any): GrantAlert {
    return {
      id: row.id,
      user_id: row.user_id,
      rule_id: row.rule_id,
      grant_id: row.grant_id,
      alert_type: row.alert_type,
      match_score: parseFloat(row.match_score),
      match_reasons: JSON.parse(row.match_reasons || '[]'),
      notification_sent: row.notification_sent,
      notification_channels: JSON.parse(row.notification_channels || '[]'),
      user_action: row.user_action,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  private async createRuleEmbedding(rule: MonitoringRule): Promise<void> {
    try {
      // Create a text representation of the rule for embedding
      const ruleText = this.constructRuleText(rule)
      
      const { embedding } = await this.openai.generateEmbedding(ruleText)
      
      await this.vectorDb.storeVector(
        `rule-${rule.id}`,
        embedding,
        {
          id: rule.id,
          type: 'monitoring_rule',
          title: rule.name,
          content: ruleText,
          organizationId: rule.user_id,
          createdAt: rule.created_at.toISOString(),
          updatedAt: rule.updated_at.toISOString(),
          source: 'monitoring_rule'
        }
      )

      logger.info('Rule embedding created', { ruleId: rule.id })
    } catch (error) {
      logger.warn('Failed to create rule embedding', { ruleId: rule.id, error })
    }
  }

  private constructRuleText(rule: MonitoringRule): string {
    const parts = [rule.name, rule.description]
    
    if (rule.criteria.keywords) {
      parts.push('Keywords: ' + rule.criteria.keywords.join(', '))
    }
    
    if (rule.criteria.categories) {
      parts.push('Categories: ' + rule.criteria.categories.join(', '))
    }
    
    return parts.join('. ')
  }

  private async getActiveMonitoringRules(): Promise<MonitoringRule[]> {
    const result = await this.db.query(
      'SELECT * FROM monitoring_rules WHERE is_active = TRUE ORDER BY created_at DESC'
    )
    return result.rows.map(row => this.mapDatabaseRowToRule(row))
  }

  private async getNewGrants(): Promise<any[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = await this.db.query(
      'SELECT * FROM grants WHERE created_at >= $1 AND is_active = TRUE ORDER BY created_at DESC',
      [yesterday]
    )
    return result.rows
  }

  private async evaluateRuleAgainstGrants(
    rule: MonitoringRule,
    grants: any[]
  ): Promise<Array<{ grant: any; score: number; reasons: string[] }>> {
    const matches: Array<{ grant: any; score: number; reasons: string[] }> = []

    for (const grant of grants) {
      const evaluation = await this.evaluateSingleGrant(rule, grant)
      if (evaluation.score > 0) {
        matches.push(evaluation)
      }
    }

    return matches.sort((a, b) => b.score - a.score)
  }

  private async evaluateSingleGrant(rule: MonitoringRule, grant: any): Promise<{ grant: any; score: number; reasons: string[] }> {
    let score = 0
    const reasons: string[] = []
    const criteria = rule.criteria

    // Keyword matching
    if (criteria.keywords && criteria.keywords.length > 0) {
      const grantText = (grant.title + ' ' + grant.description + ' ' + (grant.categories || []).join(' ')).toLowerCase()
      const matchedKeywords = criteria.keywords.filter(keyword => 
        grantText.includes(keyword.toLowerCase())
      )
      
      if (matchedKeywords.length > 0) {
        score += (matchedKeywords.length / criteria.keywords.length) * 0.4
        reasons.push(`Matches keywords: ${matchedKeywords.join(', ')}`)
      }
    }

    // Category filtering
    if (criteria.categories && criteria.categories.length > 0 && grant.categories) {
      const matchedCategories = criteria.categories.filter(category =>
        grant.categories.includes(category)
      )
      
      if (matchedCategories.length > 0) {
        score += (matchedCategories.length / criteria.categories.length) * 0.3
        reasons.push(`Matches categories: ${matchedCategories.join(', ')}`)
      }
    }

    // Amount range
    if (criteria.amount_min || criteria.amount_max) {
      const grantAmount = grant.amount_max || grant.amount_min || 0
      let amountMatch = false

      if (criteria.amount_min && grantAmount >= criteria.amount_min) {
        amountMatch = true
      }
      if (criteria.amount_max && grantAmount <= criteria.amount_max) {
        amountMatch = true
      }

      if (amountMatch) {
        score += 0.2
        reasons.push(`Amount fits criteria (€${grantAmount.toLocaleString()})`)
      }
    }

    // Funder matching
    if (criteria.funders && criteria.funders.length > 0 && grant.funder) {
      const matchedFunder = criteria.funders.some(funder =>
        grant.funder.toLowerCase().includes(funder.toLowerCase())
      )
      
      if (matchedFunder) {
        score += 0.1
        reasons.push(`Matches preferred funder: ${grant.funder}`)
      }
    }

    // Exclude filters
    if (criteria.exclude_keywords && criteria.exclude_keywords.length > 0) {
      const grantText = (grant.title + ' ' + grant.description).toLowerCase()
      const hasExcludedKeyword = criteria.exclude_keywords.some(keyword =>
        grantText.includes(keyword.toLowerCase())
      )
      
      if (hasExcludedKeyword) {
        score = 0 // Exclude completely
        return { grant, score, reasons: ['Excluded by keyword filter'] }
      }
    }

    return { grant, score: Math.min(1, score), reasons }
  }

  private async createGrantAlert(alertData: Omit<GrantAlert, 'id' | 'notification_sent' | 'notification_channels' | 'created_at' | 'updated_at'>): Promise<GrantAlert | null> {
    try {
      // Check if alert already exists
      const existingResult = await this.db.query(
        'SELECT id FROM grant_alerts WHERE user_id = $1 AND grant_id = $2 AND rule_id = $3',
        [alertData.user_id, alertData.grant_id, alertData.rule_id]
      )

      if (existingResult.rows.length > 0) {
        return null // Alert already exists
      }

      const result = await this.db.query(
        `INSERT INTO grant_alerts (user_id, rule_id, grant_id, alert_type, match_score, match_reasons, notification_sent, notification_channels, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, '[]', $7, NOW(), NOW())
         RETURNING *`,
        [
          alertData.user_id,
          alertData.rule_id,
          alertData.grant_id,
          alertData.alert_type,
          alertData.match_score,
          JSON.stringify(alertData.match_reasons),
          alertData.expires_at
        ]
      )

      return this.mapDatabaseRowToAlert(result.rows[0])
    } catch (error) {
      logger.error('Failed to create grant alert', { error, alertData })
      return null
    }
  }

  private async sendNotification(alert: GrantAlert, rule: MonitoringRule): Promise<void> {
    try {
      const notificationChannels: string[] = []

      // Check if alert meets priority threshold
      if (rule.notification_settings.priority_threshold &&
          alert.match_score < rule.notification_settings.priority_threshold) {
        return
      }

      // Check daily notification limits
      if (rule.notification_settings.max_per_day) {
        const todayAlerts = await this.getTodayAlertsCount(rule.user_id)
        if (todayAlerts >= rule.notification_settings.max_per_day) {
          return
        }
      }

      // Send notifications based on settings
      if (rule.notification_settings.email) {
        // Email notification would be implemented here
        notificationChannels.push('email')
      }

      if (rule.notification_settings.in_app) {
        // In-app notification already created as alert
        notificationChannels.push('in_app')
      }

      if (rule.notification_settings.push) {
        // Push notification would be implemented here
        notificationChannels.push('push')
      }

      // Update alert as sent
      await this.db.query(
        'UPDATE grant_alerts SET notification_sent = TRUE, notification_channels = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(notificationChannels), alert.id]
      )

      logger.info('Notification sent', {
        alertId: alert.id,
        channels: notificationChannels
      })
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : String(error),
        alertId: alert.id
      })
    }
  }

  private async createMonitoringJob(jobType: MonitoringJob['job_type']): Promise<MonitoringJob> {
    const result = await this.db.query(
      `INSERT INTO monitoring_jobs (job_type, status, rules_processed, grants_evaluated, alerts_generated, errors_encountered, started_at, next_run_at, created_at)
       VALUES ($1, 'running', 0, 0, 0, '[]', NOW(), NOW() + INTERVAL '1 hour', NOW())
       RETURNING *`,
      [jobType]
    )

    return {
      id: result.rows[0].id,
      job_type: result.rows[0].job_type,
      status: result.rows[0].status,
      rules_processed: result.rows[0].rules_processed,
      grants_evaluated: result.rows[0].grants_evaluated,
      alerts_generated: result.rows[0].alerts_generated,
      errors_encountered: JSON.parse(result.rows[0].errors_encountered),
      started_at: result.rows[0].started_at,
      completed_at: result.rows[0].completed_at,
      next_run_at: result.rows[0].next_run_at,
      created_at: result.rows[0].created_at
    }
  }

  private async completeMonitoringJob(jobId: string, results: Partial<MonitoringJob>): Promise<MonitoringJob> {
    const result = await this.db.query(
      `UPDATE monitoring_jobs 
       SET status = 'completed', 
           rules_processed = $1, 
           grants_evaluated = $2, 
           alerts_generated = $3, 
           errors_encountered = $4,
           completed_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        results.rules_processed,
        results.grants_evaluated,
        results.alerts_generated,
        JSON.stringify(results.errors_encountered),
        jobId
      ]
    )

    return {
      id: result.rows[0].id,
      job_type: result.rows[0].job_type,
      status: result.rows[0].status,
      rules_processed: result.rows[0].rules_processed,
      grants_evaluated: result.rows[0].grants_evaluated,
      alerts_generated: result.rows[0].alerts_generated,
      errors_encountered: JSON.parse(result.rows[0].errors_encountered),
      started_at: result.rows[0].started_at,
      completed_at: result.rows[0].completed_at,
      next_run_at: result.rows[0].next_run_at,
      created_at: result.rows[0].created_at
    }
  }

  private async updateRuleTriggerCount(ruleId: string): Promise<void> {
    await this.db.query(
      'UPDATE monitoring_rules SET trigger_count = trigger_count + 1, last_triggered = NOW() WHERE id = $1',
      [ruleId]
    )
  }

  private async getDeadlineRules(): Promise<MonitoringRule[]> {
    const result = await this.db.query(
      "SELECT * FROM monitoring_rules WHERE is_active = TRUE AND rule_type = 'deadline_proximity'"
    )
    return result.rows.map(row => this.mapDatabaseRowToRule(row))
  }

  private async getAISimilarityRules(): Promise<MonitoringRule[]> {
    const result = await this.db.query(
      "SELECT * FROM monitoring_rules WHERE is_active = TRUE AND rule_type = 'ai_similarity'"
    )
    return result.rows.map(row => this.mapDatabaseRowToRule(row))
  }

  private async getUpcomingDeadlineGrants(daysAhead: number): Promise<any[]> {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    const result = await this.db.query(
      'SELECT * FROM grants WHERE deadline <= $1 AND deadline > NOW() AND is_active = TRUE',
      [futureDate]
    )
    return result.rows
  }

  private async getRecentGrants(daysBack: number): Promise<any[]> {
    const pastDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    const result = await this.db.query(
      'SELECT * FROM grants WHERE created_at >= $1 AND is_active = TRUE',
      [pastDate]
    )
    return result.rows
  }

  private async checkExistingDeadlineAlert(userId: string, grantId: string): Promise<boolean> {
    const result = await this.db.query(
      "SELECT id FROM grant_alerts WHERE user_id = $1 AND grant_id = $2 AND alert_type = 'deadline_reminder'",
      [userId, grantId]
    )
    return result.rows.length > 0
  }

  private async findSimilarGrants(
    rule: MonitoringRule,
    grants: any[],
    userProfile: any
  ): Promise<Array<{ grant: any; similarity: number; reasoning: string[] }>> {
    const similarGrants: Array<{ grant: any; similarity: number; reasoning: string[] }> = []

    for (const grant of grants) {
      try {
        // Use semantic search if available
        const grantText = grant.title + ' ' + grant.description
        const { embedding } = await this.openai.generateEmbedding(grantText)
        
        // Search for similar vectors
        const searchResults = await this.vectorDb.searchSimilar(embedding, {
          filter: { type: 'monitoring_rule', organizationId: rule.user_id },
          topK: 1
        })

        if (searchResults.length > 0) {
          const similarity = searchResults[0].score
          const reasoning = [
            `AI similarity: ${Math.round(similarity * 100)}%`,
            'Based on your monitoring preferences'
          ]

          similarGrants.push({ grant, similarity, reasoning })
        }
      } catch (error) {
        logger.warn('Failed to calculate similarity for grant', { grantId: grant.id, error })
      }
    }

    return similarGrants.sort((a, b) => b.similarity - a.similarity)
  }

  private async getTodayAlertsCount(userId: string): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM grant_alerts WHERE user_id = $1 AND created_at >= $2',
      [userId, today]
    )
    
    return parseInt(result.rows[0].count)
  }

  private calculateEngagementScore(stats: any): number {
    const alertSuccessRate = parseFloat(stats.alert_success_rate || '0')
    const avgResponseTime = parseFloat(stats.avg_response_time || '86400') // Default 1 day in seconds
    
    // Lower response time = higher engagement
    const responseScore = Math.max(0, 1 - (avgResponseTime / 86400)) // Normalize to 1 day
    
    // Combine success rate and response time
    return Math.round(((alertSuccessRate + responseScore) / 2) * 100)
  }
}