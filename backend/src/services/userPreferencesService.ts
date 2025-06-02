import { logger } from './logger'
import { DatabaseService } from './database'
import { VectorDatabaseService } from './vectorDatabase'
import { OpenAIService } from './openaiService'

export interface UserPreference {
  user_id: string
  preference_type: 'category' | 'funder_type' | 'amount_range' | 'location' | 'keyword'
  preference_value: string
  weight: number // 0.0 to 1.0, how strong this preference is
  created_at: Date
  updated_at: Date
}

export interface UserInteraction {
  user_id: string
  grant_id: string
  interaction_type: 'view' | 'favorite' | 'apply' | 'share' | 'dismiss'
  timestamp: Date
  context?: Record<string, any>
}

export interface UserProfile {
  user_id: string
  preferences: UserPreference[]
  interactions: UserInteraction[]
  learning_metrics: {
    total_interactions: number
    favorite_categories: string[]
    avg_grant_amount: number
    preferred_funders: string[]
    success_rate: number
  }
}

export interface RecommendationRequest {
  user_id: string
  limit?: number
  exclude_grant_ids?: string[]
  boost_categories?: string[]
  context?: 'dashboard' | 'search' | 'email' | 'mobile'
}

export interface RecommendationResult {
  grant_id: string
  score: number
  reasoning: {
    preference_match: number
    interaction_history: number
    similarity_boost: number
    novelty_factor: number
    total_score: number
  }
  explanation: string[]
}

export class UserPreferencesService {
  private db: DatabaseService
  private vectorDb: VectorDatabaseService
  private openai: OpenAIService

  constructor(
    db: DatabaseService,
    vectorDb: VectorDatabaseService,
    openai: OpenAIService
  ) {
    this.db = db
    this.vectorDb = vectorDb
    this.openai = openai
  }

  /**
   * Record user interaction with a grant
   */
  async recordInteraction(interaction: Omit<UserInteraction, 'timestamp'>): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO user_interactions (user_id, grant_id, interaction_type, context, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [interaction.user_id, interaction.grant_id, interaction.interaction_type, JSON.stringify(interaction.context || {})]
      )

      // Update preferences based on interaction
      await this.updatePreferencesFromInteraction(interaction)

