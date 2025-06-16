/// <reference types="node" />
import { logger } from './logger';
import { DatabaseService } from './database';
import AICostManagementService from './aiCostManagementService';
import AILoadBalancerService from './aiLoadBalancerService';

export interface AIMetric {
  id: string;
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
  source: string;
}

export interface AIAlert {
  id: string;
  alertName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: string;
  currentValue: number;
  threshold: number;
  status: 'firing' | 'resolved';
  firedAt: Date;
  resolvedAt?: Date;
  description: string;
  actions: string[];
}

export interface AIPerformanceDashboard {
  overview: {
    totalRequests: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  providers: {
    id: string;
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    requests: number;
    cost: number;
    responseTime: number;
    errorRate: number;
  }[];
  models: {
    model: string;
    requests: number;
    cost: number;
    averageTokens: number;
    successRate: number;
  }[];
  operations: {
    operation: string;
    requests: number;
    cost: number;
    averageLatency: number;
    errorRate: number;
  }[];
  trends: {
    hourly: { time: string; requests: number; cost: number; errors: number }[];
    daily: { date: string; requests: number; cost: number; errors: number }[];
  };
  alerts: AIAlert[];
  recommendations: {
    type: 'cost' | 'performance' | 'reliability';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact: string;
    action: string;
  }[];
}

export interface MonitoringConfiguration {
  enableRealTimeMetrics: boolean;
  enableAlerts: boolean;
  enablePerformanceLogging: boolean;
  metricsRetentionDays: number;
  alertingWebhookUrl?: string;
  samplingRate: number; // 0.0 to 1.0
  customMetrics: {
    name: string;
    query: string;
    threshold?: number;
  }[];
}

export class AIMonitoringService {
  private db: DatabaseService;
  private costManager: AICostManagementService;
  private loadBalancer: AILoadBalancerService;
  private config: MonitoringConfiguration;
  private metricsBuffer: AIMetric[] = [];
  private alertsCache: Map<string, AIAlert> = new Map();
  private metricsCollectionInterval: NodeJS.Timer | null = null;
  private alertCheckInterval: NodeJS.Timer | null = null;

  constructor() {
    this.db = new DatabaseService();
    this.costManager = new AICostManagementService();
    this.loadBalancer = new AILoadBalancerService();
    this.config = this.loadConfiguration();
    this.initializeService();
  }

  private loadConfiguration(): MonitoringConfiguration {
    return {
      enableRealTimeMetrics: process.env.AI_MONITORING_REAL_TIME === 'true',
      enableAlerts: process.env.AI_MONITORING_ALERTS === 'true',
      enablePerformanceLogging: process.env.AI_MONITORING_PERFORMANCE === 'true',
      metricsRetentionDays: parseInt(process.env.AI_MONITORING_RETENTION_DAYS || '30'),
      alertingWebhookUrl: process.env.AI_MONITORING_WEBHOOK_URL,
      samplingRate: parseFloat(process.env.AI_MONITORING_SAMPLING_RATE || '1.0'),
      customMetrics: []
    };
  }

  private async initializeService(): Promise<void> {
    try {
      await this.createTablesIfNotExist();
      await this.loadActiveAlerts();
      this.startMetricsCollection();
      this.startAlertChecking();
      logger.info('AI Monitoring Service initialized');
    } catch (error) {
      logger.error('Failed to initialize AI Monitoring Service:', error);
      throw error;
    }
  }

  private async createTablesIfNotExist(): Promise<void> {
    // Tables are now created by migrations, just check if they exist
    try {
      await this.db.query('SELECT 1 FROM ai_metrics LIMIT 1');
      await this.db.query('SELECT 1 FROM ai_alerts LIMIT 1');
      await this.db.query('SELECT 1 FROM ai_dashboard_cache LIMIT 1');
    } catch (error) {
      logger.warn('AI Monitoring tables not found. Please run migrations.');
    }
  }

  /**
   * Record a custom metric
   */
  async recordMetric(metric: Omit<AIMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Apply sampling rate
      if (Math.random() > this.config.samplingRate) {
        return;
      }

      const fullMetric: AIMetric = {
        ...metric,
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      if (this.config.enableRealTimeMetrics) {
        // Add to buffer for batch processing
        this.metricsBuffer.push(fullMetric);
        
        // If buffer is full, flush it
        if (this.metricsBuffer.length >= 100) {
          await this.flushMetricsBuffer();
        }
      }
    } catch (error) {
      logger.error('Failed to record metric:', error);
    }
  }

