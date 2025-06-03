import { logger } from './logger'
import { DatabaseService } from './database'
import { GrantsRepository } from '../repositories/grantsRepository'
import * as sgMail from '@sendgrid/mail'
import { CronJob } from 'cron'
import * as nodemailer from 'nodemailer'

export interface NewsletterSubscription {
  id: string
  user_id?: string
  email: string
  frequency: 'daily' | 'weekly' | 'monthly'
  categories_filter?: string[]
  amount_min?: number
  amount_max?: number
  locations_filter?: string[]
  is_active: boolean
  last_sent_at?: Date
  created_at: Date
  updated_at: Date
}

export interface NewsletterContent {
  subject: string
  preheader: string
  sections: NewsletterSection[]
  recipientCount: number
}

export interface NewsletterSection {
  title: string
  grants: NewsletterGrant[]
}

export interface NewsletterGrant {
  id: string
  title: string
  funder: string
  amount: string
  deadline: string
  coverage: string
  summary: string
  url: string
  isNew?: boolean
  closingSoon?: boolean
}

export class NewsletterService {
  private db: DatabaseService
  private grantsRepo: GrantsRepository
  private cronJobs: Map<string, CronJob> = new Map()
  private emailTransporter?: nodemailer.Transporter

  constructor(db: DatabaseService) {
    this.db = db
    this.grantsRepo = new GrantsRepository()
    
    // Initialize email service
    this.initializeEmailService()

    // Initialize scheduled jobs
    this.initializeScheduledJobs()
  }

