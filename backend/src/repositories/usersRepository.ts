import { BaseRepository } from '../services/database'

export interface User {
  id: string
  org_id: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role?: string
  auth_provider?: string
  auth_provider_id?: string
  is_active?: boolean
  last_login?: Date
  created_at?: Date
  updated_at?: Date
}

export interface Organization {
  id: string
  name: string
  description?: string
  website?: string
  contact_email?: string
  contact_phone?: string
  address?: Record<string, any>
  profile_data?: Record<string, any>
  created_at?: Date
  updated_at?: Date
}

export interface NotificationPreferences {
  id: string
  user_id: string
  email_notifications?: boolean
  push_notifications?: boolean
  deadline_reminders?: boolean
  new_grants?: boolean
  submission_updates?: boolean
  weekly_digest?: boolean
  created_at?: Date
  updated_at?: Date
}

export interface Subscription {
  id: string
  org_id: string
  plan_type: string
  status?: string
  stripe_subscription_id?: string
  current_period_start?: Date
  current_period_end?: Date
  monthly_token_limit?: number
  monthly_grants_limit?: number
  tokens_used_this_month?: number
  grants_used_this_month?: number
  created_at?: Date
  updated_at?: Date
}

export class UsersRepository extends BaseRepository {

  // Users
  async findUsers(orgId?: string): Promise<User[]> {
    const conditions = orgId ? { org_id: orgId } : {}
    return this.findMany<User>('users', conditions, 'created_at DESC')
  }

  async findUserById(id: string): Promise<User | null> {
    return this.findById<User>('users', id)
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return result.rows[0] || null
  }