  /**
   * Get AI performance dashboard data
   */
  async getPerformanceDashboard(
    timeRange: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<AIPerformanceDashboard> {
    try {
      const cacheKey = `dashboard_${timeRange}`;
      const cached = await this.getCachedDashboard(cacheKey);
      
      if (cached) {
        return cached;
      }

      const dashboard = await this.buildDashboard(timeRange);
      
      // Cache the result for 5 minutes
      await this.cacheDashboard(cacheKey, dashboard, 5 * 60 * 1000);
      
      return dashboard;
    } catch (error) {
      logger.error('Failed to get performance dashboard:', error);
      throw error;
    }
  }

  /**
   * Create a custom alert rule
   */
  async createAlert(alert: {
    alertName: string;
    condition: string;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    actions: string[];
  }): Promise<string> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.db.query(
        `INSERT INTO ai_alerts 
         (id, alert_name, severity, condition_text, current_value, threshold_value, 
          status, fired_at, description, actions) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          alertId,
          alert.alertName,
          alert.severity,
          alert.condition,
          0, // current_value will be updated when alert is checked
          alert.threshold,
          'resolved', // new alerts start as resolved
          new Date(),
          alert.description,
          JSON.stringify(alert.actions)
        ]
      );

      logger.info(`Created alert: ${alert.alertName}`);
      return alertId;
    } catch (error) {
      logger.error('Failed to create alert:', error);
      throw error;
    }
  }

  /**
   * Get real-time AI system health
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    score: number; // 0-100
    checks: {
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value: number;
      threshold: number;
      message: string;
    }[];
    uptime: number;
    lastUpdate: Date;
  }> {
    try {
      const checks = await this.performHealthChecks();
      const failedChecks = checks.filter(c => c.status === 'fail').length;
      const warnChecks = checks.filter(c => c.status === 'warn').length;
      
      let status: 'healthy' | 'degraded' | 'critical';
      let score: number;
      
      if (failedChecks > 0) {
        status = 'critical';
        score = Math.max(0, 50 - (failedChecks * 25));
      } else if (warnChecks > 0) {
        status = 'degraded';
        score = Math.max(50, 100 - (warnChecks * 15));
      } else {
        status = 'healthy';
        score = 100;
      }

      const uptime = await this.calculateUptime();

      return {
        status,
        score,
        checks,
        uptime,
        lastUpdate: new Date()
      };
    } catch (error) {
      logger.error('Failed to get system health:', error);
      throw error;
    }
  }

  /**
   * Get AI usage analytics with advanced filtering
   */
  async getAdvancedAnalytics(filters: {
    timeRange: string;
    providers?: string[];
    models?: string[];
    operations?: string[];
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    metrics?: string[];
  }): Promise<{
    aggregatedMetrics: Record<string, number>;
    timeSeries: { timestamp: string; [key: string]: any }[];
    breakdown: {
      byProvider: Record<string, number>;
      byModel: Record<string, number>;
      byOperation: Record<string, number>;
      byUser: Record<string, number>;
    };
    insights: {
      trend: 'increasing' | 'decreasing' | 'stable';
      anomalies: { timestamp: string; metric: string; value: number; expected: number }[];
      patterns: string[];
    };
  }> {
    try {
      const analytics = await this.buildAdvancedAnalytics(filters);
      return analytics;
    } catch (error) {
      logger.error('Failed to get advanced analytics:', error);
      throw error;
    }
  }

  /**
   * Export metrics data for external analysis
   */
  async exportMetrics(
    format: 'json' | 'csv' | 'prometheus',
    timeRange: string,
    metrics?: string[]
  ): Promise<string> {
    try {
      const data = await this.getMetricsForExport(timeRange, metrics);
      
      switch (format) {
        case 'json':
          return JSON.stringify(data, null, 2);
        case 'csv':
          return this.convertToCSV(data);
        case 'prometheus':
          return this.convertToPrometheus(data);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export metrics:', error);
      throw error;
    }
  }

  // Private helper methods

  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const values = this.metricsBuffer.map(metric => [
        metric.id,
        metric.metricName,
        metric.metricType,
        metric.value,
        JSON.stringify(metric.labels),
        metric.timestamp,
        metric.source
      ]);

      const placeholders = values.map((_, index) => `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`).join(',');
      const query = `INSERT INTO ai_metrics (id, metric_name, metric_type, value, labels, timestamp, source) VALUES ${placeholders}`;
      
      await this.db.query(query, values.flat());
      
      logger.debug(`Flushed ${this.metricsBuffer.length} metrics to database`);
      this.metricsBuffer = [];
    } catch (error) {
      logger.error('Failed to flush metrics buffer:', error);
      // Keep metrics in buffer for retry
    }
  }

  private async buildDashboard(timeRange: string): Promise<AIPerformanceDashboard> {
    const startTime = this.getStartTimeForRange(timeRange);
    const endTime = new Date();

    // Get overview metrics
    const overview = await this.getOverviewMetrics(startTime, endTime);
    
    // Get provider metrics
    const providers = await this.getProviderMetrics(startTime, endTime);
    
    // Get model metrics
    const models = await this.getModelMetrics(startTime, endTime);
    
    // Get operation metrics
    const operations = await this.getOperationMetrics(startTime, endTime);
    
    // Get trends
    const trends = await this.getTrendMetrics(startTime, endTime, timeRange);
    
    // Get active alerts
    const alerts = Array.from(this.alertsCache.values()).filter(alert => alert.status === 'firing');
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(overview, providers, models);

    return {
      overview,
      providers,
      models,
      operations,
      trends,
      alerts,
      recommendations
    };
  }

  private async performHealthChecks(): Promise<Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    value: number;
    threshold: number;
    message: string;
  }>> {
    const checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value: number;
      threshold: number;
      message: string;
    }> = [];

    // Check error rate
    const errorRate = await this.getCurrentErrorRate();
    checks.push({
      name: 'Error Rate',
      status: errorRate < 1 ? 'pass' : errorRate < 5 ? 'warn' : 'fail',
      value: errorRate,
      threshold: 5,
      message: `Current error rate is ${errorRate.toFixed(2)}%`
    });

    // Check average response time
    const responseTime = await this.getCurrentResponseTime();
    checks.push({
      name: 'Response Time',
      status: responseTime < 2000 ? 'pass' : responseTime < 5000 ? 'warn' : 'fail',
      value: responseTime,
      threshold: 5000,
      message: `Average response time is ${responseTime.toFixed(0)}ms`
    });

    // Check queue depth
    const queueDepth = await this.getCurrentQueueDepth();
    checks.push({
      name: 'Queue Depth',
      status: queueDepth < 10 ? 'pass' : queueDepth < 50 ? 'warn' : 'fail',
      value: queueDepth,
      threshold: 50,
      message: `Current queue depth is ${queueDepth}`
    });

    // Check cost rate
    const costRate = await this.getCurrentCostRate();
    checks.push({
      name: 'Cost Rate',
      status: costRate < 100 ? 'pass' : costRate < 500 ? 'warn' : 'fail',
      value: costRate,
      threshold: 500,
      message: `Current cost rate is $${(costRate / 100).toFixed(2)}/hour`
    });

    return checks;
  }

  private getStartTimeForRange(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private async getOverviewMetrics(startTime: Date, endTime: Date): Promise<any> {
    // Implementation would query actual metrics
    return {
      totalRequests: 0,
      totalCost: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: 99.9
    };
  }

  private async getProviderMetrics(startTime: Date, endTime: Date): Promise<any[]> {
    // Implementation would query provider metrics
    return [];
  }

  private async getModelMetrics(startTime: Date, endTime: Date): Promise<any[]> {
    // Implementation would query model metrics
    return [];
  }

  private async getOperationMetrics(startTime: Date, endTime: Date): Promise<any[]> {
    // Implementation would query operation metrics
    return [];
  }

  private async getTrendMetrics(startTime: Date, endTime: Date, timeRange: string): Promise<any> {
    // Implementation would generate trend data
    return {
      hourly: [],
      daily: []
    };
  }

  private async generateRecommendations(overview: any, providers: any[], models: any[]): Promise<any[]> {
    const recommendations: Array<{
      type: 'cost' | 'performance' | 'reliability';
      priority: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      impact: string;
      action: string;
    }> = [];

    // Add cost optimization recommendations
    if (overview.totalCost > 1000) {
      recommendations.push({
        type: 'cost',
        priority: 'high',
        title: 'High AI Usage Cost Detected',
        description: 'Your AI usage costs are higher than normal',
        impact: 'Could save 20-30% on AI costs',
        action: 'Review model selection and enable cost optimization features'
      });
    }

    return recommendations;
  }

  private async getCurrentErrorRate(): Promise<number> {
    // Implementation would calculate current error rate
    return 0.5;
  }

  private async getCurrentResponseTime(): Promise<number> {
    // Implementation would calculate current response time
    return 1500;
  }

  private async getCurrentQueueDepth(): Promise<number> {
    // Implementation would get current queue depth
    return 5;
  }

  private async getCurrentCostRate(): Promise<number> {
    // Implementation would calculate current cost rate in cents per hour
    return 50;
  }

  private async calculateUptime(): Promise<number> {
    // Implementation would calculate system uptime percentage
    return 99.9;
  }

  private async getCachedDashboard(cacheKey: string): Promise<AIPerformanceDashboard | null> {
    try {
      const result = await this.db.query(
        'SELECT cache_data FROM ai_dashboard_cache WHERE cache_key = $1 AND expires_at > NOW()',
        [cacheKey]
      );
      const rows = Array.isArray(result) ? result : result.rows || [];
      
      if (rows.length > 0) {
        return JSON.parse(rows[0].cache_data);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get cached dashboard:', error);
      return null;
    }
  }

  private async cacheDashboard(cacheKey: string, data: AIPerformanceDashboard, ttlMs: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      await this.db.query(
        'INSERT INTO ai_dashboard_cache (cache_key, cache_data, expires_at) VALUES ($1, $2, $3) ON CONFLICT (cache_key) DO UPDATE SET cache_data = $4, expires_at = $5',
        [cacheKey, JSON.stringify(data), expiresAt, JSON.stringify(data), expiresAt]
      );
    } catch (error) {
      logger.error('Failed to cache dashboard:', error);
    }
  }

  private async loadActiveAlerts(): Promise<void> {
    try {
      const result = await this.db.query('SELECT * FROM ai_alerts WHERE status = $1', ['firing']);
      const alerts = Array.isArray(result) ? result : result.rows || [];
      
      this.alertsCache.clear();
      alerts.forEach((row: any) => {
        const alert: AIAlert = {
          id: row.id,
          alertName: row.alert_name,
          severity: row.severity,
          condition: row.condition_text,
          currentValue: row.current_value,
          threshold: row.threshold_value,
          status: row.status,
          firedAt: row.fired_at,
          resolvedAt: row.resolved_at,
          description: row.description,
          actions: JSON.parse(row.actions || '[]')
        };
        this.alertsCache.set(alert.id, alert);
      });
    } catch (error) {
      logger.error('Failed to load active alerts:', error);
    }
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.flushMetricsBuffer();
    }, 10000); // Collect every 10 seconds
  }

  private startAlertChecking(): void {
    this.alertCheckInterval = setInterval(async () => {
      await this.checkAlerts();
    }, 30000); // Check alerts every 30 seconds
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect various system metrics
      const loadBalancerMetrics = await this.loadBalancer.getLoadBalancingMetrics();
      
      await this.recordMetric({
        metricName: 'ai_active_providers',
        metricType: 'gauge',
        value: loadBalancerMetrics.activeProviders,
        labels: { source: 'load_balancer' },
        source: 'monitoring_service'
      });

      await this.recordMetric({
        metricName: 'ai_queue_depth',
        metricType: 'gauge',
        value: loadBalancerMetrics.queueDepth,
        labels: { source: 'load_balancer' },
        source: 'monitoring_service'
      });
    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
    }
  }

  private async checkAlerts(): Promise<void> {
    // Implementation would check alert conditions and fire/resolve alerts
    try {
      // This is a placeholder for alert checking logic
      logger.debug('Checking alerts...');
    } catch (error) {
      logger.error('Failed to check alerts:', error);
    }
  }

  private async buildAdvancedAnalytics(filters: any): Promise<any> {
    // Implementation would build advanced analytics based on filters
    return {
      aggregatedMetrics: {},
      timeSeries: [],
      breakdown: {
        byProvider: {},
        byModel: {},
        byOperation: {},
        byUser: {}
      },
      insights: {
        trend: 'stable',
        anomalies: [],
        patterns: []
      }
    };
  }

  private async getMetricsForExport(timeRange: string, metrics?: string[]): Promise<any[]> {
    // Implementation would get metrics for export
    return [];
  }

  private convertToCSV(data: any[]): string {
    // Implementation would convert data to CSV format
    return 'timestamp,metric,value\n';
  }

  private convertToPrometheus(data: any[]): string {
    // Implementation would convert data to Prometheus format
    return '# HELP ai_requests_total Total AI requests\n# TYPE ai_requests_total counter\n';
  }
}

export default AIMonitoringService;