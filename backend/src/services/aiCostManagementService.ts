import { logger } from './logger';
import { DatabaseService } from './database';

export interface AIUsageMetrics {
  id: string;
  userId: string;
  organizationId?: string;
  service: 'openai' | 'anthropic' | 'vector_db' | 'custom';
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number; // in cents
  duration: number; // in milliseconds
  timestamp: Date;
  endpoint: string;
  requestId: string;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

export interface CostThreshold {
  id: string;
  organizationId: string;
  userId?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'per_request';
  limit: number; // in cents
  currentUsage: number;
  resetDate: Date;
  alertThreshold: number; // percentage (80 for 80%)
  isActive: boolean;
  notificationSent: boolean;
}

export interface OptimizationSuggestion {
  type: 'model_switch' | 'prompt_optimization' | 'caching' | 'batching' | 'rate_limiting';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  potentialSavings: number; // in cents per month
  implementationEffort: 'low' | 'medium' | 'high';
  actionItems: string[];
}

export interface AIPerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  costPerOperation: number;
  tokensPerSecond: number;
  cacheHitRate: number;
}

export interface CostOptimizationConfig {
  enableSmartCaching: boolean;
  enableModelDowngrading: boolean;
  enableBatchOptimization: boolean;
  enableRateLimiting: boolean;
  maxDailyCostPerUser: number; // in cents
  maxMonthlyCostPerOrg: number; // in cents
  defaultModel: string;
  fallbackModel: string;
  cacheTTL: number; // in seconds
}

export class AICostManagementService {
  private db: DatabaseService;
  private config: CostOptimizationConfig;
  private usageCache: Map<string, AIUsageMetrics[]> = new Map();
  private thresholdCache: Map<string, CostThreshold[]> = new Map();

  constructor() {
    this.db = new DatabaseService();
    this.config = this.loadConfig();
    this.initializeService();
  }

  private loadConfig(): CostOptimizationConfig {
    return {
      enableSmartCaching: process.env.AI_ENABLE_SMART_CACHING === 'true',
      enableModelDowngrading: process.env.AI_ENABLE_MODEL_DOWNGRADING === 'true',
      enableBatchOptimization: process.env.AI_ENABLE_BATCH_OPTIMIZATION === 'true',
      enableRateLimiting: process.env.AI_ENABLE_RATE_LIMITING === 'true',
      maxDailyCostPerUser: parseInt(process.env.AI_MAX_DAILY_COST_PER_USER || '1000'), // $10
      maxMonthlyCostPerOrg: parseInt(process.env.AI_MAX_MONTHLY_COST_PER_ORG || '50000'), // $500
      defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      fallbackModel: process.env.AI_FALLBACK_MODEL || 'gpt-4o-mini',
      cacheTTL: parseInt(process.env.AI_CACHE_TTL || '3600') // 1 hour
    };
  }

  private async initializeService(): Promise<void> {
    try {
      await this.createTablesIfNotExist();
      await this.loadThresholdsIntoCache();
      this.startPeriodicCleanup();
      logger.info('AI Cost Management Service initialized');
    } catch (error) {
      logger.error('Failed to initialize AI Cost Management Service:', error);
      throw error;
    }
  }

  private async createTablesIfNotExist(): Promise<void> {
    const createUsageMetricsTable = `
      CREATE TABLE IF NOT EXISTS ai_usage_metrics (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        organization_id VARCHAR(255),
        service VARCHAR(50) NOT NULL,
        operation VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        cost DECIMAL(10,4) NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        endpoint VARCHAR(255),
        request_id VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_timestamp (user_id, timestamp),
        INDEX idx_org_timestamp (organization_id, timestamp),
        INDEX idx_service_operation (service, operation),
        INDEX idx_status_timestamp (status, timestamp)
      )
    `;

    const createCostThresholdsTable = `
      CREATE TABLE IF NOT EXISTS ai_cost_thresholds (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        type VARCHAR(20) NOT NULL,
        limit_amount DECIMAL(10,4) NOT NULL,
        current_usage DECIMAL(10,4) NOT NULL DEFAULT 0,
        reset_date TIMESTAMP NOT NULL,
        alert_threshold INTEGER NOT NULL DEFAULT 80,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notification_sent BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_org_type_active (organization_id, type, is_active),
        INDEX idx_user_type_active (user_id, type, is_active)
      )
    `;

    const createOptimizationSuggestionsTable = `
      CREATE TABLE IF NOT EXISTS ai_optimization_suggestions (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        potential_savings DECIMAL(10,4) NOT NULL,
        implementation_effort VARCHAR(20) NOT NULL,
        action_items JSON,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        implemented_at TIMESTAMP NULL,
        INDEX idx_org_priority_status (organization_id, priority, status)
      )
    `;

    await this.db.query(createUsageMetricsTable);
    await this.db.query(createCostThresholdsTable);
    await this.db.query(createOptimizationSuggestionsTable);
  }

