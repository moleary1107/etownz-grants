import axios from 'axios'
import crypto from 'crypto'
import { WebhookRepository, WebhookConfig, WebhookDelivery } from '../repositories/webhookRepository'
import { GrantsRepository } from '../repositories/grantsRepository'
import { logger } from './logger'

export interface WebhookEvent {
  event_type: string
  data: Record<string, any>
  org_id?: string
  user_id?: string
  timestamp: Date
}

export class WebhookService {
  private webhookRepo: WebhookRepository
  private grantsRepo: GrantsRepository

  constructor() {
    this.webhookRepo = new WebhookRepository()
    this.grantsRepo = new GrantsRepository()
  }

  async triggerEvent(event: WebhookEvent): Promise<void> {
    try {
      // Find webhook configurations for this event type and organization
      const webhooks = await this.webhookRepo.findWebhookConfigsByEvent(
        event.event_type,
        event.org_id
      )

      if (webhooks.length === 0) {
        logger.debug('No webhook configurations found for event', {
          event_type: event.event_type,
          org_id: event.org_id
        })
        return
      }

      // Create deliveries for each webhook
      const deliveryPromises = webhooks.map(webhook => 
        this.createDelivery(webhook, event)
      )

      await Promise.all(deliveryPromises)

      logger.info('Webhook event triggered', {
        event_type: event.event_type,
        webhook_count: webhooks.length,
        org_id: event.org_id
      })
    } catch (error) {
      logger.error('Error triggering webhook event', {
        error,
        event_type: event.event_type,
        org_id: event.org_id
      })
    }
  }

  private async createDelivery(webhook: WebhookConfig, event: WebhookEvent): Promise<void> {
    try {
      const payload = {
        event_type: event.event_type,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
        webhook: {
          id: webhook.id,
          name: webhook.name
        }
      }

      const delivery = await this.webhookRepo.createWebhookDelivery({
        webhook_config_id: webhook.id,
        event_type: event.event_type,
        payload,
        status: 'pending',
        attempt_count: 0
      })

      // Attempt immediate delivery
      await this.deliverWebhook(delivery, webhook)

    } catch (error) {
      logger.error('Error creating webhook delivery', {
        error,
        webhook_id: webhook.id,
        event_type: event.event_type
      })
    }
  }

