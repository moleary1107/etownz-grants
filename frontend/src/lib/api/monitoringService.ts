/**
 * Monitoring Service Client
 * Frontend utility for interacting with grant monitoring APIs
 */

export interface MonitoringRule {
  id?: string
  user_id: string
  name: string
  description?: string
  rule_type: 'keyword_match' | 'category_filter' | 'amount_range' | 'deadline_proximity' | 'ai_similarity' | 'custom_criteria'
  criteria: {
    keywords?: string[]
    excluded_keywords?: string[]
    categories?: string[]
    amount_min?: number
    amount_max?: number
    deadline_days?: number
    similarity_threshold?: number
    custom_logic?: string
  }
  notification_settings: {
    email: boolean
    in_app: boolean
    push: boolean
    frequency: 'immediate' | 'daily' | 'weekly'
  }
  is_active: boolean
  last_triggered?: Date
  trigger_count?: number
  created_at?: Date
  updated_at?: Date
}

export interface GrantAlert {
  id: string
  user_id: string
  rule_id: string
  grant_id: string
  alert_type: 'new_grant' | 'deadline_reminder' | 'criteria_match' | 'ai_recommendation'
  match_score?: number
  match_reasons: string[]
  user_action?: 'dismissed' | 'saved' | 'applied' | 'viewed'
  expires_at?: Date
  created_at: Date
  grant?: {
    title: string
    description: string
    funder: string
    amount_max?: number
    deadline?: Date
  }
}

export interface MonitoringStats {
  active_rules: number
  total_alerts_today: number
  avg_response_time?: number
  top_performing_rules: string[]
  alert_success_rate: number
  user_engagement_score: number
}

export interface MonitoringJob {
  id: string
  job_type: 'new_grants_check' | 'deadline_reminder' | 'ai_similarity_scan'
  status: 'running' | 'completed' | 'failed'
  stats: {
    rules_processed: number
    alerts_generated: number
    processing_time_ms: number
    errors: number
  }
  started_at: Date
  completed_at?: Date
}