  /**
   * Record AI usage metrics for cost tracking and optimization
   */
  async recordUsage(metrics: Omit<AIUsageMetrics, 'id' | 'timestamp'>): Promise<void> {
    try {
      const id = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date();

      const fullMetrics: AIUsageMetrics = {
        ...metrics,
        id,
        timestamp
      };

      // Store in database
      await this.db.query(
        `INSERT INTO ai_usage_metrics 
         (id, user_id, organization_id, service, operation, model, input_tokens, 
          output_tokens, total_tokens, cost, duration, timestamp, endpoint, 
          request_id, status, error_message) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullMetrics.id,
          fullMetrics.userId,
          fullMetrics.organizationId,
          fullMetrics.service,
          fullMetrics.operation,
          fullMetrics.model,
          fullMetrics.inputTokens,
          fullMetrics.outputTokens,
          fullMetrics.totalTokens,
          fullMetrics.cost,
          fullMetrics.duration,
          fullMetrics.timestamp,
          fullMetrics.endpoint,
          fullMetrics.requestId,
          fullMetrics.status,
          fullMetrics.errorMessage
        ]
      );

      // Update cache
      const cacheKey = fullMetrics.organizationId || fullMetrics.userId;
      if (!this.usageCache.has(cacheKey)) {
        this.usageCache.set(cacheKey, []);
      }
      this.usageCache.get(cacheKey)!.push(fullMetrics);

      // Check thresholds
      await this.checkCostThresholds(fullMetrics);

      logger.debug('AI usage recorded:', {
        operation: fullMetrics.operation,
        cost: fullMetrics.cost,
        tokens: fullMetrics.totalTokens
      });
    } catch (error) {
      logger.error('Failed to record AI usage:', error);
      throw error;
    }
  }

  /**
   * Check if current usage exceeds defined thresholds
   */
  private async checkCostThresholds(metrics: AIUsageMetrics): Promise<void> {
    try {
      const thresholds = await this.getActiveThresholds(
        metrics.organizationId,
        metrics.userId
      );

      for (const threshold of thresholds) {
        // Update current usage
        const currentUsage = await this.calculateCurrentUsage(threshold);
        await this.updateThresholdUsage(threshold.id, currentUsage);

        // Check if threshold is exceeded
        const usagePercentage = (currentUsage / threshold.limit) * 100;
        
        if (usagePercentage >= threshold.alertThreshold && !threshold.notificationSent) {
          await this.sendThresholdAlert(threshold, usagePercentage);
        }

        if (usagePercentage >= 100) {
          await this.handleThresholdExceeded(threshold);
        }
      }
    } catch (error) {
      logger.error('Failed to check cost thresholds:', error);
    }
  }

  /**
   * Get AI usage analytics for a given period
   */
  async getUsageAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCost: number;
    totalTokens: number;
    requestCount: number;
    averageCostPerRequest: number;
    usageByService: Record<string, number>;
    usageByModel: Record<string, number>;
    usageByOperation: Record<string, number>;
    performanceMetrics: AIPerformanceMetrics;
    trends: {
      dailyCosts: { date: string; cost: number }[];
      modelUsage: { model: string; percentage: number }[];
    };
  }> {
    try {
      const query = `
        SELECT 
          service, operation, model, status,
          SUM(cost) as total_cost,
          SUM(total_tokens) as total_tokens,
          COUNT(*) as request_count,
          AVG(duration) as avg_duration,
          DATE(timestamp) as date
        FROM ai_usage_metrics 
        WHERE organization_id = ? 
          AND timestamp BETWEEN ? AND ?
        GROUP BY service, operation, model, status, DATE(timestamp)
        ORDER BY timestamp DESC
      `;

      const results = await this.db.query(query, [organizationId, startDate, endDate]);

      // Process results for analytics
      const analytics = this.processUsageAnalytics(Array.isArray(results) ? results : results.rows || []);
      
      return analytics;
    } catch (error) {
      logger.error('Failed to get usage analytics:', error);
      throw error;
    }
  }

  /**
   * Generate optimization suggestions based on usage patterns
   */
  async generateOptimizationSuggestions(organizationId: string): Promise<OptimizationSuggestion[]> {
    try {
      const suggestions: OptimizationSuggestion[] = [];
      
      // Analyze usage patterns
      const recentUsage = await this.getRecentUsage(organizationId, 30); // Last 30 days
      
      // Model optimization suggestions
      const modelSuggestions = await this.analyzeModelUsage(recentUsage);
      suggestions.push(...modelSuggestions);

      // Prompt optimization suggestions
      const promptSuggestions = await this.analyzePromptEfficiency(recentUsage);
      suggestions.push(...promptSuggestions);

      // Caching suggestions
      const cachingSuggestions = await this.analyzeCachingOpportunities(recentUsage);
      suggestions.push(...cachingSuggestions);

      // Batching suggestions
      const batchingSuggestions = await this.analyzeBatchingOpportunities(recentUsage);
      suggestions.push(...batchingSuggestions);

      // Store suggestions
      await this.storeSuggestions(organizationId, suggestions);

      return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
    } catch (error) {
      logger.error('Failed to generate optimization suggestions:', error);
      throw error;
    }
  }

  /**
   * Apply automatic optimizations based on configuration
   */
  async applyAutomaticOptimizations(
    operation: string,
    prompt: string,
    options: any
  ): Promise<{
    optimizedModel: string;
    optimizedPrompt: string;
    optimizedOptions: any;
    optimizationsApplied: string[];
  }> {
    const optimizationsApplied: string[] = [];
    let optimizedModel = options.model || this.config.defaultModel;
    let optimizedPrompt = prompt;
    let optimizedOptions = { ...options };

    try {
      // Smart model selection based on complexity
      if (this.config.enableModelDowngrading) {
        const suggestedModel = await this.suggestOptimalModel(prompt, operation);
        if (suggestedModel !== optimizedModel) {
          optimizedModel = suggestedModel;
          optimizationsApplied.push(`Model switched to ${suggestedModel}`);
        }
      }

      // Prompt optimization
      if (this.config.enableSmartCaching) {
        const cachedResult = await this.checkPromptCache(prompt, optimizedModel);
        if (cachedResult) {
          optimizationsApplied.push('Used cached result');
          return {
            optimizedModel,
            optimizedPrompt,
            optimizedOptions,
            optimizationsApplied
          };
        }
      }

      // Batch optimization (for multiple requests)
      if (this.config.enableBatchOptimization && Array.isArray(prompt)) {
        optimizedOptions.batchSize = this.calculateOptimalBatchSize(prompt.length);
        optimizationsApplied.push('Applied batch optimization');
      }

      return {
        optimizedModel,
        optimizedPrompt,
        optimizedOptions,
        optimizationsApplied
      };
    } catch (error) {
      logger.error('Failed to apply automatic optimizations:', error);
      return {
        optimizedModel,
        optimizedPrompt,
        optimizedOptions,
        optimizationsApplied
      };
    }
  }

  /**
   * Set cost thresholds for users or organizations
   */
  async setCostThreshold(threshold: Omit<CostThreshold, 'id' | 'currentUsage'>): Promise<string> {
    try {
      const id = `threshold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.db.query(
        `INSERT INTO ai_cost_thresholds 
         (id, organization_id, user_id, type, limit_amount, reset_date, 
          alert_threshold, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          threshold.organizationId,
          threshold.userId,
          threshold.type,
          threshold.limit,
          threshold.resetDate,
          threshold.alertThreshold,
          threshold.isActive
        ]
      );

      // Update cache
      await this.loadThresholdsIntoCache();

      logger.info('Cost threshold set:', { id, type: threshold.type, limit: threshold.limit });
      return id;
    } catch (error) {
      logger.error('Failed to set cost threshold:', error);
      throw error;
    }
  }

  // Helper methods (implementation details)

  private async getActiveThresholds(
    organizationId?: string,
    userId?: string
  ): Promise<CostThreshold[]> {
    const cacheKey = organizationId || userId || 'global';
    return this.thresholdCache.get(cacheKey) || [];
  }

  private async calculateCurrentUsage(threshold: CostThreshold): Promise<number> {
    const now = new Date();
    const resetDate = new Date(threshold.resetDate);
    
    let startDate: Date;
    switch (threshold.type) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = resetDate;
    }

    const query = `
      SELECT SUM(cost) as total_cost
      FROM ai_usage_metrics 
      WHERE ${threshold.organizationId ? 'organization_id = ?' : 'user_id = ?'}
        AND timestamp >= ?
        AND status = 'success'
    `;

    const params = [
      threshold.organizationId || threshold.userId,
      startDate
    ];

    const result = await this.db.query(query, params);
    return result[0]?.total_cost || 0;
  }

  private async updateThresholdUsage(thresholdId: string, currentUsage: number): Promise<void> {
    await this.db.query(
      'UPDATE ai_cost_thresholds SET current_usage = ? WHERE id = ?',
      [currentUsage, thresholdId]
    );
  }

  private async sendThresholdAlert(threshold: CostThreshold, usagePercentage: number): Promise<void> {
    // Implementation would send notification (email, webhook, etc.)
    logger.warn('Cost threshold alert:', {
      thresholdId: threshold.id,
      usagePercentage: Math.round(usagePercentage),
      limit: threshold.limit
    });

    await this.db.query(
      'UPDATE ai_cost_thresholds SET notification_sent = true WHERE id = ?',
      [threshold.id]
    );
  }

  private async handleThresholdExceeded(threshold: CostThreshold): Promise<void> {
    // Implementation would apply cost controls (rate limiting, service suspension, etc.)
    logger.error('Cost threshold exceeded:', {
      thresholdId: threshold.id,
      limit: threshold.limit,
      currentUsage: threshold.currentUsage
    });
  }

  private processUsageAnalytics(results: any[]): any {
    // Implementation would process database results into analytics format
    return {
      totalCost: 0,
      totalTokens: 0,
      requestCount: 0,
      averageCostPerRequest: 0,
      usageByService: {},
      usageByModel: {},
      usageByOperation: {},
      performanceMetrics: {
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        costPerOperation: 0,
        tokensPerSecond: 0,
        cacheHitRate: 0
      },
      trends: {
        dailyCosts: [],
        modelUsage: []
      }
    };
  }

  private async getRecentUsage(organizationId: string, days: number): Promise<AIUsageMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT * FROM ai_usage_metrics 
      WHERE organization_id = ? AND timestamp >= ?
      ORDER BY timestamp DESC
    `;

    const result = await this.db.query(query, [organizationId, startDate]);
    return Array.isArray(result) ? result : result.rows || [];
  }

  private async analyzeModelUsage(usage: AIUsageMetrics[]): Promise<OptimizationSuggestion[]> {
    // Analyze if cheaper models could be used for certain operations
    return [];
  }

  private async analyzePromptEfficiency(usage: AIUsageMetrics[]): Promise<OptimizationSuggestion[]> {
    // Analyze prompt length and efficiency
    return [];
  }

  private async analyzeCachingOpportunities(usage: AIUsageMetrics[]): Promise<OptimizationSuggestion[]> {
    // Identify repeated queries that could be cached
    return [];
  }

  private async analyzeBatchingOpportunities(usage: AIUsageMetrics[]): Promise<OptimizationSuggestion[]> {
    // Identify operations that could be batched
    return [];
  }

  private async storeSuggestions(organizationId: string, suggestions: OptimizationSuggestion[]): Promise<void> {
    // Store suggestions in database
    for (const suggestion of suggestions) {
      const id = `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.query(
        `INSERT INTO ai_optimization_suggestions 
         (id, organization_id, type, priority, title, description, 
          potential_savings, implementation_effort, action_items) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          suggestion.type,
          suggestion.priority,
          suggestion.title,
          suggestion.description,
          suggestion.potentialSavings,
          suggestion.implementationEffort,
          JSON.stringify(suggestion.actionItems)
        ]
      );
    }
  }

  private async suggestOptimalModel(prompt: string, operation: string): Promise<string> {
    // Analyze prompt complexity and suggest optimal model
    const promptLength = prompt.length;
    const complexity = this.analyzePromptComplexity(prompt, operation);

    if (complexity === 'low' && promptLength < 1000) {
      return 'gpt-4o-mini';
    } else if (complexity === 'medium') {
      return 'gpt-4o';
    } else {
      return 'gpt-4-turbo';
    }
  }

  private analyzePromptComplexity(prompt: string, operation: string): 'low' | 'medium' | 'high' {
    // Simple complexity analysis
    const hasComplexKeywords = /analyze|complex|detailed|comprehensive|advanced/.test(prompt.toLowerCase());
    const isLongPrompt = prompt.length > 2000;
    const isComplexOperation = ['analysis', 'generation', 'reasoning'].includes(operation);

    if (hasComplexKeywords || isLongPrompt || isComplexOperation) {
      return 'high';
    } else if (prompt.length > 500 || operation.includes('search')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async checkPromptCache(prompt: string, model: string): Promise<any | null> {
    // Check if similar prompt has been cached
    const promptHash = this.hashString(prompt + model);
    // Implementation would check cache (Redis, database, etc.)
    return null;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private calculateOptimalBatchSize(itemCount: number): number {
    // Calculate optimal batch size based on item count and API limits
    if (itemCount < 10) return itemCount;
    if (itemCount < 100) return 10;
    return 25;
  }

  private async loadThresholdsIntoCache(): Promise<void> {
    const result = await this.db.query(
      'SELECT * FROM ai_cost_thresholds WHERE is_active = true'
    );
    const thresholds = Array.isArray(result) ? result : result.rows || [];

    this.thresholdCache.clear();
    for (const threshold of thresholds) {
      const cacheKey = threshold.organization_id || threshold.user_id || 'global';
      if (!this.thresholdCache.has(cacheKey)) {
        this.thresholdCache.set(cacheKey, []);
      }
      this.thresholdCache.get(cacheKey)!.push({
        id: threshold.id,
        organizationId: threshold.organization_id,
        userId: threshold.user_id,
        type: threshold.type,
        limit: threshold.limit_amount,
        currentUsage: threshold.current_usage,
        resetDate: threshold.reset_date,
        alertThreshold: threshold.alert_threshold,
        isActive: threshold.is_active,
        notificationSent: threshold.notification_sent
      });
    }
  }

  private startPeriodicCleanup(): void {
    // Clean up old usage data and reset thresholds periodically
    setInterval(async () => {
      try {
        await this.cleanupOldUsageData();
        await this.resetThresholds();
      } catch (error) {
        logger.error('Periodic cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private async cleanupOldUsageData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days of data

    await this.db.query(
      'DELETE FROM ai_usage_metrics WHERE timestamp < ?',
      [cutoffDate]
    );

    logger.info('Cleaned up old usage data');
  }

  private async resetThresholds(): Promise<void> {
    const now = new Date();
    
    const result = await this.db.query(
      'SELECT * FROM ai_cost_thresholds WHERE reset_date <= ? AND is_active = true',
      [now]
    );
    const thresholdsToReset = Array.isArray(result) ? result : result.rows || [];

    for (const threshold of thresholdsToReset) {
      let newResetDate = new Date();
      
      switch (threshold.type) {
        case 'daily':
          newResetDate.setDate(newResetDate.getDate() + 1);
          break;
        case 'weekly':
          newResetDate.setDate(newResetDate.getDate() + 7);
          break;
        case 'monthly':
          newResetDate.setMonth(newResetDate.getMonth() + 1);
          break;
      }

      await this.db.query(
        `UPDATE ai_cost_thresholds 
         SET current_usage = 0, reset_date = ?, notification_sent = false 
         WHERE id = ?`,
        [newResetDate, threshold.id]
      );
    }

    if (thresholdsToReset && thresholdsToReset.length > 0) {
      logger.info(`Reset ${thresholdsToReset.length} cost thresholds`);
      await this.loadThresholdsIntoCache();
    }
  }
}

export default AICostManagementService;