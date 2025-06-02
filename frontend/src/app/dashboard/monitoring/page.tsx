"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import { Badge } from "../../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  Bell, 
  Plus, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  Eye,
  Bookmark,
  X,
  Edit,
  Trash2,
  Play,
  BarChart3,
  Filter,
  Search,
  Loader2
} from "lucide-react"
import { User } from "../../../lib/auth"
import { 
  monitoringService, 
  MonitoringRule, 
  GrantAlert, 
  MonitoringStats,
  MonitoringJob
} from "../../../lib/api"

export default function MonitoringPage() {
  const [user, setUser] = useState<User | null>(null)
  const [rules, setRules] = useState<MonitoringRule[]>([])
  const [alerts, setAlerts] = useState<GrantAlert[]>([])
  const [stats, setStats] = useState<MonitoringStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateRule, setShowCreateRule] = useState(false)
  const [isCreatingRule, setIsCreatingRule] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<GrantAlert | null>(null)
  const [alertFilter, setAlertFilter] = useState<'all' | 'unread' | 'new_grant' | 'deadline_reminder'>('all')
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  // Form state for creating rules
  const [newRule, setNewRule] = useState<Partial<MonitoringRule>>({
    name: '',
    description: '',
    rule_type: 'keyword_match',
    criteria: {
      keywords: [],
      categories: [],
      amount_min: undefined,
      amount_max: undefined,
      deadline_days: 14
    },
    notification_settings: {
      email: true,
      in_app: true,
      push: false,
      frequency: 'daily'
    },
    is_active: true
  })

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    try {
      const userData = JSON.parse(userStr)
      setUser(userData)
      loadMonitoringData(userData.id)
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadMonitoringData = async (userId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [rulesResponse, alertsResponse, statsResponse] = await Promise.all([
        monitoringService.getUserRules(userId),
        monitoringService.getUserAlerts(userId, { limit: 50 }),
        monitoringService.getStats(userId)
      ])
      
      setRules(rulesResponse.rules)
      setAlerts(alertsResponse.alerts)
      setStats(statsResponse)
    } catch (error) {
      console.error('Error loading monitoring data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load monitoring data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRule = async () => {
    if (!user || !newRule.name || !newRule.rule_type) return

    try {
      setIsCreatingRule(true)
      
      const ruleData: any = {
        user_id: user.id,
        name: newRule.name,
        description: newRule.description || '',
        rule_type: newRule.rule_type,
        criteria: newRule.criteria,
        notification_settings: newRule.notification_settings,
        is_active: newRule.is_active
      }

      const createdRule = await monitoringService.createRule(ruleData)
      setRules(prev => [createdRule, ...prev])
      setShowCreateRule(false)
      setNewRule({
        name: '',
        description: '',
        rule_type: 'keyword_match',
        criteria: { keywords: [], categories: [] },
        notification_settings: {
          email: true,
          in_app: true,
          push: false,
          frequency: 'daily'
        },
        is_active: true
      })
    } catch (error) {
      console.error('Error creating rule:', error)
      setError(error instanceof Error ? error.message : 'Failed to create rule')
    } finally {
      setIsCreatingRule(false)
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await monitoringService.updateRule(ruleId, { is_active: !isActive })
      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, is_active: !isActive } : rule
      ))
    } catch (error) {
      console.error('Error toggling rule:', error)
      setError(error instanceof Error ? error.message : 'Failed to update rule')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      await monitoringService.deleteRule(ruleId)
      setRules(prev => prev.filter(rule => rule.id !== ruleId))
    } catch (error) {
      console.error('Error deleting rule:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete rule')
    }
  }

  const handleAlertAction = async (alertId: string, action: 'dismissed' | 'saved' | 'applied' | 'viewed') => {
    try {
      await monitoringService.markAlertAction(alertId, action)
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, user_action: action } : alert
      ))
    } catch (error) {
      console.error('Error updating alert:', error)
      setError(error instanceof Error ? error.message : 'Failed to update alert')
    }
  }

  const createPredefinedRules = async () => {
    if (!user) return

    try {
      const rules = await monitoringService.createPredefinedRules(user.id, [
        'new_grants', 'deadline_reminders', 'high_value'
      ])
      setRules(prev => [...rules, ...prev])
    } catch (error) {
      console.error('Error creating predefined rules:', error)
      setError(error instanceof Error ? error.message : 'Failed to create predefined rules')
    }
  }

  const runMonitoringJob = async (jobType: 'new_grants_check' | 'deadline_reminder' | 'ai_similarity_scan') => {
    try {
      await monitoringService.runJob(jobType)
      // Reload data after job completion
      if (user) {
        await loadMonitoringData(user.id)
      }
    } catch (error) {
      console.error('Error running monitoring job:', error)
      setError(error instanceof Error ? error.message : 'Failed to run monitoring job')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = alertFilter === 'all' || 
      (alertFilter === 'unread' && !alert.user_action) ||
      alert.alert_type === alertFilter

    const matchesSearch = !searchTerm || 
      alert.grant?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.match_reasons.some(reason => reason.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesFilter && matchesSearch
  })

  const ruleTemplates = monitoringService.getRuleTemplates()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Grant Monitoring & Alerts
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Zap className="w-3 h-3 mr-1" />
                    AI-Powered
                  </span>
                </h1>
                <p className="text-gray-600">
                  Automated monitoring and intelligent alerts for grant opportunities
                </p>
              </div>
              {error && (
                <div className="flex items-center text-red-600 bg-red-50 px-3 py-2 rounded-md">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Rules</p>
                      <p className="text-2xl font-bold">{stats.active_rules}</p>
                    </div>
                    <Settings className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Alerts Today</p>
                      <p className="text-2xl font-bold">{stats.total_alerts_today}</p>
                    </div>
                    <Bell className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold">{Math.round(stats.alert_success_rate * 100)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Engagement</p>
                      <p className="text-2xl font-bold">{Math.round(stats.user_engagement_score * 100)}%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="alerts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
              <TabsTrigger value="rules">Monitoring Rules</TabsTrigger>
              <TabsTrigger value="settings">Settings & Jobs</TabsTrigger>
            </TabsList>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search alerts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <select
                    value={alertFilter}
                    onChange={(e) => setAlertFilter(e.target.value as any)}
                    className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Alerts</option>
                    <option value="unread">Unread</option>
                    <option value="new_grant">New Grants</option>
                    <option value="deadline_reminder">Deadline Reminders</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600">
                  {filteredAlerts.length} alerts
                </p>
              </div>

              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <Card key={alert.id} className={`${!alert.user_action ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant={alert.alert_type === 'deadline_reminder' ? 'destructive' : 'default'}>
                              {alert.alert_type.replace('_', ' ')}
                            </Badge>
                            {alert.match_score && (
                              <Badge variant="outline">
                                {alert.match_score}% match
                              </Badge>
                            )}
                            {!alert.user_action && (
                              <Badge className="bg-blue-100 text-blue-800">New</Badge>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold mb-2">
                            {alert.grant?.title || 'Grant Alert'}
                          </h3>
                          
                          <p className="text-gray-600 mb-3">
                            {alert.grant?.description?.substring(0, 200)}...
                          </p>
                          
                          <div className="flex flex-wrap gap-1 mb-3">
                            {alert.match_reasons.slice(0, 3).map((reason, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {reason}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(alert.created_at).toLocaleDateString()}
                            {alert.grant?.deadline && (
                              <>
                                <span className="mx-2">•</span>
                                Deadline: {new Date(alert.grant.deadline).toLocaleDateString()}
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!alert.user_action && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAlertAction(alert.id, 'viewed')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAlertAction(alert.id, 'saved')}
                              >
                                <Bookmark className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAlertAction(alert.id, 'dismissed')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredAlerts.length === 0 && (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
                    <p className="text-gray-600">
                      {alertFilter === 'all' 
                        ? 'Create monitoring rules to start receiving alerts'
                        : 'No alerts match your current filter'
                      }
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Monitoring Rules</h2>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={createPredefinedRules}
                  >
                    Add Quick Setup
                  </Button>
                  <Button onClick={() => setShowCreateRule(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Rule
                  </Button>
                </div>
              </div>

              {/* Create Rule Form */}
              {showCreateRule && (
                <Card>
                  <CardHeader>
                    <CardTitle>Create Monitoring Rule</CardTitle>
                    <CardDescription>
                      Set up automated monitoring for grant opportunities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Rule Name</label>
                        <Input
                          value={newRule.name || ''}
                          onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Technology Innovation Grants"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Rule Type</label>
                        <select
                          value={newRule.rule_type}
                          onChange={(e) => setNewRule(prev => ({ ...prev, rule_type: e.target.value as any }))}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="keyword_match">Keyword Matching</option>
                          <option value="category_filter">Category Filter</option>
                          <option value="amount_range">Amount Range</option>
                          <option value="deadline_proximity">Deadline Alerts</option>
                          <option value="ai_similarity">AI Similarity</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        value={newRule.description || ''}
                        onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this rule monitors for..."
                        rows={2}
                      />
                    </div>

                    {newRule.rule_type === 'keyword_match' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
                        <Input
                          placeholder="technology, AI, innovation, startup"
                          onChange={(e) => setNewRule(prev => ({
                            ...prev,
                            criteria: {
                              ...prev.criteria,
                              keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                            }
                          }))}
                        />
                      </div>
                    )}

                    {newRule.rule_type === 'deadline_proximity' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Alert Days Before Deadline</label>
                        <Input
                          type="number"
                          value={newRule.criteria?.deadline_days || 14}
                          onChange={(e) => setNewRule(prev => ({
                            ...prev,
                            criteria: {
                              ...prev.criteria,
                              deadline_days: parseInt(e.target.value)
                            }
                          }))}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newRule.notification_settings?.email}
                            onChange={(e) => setNewRule(prev => ({
                              ...prev,
                              notification_settings: {
                                ...prev.notification_settings!,
                                email: e.target.checked
                              }
                            }))}
                            className="mr-2"
                          />
                          Email
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newRule.notification_settings?.in_app}
                            onChange={(e) => setNewRule(prev => ({
                              ...prev,
                              notification_settings: {
                                ...prev.notification_settings!,
                                in_app: e.target.checked
                              }
                            }))}
                            className="mr-2"
                          />
                          In-App
                        </label>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateRule(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateRule}
                          disabled={isCreatingRule || !newRule.name}
                        >
                          {isCreatingRule ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Create Rule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rules List */}
              <div className="space-y-4">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold">{rule.name}</h3>
                            <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">
                              {rule.rule_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {rule.description && (
                            <p className="text-gray-600 mb-3">{rule.description}</p>
                          )}
                          
                          <div className="flex items-center text-sm text-gray-500">
                            <span>Triggered {rule.trigger_count || 0} times</span>
                            {rule.last_triggered && (
                              <>
                                <span className="mx-2">•</span>
                                Last: {new Date(rule.last_triggered).toLocaleDateString()}
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleRule(rule.id!, rule.is_active)}
                          >
                            {rule.is_active ? 'Pause' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRule(rule.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {rules.length === 0 && (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No monitoring rules</h3>
                    <p className="text-gray-600 mb-4">
                      Create rules to automatically monitor for grant opportunities
                    </p>
                    <Button onClick={() => setShowCreateRule(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Rule
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Manual Monitoring Jobs</CardTitle>
                    <CardDescription>
                      Run monitoring jobs manually to check for new opportunities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      className="w-full"
                      onClick={() => runMonitoringJob('new_grants_check')}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Check for New Grants
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => runMonitoringJob('deadline_reminder')}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Run Deadline Reminders
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => runMonitoringJob('ai_similarity_scan')}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      AI Similarity Scan
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rule Templates</CardTitle>
                    <CardDescription>
                      Quick setup with predefined monitoring rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(ruleTemplates).map(([key, template]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewRule({ ...template, user_id: user.id })
                            setShowCreateRule(true)
                          }}
                        >
                          Use
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}