class MonitoringService {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api'
  }

  /**
   * Create a new monitoring rule
   */
  async createRule(rule: Omit<MonitoringRule, 'id' | 'last_triggered' | 'trigger_count' | 'created_at' | 'updated_at'>): Promise<MonitoringRule> {
    const response = await fetch(`${this.baseUrl}/monitoring/rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify(rule)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to create monitoring rule: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get monitoring rules for a user
   */
  async getUserRules(userId: string, activeOnly: boolean = false): Promise<{
    rules: MonitoringRule[]
    total: number
    processingTime: number
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/monitoring/rules/${userId}?active_only=${activeOnly}`, {
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
        throw new Error(error.message || `Failed to get monitoring rules: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      // Return mock data if endpoint doesn't exist
      console.warn('Monitoring rules endpoint not available, using mock data')
      return {
        rules: [],
        total: 0,
        processingTime: 0
      }
    }
  }

  /**
   * Update a monitoring rule
   */
  async updateRule(ruleId: string, updates: Partial<MonitoringRule>): Promise<MonitoringRule> {
    const response = await fetch(`${this.baseUrl}/monitoring/rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to update monitoring rule: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Delete a monitoring rule
   */
  async deleteRule(ruleId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/monitoring/rules/${ruleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to delete monitoring rule: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get alerts for a user
   */
  async getUserAlerts(
    userId: string, 
    options: {
      limit?: number
      offset?: number
      alert_type?: string
      unread_only?: boolean
      start_date?: Date
      end_date?: Date
    } = {}
  ): Promise<{
    alerts: GrantAlert[]
    total: number
    processingTime: number
  }> {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit.toString())
    if (options.offset) params.set('offset', options.offset.toString())
    if (options.alert_type) params.set('alert_type', options.alert_type)
    if (options.unread_only) params.set('unread_only', 'true')
    if (options.start_date) params.set('start_date', options.start_date.toISOString())
    if (options.end_date) params.set('end_date', options.end_date.toISOString())

    const queryString = params.toString()
    const url = `${this.baseUrl}/monitoring/alerts/${userId}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
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
      throw new Error(error.message || `Failed to get user alerts: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Mark alert action
   */
  async markAlertAction(alertId: string, action: 'dismissed' | 'saved' | 'applied' | 'viewed'): Promise<{
    success: boolean
    message: string
  }> {
    const response = await fetch(`${this.baseUrl}/monitoring/alerts/${alertId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({ action })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to mark alert action: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get monitoring statistics for a user
   */
  async getStats(userId: string): Promise<MonitoringStats & { processingTime: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/monitoring/stats/${userId}`, {
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
        throw new Error(error.message || `Failed to get monitoring stats: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      // Return mock stats if endpoint doesn't exist
      console.warn('Monitoring stats endpoint not available, using mock data')
      return {
        active_rules: 0,
        total_alerts_today: 0,
        avg_response_time: 0,
        top_performing_rules: [],
        alert_success_rate: 0,
        user_engagement_score: 0,
        processingTime: 0
      }
    }
  }

  /**
   * Manually trigger a monitoring job
   */
  async runJob(jobType: 'new_grants_check' | 'deadline_reminder' | 'ai_similarity_scan'): Promise<MonitoringJob> {
    const response = await fetch(`${this.baseUrl}/monitoring/jobs/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({ job_type: jobType })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to run monitoring job: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Create predefined monitoring rules for common scenarios
   */
  async createPredefinedRules(userId: string, ruleTypes: string[]): Promise<MonitoringRule[]> {
    const predefinedRules: Partial<MonitoringRule>[] = []

    if (ruleTypes.includes('new_grants')) {
      predefinedRules.push({
        user_id: userId,
        name: 'New Grant Opportunities',
        description: 'Notify me when new grants matching my interests are added',
        rule_type: 'keyword_match',
        criteria: {
          keywords: ['technology', 'innovation', 'startup', 'research']
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: false,
          frequency: 'daily'
        },
        is_active: true
      })
    }

    if (ruleTypes.includes('deadline_reminders')) {
      predefinedRules.push({
        user_id: userId,
        name: 'Deadline Reminders',
        description: 'Remind me about upcoming grant deadlines',
        rule_type: 'deadline_proximity',
        criteria: {
          deadline_days: 14
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: true,
          frequency: 'immediate'
        },
        is_active: true
      })
    }

    if (ruleTypes.includes('high_value')) {
      predefinedRules.push({
        user_id: userId,
        name: 'High-Value Grants',
        description: 'Notify me about grants with significant funding amounts',
        rule_type: 'amount_range',
        criteria: {
          amount_min: 50000
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: true,
          frequency: 'immediate'
        },
        is_active: true
      })
    }

    const createdRules = await Promise.all(
      predefinedRules.map(rule => this.createRule(rule as any))
    )

    return createdRules
  }

  /**
   * Get rule templates for different use cases
   */
  getRuleTemplates(): { [key: string]: Partial<MonitoringRule> } {
    return {
      'technology_focus': {
        name: 'Technology & Innovation Grants',
        description: 'Monitor for technology and innovation funding opportunities',
        rule_type: 'keyword_match',
        criteria: {
          keywords: ['technology', 'innovation', 'AI', 'software', 'digital', 'tech'],
          categories: ['Research & Development', 'Innovation']
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: false,
          frequency: 'daily'
        }
      },
      'startup_funding': {
        name: 'Startup Funding Opportunities',
        description: 'Track grants specifically for startups and early-stage companies',
        rule_type: 'keyword_match',
        criteria: {
          keywords: ['startup', 'entrepreneur', 'early-stage', 'seed funding', 'incubator'],
          categories: ['Entrepreneurship']
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: true,
          frequency: 'immediate'
        }
      },
      'research_grants': {
        name: 'Research & Development Grants',
        description: 'Monitor for academic and commercial research funding',
        rule_type: 'category_filter',
        criteria: {
          categories: ['Research & Development', 'Education & STEM']
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: false,
          frequency: 'weekly'
        }
      },
      'large_grants': {
        name: 'Large Funding Opportunities',
        description: 'Track grants with substantial funding amounts (€100K+)',
        rule_type: 'amount_range',
        criteria: {
          amount_min: 100000
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: true,
          frequency: 'immediate'
        }
      },
      'deadline_alerts': {
        name: 'Urgent Deadline Alerts',
        description: 'Get notified about grants with approaching deadlines',
        rule_type: 'deadline_proximity',
        criteria: {
          deadline_days: 7
        },
        notification_settings: {
          email: true,
          in_app: true,
          push: true,
          frequency: 'immediate'
        }
      }
    }
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService()

// Export class for testing
export { MonitoringService }