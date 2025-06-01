import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { WebhookRepository } from '../repositories/webhookRepository';
import { WebhookService } from '../services/webhookService';
import { logger } from '../services/logger';

const router = express.Router();
const webhookRepo = new WebhookRepository();
const webhookService = new WebhookService();

/**
 * @swagger
 * components:
 *   schemas:
 *     WebhookConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Webhook configuration ID
 *         org_id:
 *           type: string
 *           format: uuid
 *           description: Organization ID
 *         name:
 *           type: string
 *           description: Webhook name
 *         url:
 *           type: string
 *           format: uri
 *           description: Webhook URL endpoint
 *         events:
 *           type: array
 *           items:
 *             type: string
 *           description: List of events to subscribe to
 *         is_active:
 *           type: boolean
 *           description: Whether webhook is active
 *         secret_key:
 *           type: string
 *           description: Secret key for signature verification
 *         last_triggered_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: Get webhook configurations for organization
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: org_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of webhook configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WebhookConfig'
 */
router.get('/', asyncHandler(async (req, res) => {
  const { org_id } = req.query;

  if (!org_id) {
    return res.status(400).json({
      error: 'Missing organization ID',
      message: 'org_id query parameter is required'
    });
  }

  try {
    const webhooks = await webhookRepo.findWebhookConfigs(org_id as string);
    
    // Don't expose secret keys in response
    const safeWebhooks = webhooks.map(webhook => ({
      ...webhook,
      secret_key: webhook.secret_key ? '****' : undefined
    }));

    res.json({
      webhooks: safeWebhooks
    });
  } catch (error) {
    logger.error('Error fetching webhooks', { error, org_id });
    throw error;
  }
}));

/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Create new webhook configuration
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - org_id
 *               - name
 *               - url
 *               - events
 *             properties:
 *               org_id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [new_grant_match, deadline_reminder, submission_update, new_grants_discovered]
 *               secret_key:
 *                 type: string
 *     responses:
 *       201:
 *         description: Webhook configuration created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookConfig'
 */
router.post('/', asyncHandler(async (req, res) => {
  const { org_id, name, url, events, secret_key } = req.body;

  // Validation
  if (!org_id || !name || !url || !events) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'org_id, name, url, and events are required'
    });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({
      error: 'Invalid events',
      message: 'events must be a non-empty array'
    });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'url must be a valid HTTP/HTTPS URL'
    });
  }

  // Validate event types
  const validEvents = ['new_grant_match', 'deadline_reminder', 'submission_update', 'new_grants_discovered'];
  const invalidEvents = events.filter(event => !validEvents.includes(event));
  if (invalidEvents.length > 0) {
    return res.status(400).json({
      error: 'Invalid event types',
      message: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}`
    });
  }

  try {
    const webhook = await webhookRepo.createWebhookConfig({
      org_id,
      name,
      url,
      events,
      secret_key,
      is_active: true
    });

    // Don't expose secret key in response
    const safeWebhook = {
      ...webhook,
      secret_key: webhook.secret_key ? '****' : undefined
    };

    res.status(201).json(safeWebhook);
  } catch (error) {
    logger.error('Error creating webhook', { error, org_id, name, url });
    throw error;
  }
}));

/**
 * @swagger
 * /webhooks/{id}:
 *   get:
 *     summary: Get webhook configuration by ID
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Webhook configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookConfig'
 *       404:
 *         description: Webhook not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const webhook = await webhookRepo.findWebhookConfigById(id);

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        message: `Webhook with ID ${id} does not exist`
      });
    }

    // Don't expose secret key in response
    const safeWebhook = {
      ...webhook,
      secret_key: webhook.secret_key ? '****' : undefined
    };

    res.json(safeWebhook);
  } catch (error) {
    logger.error('Error fetching webhook', { error, webhookId: id });
    throw error;
  }
}));

/**
 * @swagger
 * /webhooks/{id}:
 *   put:
 *     summary: Update webhook configuration
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *               secret_key:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook configuration updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookConfig'
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, url, events, is_active, secret_key } = req.body;

  // Validate URL if provided
  if (url) {
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'url must be a valid HTTP/HTTPS URL'
      });
    }
  }

  // Validate events if provided
  if (events) {
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: 'Invalid events',
        message: 'events must be a non-empty array'
      });
    }

    const validEvents = ['new_grant_match', 'deadline_reminder', 'submission_update', 'new_grants_discovered'];
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: 'Invalid event types',
        message: `Invalid events: ${invalidEvents.join(', ')}`
      });
    }
  }

  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (secret_key !== undefined) updateData.secret_key = secret_key;

    const webhook = await webhookRepo.updateWebhookConfig(id, updateData);

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        message: `Webhook with ID ${id} does not exist`
      });
    }

    // Don't expose secret key in response
    const safeWebhook = {
      ...webhook,
      secret_key: webhook.secret_key ? '****' : undefined
    };

    res.json(safeWebhook);
  } catch (error) {
    logger.error('Error updating webhook', { error, webhookId: id });
    throw error;
  }
}));

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     summary: Delete webhook configuration
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Webhook deleted successfully
 *       404:
 *         description: Webhook not found
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await webhookRepo.deleteWebhookConfig(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Webhook not found',
        message: `Webhook with ID ${id} does not exist`
      });
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting webhook', { error, webhookId: id });
    throw error;
  }
}));

/**
 * @swagger
 * /webhooks/{id}/test:
 *   post:
 *     summary: Test webhook configuration
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Test webhook sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const webhook = await webhookRepo.findWebhookConfigById(id);

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        message: `Webhook with ID ${id} does not exist`
      });
    }

    await webhookService.testWebhook(id);

    res.json({
      message: 'Test webhook sent successfully'
    });
  } catch (error) {
    logger.error('Error testing webhook', { error, webhookId: id });
    throw error;
  }
}));

/**
 * @swagger
 * /webhooks/{id}/deliveries:
 *   get:
 *     summary: Get webhook delivery history
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, delivered, failed]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Webhook delivery history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveries:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/:id/deliveries', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, limit = 50 } = req.query;

  try {
    const webhook = await webhookRepo.findWebhookConfigById(id);

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        message: `Webhook with ID ${id} does not exist`
      });
    }

    const deliveries = await webhookRepo.findWebhookDeliveries(
      id,
      status as string,
      Number(limit)
    );

    res.json({
      deliveries,
      count: deliveries.length
    });
  } catch (error) {
    logger.error('Error fetching webhook deliveries', { error, webhookId: id });
    throw error;
  }
}));

/**
 * @swagger
 * /webhooks/{id}/stats:
 *   get:
 *     summary: Get webhook delivery statistics
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Webhook delivery statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 delivered:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *                 pending:
 *                   type: integer
 *                 success_rate:
 *                   type: number
 */
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const webhook = await webhookRepo.findWebhookConfigById(id);

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
        message: `Webhook with ID ${id} does not exist`
      });
    }

    const stats = await webhookService.getWebhookStats(id);

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching webhook stats', { error, webhookId: id });
    throw error;
  }
}));

export default router;