      logger.info('User interaction recorded', {
        userId: interaction.user_id,
        grantId: interaction.grant_id,
        type: interaction.interaction_type
      })
    } catch (error) {
      logger.error('Failed to record user interaction', { error, interaction })
      throw error
    }
  }

  /**
   * Get user profile with preferences and learning metrics
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Get preferences
      const preferencesResult = await this.db.query(
        `SELECT * FROM user_preferences WHERE user_id = $1 ORDER BY weight DESC`,
        [userId]
      )

      // Get recent interactions
      const interactionsResult = await this.db.query(
        `SELECT * FROM user_interactions 
         WHERE user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT 100`,
        [userId]
      )

      // Calculate learning metrics
      const metrics = await this.calculateLearningMetrics(userId)

      return {
        user_id: userId,
        preferences: preferencesResult.rows.map(row => ({
          user_id: row.user_id,
          preference_type: row.preference_type,
          preference_value: row.preference_value,
          weight: parseFloat(row.weight),
          created_at: row.created_at,
          updated_at: row.updated_at
        })),
        interactions: interactionsResult.rows.map(row => ({
          user_id: row.user_id,
          grant_id: row.grant_id,
          interaction_type: row.interaction_type,
          timestamp: row.timestamp,
          context: row.context
        })),
        learning_metrics: metrics
      }
    } catch (error) {
      logger.error('Failed to get user profile', { error, userId })
      throw error
    }
  }

  /**
   * Generate personalized grant recommendations
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    try {
      const userProfile = await this.getUserProfile(request.user_id)
      const limit = request.limit || 10

      // Get candidate grants (exclude already interacted with)
      const excludeIds = [
        ...(request.exclude_grant_ids || []),
        ...userProfile.interactions
          .filter(i => ['apply', 'dismiss'].includes(i.interaction_type))
          .map(i => i.grant_id)
      ]

      const candidatesResult = await this.db.query(
        `SELECT g.*, v.embedding_id 
         FROM grants g
         LEFT JOIN vector_embeddings v ON g.id = v.source_id AND v.source_type = 'grant'
         WHERE g.is_active = true 
         AND g.deadline > NOW()
         ${excludeIds.length > 0 ? `AND g.id NOT IN (${excludeIds.map((_, i) => `$${i + 1}`).join(',')})` : ''}
         ORDER BY g.created_at DESC
         LIMIT ${limit * 3}`, // Get more candidates to filter
        excludeIds
      )

      const candidates = candidatesResult.rows

      // Score each candidate
      const scoredCandidates = await Promise.all(
        candidates.map(async (grant) => {
          const score = await this.scoreGrant(grant, userProfile, request)
          return {
            grant,
            ...score
          }
        })
      )

      // Sort by score and return top results
      return scoredCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(candidate => ({
          grant_id: candidate.grant.id,
          score: candidate.score,
          reasoning: candidate.reasoning,
          explanation: candidate.explanation
        }))
    } catch (error) {
      logger.error('Failed to generate recommendations', { error, request })
      throw error
    }
  }

  /**
   * Update user preferences based on interaction
   */
  private async updatePreferencesFromInteraction(interaction: Omit<UserInteraction, 'timestamp'>): Promise<void> {
    try {
      // Get grant details
      const grantResult = await this.db.query(
        `SELECT * FROM grants WHERE id = $1`,
        [interaction.grant_id]
      )

      if (grantResult.rows.length === 0) return

      const grant = grantResult.rows[0]
      const weightAdjustment = this.getWeightAdjustment(interaction.interaction_type)

      // Update category preferences
      if (grant.categories && grant.categories.length > 0) {
        for (const category of grant.categories) {
          await this.updatePreference(interaction.user_id, 'category', category, weightAdjustment)
        }
      }

      // Update funder type preference
      if (grant.funder_type) {
        await this.updatePreference(interaction.user_id, 'funder_type', grant.funder_type, weightAdjustment)
      }

      // Update amount range preference
      if (grant.amount_max) {
        const amountRange = this.getAmountRange(grant.amount_max)
        await this.updatePreference(interaction.user_id, 'amount_range', amountRange, weightAdjustment)
      }

      logger.debug('Updated preferences from interaction', {
        userId: interaction.user_id,
        grantId: interaction.grant_id,
        weightAdjustment
      })
    } catch (error) {
      logger.error('Failed to update preferences from interaction', { error, interaction })
    }
  }

  /**
   * Update or create a user preference
   */
  private async updatePreference(userId: string, type: string, value: string, weightChange: number): Promise<void> {
    try {
      // Check if preference exists
      const existingResult = await this.db.query(
        `SELECT * FROM user_preferences 
         WHERE user_id = $1 AND preference_type = $2 AND preference_value = $3`,
        [userId, type, value]
      )

      if (existingResult.rows.length > 0) {
        // Update existing preference
        const currentWeight = parseFloat(existingResult.rows[0].weight)
        const newWeight = Math.max(0, Math.min(1, currentWeight + weightChange))

        await this.db.query(
          `UPDATE user_preferences 
           SET weight = $1, updated_at = NOW() 
           WHERE user_id = $2 AND preference_type = $3 AND preference_value = $4`,
          [newWeight, userId, type, value]
        )
      } else {
        // Create new preference
        const initialWeight = Math.max(0.1, 0.5 + weightChange)

        await this.db.query(
          `INSERT INTO user_preferences (user_id, preference_type, preference_value, weight, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [userId, type, value, initialWeight]
        )
      }
    } catch (error) {
      logger.error('Failed to update preference', { error, userId, type, value })
    }
  }

  /**
   * Score a grant for a user based on preferences and history
   */
  private async scoreGrant(
    grant: any,
    userProfile: UserProfile,
    request: RecommendationRequest
  ): Promise<{ score: number; reasoning: RecommendationResult['reasoning']; explanation: string[] }> {
    const explanation: string[] = []
    let preferenceMatch = 0
    let interactionHistory = 0
    let similarityBoost = 0
    let noveltyFactor = 0.5 // Base novelty

    // Calculate preference match score
    for (const preference of userProfile.preferences) {
      let match = 0

      switch (preference.preference_type) {
        case 'category':
          if (grant.categories && grant.categories.includes(preference.preference_value)) {
            match = preference.weight
            explanation.push(`Matches preferred category: ${preference.preference_value}`)
          }
          break
        case 'funder_type':
          if (grant.funder_type === preference.preference_value) {
            match = preference.weight
            explanation.push(`Matches preferred funder type: ${preference.preference_value}`)
          }
          break
        case 'amount_range':
          if (this.getAmountRange(grant.amount_max || 0) === preference.preference_value) {
            match = preference.weight * 0.7 // Amount is less important than category
            explanation.push(`Matches preferred amount range: ${preference.preference_value}`)
          }
          break
      }

      preferenceMatch += match
    }

    // Normalize preference match
    preferenceMatch = Math.min(1, preferenceMatch)

    // Calculate interaction history boost
    const similarInteractions = userProfile.interactions.filter(interaction => {
      // Find interactions with grants that have similar characteristics
      return ['favorite', 'apply'].includes(interaction.interaction_type)
    })

    if (similarInteractions.length > 0) {
      interactionHistory = Math.min(0.3, similarInteractions.length * 0.05)
      explanation.push(`Similar to ${similarInteractions.length} grants you've interacted with positively`)
    }

    // Calculate semantic similarity boost if vector embedding exists
    if (grant.embedding_id && userProfile.interactions.length > 0) {
      try {
        // Get embeddings for grants user has favorited/applied to
        const positiveInteractions = userProfile.interactions
          .filter(i => ['favorite', 'apply'].includes(i.interaction_type))
          .slice(0, 5) // Limit to recent positive interactions

        if (positiveInteractions.length > 0) {
          const similarities = await Promise.all(
            positiveInteractions.map(async (interaction) => {
              const result = await this.vectorDb.searchSimilar(grant.embedding_id, {
                filter: { source_id: interaction.grant_id },
                topK: 1
              })
              return result[0]?.score || 0
            })
          )

          const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length
          similarityBoost = avgSimilarity * 0.2

          if (avgSimilarity > 0.7) {
            explanation.push('Semantically similar to grants you\'ve shown interest in')
          }
        }
      } catch (error) {
        logger.debug('Could not calculate semantic similarity', { error })
      }
    }

    // Calculate novelty factor (encourage discovery)
    const categoryInteractions = userProfile.interactions.filter(interaction => 
      grant.categories && grant.categories.some(cat => 
        userProfile.learning_metrics.favorite_categories.includes(cat)
      )
    )

    if (categoryInteractions.length === 0) {
      noveltyFactor = 0.8 // High novelty for unexplored categories
      explanation.push('New category to explore')
    } else if (categoryInteractions.length < 3) {
      noveltyFactor = 0.6
      explanation.push('Limited experience with this category')
    }

    // Boost for context-specific recommendations
    let contextBoost = 0
    if (request.boost_categories && grant.categories) {
      const hasBoostCategory = grant.categories.some(cat => request.boost_categories!.includes(cat))
      if (hasBoostCategory) {
        contextBoost = 0.1
        explanation.push('Matches current search context')
      }
    }

    // Calculate final score (weighted combination)
    const totalScore = (
      preferenceMatch * 0.4 +
      interactionHistory * 0.2 +
      similarityBoost * 0.2 +
      noveltyFactor * 0.15 +
      contextBoost * 0.05
    )

    return {
      score: Math.round(totalScore * 100) / 100,
      reasoning: {
        preference_match: Math.round(preferenceMatch * 100) / 100,
        interaction_history: Math.round(interactionHistory * 100) / 100,
        similarity_boost: Math.round(similarityBoost * 100) / 100,
        novelty_factor: Math.round(noveltyFactor * 100) / 100,
        total_score: Math.round(totalScore * 100) / 100
      },
      explanation: explanation.length > 0 ? explanation : ['General recommendation based on available grants']
    }
  }

  /**
   * Calculate learning metrics for a user
   */
  private async calculateLearningMetrics(userId: string): Promise<UserProfile['learning_metrics']> {
    try {
      // Total interactions
      const totalResult = await this.db.query(
        `SELECT COUNT(*) as total FROM user_interactions WHERE user_id = $1`,
        [userId]
      )

      // Favorite categories (from positive interactions)
      const categoriesResult = await this.db.query(
        `SELECT g.categories, COUNT(*) as interaction_count
         FROM user_interactions ui
         JOIN grants g ON ui.grant_id = g.id
         WHERE ui.user_id = $1 AND ui.interaction_type IN ('favorite', 'apply')
         AND g.categories IS NOT NULL
         GROUP BY g.categories
         ORDER BY interaction_count DESC
         LIMIT 5`,
        [userId]
      )

      // Average grant amount (from positive interactions)
      const amountResult = await this.db.query(
        `SELECT AVG(g.amount_max) as avg_amount
         FROM user_interactions ui
         JOIN grants g ON ui.grant_id = g.id
         WHERE ui.user_id = $1 AND ui.interaction_type IN ('favorite', 'apply')
         AND g.amount_max IS NOT NULL`,
        [userId]
      )

      // Preferred funders
      const fundersResult = await this.db.query(
        `SELECT g.funder, COUNT(*) as interaction_count
         FROM user_interactions ui
         JOIN grants g ON ui.grant_id = g.id
         WHERE ui.user_id = $1 AND ui.interaction_type IN ('favorite', 'apply')
         GROUP BY g.funder
         ORDER BY interaction_count DESC
         LIMIT 5`,
        [userId]
      )

      const favoriteCategories = categoriesResult.rows
        .flatMap(row => row.categories || [])
        .filter((cat, index, arr) => arr.indexOf(cat) === index) // Unique categories

      return {
        total_interactions: parseInt(totalResult.rows[0]?.total || '0'),
        favorite_categories: favoriteCategories,
        avg_grant_amount: parseFloat(amountResult.rows[0]?.avg_amount || '0'),
        preferred_funders: fundersResult.rows.map(row => row.funder).filter(Boolean),
        success_rate: 0 // Would need application outcome data
      }
    } catch (error) {
      logger.error('Failed to calculate learning metrics', { error, userId })
      return {
        total_interactions: 0,
        favorite_categories: [],
        avg_grant_amount: 0,
        preferred_funders: [],
        success_rate: 0
      }
    }
  }

  /**
   * Get weight adjustment based on interaction type
   */
  private getWeightAdjustment(interactionType: string): number {
    switch (interactionType) {
      case 'apply': return 0.3
      case 'favorite': return 0.2
      case 'share': return 0.1
      case 'view': return 0.05
      case 'dismiss': return -0.1
      default: return 0
    }
  }

  /**
   * Categorize amount into ranges
   */
  private getAmountRange(amount: number): string {
    if (amount <= 5000) return 'small'
    if (amount <= 25000) return 'medium'
    if (amount <= 100000) return 'large'
    return 'enterprise'
  }

  /**
   * Batch update user preferences from external data
   */
  async batchUpdatePreferences(userId: string, preferences: Partial<UserPreference>[]): Promise<void> {
    try {
      for (const pref of preferences) {
        if (pref.preference_type && pref.preference_value && pref.weight !== undefined) {
          await this.updatePreference(userId, pref.preference_type, pref.preference_value, pref.weight - 0.5)
        }
      }

      logger.info('Batch updated user preferences', { userId, count: preferences.length })
    } catch (error) {
      logger.error('Failed to batch update preferences', { error, userId })
      throw error
    }
  }

  /**
   * Get recommendation explanation for debugging
   */
  async explainRecommendation(userId: string, grantId: string): Promise<{
    score: number
    reasoning: RecommendationResult['reasoning']
    explanation: string[]
    userProfile: UserProfile
  }> {
    try {
      const userProfile = await this.getUserProfile(userId)
      
      const grantResult = await this.db.query(
        `SELECT g.*, v.embedding_id 
         FROM grants g
         LEFT JOIN vector_embeddings v ON g.id = v.source_id AND v.source_type = 'grant'
         WHERE g.id = $1`,
        [grantId]
      )

      if (grantResult.rows.length === 0) {
        throw new Error('Grant not found')
      }

      const grant = grantResult.rows[0]
      const scoring = await this.scoreGrant(grant, userProfile, { user_id: userId })

      return {
        score: scoring.score,
        reasoning: scoring.reasoning,
        explanation: scoring.explanation,
        userProfile
      }
    } catch (error) {
      logger.error('Failed to explain recommendation', { error, userId, grantId })
      throw error
    }
  }
}