  private initializeEmailService() {
    // Initialize SendGrid if available
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      logger.info('Email service initialized with SendGrid')
    } 
    // Otherwise use Elastic Email SMTP
    else if (process.env.ELASTIC_EMAIL_SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.ELASTIC_EMAIL_SMTP_HOST,
        port: parseInt(process.env.ELASTIC_EMAIL_SMTP_PORT || '2525'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.ELASTIC_EMAIL_SMTP_USER,
          pass: process.env.ELASTIC_EMAIL_SMTP_PASS
        }
      })
      logger.info('Email service initialized with Elastic Email SMTP')
    } else {
      logger.warn('No email service configured - newsletters will not be sent')
    }
  }

  /**
   * Initialize cron jobs for automated newsletters
   */
  private initializeScheduledJobs() {
    // Weekly newsletter - Every Monday at 9 AM
    const weeklyJob = new CronJob('0 9 * * 1', async () => {
      logger.info('Running weekly newsletter job')
      await this.sendScheduledNewsletters('weekly')
    })

    // Daily newsletter - Every day at 8 AM
    const dailyJob = new CronJob('0 8 * * *', async () => {
      logger.info('Running daily newsletter job')
      await this.sendScheduledNewsletters('daily')
    })

    // Monthly newsletter - First Monday of each month at 9 AM
    const monthlyJob = new CronJob('0 9 1-7 * 1', async () => {
      logger.info('Running monthly newsletter job')
      await this.sendScheduledNewsletters('monthly')
    })

    this.cronJobs.set('weekly', weeklyJob)
    this.cronJobs.set('daily', dailyJob)
    this.cronJobs.set('monthly', monthlyJob)

    // Start all jobs
    this.cronJobs.forEach(job => job.start())
    
    logger.info('Newsletter cron jobs initialized')
  }

  /**
   * Subscribe user to newsletter
   */
  async subscribe(data: {
    email: string
    userId?: string
    frequency?: 'daily' | 'weekly' | 'monthly'
    categories?: string[]
    amountMin?: number
    amountMax?: number
    locations?: string[]
  }): Promise<NewsletterSubscription> {
    try {
      logger.info('Subscribing to newsletter', { email: data.email, frequency: data.frequency })

      // Check if already subscribed
      const existing = await this.db.query(
        'SELECT * FROM newsletter_subscriptions WHERE email = $1',
        [data.email]
      )

      if (existing.rows.length > 0) {
        // Update existing subscription
        const result = await this.db.query(`
          UPDATE newsletter_subscriptions 
          SET 
            frequency = COALESCE($2, frequency),
            categories_filter = COALESCE($3, categories_filter),
            amount_min = COALESCE($4, amount_min),
            amount_max = COALESCE($5, amount_max),
            locations_filter = COALESCE($6, locations_filter),
            is_active = true,
            updated_at = NOW()
          WHERE email = $1
          RETURNING *
        `, [
          data.email,
          data.frequency || 'weekly',
          data.categories || null,
          data.amountMin || null,
          data.amountMax || null,
          data.locations || null
        ])

        return result.rows[0]
      } else {
        // Create new subscription
        const result = await this.db.query(`
          INSERT INTO newsletter_subscriptions (
            email, user_id, frequency, categories_filter, 
            amount_min, amount_max, locations_filter
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          data.email,
          data.userId || null,
          data.frequency || 'weekly',
          data.categories || null,
          data.amountMin || null,
          data.amountMax || null,
          data.locations || null
        ])

        // Send welcome email
        await this.sendWelcomeEmail(data.email)

        return result.rows[0]
      }
    } catch (error) {
      logger.error('Failed to subscribe to newsletter', { error, email: data.email })
      throw error
    }
  }

  /**
   * Unsubscribe from newsletter
   */
  async unsubscribe(email: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'UPDATE newsletter_subscriptions SET is_active = false WHERE email = $1',
        [email]
      )

      return (result.rowCount || 0) > 0
    } catch (error) {
      logger.error('Failed to unsubscribe from newsletter', { error, email })
      throw error
    }
  }

  /**
   * Send scheduled newsletters
   */
  async sendScheduledNewsletters(frequency: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      logger.info('Sending scheduled newsletters', { frequency })

      // Get active subscriptions for this frequency
      const subscriptions = await this.getActiveSubscriptions(frequency)
      
      if (subscriptions.length === 0) {
        logger.info('No active subscriptions for frequency', { frequency })
        return
      }

      // Get grants based on frequency
      const grants = await this.getNewsletterGrants(frequency)
      
      if (grants.length === 0) {
        logger.info('No grants to send for frequency', { frequency })
        return
      }

      // Group subscriptions by filter criteria to optimize sending
      const groups = this.groupSubscriptionsByFilters(subscriptions)

      // Send newsletters to each group
      for (const group of groups) {
        const filteredGrants = this.filterGrantsForGroup(grants, group.filters)
        
        if (filteredGrants.length > 0) {
          await this.sendNewsletterToGroup(group.emails, filteredGrants, frequency)
          
          // Update last sent timestamp
          await this.updateLastSent(group.emails)
        }
      }

      logger.info('Scheduled newsletters sent successfully', { 
        frequency, 
        recipientCount: subscriptions.length 
      })
    } catch (error) {
      logger.error('Failed to send scheduled newsletters', { error, frequency })
    }
  }

  /**
   * Send newsletter to specific users
   */
  async sendNewsletter(
    emails: string[],
    options?: {
      categories?: string[]
      preview?: boolean
    }
  ): Promise<NewsletterContent> {
    try {
      // Get grants for newsletter
      const grants = await this.getNewsletterGrants('weekly')
      
      // Filter by categories if specified
      let filteredGrants = grants
      if (options?.categories?.length) {
        filteredGrants = grants.filter(grant => 
          grant.categories?.some(cat => options.categories!.includes(cat))
        )
      }

      // Prepare content
      const content = this.prepareNewsletterContent(filteredGrants, emails.length)

      // Send or preview
      if (!options?.preview) {
        await this.sendEmail(emails, content)
      }

      return content
    } catch (error) {
      logger.error('Failed to send newsletter', { error, emailCount: emails.length })
      throw error
    }
  }

  /**
   * Get active subscriptions by frequency
   */
  private async getActiveSubscriptions(frequency: string): Promise<NewsletterSubscription[]> {
    const result = await this.db.query(`
      SELECT * FROM newsletter_subscriptions 
      WHERE is_active = true AND frequency = $1
      AND (last_sent_at IS NULL OR last_sent_at < NOW() - INTERVAL '1 ${frequency}')
    `, [frequency])

    return result.rows
  }

  /**
   * Get grants for newsletter based on frequency
   */
  private async getNewsletterGrants(frequency: 'daily' | 'weekly' | 'monthly'): Promise<any[]> {
    const intervals = {
      daily: '1 day',
      weekly: '7 days',
      monthly: '30 days'
    }

    // Get new grants
    const newGrants = await this.db.query(`
      SELECT * FROM grants 
      WHERE is_active = true 
      AND created_at >= NOW() - INTERVAL '${intervals[frequency]}'
      ORDER BY created_at DESC
    `)

    // Get grants closing soon
    const closingSoon = await this.db.query(`
      SELECT * FROM grants 
      WHERE is_active = true 
      AND deadline BETWEEN NOW() AND NOW() + INTERVAL '14 days'
      ORDER BY deadline ASC
    `)

    // Get high-value grants
    const highValue = await this.db.query(`
      SELECT * FROM grants 
      WHERE is_active = true 
      AND amount_max >= 50000
      ORDER BY amount_max DESC
      LIMIT 10
    `)

    return [
      ...newGrants.rows.map(g => ({ ...g, isNew: true })),
      ...closingSoon.rows.map(g => ({ ...g, closingSoon: true })),
      ...highValue.rows
    ]
  }

  /**
   * Group subscriptions by filter criteria
   */
  private groupSubscriptionsByFilters(subscriptions: NewsletterSubscription[]): any[] {
    const groups = new Map<string, { filters: any; emails: string[] }>()

    for (const sub of subscriptions) {
      const key = JSON.stringify({
        categories: sub.categories_filter || [],
        amountMin: sub.amount_min,
        amountMax: sub.amount_max,
        locations: sub.locations_filter || []
      })

      if (!groups.has(key)) {
        groups.set(key, {
          filters: {
            categories: sub.categories_filter,
            amountMin: sub.amount_min,
            amountMax: sub.amount_max,
            locations: sub.locations_filter
          },
          emails: []
        })
      }

      groups.get(key)!.emails.push(sub.email)
    }

    return Array.from(groups.values())
  }

  /**
   * Filter grants based on group criteria
   */
  private filterGrantsForGroup(grants: any[], filters: any): any[] {
    return grants.filter(grant => {
      // Category filter
      if (filters.categories?.length && !grant.categories?.some((cat: string) => 
        filters.categories.includes(cat)
      )) {
        return false
      }

      // Amount filter
      if (filters.amountMin && grant.amount_max < filters.amountMin) {
        return false
      }
      if (filters.amountMax && grant.amount_min > filters.amountMax) {
        return false
      }

      // Location filter
      if (filters.locations?.length && !grant.location_specific?.some((loc: string) =>
        filters.locations.includes(loc)
      )) {
        return false
      }

      return true
    })
  }

  /**
   * Prepare newsletter content
   */
  private prepareNewsletterContent(grants: any[], recipientCount: number): NewsletterContent {
    const newGrants = grants.filter(g => g.isNew)
    const closingSoon = grants.filter(g => g.closingSoon)
    const otherGrants = grants.filter(g => !g.isNew && !g.closingSoon)

    const sections: NewsletterSection[] = []

    if (newGrants.length > 0) {
      sections.push({
        title: '🆕 New Grant Opportunities',
        grants: newGrants.slice(0, 5).map(g => this.formatGrant(g))
      })
    }

    if (closingSoon.length > 0) {
      sections.push({
        title: '⏰ Closing Soon',
        grants: closingSoon.slice(0, 5).map(g => this.formatGrant(g))
      })
    }

    if (otherGrants.length > 0) {
      sections.push({
        title: '💰 Featured Grants',
        grants: otherGrants.slice(0, 5).map(g => this.formatGrant(g))
      })
    }

    return {
      subject: `${sections[0]?.grants.length || 0} New Grant Opportunities This Week`,
      preheader: 'Your weekly digest of grant opportunities in Ireland',
      sections,
      recipientCount
    }
  }

  /**
   * Format grant for newsletter
   */
  private formatGrant(grant: any): NewsletterGrant {
    const amount = grant.amount_max 
      ? `€${grant.amount_min?.toLocaleString() || 0} - €${grant.amount_max.toLocaleString()}`
      : grant.amount_min 
        ? `Up to €${grant.amount_min.toLocaleString()}`
        : 'Amount varies'

    const deadline = grant.deadline
      ? new Date(grant.deadline).toLocaleDateString('en-IE', { 
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : grant.is_rolling_deadline 
        ? 'Rolling deadline'
        : 'Check website'

    const coverage = grant.coverage_percentage
      ? `${grant.coverage_percentage}% funding`
      : '100% funding'

    return {
      id: grant.id,
      title: grant.title,
      funder: grant.funder || 'Unknown',
      amount,
      deadline,
      coverage,
      summary: grant.summary || grant.description?.substring(0, 200) + '...' || '',
      url: grant.url || `https://grants.etownz.com/grants/${grant.id}`,
      isNew: grant.isNew,
      closingSoon: grant.closingSoon
    }
  }

  /**
   * Send newsletter email
   */
  private async sendEmail(emails: string[], content: NewsletterContent): Promise<void> {
    const html = this.generateEmailHTML(content)
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.ELASTIC_EMAIL_FROM_EMAIL || 'noreply@etownz.com'

    // Use SendGrid if available
    if (process.env.SENDGRID_API_KEY) {
      await this.sendWithSendGrid(emails, content.subject, html, fromEmail)
    } 
    // Otherwise use Elastic Email SMTP
    else if (this.emailTransporter) {
      await this.sendWithElasticEmail(emails, content.subject, html, fromEmail)
    } else {
      logger.warn('No email service configured, skipping email send')
      return
    }
  }

  private async sendWithSendGrid(emails: string[], subject: string, html: string, fromEmail: string): Promise<void> {
    const msg = {
      to: emails,
      from: fromEmail,
      subject: subject,
      html,
      asm: {
        groupId: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || '0'),
        groupsToDisplay: [parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || '0')]
      },
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    }

    try {
      await sgMail.sendMultiple(msg)
      logger.info('Newsletter sent successfully via SendGrid', { recipientCount: emails.length })
    } catch (error) {
      logger.error('Failed to send newsletter via SendGrid', { error })
      throw error
    }
  }

  private async sendWithElasticEmail(emails: string[], subject: string, html: string, fromEmail: string): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized')
    }

    // Send emails in batches to avoid overwhelming the SMTP server
    const batchSize = 50
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      
      try {
        await this.emailTransporter.sendMail({
          from: fromEmail,
          to: batch.join(','),
          subject: subject,
          html: html,
          headers: {
            'List-Unsubscribe': '<https://grants.etownz.com/newsletter/unsubscribe>'
          }
        })
        
        logger.info('Newsletter batch sent via Elastic Email', { 
          batchNumber: Math.floor(i / batchSize) + 1,
          recipientCount: batch.length 
        })
      } catch (error) {
        logger.error('Failed to send newsletter batch via Elastic Email', { error, batch })
        throw error
      }
    }
  }

  /**
   * Generate email HTML
   */
  private generateEmailHTML(content: NewsletterContent): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
    .section { margin: 30px 0; }
    .grant { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 8px; }
    .grant-title { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
    .grant-meta { color: #666; font-size: 14px; margin: 5px 0; }
    .grant-amount { color: #059669; font-weight: bold; }
    .grant-deadline { color: #dc2626; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>eTownz Grants Newsletter</h1>
      <p>${content.preheader}</p>
    </div>

    ${content.sections.map(section => `
      <div class="section">
        <h2>${section.title}</h2>
        ${section.grants.map(grant => `
          <div class="grant">
            <div class="grant-title">${grant.title}</div>
            <div class="grant-meta">
              <strong>Funder:</strong> ${grant.funder}
            </div>
            <div class="grant-meta grant-amount">
              <strong>Amount:</strong> ${grant.amount} (${grant.coverage})
            </div>
            <div class="grant-meta grant-deadline">
              <strong>Deadline:</strong> ${grant.deadline}
            </div>
            <p>${grant.summary}</p>
            <a href="${grant.url}" class="button">View Details</a>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="footer">
      <p>You're receiving this because you subscribed to eTownz Grants newsletters.</p>
      <p><a href="{{{unsubscribe}}}">Unsubscribe</a> | <a href="https://grants.etownz.com/settings">Update Preferences</a></p>
      <p>&copy; ${new Date().getFullYear()} eTownz. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(email: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to eTownz Grants Newsletter</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563eb;">Welcome to eTownz Grants!</h1>
    <p>Thank you for subscribing to our grant opportunities newsletter.</p>
    <p>You'll now receive regular updates about:</p>
    <ul>
      <li>New grant opportunities matching your interests</li>
      <li>Grants with approaching deadlines</li>
      <li>High-value funding opportunities</li>
      <li>Tips and insights for successful applications</li>
    </ul>
    <p>You can update your preferences or unsubscribe at any time.</p>
    <p>Best regards,<br>The eTownz Grants Team</p>
  </div>
</body>
</html>
    `

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.ELASTIC_EMAIL_FROM_EMAIL || 'noreply@etownz.com'
    const subject = 'Welcome to eTownz Grants Newsletter'

    try {
      if (process.env.SENDGRID_API_KEY) {
        const msg = {
          to: email,
          from: fromEmail,
          subject: subject,
          html
        }
        await sgMail.send(msg)
        logger.info('Welcome email sent via SendGrid', { email })
      } else if (this.emailTransporter) {
        await this.emailTransporter.sendMail({
          from: fromEmail,
          to: email,
          subject: subject,
          html: html
        })
        logger.info('Welcome email sent via Elastic Email', { email })
      }
    } catch (error) {
      logger.error('Failed to send welcome email', { error, email })
    }
  }

  /**
   * Update last sent timestamp
   */
  private async updateLastSent(emails: string[]): Promise<void> {
    await this.db.query(
      'UPDATE newsletter_subscriptions SET last_sent_at = NOW() WHERE email = ANY($1)',
      [emails]
    )
  }

  /**
   * Send newsletter to group
   */
  private async sendNewsletterToGroup(
    emails: string[],
    grants: any[],
    frequency: string
  ): Promise<void> {
    const content = this.prepareNewsletterContent(grants, emails.length)
    await this.sendEmail(emails, content)
    
    logger.info('Newsletter sent to group', { 
      emailCount: emails.length, 
      grantCount: grants.length,
      frequency 
    })
  }

  /**
   * Get newsletter stats
   */
  async getStats(): Promise<{
    totalSubscribers: number
    activeSubscribers: number
    byFrequency: Record<string, number>
    recentlySent: number
  }> {
    const stats = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE frequency = 'daily') as daily,
        COUNT(*) FILTER (WHERE frequency = 'weekly') as weekly,
        COUNT(*) FILTER (WHERE frequency = 'monthly') as monthly,
        COUNT(*) FILTER (WHERE last_sent_at > NOW() - INTERVAL '7 days') as recent
      FROM newsletter_subscriptions
    `)

    const row = stats.rows[0]
    return {
      totalSubscribers: parseInt(row.total),
      activeSubscribers: parseInt(row.active),
      byFrequency: {
        daily: parseInt(row.daily),
        weekly: parseInt(row.weekly),
        monthly: parseInt(row.monthly)
      },
      recentlySent: parseInt(row.recent)
    }
  }
}