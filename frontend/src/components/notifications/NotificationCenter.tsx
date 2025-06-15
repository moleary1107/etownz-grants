"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Bell, 
  CheckCircle, 
 
  Info, 
  X, 
  Clock, 
  FileText,
  DollarSign,
  Users,
  Zap,
} from 'lucide-react'
import { User } from '../../lib/auth'

export interface Notification {
  id: string
  type: 'deadline' | 'application' | 'grant' | 'system' | 'ai_insight' | 'team'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionText?: string
  data?: Record<string, unknown>
}

interface NotificationCenterProps {
  user: User
  notifications: Notification[]
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onDismiss: (notificationId: string) => void
  className?: string
}

const NOTIFICATION_ICONS = {
  deadline: Clock,
  application: FileText,
  grant: DollarSign,
  system: Info,
  ai_insight: Zap,
  team: Users
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
}

const PRIORITY_BORDERS = {
  low: 'border-gray-200',
  medium: 'border-blue-200',
  high: 'border-orange-200',
  urgent: 'border-red-300'
}

export function NotificationCenter({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onDismiss,
  className = ""
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')

  const unreadCount = notifications.filter(n => !n.read).length
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.read).length

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read
      case 'urgent':
        return notification.priority === 'urgent'
      default:
        return true
    }
  }).sort((a, b) => {
    // Sort by priority first, then by timestamp
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const aPriority = priorityOrder[a.priority]
    const bPriority = priorityOrder[b.priority]
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return timestamp.toLocaleDateString()
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-screen-sm z-50">
          <Card className="shadow-lg border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <CardDescription>
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                    {urgentCount > 0 && (
                      <span className="ml-2 text-red-600 font-medium">
                        {urgentCount} urgent
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-1 mt-3">
                {[
                  { key: 'all', label: 'All', count: notifications.length },
                  { key: 'unread', label: 'Unread', count: unreadCount },
                  { key: 'urgent', label: 'Urgent', count: urgentCount }
                ].map(({ key, label, count }) => (
                  <Button
                    key={key}
                    variant={filter === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(key as 'all' | 'unread' | 'urgent')}
                    className="text-xs"
                  >
                    {label} {count > 0 && <span className="ml-1">({count})</span>}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Action Buttons */}
              {unreadCount > 0 && (
                <div className="px-4 pb-3 border-b">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onMarkAllAsRead}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark all as read
                  </Button>
                </div>
              )}

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {filter === 'all' ? 'No notifications yet' : 
                       filter === 'unread' ? 'No unread notifications' : 
                       'No urgent notifications'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => {
                      const IconComponent = NOTIFICATION_ICONS[notification.type]
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                            !notification.read ? 'bg-blue-50' : ''
                          } ${PRIORITY_BORDERS[notification.priority]}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <IconComponent className={`h-5 w-5 ${
                                notification.priority === 'urgent' ? 'text-red-500' :
                                notification.priority === 'high' ? 'text-orange-500' :
                                notification.priority === 'medium' ? 'text-blue-500' :
                                'text-gray-500'
                              }`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-sm font-medium ${
                                  !notification.read ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notification.title}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${PRIORITY_COLORS[notification.priority]}`}
                                  >
                                    {notification.priority}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDismiss(notification.id)
                                    }}
                                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                                
                                {notification.actionText && notification.actionUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.location.href = notification.actionUrl!
                                    }}
                                  >
                                    {notification.actionText}
                                  </Button>
                                )}
                              </div>
                              
                              {!notification.read && (
                                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Hook for generating mock notifications
export function useMockNotifications(user: User): Notification[] {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // Generate mock notifications based on user role
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'deadline',
        priority: 'urgent',
        title: 'Grant Deadline Approaching',
        message: 'SFI Discover Programme deadline is in 2 days. Complete your application soon.',
        timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
        read: false,
        actionUrl: '/dashboard/applications',
        actionText: 'View Application'
      },
      {
        id: '2',
        type: 'ai_insight',
        priority: 'medium',
        title: 'AI Recommendation',
        message: 'New grants matching your profile have been found. Success probability: 87%',
        timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
        read: false,
        actionUrl: '/dashboard/grants',
        actionText: 'View Grants'
      },
      {
        id: '3',
        type: 'application',
        priority: 'high',
        title: 'Application Status Update',
        message: 'Your Enterprise Ireland Innovation Grant application is under review.',
        timestamp: new Date(Date.now() - 4 * 60 * 60000), // 4 hours ago
        read: true,
        actionUrl: '/dashboard/applications',
        actionText: 'Check Status'
      },
      {
        id: '4',
        type: 'grant',
        priority: 'medium',
        title: 'New Grant Opportunity',
        message: 'Dublin City Council Community Innovation Fund is now open for applications.',
        timestamp: new Date(Date.now() - 24 * 60 * 60000), // 1 day ago
        read: false,
        actionUrl: '/dashboard/grants',
        actionText: 'Learn More'
      },
      {
        id: '5',
        type: 'system',
        priority: 'low',
        title: 'System Update',
        message: 'New AI writing features have been added to improve your applications.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60000), // 2 days ago
        read: true,
        actionUrl: '/dashboard/ai-writing',
        actionText: 'Explore Features'
      }
    ]

    // Filter notifications based on user role
    const roleBasedNotifications = mockNotifications.filter(notification => {
      if (user.role === 'viewer') {
        return notification.type === 'grant' || notification.type === 'system'
      }
      return true
    })

    setNotifications(roleBasedNotifications)
  }, [user])

  return notifications
}