  async findUserWithOrganization(userId: string): Promise<(User & { organization: Organization }) | null> {
    const result = await this.db.query(`
      SELECT 
        u.*,
        o.name as org_name,
        o.description as org_description,
        o.website as org_website,
        o.contact_email as org_contact_email,
        o.contact_phone as org_contact_phone,
        o.address as org_address,
        o.profile_data as org_profile_data
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1
    `, [userId])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      ...row,
      organization: {
        id: row.org_id,
        name: row.org_name,
        description: row.org_description,
        website: row.org_website,
        contact_email: row.org_contact_email,
        contact_phone: row.org_contact_phone,
        address: row.org_address,
        profile_data: row.org_profile_data
      }
    }
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    return this.create<User>('users', user)
  }

  async updateUser(id: string, user: Partial<User>): Promise<User | null> {
    return this.update<User>('users', id, user)
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.delete('users', id)
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [id]
    )
  }

  async deactivateUser(id: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [id]
    )
  }

  async reactivateUser(id: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET is_active = true WHERE id = $1',
      [id]
    )
  }

  // Organizations
  async findOrganizations(): Promise<Organization[]> {
    return this.findMany<Organization>('organizations', {}, 'name ASC')
  }

  async findOrganizationById(id: string): Promise<Organization | null> {
    return this.findById<Organization>('organizations', id)
  }

  async findOrganizationByName(name: string): Promise<Organization | null> {
    const result = await this.db.query(
      'SELECT * FROM organizations WHERE name ILIKE $1',
      [`%${name}%`]
    )
    return result.rows[0] || null
  }

  async createOrganization(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
    return this.create<Organization>('organizations', org)
  }

  async updateOrganization(id: string, org: Partial<Organization>): Promise<Organization | null> {
    return this.update<Organization>('organizations', id, org)
  }

  async deleteOrganization(id: string): Promise<boolean> {
    return this.delete('organizations', id)
  }

  async getOrganizationWithUsers(orgId: string): Promise<(Organization & { users: User[] }) | null> {
    const org = await this.findOrganizationById(orgId)
    if (!org) return null

    const users = await this.findUsers(orgId)
    return { ...org, users }
  }

  async getOrganizationStats(orgId: string): Promise<{
    total_users: number
    active_users: number
    total_submissions: number
    pending_submissions: number
    approved_submissions: number
    total_documents: number
  }> {
    const result = await this.db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE org_id = $1) as total_users,
        (SELECT COUNT(*) FROM users WHERE org_id = $1 AND is_active = true) as active_users,
        (SELECT COUNT(*) FROM submissions WHERE org_id = $1) as total_submissions,
        (SELECT COUNT(*) FROM submissions WHERE org_id = $1 AND status = 'pending') as pending_submissions,
        (SELECT COUNT(*) FROM submissions WHERE org_id = $1 AND status = 'approved') as approved_submissions,
        (SELECT COUNT(*) FROM documents WHERE org_id = $1) as total_documents
    `, [orgId])

    return result.rows[0]
  }

  // Notification Preferences
  async findNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    const result = await this.db.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    )
    return result.rows[0] || null
  }

  async createNotificationPreferences(
    prefs: Omit<NotificationPreferences, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NotificationPreferences> {
    return this.create<NotificationPreferences>('notification_preferences', prefs)
  }

  async updateNotificationPreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    const existing = await this.findNotificationPreferences(userId)
    
    if (existing) {
      return this.update<NotificationPreferences>('notification_preferences', existing.id, prefs)
    } else {
      return this.createNotificationPreferences({ user_id: userId, ...prefs })
    }
  }

  // Subscriptions
  async findSubscription(orgId: string): Promise<Subscription | null> {
    const result = await this.db.query(
      'SELECT * FROM subscriptions WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orgId]
    )
    return result.rows[0] || null
  }

  async createSubscription(subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<Subscription> {
    return this.create<Subscription>('subscriptions', subscription)
  }

  async updateSubscription(id: string, subscription: Partial<Subscription>): Promise<Subscription | null> {
    return this.update<Subscription>('subscriptions', id, subscription)
  }

  async updateSubscriptionUsage(
    orgId: string,
    tokensUsed?: number,
    grantsUsed?: number
  ): Promise<void> {
    const updates: string[] = []
    const params: any[] = [orgId]
    let paramIndex = 2

    if (tokensUsed !== undefined) {
      updates.push(`tokens_used_this_month = tokens_used_this_month + $${paramIndex}`)
      params.push(tokensUsed)
      paramIndex++
    }

    if (grantsUsed !== undefined) {
      updates.push(`grants_used_this_month = grants_used_this_month + $${paramIndex}`)
      params.push(grantsUsed)
      paramIndex++
    }

    if (updates.length > 0) {
      const query = `
        UPDATE subscriptions 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE org_id = $1 AND status = 'active'
      `
      await this.db.query(query, params)
    }
  }

  async resetMonthlyUsage(orgId: string): Promise<void> {
    await this.db.query(`
      UPDATE subscriptions 
      SET tokens_used_this_month = 0, grants_used_this_month = 0, updated_at = NOW()
      WHERE org_id = $1 AND status = 'active'
    `, [orgId])
  }

  async checkSubscriptionLimits(orgId: string): Promise<{
    tokens_available: number
    grants_available: number
    is_within_limits: boolean
  }> {
    const subscription = await this.findSubscription(orgId)
    
    if (!subscription || subscription.status !== 'active') {
      return {
        tokens_available: 0,
        grants_available: 0,
        is_within_limits: false
      }
    }

    const tokensAvailable = (subscription.monthly_token_limit || 0) - (subscription.tokens_used_this_month || 0)
    const grantsAvailable = (subscription.monthly_grants_limit || 0) - (subscription.grants_used_this_month || 0)

    return {
      tokens_available: Math.max(0, tokensAvailable),
      grants_available: Math.max(0, grantsAvailable),
      is_within_limits: tokensAvailable > 0 && grantsAvailable > 0
    }
  }

  // Authentication helpers
  async authenticateUser(email: string): Promise<User | null> {
    const user = await this.findUserByEmail(email)
    
    if (user && user.is_active) {
      await this.updateLastLogin(user.id)
      return user
    }
    
    return null
  }

  async registerUser(
    userData: Omit<User, 'id' | 'created_at' | 'updated_at'>,
    createOrganization?: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
  ): Promise<User> {
    return this.db.transaction(async (client) => {
      let orgId = userData.org_id

      // Create organization if provided
      if (createOrganization) {
        const orgResult = await client.query(`
          INSERT INTO organizations (name, description, website, contact_email, contact_phone, address, profile_data)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          createOrganization.name,
          createOrganization.description,
          createOrganization.website,
          createOrganization.contact_email,
          createOrganization.contact_phone,
          createOrganization.address || {},
          createOrganization.profile_data || {}
        ])
        orgId = orgResult.rows[0].id
      }

      // Create user
      const userResult = await client.query(`
        INSERT INTO users (org_id, email, first_name, last_name, role, auth_provider, auth_provider_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        orgId,
        userData.email,
        userData.first_name,
        userData.last_name,
        userData.role || 'member',
        userData.auth_provider || 'email',
        userData.auth_provider_id,
        userData.is_active !== false
      ])

      const user = userResult.rows[0]

      // Create default notification preferences
      await client.query(`
        INSERT INTO notification_preferences (user_id, email_notifications, push_notifications, deadline_reminders, new_grants, submission_updates, weekly_digest)
        VALUES ($1, true, true, true, true, true, true)
      `, [user.id])

      return user
    })
  }
}