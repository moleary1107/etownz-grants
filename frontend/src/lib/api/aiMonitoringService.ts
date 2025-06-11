/**
 * AI Monitoring Service
 * Real-time monitoring and analytics for AI services
 */

export interface AIMetric {
  id: string;
  metricName: string;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface AIAlert {
  id: string;
  alertName: string;
  severity: 'critical' | 'warning' | 'info';
  condition: string;
  currentValue: number;
  thresholdValue: number;
  status: 'firing' | 'resolved';
  firedAt: Date;
  resolvedAt?: Date;
  description: string;
}

export interface ProviderStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  latency: number;
  errorRate: number;
  requestsPerMinute: number;
}

export interface ServiceMetrics {
  service: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  totalCost: number;
  errorCount: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface ModelUsage {
  model: string;
  provider: string;
  requestCount: number;
  tokenCount: number;
  totalCost: number;
  avgTokensPerRequest: number;
  errorRate: number;
}

export interface CostAnalytics {
  totalCost: number;
  costByService: Record<string, number>;
  costByModel: Record<string, number>;
  costTrend: Array<{ date: string; cost: number }>;
  projectedMonthlyCost: number;
  savingsOpportunities: Array<{
    description: string;
    potentialSavings: number;
    effort: 'low' | 'medium' | 'high';
  }>;
}

export interface PerformanceDashboard {
  overview: {
    totalRequests: number;
    avgResponseTime: number;
    successRate: number;
    activeUsers: number;
    totalCost: number;
  };
  providers: ProviderStatus[];
  services: ServiceMetrics[];
  models: ModelUsage[];
  alerts: AIAlert[];
  recentErrors: Array<{
    timestamp: Date;
    service: string;
    error: string;
    context: Record<string, any>;
  }>;
}

export class AIMonitoringService {
  private baseUrl: string;
  private headers: () => Record<string, string>;
  private eventSource: EventSource | null = null;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://grants.etownz.com/api' 
      : 'http://localhost:8001';
    this.headers = () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return headers;
    };
  }

  /**
   * Get performance dashboard
   */
  async getDashboard(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<PerformanceDashboard> {
    const response = await fetch(`${this.baseUrl}/ai-monitoring/dashboard?timeRange=${timeRange}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard');
    }

    return response.json();
  }

  /**
   * Get metrics for a specific service
   */
  async getServiceMetrics(
    service: string,
    startTime: Date,
    endTime: Date,
    granularity: '1m' | '5m' | '1h' | '1d' = '5m'
  ): Promise<AIMetric[]> {
    const params = new URLSearchParams({
      service,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      granularity
    });

    const response = await fetch(`${this.baseUrl}/ai-monitoring/metrics?${params}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }

    return response.json();
  }

  /**
   * Get active alerts
   */
  async getAlerts(severity?: 'critical' | 'warning' | 'info'): Promise<AIAlert[]> {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);

    const response = await fetch(`${this.baseUrl}/ai-monitoring/alerts?${params}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch alerts');
    }

    return response.json();
  }

  /**
   * Get cost analytics
   */
  async getCostAnalytics(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<CostAnalytics> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy
    });

    const response = await fetch(`${this.baseUrl}/ai-monitoring/cost-analytics?${params}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cost analytics');
    }

    return response.json();
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<ProviderStatus[]> {
    const response = await fetch(`${this.baseUrl}/ai-monitoring/provider-health`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch provider health');
    }

    return response.json();
  }

  /**
   * Create a custom alert
   */
  async createAlert(alert: {
    name: string;
    metric: string;
    condition: 'above' | 'below';
    threshold: number;
    severity: 'critical' | 'warning' | 'info';
    description?: string;
  }): Promise<{ id: string; success: boolean }> {
    const response = await fetch(`${this.baseUrl}/ai-monitoring/alerts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(alert)
    });

    if (!response.ok) {
      throw new Error('Failed to create alert');
    }

    return response.json();
  }

  /**
   * Subscribe to real-time metrics
   */
  subscribeToMetrics(
    onMetric: (metric: AIMetric) => void,
    onError?: (error: Error) => void
  ): () => void {
    const token = localStorage.getItem('token');
    const url = new URL(`${this.baseUrl}/ai-monitoring/stream`);
    if (token) {
      url.searchParams.append('token', token);
    }

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onmessage = (event) => {
      try {
        const metric = JSON.parse(event.data);
        onMetric(metric);
      } catch (error) {
        onError?.(new Error('Failed to parse metric'));
      }
    };

    this.eventSource.onerror = (error) => {
      onError?.(new Error('Connection lost'));
    };

    // Return cleanup function
    return () => {
      this.eventSource?.close();
      this.eventSource = null;
    };
  }

  /**
   * Get error logs
   */
  async getErrorLogs(
    service?: string,
    startTime?: Date,
    limit: number = 100
  ): Promise<Array<{
    timestamp: Date;
    service: string;
    error: string;
    context: Record<string, any>;
    stackTrace?: string;
  }>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (service) params.append('service', service);
    if (startTime) params.append('startTime', startTime.toISOString());

    const response = await fetch(`${this.baseUrl}/ai-monitoring/errors?${params}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch error logs');
    }

    return response.json();
  }

  /**
   * Export metrics data
   */
  async exportMetrics(
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      format
    });

    const response = await fetch(`${this.baseUrl}/ai-monitoring/export?${params}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to export metrics');
    }

    return response.blob();
  }

  /**
   * Test alert configuration
   */
  async testAlert(alertId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/ai-monitoring/alerts/${alertId}/test`, {
      method: 'POST',
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to test alert');
    }

    return response.json();
  }
}

// Export singleton instance
export const aiMonitoringService = new AIMonitoringService();