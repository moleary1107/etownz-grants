'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { aiMonitoringService } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingDown,
  Server,
  Download,
  RefreshCw,
  XCircle,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Target,
  Users
} from 'lucide-react';
import type { 
  PerformanceDashboard, 
  AIAlert, 
  CostAnalytics
} from '@/lib/api/aiMonitoringService';

interface AIMonitoringDashboardProps {
  className?: string;
}

export const AIMonitoringDashboard: React.FC<AIMonitoringDashboardProps> = ({
  className = ''
}) => {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  
  // Dashboard data
  const [dashboard, setDashboard] = useState<PerformanceDashboard | null>(null);
  const [costAnalytics, setCostAnalytics] = useState<CostAnalytics | null>(null);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  
  // Live updates
  const [realtimeMetrics, setRealtimeMetrics] = useState<Record<string, number>>({});
  const cleanupRef = useRef<(() => void) | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize dashboard
  useEffect(() => {
    loadDashboardData();
  }, [timeRange, loadDashboardData]);
  
  // Handle live mode toggle
  useEffect(() => {
    if (isLiveMode) {
      startLiveUpdates();
    } else {
      stopLiveUpdates();
    }
    
    return () => stopLiveUpdates();
  }, [isLiveMode, startLiveUpdates, stopLiveUpdates]);
  
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, costData] = await Promise.all([
        aiMonitoringService.getDashboard(timeRange),
        aiMonitoringService.getCostAnalytics(
          new Date(Date.now() - (timeRange === '1h' ? 3600000 : timeRange === '24h' ? 86400000 : timeRange === '7d' ? 604800000 : 2592000000)),
          new Date(),
          timeRange === '1h' || timeRange === '24h' ? 'day' : timeRange === '7d' ? 'week' : 'month'
        )
      ]);
      
      setDashboard(dashboardData);
      setCostAnalytics(costData);
      setAlerts(dashboardData.alerts);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Failed to load dashboard',
        description: 'Unable to fetch monitoring data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange, toast]);
  
  const startLiveUpdates = useCallback(() => {
    // Subscribe to real-time metrics
    cleanupRef.current = aiMonitoringService.subscribeToMetrics(
      (metric) => {
        setRealtimeMetrics(prev => ({
          ...prev,
          [metric.metricName]: metric.value
        }));
      },
      () => {
        console.error('Live metrics error');
        toast({
          title: 'Live updates failed',
          description: 'Connection to real-time metrics lost',
          variant: 'destructive'
        });
        setIsLiveMode(false);
      }
    );
    
    // Refresh dashboard every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      loadDashboardData();
    }, 30000);
  }, [loadDashboardData, toast]);
  
  const stopLiveUpdates = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);
  
  const exportData = useCallback(async () => {
    try {
      const blob = await aiMonitoringService.exportMetrics(
        new Date(Date.now() - 86400000), // Last 24 hours
        new Date(),
        'csv'
      );
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-metrics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Export failed',
        description: 'Unable to export metrics data',
        variant: 'destructive'
      });
    }
  }, [toast]);
  
  // const getStatusColor = (status: string): string => {
  //   switch (status) {
  //     case 'healthy': return 'text-green-600';
  //     case 'degraded': return 'text-yellow-600';
  //     case 'down': return 'text-red-600';
  //     default: return 'text-gray-600';
  //   }
  // };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              AI Monitoring Dashboard
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time performance and cost analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | '30d')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLiveMode(!isLiveMode)}
            >
              {isLiveMode ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause Live
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Go Live
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Metrics */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Total Requests</h4>
                  <p className="text-2xl font-bold">
                    {formatNumber(realtimeMetrics.totalRequests || dashboard.overview.totalRequests)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Avg Response Time</h4>
                  <p className="text-2xl font-bold">
                    {formatDuration(realtimeMetrics.avgResponseTime || dashboard.overview.avgResponseTime)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Success Rate</h4>
                  <p className="text-2xl font-bold">
                    {(realtimeMetrics.successRate || dashboard.overview.successRate).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Active Users</h4>
                  <p className="text-2xl font-bold">
                    {realtimeMetrics.activeUsers || dashboard.overview.activeUsers}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-500" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Total Cost</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(realtimeMetrics.totalCost || dashboard.overview.totalCost)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Live Status Indicator */}
        {isLiveMode && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live monitoring active
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {dashboard && (
              <>
                {/* Provider Health */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Provider Health Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {dashboard.providers.map((provider) => (
                      <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(provider.status)}
                          <span className="font-medium">{provider.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{provider.uptime.toFixed(1)}% uptime</p>
                          <p className="text-xs text-muted-foreground">{formatDuration(provider.latency)} latency</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Recent Errors */}
                {dashboard.recentErrors.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-4">Recent Errors</h4>
                    <div className="space-y-2">
                      {dashboard.recentErrors.slice(0, 5).map((error, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{error.service}</p>
                            <p className="text-sm text-muted-foreground">{error.error}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(error.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            {dashboard && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.providers.map((provider) => (
                  <Card key={provider.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          {getStatusIcon(provider.status)}
                          {provider.name}
                        </h4>
                        <Badge variant={provider.status === 'healthy' ? 'default' : 'secondary'}>
                          {provider.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Uptime</p>
                          <p className="font-medium">{provider.uptime.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Latency</p>
                          <p className="font-medium">{formatDuration(provider.latency)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Error Rate</p>
                          <p className="font-medium">{provider.errorRate.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Req/Min</p>
                          <p className="font-medium">{provider.requestsPerMinute}</p>
                        </div>
                      </div>
                      
                      <Progress value={provider.uptime} className="h-2" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            {dashboard && (
              <div className="space-y-4">
                {dashboard.services.map((service) => (
                  <Card key={service.service} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{service.service}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={service.successRate > 95 ? 'default' : 'secondary'}>
                            {service.successRate.toFixed(1)}% success
                          </Badge>
                          <Badge variant="outline">
                            {formatCurrency(service.totalCost)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Requests</p>
                          <p className="font-medium">{formatNumber(service.totalRequests)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Response</p>
                          <p className="font-medium">{formatDuration(service.avgResponseTime)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">P95</p>
                          <p className="font-medium">{formatDuration(service.p95ResponseTime)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Errors</p>
                          <p className="font-medium">{service.errorCount}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            {costAnalytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Total Cost</h4>
                    <p className="text-2xl font-bold">{formatCurrency(costAnalytics.totalCost)}</p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Projected Monthly</h4>
                    <p className="text-2xl font-bold">{formatCurrency(costAnalytics.projectedMonthlyCost)}</p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Potential Savings</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(costAnalytics.savingsOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0))}
                    </p>
                  </Card>
                </div>

                {/* Cost by Service */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Cost by Service</h4>
                  <div className="space-y-3">
                    {Object.entries(costAnalytics.costByService).map(([service, cost]) => (
                      <div key={service} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{service}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${(cost / costAnalytics.totalCost) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-16 text-right">
                            {formatCurrency(cost)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Savings Opportunities */}
                {costAnalytics.savingsOpportunities.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-4">Savings Opportunities</h4>
                    <div className="space-y-3">
                      {costAnalytics.savingsOpportunities.map((opportunity, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                          <TrendingDown className="h-4 w-4 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{opportunity.description}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-green-600 font-medium">
                                Save {formatCurrency(opportunity.potentialSavings)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {opportunity.effort} effort
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="space-y-4">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <Card key={alert.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(alert.severity)}
                          <div>
                            <h4 className="font-medium">{alert.alertName}</h4>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {alert.severity}
                          </Badge>
                          <Badge variant={alert.status === 'firing' ? 'destructive' : 'default'}>
                            {alert.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Condition</p>
                          <p className="font-medium">{alert.condition}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Value</p>
                          <p className="font-medium">{alert.currentValue}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Threshold</p>
                          <p className="font-medium">{alert.thresholdValue}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fired At</p>
                          <p className="font-medium">{new Date(alert.firedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">No active alerts. System is running smoothly!</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};