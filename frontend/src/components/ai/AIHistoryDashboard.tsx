'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useAIHistory, useAISync, AIInteraction } from '@/lib/store/aiStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  Star,
  StarIcon,
  MessageCircle,
  Brain,
  TrendingUp,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface AIHistoryDashboardProps {
  className?: string
}

interface InteractionStats {
  totalInteractions: number
  avgProcessingTime: number
  avgConfidence: number
  avgRating: number
  successRate: number
  mostUsedModel: string
  interactionsByType: Record<string, number>
}

export function AIHistoryDashboard({ className }: AIHistoryDashboardProps) {
  const { 
    interactionHistory, 
    isLoadingHistory, 
    lastHistorySync,
    rateInteraction,
    syncWithBackend
  } = useAIHistory()
  
  const { autoSync } = useAISync()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  // const [selectedInteraction, setSelectedInteraction] = useState<AIInteraction | null>(null)

  // Auto-sync on mount
  useEffect(() => {
    autoSync()
  }, [autoSync])

  // Calculate statistics
  const stats: InteractionStats = useMemo(() => {
    const validInteractions = interactionHistory.filter(i => i.status === 'completed')
    
    if (validInteractions.length === 0) {
      return {
        totalInteractions: 0,
        avgProcessingTime: 0,
        avgConfidence: 0,
        avgRating: 0,
        successRate: 0,
        mostUsedModel: '',
        interactionsByType: {}
      }
    }

    const totalProcessingTime = validInteractions.reduce((sum, i) => sum + (i.processingTimeMs || 0), 0)
    const totalConfidence = validInteractions.reduce((sum, i) => sum + (i.confidenceScore || 0), 0)
    const ratedInteractions = validInteractions.filter(i => i.userRating)
    const totalRating = ratedInteractions.reduce((sum, i) => sum + (i.userRating || 0), 0)
    
    const interactionsByType = validInteractions.reduce((acc, i) => {
      acc[i.interactionType] = (acc[i.interactionType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const modelCounts = validInteractions.reduce((acc, i) => {
      acc[i.modelUsed] = (acc[i.modelUsed] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostUsedModel = Object.entries(modelCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || ''

    return {
      totalInteractions: interactionHistory.length,
      avgProcessingTime: totalProcessingTime / validInteractions.length,
      avgConfidence: totalConfidence / validInteractions.length,
      avgRating: ratedInteractions.length > 0 ? totalRating / ratedInteractions.length : 0,
      successRate: (validInteractions.length / interactionHistory.length) * 100,
      mostUsedModel,
      interactionsByType
    }
  }, [interactionHistory])

  // Filter interactions
  const filteredInteractions = useMemo(() => {
    return interactionHistory.filter(interaction => {
      const matchesSearch = searchQuery === '' || 
        interaction.promptText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interaction.interactionType.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesType = typeFilter === 'all' || interaction.interactionType === typeFilter
      const matchesStatus = statusFilter === 'all' || interaction.status === statusFilter
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [interactionHistory, searchQuery, typeFilter, statusFilter])

  const handleRating = async (interactionId: string, rating: number) => {
    await rateInteraction(interactionId, rating)
  }

  const getInteractionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'grant_matching': 'Grant Matching',
      'semantic_search': 'Semantic Search',
      'grant_analysis': 'Grant Analysis',
      'content_generation': 'Content Generation',
      'document_analysis': 'Document Analysis'
    }
    return labels[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'processing': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const renderStarRating = (interaction: AIInteraction) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRating(interaction.id, star)}
            className={cn(
              "hover:scale-110 transition-transform",
              (interaction.userRating || 0) >= star ? "text-yellow-500" : "text-gray-300"
            )}
          >
            <StarIcon className="h-4 w-4 fill-current" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Interaction History</h2>
          <p className="text-muted-foreground">
            Track and analyze your AI interactions
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastHistorySync && (
            <p className="text-sm text-muted-foreground">
              Last sync: {formatDistanceToNow(new Date(lastHistorySync), { addSuffix: true })}
            </p>
          )}
          <Button 
            onClick={syncWithBackend} 
            disabled={isLoadingHistory}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingHistory && "animate-spin")} />
            Sync
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInteractions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgProcessingTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.avgConfidence * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              AI confidence score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgRating.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Average user rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Interactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search interactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="grant_matching">Grant Matching</SelectItem>
                <SelectItem value="semantic_search">Semantic Search</SelectItem>
                <SelectItem value="grant_analysis">Grant Analysis</SelectItem>
                <SelectItem value="content_generation">Content Generation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Interactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Interactions</CardTitle>
          <CardDescription>
            {filteredInteractions.length} of {interactionHistory.length} interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredInteractions.map((interaction, index) => (
                <div key={interaction.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {getInteractionTypeLabel(interaction.interactionType)}
                        </Badge>
                        <Badge className={getStatusColor(interaction.status)}>
                          {interaction.status}
                        </Badge>
                        {interaction.modelUsed && (
                          <Badge variant="secondary">
                            {interaction.modelUsed}
                          </Badge>
                        )}
                      </div>
                      
                      {interaction.promptText && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {interaction.promptText}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(interaction.createdAt), 'MMM d, HH:mm')}
                        </span>
                        {interaction.processingTimeMs && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {interaction.processingTimeMs}ms
                          </span>
                        )}
                        {interaction.confidenceScore && (
                          <span className="flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {(interaction.confidenceScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {renderStarRating(interaction)}
                      {interaction.userFeedback && (
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                  
                  {index < filteredInteractions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
            
            {filteredInteractions.length === 0 && (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {interactionHistory.length === 0
                    ? "No AI interactions yet. Start using AI features to see your history here."
                    : "No interactions match your current filters."
                  }
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Interaction Types Chart */}
      {Object.keys(stats.interactionsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interaction Types</CardTitle>
            <CardDescription>
              Breakdown of your AI usage patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.interactionsByType)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => {
                  const percentage = (count / stats.totalInteractions) * 100
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{getInteractionTypeLabel(type)}</span>
                        <span>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}