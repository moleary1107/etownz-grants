import { BaseRepository } from '../services/database'

export interface WebhookConfig {
  id: string
  org_id: string
  name: string
  url: string
  events: string[]
  is_active?: boolean
  secret_key?: string
  last_triggered_at?: Date
  created_at?: Date
  updated_at?: Date
}

export interface WebhookDelivery {
  id: string
  webhook_config_id: string
  event_type: string
  payload: Record<string, any>
  status?: string
  response_status?: number
  response_body?: string
  attempt_count?: number
  next_retry_at?: Date
  delivered_at?: Date
  created_at?: Date
}

export class WebhookRepository extends BaseRepository {

  // Webhook Configurations
  async findWebhookConfigs(orgId?: string): Promise<WebhookConfig[]> {
    const conditions = orgId ? { org_id: orgId, is_active: true } : { is_active: true }
    return this.findMany<WebhookConfig>('webhook_configs', conditions, 'created_at DESC')
  }

  async findWebhookConfigById(id: string): Promise<WebhookConfig | null> {
    return this.findById<WebhookConfig>('webhook_configs', id)
  }

  async findWebhookConfigsByEvent(eventType: string, orgId?: string): Promise<WebhookConfig[]> {
    let query = 'SELECT * FROM webhook_configs WHERE is_active = true AND $1 = ANY(events)'
    const params: any[] = [eventType]

    if (orgId) {
      query += ' AND org_id = $2'
      params.push(orgId)
    }

    query += ' ORDER BY created_at DESC'

    const result = await this.db.query(query, params)
    return result.rows
  }

  async createWebhookConfig(config: Omit<WebhookConfig, 'id' | 'created_at' | 'updated_at'>): Promise<WebhookConfig> {
    return this.create<WebhookConfig>('webhook_configs', config)
  }

  async updateWebhookConfig(id: string, config: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
    return this.update<WebhookConfig>('webhook_configs', id, config)
  }

  async deleteWebhookConfig(id: string): Promise<boolean> {
    return this.delete('webhook_configs', id)
  }

  async updateLastTriggered(id: string): Promise<void> {
    await this.db.query(
      'UPDATE webhook_configs SET last_triggered_at = NOW() WHERE id = $1',
      [id]
    )
  }

  // Webhook Deliveries
  async findWebhookDeliveries(
    webhookConfigId?: string,
    status?: string,
    limit?: number
  ): Promise<WebhookDelivery[]> {
    let query = 'SELECT * FROM webhook_deliveries WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (webhookConfigId) {
      query += ` AND webhook_config_id = $${paramIndex}`
      params.push(webhookConfigId)
      paramIndex++
    }

    if (status) {
      query += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    query += ' ORDER BY created_at DESC'

    if (limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(limit)
    }

    const result = await this.db.query(query, params)
    return result.rows
  }

  async createWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'created_at'>): Promise<WebhookDelivery> {
    return this.create<WebhookDelivery>('webhook_deliveries', delivery)
  }

  async updateWebhookDelivery(id: string, delivery: Partial<WebhookDelivery>): Promise<WebhookDelivery | null> {
    return this.update<WebhookDelivery>('webhook_deliveries', id, delivery)
  }

  async markDeliverySuccess(id: string, responseStatus: number, responseBody?: string): Promise<void> {
    await this.db.query(`
      UPDATE webhook_deliveries SET
        status = 'delivered',
        response_status = $2,
        response_body = $3,
        delivered_at = NOW()
      WHERE id = $1
    `, [id, responseStatus, responseBody])
  }

  async markDeliveryFailed(
    id: string,
    responseStatus?: number,
    responseBody?: string,
    nextRetryAt?: Date
  ): Promise<void> {
    await this.db.query(`
      UPDATE webhook_deliveries SET
        status = 'failed',
        response_status = $2,
        response_body = $3,
        attempt_count = attempt_count + 1,
        next_retry_at = $4
      WHERE id = $1
    `, [id, responseStatus, responseBody, nextRetryAt])
  }

  async getDeliveriesForRetry(): Promise<WebhookDelivery[]> {
    const result = await this.db.query(`
      SELECT * FROM webhook_deliveries 
      WHERE status = 'failed' 
      AND next_retry_at <= NOW()
      AND attempt_count < 5
      ORDER BY next_retry_at ASC
      LIMIT 100
    `)
    return result.rows
  }

  async getDeliveryStats(webhookConfigId?: string): Promise<{
    total: number
    delivered: number
    failed: number
    pending: number
    success_rate: number
  }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM webhook_deliveries
    `
    const params: any[] = []

    if (webhookConfigId) {
      query += ' WHERE webhook_config_id = $1'
      params.push(webhookConfigId)
    }

    const result = await this.db.query(query, params)
    const stats = result.rows[0]

    const successRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0

    return {
      total: parseInt(stats.total),
      delivered: parseInt(stats.delivered),
      failed: parseInt(stats.failed),
      pending: parseInt(stats.pending),
      success_rate: Math.round(successRate * 100) / 100
    }
  }

  async deleteOldDeliveries(daysOld: number = 30): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM webhook_deliveries WHERE created_at < NOW() - INTERVAL $1',
      [`${daysOld} days`]
    )
    return result.rowCount || 0
  }

  async testWebhookConfig(id: string): Promise<WebhookDelivery> {
    const config = await this.findWebhookConfigById(id)
    if (!config) {
      throw new Error('Webhook configuration not found')
    }

    return this.createWebhookDelivery({
      webhook_config_id: id,
      event_type: 'test',
      payload: {
        message: 'Test webhook delivery',
        timestamp: new Date().toISOString(),
        webhook_config: {
          id: config.id,
          name: config.name,
          url: config.url
        }
      },
      status: 'pending',
      attempt_count: 0
    })
  }
}