  async deliverWebhook(delivery: WebhookDelivery, config?: WebhookConfig): Promise<void> {
    if (!config) {
      const foundConfig = await this.webhookRepo.findWebhookConfigById(delivery.webhook_config_id)
      if (!foundConfig) {
        logger.error('Webhook configuration not found', {
          delivery_id: delivery.id,
          webhook_config_id: delivery.webhook_config_id
        })
        return
      }
      config = foundConfig
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'eTownz-Grants-Webhook/1.0'
      }

      // Add signature if secret key is configured
      if (config.secret_key) {
        const signature = this.generateSignature(delivery.payload, config.secret_key)
        headers['X-Webhook-Signature'] = signature
      }

      const response = await axios.post(config.url, delivery.payload, {
        headers,
        timeout: 10000, // 10 seconds
        maxRedirects: 0,
        validateStatus: (status) => status < 500 // Consider 4xx as success (client error, not our fault)
      })

      // Mark as delivered
      await this.webhookRepo.markDeliverySuccess(
        delivery.id,
        response.status,
        response.data ? JSON.stringify(response.data).substring(0, 1000) : undefined
      )

      // Update webhook last triggered
      await this.webhookRepo.updateLastTriggered(config.id)

      logger.info('Webhook delivered successfully', {
        delivery_id: delivery.id,
        webhook_url: config.url,
        status: response.status,
        event_type: delivery.event_type
      })

    } catch (error) {
      let responseStatus: number | undefined
      let responseBody: string | undefined

      if (axios.isAxiosError(error)) {
        responseStatus = error.response?.status
        responseBody = error.response?.data ? 
          JSON.stringify(error.response.data).substring(0, 1000) : 
          error.message
      } else {
        responseBody = error instanceof Error ? error.message : 'Unknown error'
      }

      // Calculate next retry time (exponential backoff)
      const nextRetryAt = this.calculateNextRetry(delivery.attempt_count || 0)

      await this.webhookRepo.markDeliveryFailed(
        delivery.id,
        responseStatus,
        responseBody,
        nextRetryAt
      )

      logger.warn('Webhook delivery failed', {
        delivery_id: delivery.id,
        webhook_url: config.url,
        attempt: delivery.attempt_count || 0,
        next_retry: nextRetryAt,
        error: responseBody
      })
    }
  }

  private generateSignature(payload: Record<string, any>, secret: string): string {
    const payloadString = JSON.stringify(payload)
    return 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')
  }

  private calculateNextRetry(attemptCount: number): Date | undefined {
    if (attemptCount >= 4) {
      return undefined // Max retries reached
    }

    // Exponential backoff: 1m, 5m, 30m, 2h
    const delays = [60, 300, 1800, 7200] // seconds
    const delaySeconds = delays[attemptCount] || 7200

    const nextRetry = new Date()
    nextRetry.setSeconds(nextRetry.getSeconds() + delaySeconds)
    return nextRetry
  }

  async processRetries(): Promise<void> {
    try {
      const failedDeliveries = await this.webhookRepo.getDeliveriesForRetry()
      
      if (failedDeliveries.length === 0) {
        return
      }

      logger.info('Processing webhook retries', { count: failedDeliveries.length })

      for (const delivery of failedDeliveries) {
        await this.deliverWebhook(delivery)
        // Small delay between retries to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100))
      }

    } catch (error) {
      logger.error('Error processing webhook retries', { error })
    }
  }

  // Event-specific methods
  async notifyNewGrantMatch(orgId: string, grantId: string, matchScore: number): Promise<void> {
    try {
      const grant = await this.grantsRepo.findGrantById(grantId)
      if (!grant) {
        logger.warn('Grant not found for webhook notification', { grantId })
        return
      }

      await this.triggerEvent({
        event_type: 'new_grant_match',
        org_id: orgId,
        timestamp: new Date(),
        data: {
          grant: {
            id: grant.id,
            title: grant.title,
            funder: grant.funder,
            deadline: grant.deadline,
            amount_min: grant.amount_min,
            amount_max: grant.amount_max,
            url: grant.url
          },
          match_score: matchScore,
          message: `New grant match found: ${grant.title}`
        }
      })
    } catch (error) {
      logger.error('Error sending new grant match notification', {
        error,
        orgId,
        grantId
      })
    }
  }

  async notifyDeadlineReminder(orgId: string, grantId: string, daysUntilDeadline: number): Promise<void> {
    try {
      const grant = await this.grantsRepo.findGrantById(grantId)
      if (!grant) {
        logger.warn('Grant not found for deadline reminder', { grantId })
        return
      }

      await this.triggerEvent({
        event_type: 'deadline_reminder',
        org_id: orgId,
        timestamp: new Date(),
        data: {
          grant: {
            id: grant.id,
            title: grant.title,
            funder: grant.funder,
            deadline: grant.deadline,
            url: grant.url
          },
          days_until_deadline: daysUntilDeadline,
          message: `Grant deadline approaching: ${grant.title} (${daysUntilDeadline} days remaining)`
        }
      })
    } catch (error) {
      logger.error('Error sending deadline reminder', {
        error,
        orgId,
        grantId,
        daysUntilDeadline
      })
    }
  }

  async notifySubmissionUpdate(orgId: string, submissionId: string, status: string): Promise<void> {
    try {
      await this.triggerEvent({
        event_type: 'submission_update',
        org_id: orgId,
        timestamp: new Date(),
        data: {
          submission_id: submissionId,
          new_status: status,
          message: `Grant submission status updated: ${status}`
        }
      })
    } catch (error) {
      logger.error('Error sending submission update notification', {
        error,
        orgId,
        submissionId,
        status
      })
    }
  }

  async notifyNewGrantsDiscovered(sourceId: string, count: number): Promise<void> {
    try {
      await this.triggerEvent({
        event_type: 'new_grants_discovered',
        timestamp: new Date(),
        data: {
          source_id: sourceId,
          grants_count: count,
          message: `${count} new grants discovered from crawler`
        }
      })
    } catch (error) {
      logger.error('Error sending new grants discovered notification', {
        error,
        sourceId,
        count
      })
    }
  }

  // Statistics and management
  async getWebhookStats(webhookConfigId?: string): Promise<any> {
    return this.webhookRepo.getDeliveryStats(webhookConfigId)
  }

  async cleanupOldDeliveries(daysOld: number = 30): Promise<number> {
    return this.webhookRepo.deleteOldDeliveries(daysOld)
  }

  async testWebhook(webhookId: string): Promise<void> {
    const delivery = await this.webhookRepo.testWebhookConfig(webhookId)
    await this.deliverWebhook(delivery)
  }
}