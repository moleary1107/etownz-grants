/// <reference types="node" />
import { logger } from './logger';
import { DatabaseService } from './database';
import AICostManagementService from './aiCostManagementService';

export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'custom';
  endpoint: string;
  apiKey: string;
  models: string[];
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    currentRequests: number;
    currentTokens: number;
    lastReset: Date;
  };
  healthStatus: {
    isHealthy: boolean;
    lastCheck: Date;
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  cost: {
    inputCostPer1MTokens: number;
    outputCostPer1MTokens: number;
  };
  priority: number; // 1-10, higher is preferred
  isActive: boolean;
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'least-cost' | 'least-latency' | 'weighted' | 'failover';
  config: {
    weights?: Record<string, number>;
    failoverOrder?: string[];
    costThreshold?: number;
    latencyThreshold?: number;
  };
}

export interface ScalingPolicy {
  id: string;
  name: string;
  triggerMetric: 'request_rate' | 'error_rate' | 'response_time' | 'cost' | 'queue_depth';
  threshold: number;
  scaleAction: 'scale_up' | 'scale_down' | 'switch_provider' | 'throttle';
  cooldownPeriod: number; // seconds
  isActive: boolean;
}

export interface AIRequest {
  id: string;
  operation: string;
  model: string;
  inputTokens: number;
  estimatedOutputTokens: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  maxRetries: number;
  timeout: number;
  userId: string;
  organizationId?: string;
  metadata: Record<string, any>;
}

export interface ProviderSelection {
  provider: AIProvider;
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
}

