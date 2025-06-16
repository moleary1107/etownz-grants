import { pool } from '../config/database';
import { logger } from './logger';
import { EventEmitter } from 'events';

export interface CrawlAlert {
  id: string;
  sourceId: string;
  sourceName: string;
  alertType: 'failure' | 'timeout' | 'low_success_rate' | 'no_recent_crawls';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface MonitoringRule {
  id: string;
  name: string;
  ruleType: 'failure_threshold' | 'timeout_threshold' | 'success_rate' | 'no_recent_crawls';
  enabled: boolean;
  parameters: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class CrawlMonitoringService extends EventEmitter {
  private alertThresholds = {
    consecutiveFailures: 3,
    successRateThreshold: 0.7, // 70%
    noRecentCrawlsHours: 48,
    maxCrawlDurationMinutes: 30
  };

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  private async initializeDefaultRules(): Promise<void> {
    try {
      // Check if default rules exist
      const existingRules = await this.getMonitoringRules();
      if (existingRules.length > 0) {
        return; // Rules already exist
      }

      // Create default monitoring rules
      const defaultRules = [
        {
          name: 'Consecutive Failures Alert',
          ruleType: 'failure_threshold',
          enabled: true,
          parameters: {
            maxConsecutiveFailures: 3,
            alertSeverity: 'high'
          }
        },
        {
          name: 'Low Success Rate Alert', 
          ruleType: 'success_rate',
          enabled: true,
          parameters: {
            minSuccessRate: 0.7,
            evaluationPeriodDays: 7,
            alertSeverity: 'medium'
          }
        },
        {
          name: 'No Recent Crawls Alert',
          ruleType: 'no_recent_crawls',
          enabled: true,
          parameters: {
            maxHoursSinceLastCrawl: 48,
            alertSeverity: 'medium'
          }
        },
        {
          name: 'Crawl Timeout Alert',
          ruleType: 'timeout_threshold',
          enabled: true,
          parameters: {
            maxDurationMinutes: 30,
            alertSeverity: 'high'
          }
        }
      ];

      for (const rule of defaultRules) {
        await this.createMonitoringRule(rule);
      }

      logger.info('Default monitoring rules initialized');
    } catch (error) {
      logger.error('Failed to initialize default monitoring rules', { error });
    }
  }

  async createMonitoringRule(rule: Omit<MonitoringRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const result = await pool.query(`
        INSERT INTO crawl_monitoring_rules (
          name, rule_type, enabled, parameters
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [rule.name, rule.ruleType, rule.enabled, JSON.stringify(rule.parameters)]);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to create monitoring rule', { rule, error });
      throw error;
    }
  }

  async getMonitoringRules(): Promise<MonitoringRule[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id, name, rule_type as "ruleType", enabled, parameters,
          created_at as "createdAt", updated_at as "updatedAt"
        FROM crawl_monitoring_rules
        ORDER BY created_at DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch monitoring rules', { error });
      throw error;
    }
  }

  async checkAllSources(): Promise<CrawlAlert[]> {
    try {
      logger.info('Running crawl monitoring checks');
      
      const alerts: CrawlAlert[] = [];
      const rules = await this.getMonitoringRules();
      const enabledRules = rules.filter(rule => rule.enabled);

      for (const rule of enabledRules) {
        const ruleAlerts = await this.applyMonitoringRule(rule);
        alerts.push(...ruleAlerts);
      }

      // Save alerts to database
      for (const alert of alerts) {
        await this.saveAlert(alert);
      }

      if (alerts.length > 0) {
        logger.warn(`Generated ${alerts.length} crawl monitoring alerts`);
        this.emit('alertsGenerated', alerts);
      }

      return alerts;
    } catch (error) {
      logger.error('Failed to check crawl monitoring', { error });
      throw error;
    }
  }

  private async applyMonitoringRule(rule: MonitoringRule): Promise<CrawlAlert[]> {
    const alerts: CrawlAlert[] = [];

    try {
      switch (rule.ruleType) {
        case 'failure_threshold':
          alerts.push(...await this.checkConsecutiveFailures(rule));
          break;
        case 'success_rate':
          alerts.push(...await this.checkSuccessRate(rule));
          break;
        case 'no_recent_crawls':
          alerts.push(...await this.checkNoRecentCrawls(rule));
          break;
        case 'timeout_threshold':
          alerts.push(...await this.checkTimeouts(rule));
          break;
      }
    } catch (error) {
      logger.error('Failed to apply monitoring rule', { rule: rule.name, error });
    }

    return alerts;
  }

  private async checkConsecutiveFailures(rule: MonitoringRule): Promise<CrawlAlert[]> {
    const { maxConsecutiveFailures, alertSeverity } = rule.parameters;
    const alerts: CrawlAlert[] = [];

    try {
      const result = await pool.query(`
        WITH consecutive_failures AS (
          SELECT 
            gs.id as source_id,
            gs.name as source_name,
            COUNT(*) as consecutive_failures
          FROM grant_sources gs
          JOIN crawl_monitoring cm ON gs.id = cm.source_id
          WHERE cm.status = 'failed' 
            AND cm.started_at > NOW() - INTERVAL '24 hours'
            AND gs.is_active = true
          GROUP BY gs.id, gs.name
          HAVING COUNT(*) >= $1
        )
        SELECT * FROM consecutive_failures
      `, [maxConsecutiveFailures]);

      for (const row of result.rows) {
        alerts.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          sourceId: row.source_id,
          sourceName: row.source_name,
          alertType: 'failure',
          severity: alertSeverity,
          message: `${row.consecutive_failures} consecutive crawl failures detected`,
          details: {
            consecutiveFailures: row.consecutive_failures,
            threshold: maxConsecutiveFailures
          },
          createdAt: new Date(),
          acknowledged: false
        });
      }
    } catch (error) {
      logger.error('Failed to check consecutive failures', { error });
    }

    return alerts;
  }

  private async checkSuccessRate(rule: MonitoringRule): Promise<CrawlAlert[]> {
    const { minSuccessRate, evaluationPeriodDays, alertSeverity } = rule.parameters;
    const alerts: CrawlAlert[] = [];

    try {
      const result = await pool.query(`
        WITH success_rates AS (
          SELECT 
            gs.id as source_id,
            gs.name as source_name,
            COUNT(*) as total_crawls,
            COUNT(CASE WHEN cm.status = 'completed' THEN 1 END) as successful_crawls,
            CAST(COUNT(CASE WHEN cm.status = 'completed' THEN 1 END) AS FLOAT) / COUNT(*) as success_rate
          FROM grant_sources gs
          JOIN crawl_monitoring cm ON gs.id = cm.source_id
          WHERE cm.started_at > NOW() - INTERVAL '${evaluationPeriodDays} days'
            AND gs.is_active = true
          GROUP BY gs.id, gs.name
          HAVING COUNT(*) >= 5 -- Require at least 5 crawls for meaningful rate
        )
        SELECT * FROM success_rates WHERE success_rate < $1
      `, [minSuccessRate]);

      for (const row of result.rows) {
        alerts.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          sourceId: row.source_id,
          sourceName: row.source_name,
          alertType: 'low_success_rate',
          severity: alertSeverity,
          message: `Low success rate: ${(row.success_rate * 100).toFixed(1)}%`,
          details: {
            successRate: row.success_rate,
            totalCrawls: row.total_crawls,
            successfulCrawls: row.successful_crawls,
            threshold: minSuccessRate,
            evaluationPeriodDays
          },
          createdAt: new Date(),
          acknowledged: false
        });
      }
    } catch (error) {
      logger.error('Failed to check success rates', { error });
    }

    return alerts;
  }

  private async checkNoRecentCrawls(rule: MonitoringRule): Promise<CrawlAlert[]> {
    const { maxHoursSinceLastCrawl, alertSeverity } = rule.parameters;
    const alerts: CrawlAlert[] = [];

    try {
      const result = await pool.query(`
        SELECT 
          gs.id as source_id,
          gs.name as source_name,
          gs.last_crawled,
          EXTRACT(EPOCH FROM (NOW() - gs.last_crawled)) / 3600 as hours_since_last_crawl
        FROM grant_sources gs
        WHERE gs.is_active = true
          AND gs.crawl_schedule != 'manual'
          AND (
            gs.last_crawled IS NULL 
            OR gs.last_crawled < NOW() - INTERVAL '${maxHoursSinceLastCrawl} hours'
          )
      `);

      for (const row of result.rows) {
        const hoursSince = row.hours_since_last_crawl || 'never';
        
        alerts.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          sourceId: row.source_id,
          sourceName: row.source_name,
          alertType: 'no_recent_crawls',
          severity: alertSeverity,
          message: `No recent crawls: last crawled ${hoursSince === 'never' ? 'never' : Math.round(hoursSince) + ' hours ago'}`,
          details: {
            lastCrawled: row.last_crawled,
            hoursSinceLastCrawl: hoursSince,
            threshold: maxHoursSinceLastCrawl
          },
          createdAt: new Date(),
          acknowledged: false
        });
      }
    } catch (error) {
      logger.error('Failed to check no recent crawls', { error });
    }

    return alerts;
  }

  private async checkTimeouts(rule: MonitoringRule): Promise<CrawlAlert[]> {
    const { maxDurationMinutes, alertSeverity } = rule.parameters;
    const alerts: CrawlAlert[] = [];

    try {
      const result = await pool.query(`
        SELECT 
          gs.id as source_id,
          gs.name as source_name,
          cm.duration_seconds,
          cm.started_at
        FROM grant_sources gs
        JOIN crawl_monitoring cm ON gs.id = cm.source_id
        WHERE cm.status = 'timeout'
          AND cm.duration_seconds > $1 * 60
          AND cm.started_at > NOW() - INTERVAL '24 hours'
          AND gs.is_active = true
      `, [maxDurationMinutes]);

      for (const row of result.rows) {
        const durationMinutes = Math.round(row.duration_seconds / 60);
        
        alerts.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          sourceId: row.source_id,
          sourceName: row.source_name,
          alertType: 'timeout',
          severity: alertSeverity,
          message: `Crawl timeout: ${durationMinutes} minutes`,
          details: {
            durationMinutes,
            threshold: maxDurationMinutes,
            startedAt: row.started_at
          },
          createdAt: new Date(),
          acknowledged: false
        });
      }
    } catch (error) {
      logger.error('Failed to check timeouts', { error });
    }

    return alerts;
  }

  private async saveAlert(alert: CrawlAlert): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO crawl_alerts (
          source_id, alert_type, severity, message, details, acknowledged
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        alert.sourceId,
        alert.alertType,
        alert.severity,
        alert.message,
        JSON.stringify(alert.details),
        alert.acknowledged
      ]);
    } catch (error) {
      // Ignore duplicate alerts
      if (error.code !== '23505') {
        logger.error('Failed to save alert', { alert, error });
      }
    }
  }

  async getRecentAlerts(limit: number = 50): Promise<CrawlAlert[]> {
    try {
      const result = await pool.query(`
        SELECT 
          ca.id, ca.source_id as "sourceId", gs.name as "sourceName",
          ca.alert_type as "alertType", ca.severity, ca.message, ca.details,
          ca.acknowledged, ca.acknowledged_at as "acknowledgedAt",
          ca.acknowledged_by as "acknowledgedBy", ca.created_at as "createdAt"
        FROM crawl_alerts ca
        JOIN grant_sources gs ON ca.source_id = gs.id
        ORDER BY ca.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch recent alerts', { error });
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      await pool.query(`
        UPDATE crawl_alerts 
        SET 
          acknowledged = true,
          acknowledged_at = NOW(),
          acknowledged_by = $2
        WHERE id = $1
      `, [alertId, acknowledgedBy]);

      logger.info('Alert acknowledged', { alertId, acknowledgedBy });
    } catch (error) {
      logger.error('Failed to acknowledge alert', { alertId, error });
      throw error;
    }
  }

  async getDashboardMetrics(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN acknowledged = false THEN 1 END) as unacknowledged_alerts,
          COUNT(CASE WHEN severity = 'critical' AND acknowledged = false THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN severity = 'high' AND acknowledged = false THEN 1 END) as high_alerts,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as alerts_last_24h
        FROM crawl_alerts
        WHERE created_at > NOW() - INTERVAL '7 days'
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to fetch dashboard metrics', { error });
      throw error;
    }
  }

  async updateAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): Promise<void> {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    logger.info('Alert thresholds updated', { thresholds: this.alertThresholds });
  }

  getAlertThresholds() {
    return { ...this.alertThresholds };
  }
}

export const crawlMonitoringService = new CrawlMonitoringService();
export default CrawlMonitoringService;