import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Mail, 
  Play, 
  RefreshCw,
  TrendingUp,
  XCircle
} from 'lucide-react';

interface AutomationMetrics {
  sources: {
    total: number;
    active: number;
    scheduled: number;
    manual: number;
  };
  jobs: {
    total_pending: number;
    total_running: number;
    total_completed: number;
    total_failed: number;
    avg_duration_seconds: number;
  };
  alerts: {
    total_alerts: number;
    unacknowledged_alerts: number;
    critical_alerts: number;
    high_alerts: number;
    alerts_last_24h: number;
  };
  performance: {
    success_rate: number;
    avg_crawl_duration: number;
    total_grants_found: number;
    sources_needing_attention: number;
  };
}

interface CrawlAlert {
  id: string;
  sourceId: string;
  sourceName: string;
  alertType: 'failure' | 'timeout' | 'low_success_rate' | 'no_recent_crawls';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

interface GrantSource {
  id: string;
  name: string;
  url: string;
  crawlSchedule: string;
  isActive: boolean;
  lastCrawled?: string;
  successCount: number;
  failureCount: number;
}

export default function AutomationMonitoringDashboard() {
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [alerts, setAlerts] = useState<CrawlAlert[]>([]);
  const [sources, setSources] = useState<GrantSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      const [metricsResponse, alertsResponse, sourcesResponse] = await Promise.all([
        fetch('/api/automation/metrics'),
        fetch('/api/automation/alerts/recent'),
        fetch('/api/automation/grant-sources')
      ]);

      if (!metricsResponse.ok || !alertsResponse.ok || !sourcesResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [metricsData, alertsData, sourcesData] = await Promise.all([
        metricsResponse.json(),
        alertsResponse.json(),
        sourcesResponse.json()
      ]);

      setMetrics(metricsData.data);
      setAlerts(alertsData.data);
      setSources(sourcesData.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/automation/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: 'admin' })
      });

      if (response.ok) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() }
            : alert
        ));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const triggerManualCrawl = async (sourceId: string) => {
    try {
      const response = await fetch('/api/automation/crawl/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId })
      });

      if (response.ok) {
        await fetchDashboardData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to trigger crawl:', err);
    }
  };

  const sendTestEmail = async () => {
    try {
      const response = await fetch('/api/automation/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@etownz.com' })
      });

      if (response.ok) {
        alert('Test email sent successfully!');
      }
    } catch (err) {
      console.error('Failed to send test email:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading automation dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSuccessRate = (source: GrantSource) => {
    const total = source.successCount + source.failureCount;
    return total > 0 ? ((source.successCount / total) * 100).toFixed(1) : '0';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automation Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring of grant discovery automation</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={sendTestEmail} variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Test Email
          </Button>
          <Button onClick={fetchDashboardData} disabled={refreshing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Active Sources</p>
                <p className="text-2xl font-bold">{metrics?.sources.active || 0}</p>
                <p className="text-xs text-gray-500">of {metrics?.sources.total || 0} total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Jobs Running</p>
                <p className="text-2xl font-bold">{metrics?.jobs.total_running || 0}</p>
                <p className="text-xs text-gray-500">{metrics?.jobs.total_pending || 0} pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold">{metrics?.alerts.unacknowledged_alerts || 0}</p>
                <p className="text-xs text-gray-500">{metrics?.alerts.critical_alerts || 0} critical</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{metrics?.performance.success_rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="sources">Grant Sources</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No active alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 border rounded-lg ${alert.acknowledged ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">
                              {alert.alertType.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {alert.sourceName}
                            </span>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!alert.acknowledged && (
                          <Button 
                            onClick={() => acknowledgeAlert(alert.id)}
                            variant="outline" 
                            size="sm"
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grant Sources Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{source.name}</h3>
                          <Badge variant={source.isActive ? "default" : "secondary"}>
                            {source.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {source.crawlSchedule}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{source.url}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Success Rate: {getSuccessRate(source)}%</span>
                          <span>Success: {source.successCount}</span>
                          <span>Failed: {source.failureCount}</span>
                          {source.lastCrawled && (
                            <span>Last: {new Date(source.lastCrawled).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => triggerManualCrawl(source.id)}
                        variant="outline" 
                        size="sm"
                        disabled={!source.isActive}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Crawl Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overall Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-medium">{metrics?.performance.success_rate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Duration</span>
                    <span className="font-medium">{metrics?.performance.avg_crawl_duration?.toFixed(0) || 0}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Grants Found</span>
                    <span className="font-medium">{metrics?.performance.total_grants_found || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-medium">{metrics?.jobs.total_pending || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Running</span>
                    <span className="font-medium">{metrics?.jobs.total_running || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-medium">{metrics?.jobs.total_completed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Failed</span>
                    <span className="font-medium">{metrics?.jobs.total_failed || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Critical</span>
                    <span className="font-medium text-red-600">{metrics?.alerts.critical_alerts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">High</span>
                    <span className="font-medium text-orange-600">{metrics?.alerts.high_alerts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last 24h</span>
                    <span className="font-medium">{metrics?.alerts.alerts_last_24h || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Unacknowledged</span>
                    <span className="font-medium">{metrics?.alerts.unacknowledged_alerts || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}