export class AILoadBalancerService {
  private db: DatabaseService;
  private costManager: AICostManagementService;
  private providers: Map<string, AIProvider> = new Map();
  private requestQueue: Map<string, AIRequest[]> = new Map(); // priority queues
  private loadBalancingStrategy: LoadBalancingStrategy;
  private scalingPolicies: ScalingPolicy[] = [];
  private lastProviderIndex = 0; // for round-robin
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private rateLimitResetInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.db = new DatabaseService();
    this.costManager = new AICostManagementService();
    this.loadBalancingStrategy = this.getDefaultStrategy();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      await this.createTablesIfNotExist();
      await this.loadProvidersFromDatabase();
      await this.loadScalingPolicies();
      this.startHealthChecks();
      this.startRateLimitResets();
      this.startRequestProcessing();
      logger.info('AI Load Balancer Service initialized');
    } catch (error) {
      logger.error('Failed to initialize AI Load Balancer Service:', error);
      throw error;
    }
  }

  private async createTablesIfNotExist(): Promise<void> {
    // Tables are now created by migrations, just check if they exist
    try {
      await this.db.query('SELECT 1 FROM ai_providers LIMIT 1');
      await this.db.query('SELECT 1 FROM ai_scaling_policies LIMIT 1');
      await this.db.query('SELECT 1 FROM ai_request_logs LIMIT 1');
    } catch (error) {
      logger.warn('AI Load Balancer tables not found. Please run migrations.');
    }
  }

  /**
   * Route an AI request to the most appropriate provider
   */
  async routeRequest(request: AIRequest): Promise<ProviderSelection> {
    try {
      const availableProviders = await this.getAvailableProviders(request);
      
      if (availableProviders.length === 0) {
        throw new Error('No available providers for this request');
      }

      const selectedProvider = await this.selectProvider(availableProviders, request);
      
      // Update rate limits
      await this.updateProviderRateLimit(selectedProvider.id, request);
      
      // Log the selection
      await this.logProviderSelection(request, selectedProvider);

      const estimatedCost = this.calculateEstimatedCost(request, selectedProvider);
      const estimatedLatency = this.estimateLatency(selectedProvider);

      return {
        provider: selectedProvider,
        reason: this.getSelectionReason(selectedProvider, request),
        estimatedCost,
        estimatedLatency
      };
    } catch (error) {
      logger.error('Failed to route AI request:', error);
      throw error;
    }
  }

  /**
   * Add a request to the priority queue for processing
   */
  async queueRequest(request: AIRequest): Promise<void> {
    const priorityLevel = request.priority;
    
    if (!this.requestQueue.has(priorityLevel)) {
      this.requestQueue.set(priorityLevel, []);
    }
    
    this.requestQueue.get(priorityLevel)!.push(request);
    
    logger.debug(`Request ${request.id} queued with priority ${priorityLevel}`);
  }

  /**
   * Process the next request from the queue
   */
  async processNextRequest(): Promise<AIRequest | null> {
    // Process in priority order: critical -> high -> medium -> low
    const priorities: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorities) {
      const queue = this.requestQueue.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }
    
    return null;
  }

  /**
   * Add a new AI provider
   */
  async addProvider(provider: Omit<AIProvider, 'id'>): Promise<string> {
    try {
      const id = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullProvider: AIProvider = { ...provider, id };

      await this.db.query(
        `INSERT INTO ai_providers 
         (id, name, type, endpoint, api_key, models, rate_limit, 
          health_status, cost, priority, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          provider.name,
          provider.type,
          provider.endpoint,
          provider.apiKey,
          JSON.stringify(provider.models),
          JSON.stringify(provider.rateLimit),
          JSON.stringify(provider.healthStatus),
          JSON.stringify(provider.cost),
          provider.priority,
          provider.isActive
        ]
      );

      this.providers.set(id, fullProvider);
      
      logger.info(`Added AI provider: ${provider.name}`);
      return id;
    } catch (error) {
      logger.error('Failed to add AI provider:', error);
      throw error;
    }
  }

  /**
   * Update provider health status
   */
  async updateProviderHealth(providerId: string, healthData: Partial<AIProvider['healthStatus']>): Promise<void> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      provider.healthStatus = { ...provider.healthStatus, ...healthData };
      
      await this.db.query(
        'UPDATE ai_providers SET health_status = $1 WHERE id = $2',
        [JSON.stringify(provider.healthStatus), providerId]
      );

      this.providers.set(providerId, provider);
    } catch (error) {
      logger.error('Failed to update provider health:', error);
      throw error;
    }
  }

  /**
   * Set load balancing strategy
   */
  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancingStrategy = strategy;
    logger.info(`Load balancing strategy set to: ${strategy.type}`);
  }

  /**
   * Add scaling policy
   */
  async addScalingPolicy(policy: Omit<ScalingPolicy, 'id'>): Promise<string> {
    try {
      const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullPolicy: ScalingPolicy = { ...policy, id };

      await this.db.query(
        `INSERT INTO ai_scaling_policies 
         (id, name, trigger_metric, threshold, scale_action, cooldown_period, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          policy.name,
          policy.triggerMetric,
          policy.threshold,
          policy.scaleAction,
          policy.cooldownPeriod,
          policy.isActive
        ]
      );

      this.scalingPolicies.push(fullPolicy);
      
      logger.info(`Added scaling policy: ${policy.name}`);
      return id;
    } catch (error) {
      logger.error('Failed to add scaling policy:', error);
      throw error;
    }
  }

  /**
   * Get load balancing metrics and status
   */
  async getLoadBalancingMetrics(): Promise<{
    totalProviders: number;
    activeProviders: number;
    healthyProviders: number;
    totalRequests: number;
    queueDepth: number;
    averageResponseTime: number;
    errorRate: number;
    providerUtilization: Record<string, number>;
    costBreakdown: Record<string, number>;
  }> {
    try {
      const totalProviders = this.providers.size;
      const activeProviders = Array.from(this.providers.values()).filter(p => p.isActive).length;
      const healthyProviders = Array.from(this.providers.values()).filter(p => p.isActive && p.healthStatus.isHealthy).length;
      
      const queueDepth = Array.from(this.requestQueue.values()).reduce((sum, queue) => sum + queue.length, 0);
      
      // Get metrics from database for the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          AVG(response_time) as avg_response_time,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) / COUNT(*) * 100 as error_rate,
          provider_id,
          SUM(cost) as total_cost
        FROM ai_request_logs 
        WHERE timestamp >= $1
        GROUP BY provider_id
      `;
      
      const result = await this.db.query(metricsQuery, [oneHourAgo]);
      const metrics = Array.isArray(result) ? result : result.rows || [];
      
      const totalRequests = metrics.reduce((sum: number, m: any) => sum + (m.total_requests || 0), 0);
      const averageResponseTime = metrics.reduce((sum: number, m: any) => sum + (m.avg_response_time || 0), 0) / (metrics.length || 1);
      const errorRate = metrics.reduce((sum: number, m: any) => sum + (m.error_rate || 0), 0) / (metrics.length || 1);
      
      const providerUtilization: Record<string, number> = {};
      const costBreakdown: Record<string, number> = {};
      
      metrics.forEach((m: any) => {
        if (m.provider_id) {
          providerUtilization[m.provider_id] = m.total_requests || 0;
          costBreakdown[m.provider_id] = m.total_cost || 0;
        }
      });

      return {
        totalProviders,
        activeProviders,
        healthyProviders,
        totalRequests,
        queueDepth,
        averageResponseTime,
        errorRate,
        providerUtilization,
        costBreakdown
      };
    } catch (error) {
      logger.error('Failed to get load balancing metrics:', error);
      throw error;
    }
  }

  // Private helper methods

  private getDefaultStrategy(): LoadBalancingStrategy {
    return {
      type: 'weighted',
      config: {
        weights: {},
        costThreshold: 1000, // cents
        latencyThreshold: 5000 // ms
      }
    };
  }

  private async loadProvidersFromDatabase(): Promise<void> {
    try {
      const result = await this.db.query('SELECT * FROM ai_providers WHERE is_active = true');
      const providers = Array.isArray(result) ? result : result.rows || [];
      
      this.providers.clear();
      providers.forEach((row: any) => {
        const provider: AIProvider = {
          id: row.id,
          name: row.name,
          type: row.type,
          endpoint: row.endpoint,
          apiKey: row.api_key,
          models: JSON.parse(row.models),
          rateLimit: JSON.parse(row.rate_limit),
          healthStatus: JSON.parse(row.health_status),
          cost: JSON.parse(row.cost),
          priority: row.priority,
          isActive: row.is_active
        };
        this.providers.set(provider.id, provider);
      });
      
      logger.info(`Loaded ${this.providers.size} AI providers`);
    } catch (error) {
      logger.error('Failed to load providers from database:', error);
    }
  }

  private async loadScalingPolicies(): Promise<void> {
    try {
      const result = await this.db.query('SELECT * FROM ai_scaling_policies WHERE is_active = true');
      const policies = Array.isArray(result) ? result : result.rows || [];
      
      this.scalingPolicies = policies.map((row: any) => ({
        id: row.id,
        name: row.name,
        triggerMetric: row.trigger_metric,
        threshold: row.threshold,
        scaleAction: row.scale_action,
        cooldownPeriod: row.cooldown_period,
        isActive: row.is_active
      }));
      
      logger.info(`Loaded ${this.scalingPolicies.length} scaling policies`);
    } catch (error) {
      logger.error('Failed to load scaling policies:', error);
    }
  }

  private async getAvailableProviders(request: AIRequest): Promise<AIProvider[]> {
    return Array.from(this.providers.values()).filter(provider => {
      return (
        provider.isActive &&
        provider.healthStatus.isHealthy &&
        provider.models.includes(request.model) &&
        this.checkRateLimit(provider, request)
      );
    });
  }

  private async selectProvider(providers: AIProvider[], request: AIRequest): Promise<AIProvider> {
    switch (this.loadBalancingStrategy.type) {
      case 'round-robin':
        return this.selectRoundRobin(providers);
      case 'least-cost':
        return this.selectLeastCost(providers, request);
      case 'least-latency':
        return this.selectLeastLatency(providers);
      case 'weighted':
        return this.selectWeighted(providers, request);
      case 'failover':
        return this.selectFailover(providers);
      default:
        return providers[0];
    }
  }

  private selectRoundRobin(providers: AIProvider[]): AIProvider {
    const provider = providers[this.lastProviderIndex % providers.length];
    this.lastProviderIndex = (this.lastProviderIndex + 1) % providers.length;
    return provider;
  }

  private selectLeastCost(providers: AIProvider[], request: AIRequest): AIProvider {
    return providers.reduce((cheapest, current) => {
      const cheapestCost = this.calculateEstimatedCost(request, cheapest);
      const currentCost = this.calculateEstimatedCost(request, current);
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  private selectLeastLatency(providers: AIProvider[]): AIProvider {
    return providers.reduce((fastest, current) => {
      return current.healthStatus.responseTime < fastest.healthStatus.responseTime ? current : fastest;
    });
  }

  private selectWeighted(providers: AIProvider[], request: AIRequest): AIProvider {
    // Weighted selection based on cost, latency, and priority
    const scores = providers.map(provider => {
      const cost = this.calculateEstimatedCost(request, provider);
      const latency = provider.healthStatus.responseTime;
      const priority = provider.priority;
      
      // Lower cost and latency = higher score, higher priority = higher score
      const costScore = 1000 / (cost + 1);
      const latencyScore = 5000 / (latency + 1);
      const priorityScore = priority * 100;
      
      return {
        provider,
        score: costScore + latencyScore + priorityScore
      };
    });
    
    // Select provider with highest score
    return scores.reduce((best, current) => 
      current.score > best.score ? current : best
    ).provider;
  }

  private selectFailover(providers: AIProvider[]): AIProvider {
    const failoverOrder = this.loadBalancingStrategy.config.failoverOrder || [];
    
    for (const providerId of failoverOrder) {
      const provider = providers.find(p => p.id === providerId);
      if (provider && provider.healthStatus.isHealthy) {
        return provider;
      }
    }
    
    // If no failover provider available, return the first healthy one
    return providers.find(p => p.healthStatus.isHealthy) || providers[0];
  }

  private checkRateLimit(provider: AIProvider, request: AIRequest): boolean {
    const now = new Date();
    const timeSinceReset = now.getTime() - provider.rateLimit.lastReset.getTime();
    
    // Reset rate limits if a minute has passed
    if (timeSinceReset >= 60000) {
      provider.rateLimit.currentRequests = 0;
      provider.rateLimit.currentTokens = 0;
      provider.rateLimit.lastReset = now;
    }
    
    const wouldExceedRequests = provider.rateLimit.currentRequests >= provider.rateLimit.requestsPerMinute;
    const wouldExceedTokens = provider.rateLimit.currentTokens + request.inputTokens + request.estimatedOutputTokens >= provider.rateLimit.tokensPerMinute;
    
    return !wouldExceedRequests && !wouldExceedTokens;
  }

  private async updateProviderRateLimit(providerId: string, request: AIRequest): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.rateLimit.currentRequests += 1;
      provider.rateLimit.currentTokens += request.inputTokens + request.estimatedOutputTokens;
    }
  }

  private calculateEstimatedCost(request: AIRequest, provider: AIProvider): number {
    const inputCost = (request.inputTokens / 1000000) * provider.cost.inputCostPer1MTokens;
    const outputCost = (request.estimatedOutputTokens / 1000000) * provider.cost.outputCostPer1MTokens;
    return inputCost + outputCost;
  }

  private estimateLatency(provider: AIProvider): number {
    return provider.healthStatus.responseTime || 1000;
  }

  private getSelectionReason(provider: AIProvider, request: AIRequest): string {
    return `Selected ${provider.name} using ${this.loadBalancingStrategy.type} strategy`;
  }

  private async logProviderSelection(request: AIRequest, provider: AIProvider): Promise<void> {
    // This would be implemented to log the selection for analytics
    logger.debug(`Selected provider ${provider.name} for request ${request.id}`);
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  private startRateLimitResets(): void {
    this.rateLimitResetInterval = setInterval(() => {
      this.resetRateLimits();
    }, 60000); // Reset every minute
  }

  private startRequestProcessing(): void {
    // This would start a background processor for queued requests
    setInterval(async () => {
      const request = await this.processNextRequest();
      if (request) {
        // Process the request
        logger.debug(`Processing queued request ${request.id}`);
      }
    }, 100); // Check queue every 100ms
  }

  private async performHealthChecks(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        const startTime = Date.now();
        
        // Perform health check (this would be implemented based on provider type)
        const isHealthy = await this.checkProviderHealth(provider);
        const responseTime = Date.now() - startTime;
        
        await this.updateProviderHealth(provider.id, {
          isHealthy,
          lastCheck: new Date(),
          responseTime
        });
      } catch (error) {
        logger.error(`Health check failed for provider ${provider.name}:`, error);
        await this.updateProviderHealth(provider.id, {
          isHealthy: false,
          lastCheck: new Date()
        });
      }
    }
  }

  private async checkProviderHealth(provider: AIProvider): Promise<boolean> {
    // This would implement actual health checks based on provider type
    // For now, return true as a placeholder
    return true;
  }

  private resetRateLimits(): void {
    const now = new Date();
    for (const provider of this.providers.values()) {
      provider.rateLimit.currentRequests = 0;
      provider.rateLimit.currentTokens = 0;
      provider.rateLimit.lastReset = now;
    }
  }
}

export default AILoadBalancerService;