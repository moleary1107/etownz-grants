"use client"

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Plus, 
  Search, 
  Clock, 
  FileText, 
  Zap, 
  BarChart3, 
  Settings, 
  Users,
  Building,
  Target,
  CheckCircle,
  Calendar,
  Download,
  Upload,
  Eye,
  Filter,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { User, UserRole } from '../../lib/auth'
import { useRouter } from 'next/navigation'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  badge?: string
  priority: number
  roles: UserRole[]
  category: 'primary' | 'secondary' | 'utility'
}

interface QuickActionsBarProps {
  user: User
  className?: string
  compact?: boolean
}

const QUICK_ACTIONS: QuickAction[] = [
  // Primary Actions (most important for each role)
  {
    id: 'new-application',
    title: 'New Application',
    description: 'Start a new grant application',
    icon: Plus,
    href: '/dashboard/applications/create',
    color: 'bg-green-600 hover:bg-green-700 text-white',
    priority: 1,
    roles: [UserRole.GRANT_WRITER, UserRole.ORGANIZATION_ADMIN],
    category: 'primary'
  },
  {
    id: 'find-grants',
    title: 'Find Grants',
    description: 'Discover funding opportunities',
    icon: Search,
    href: '/dashboard/grants',
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
    priority: 2,
    roles: [UserRole.GRANT_WRITER, UserRole.VIEWER, UserRole.ORGANIZATION_ADMIN],
    category: 'primary'
  },
  {
    id: 'ai-match',
    title: 'AI Grant Match',
    description: 'Get AI-powered recommendations',
    icon: Sparkles,
    href: '/dashboard/grants?ai=true',
    color: 'bg-purple-600 hover:bg-purple-700 text-white',
    badge: 'AI',
    priority: 3,
    roles: [UserRole.GRANT_WRITER, UserRole.ORGANIZATION_ADMIN],
    category: 'primary'
  },
  {
    id: 'my-applications',
    title: 'My Applications',
    description: 'View and manage applications',
    icon: FileText,
    href: '/dashboard/applications',
    color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    priority: 4,
    roles: [UserRole.GRANT_WRITER, UserRole.ORGANIZATION_ADMIN, UserRole.VIEWER],
    category: 'primary'
  },

  // Secondary Actions
  {
    id: 'deadlines',
    title: 'Deadlines',
    description: 'Track upcoming deadlines',
    icon: Clock,
    href: '/dashboard/deadlines',
    color: 'bg-orange-600 hover:bg-orange-700 text-white',
    priority: 5,
    roles: [UserRole.GRANT_WRITER, UserRole.ORGANIZATION_ADMIN],
    category: 'secondary'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'View performance metrics',
    icon: BarChart3,
    href: '/dashboard/analytics',
    color: 'bg-teal-600 hover:bg-teal-700 text-white',
    priority: 6,
    roles: [UserRole.SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN],
    category: 'secondary'
  },
  {
    id: 'team-management',
    title: 'Team',
    description: 'Manage team members',
    icon: Users,
    href: '/dashboard/users',
    color: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    priority: 7,
    roles: [UserRole.SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN],
    category: 'secondary'
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: 'Check compliance status',
    icon: CheckCircle,
    href: '/dashboard/compliance',
    color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    priority: 8,
    roles: [UserRole.GRANT_WRITER, UserRole.ORGANIZATION_ADMIN],
    category: 'secondary'
  },

  // Utility Actions
  {
    id: 'export-data',
    title: 'Export',
    description: 'Export data and reports',
    icon: Download,
    href: '/dashboard/export',
    color: 'bg-gray-600 hover:bg-gray-700 text-white',
    priority: 9,
    roles: [UserRole.SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN],
    category: 'utility'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure preferences',
    icon: Settings,
    href: '/dashboard/settings',
    color: 'bg-slate-600 hover:bg-slate-700 text-white',
    priority: 10,
    roles: [UserRole.SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.GRANT_WRITER],
    category: 'utility'
  }
]

export function QuickActionsBar({ user, className = "", compact = false }: QuickActionsBarProps) {
  const [showSecondary, setShowSecondary] = useState(false)
  const [showUtility, setShowUtility] = useState(false)
  const router = useRouter()

  const availableActions = QUICK_ACTIONS
    .filter(action => action.roles.includes(user.role))
    .sort((a, b) => a.priority - b.priority)

  const primaryActions = availableActions.filter(action => action.category === 'primary')
  const secondaryActions = availableActions.filter(action => action.category === 'secondary')
  const utilityActions = availableActions.filter(action => action.category === 'utility')

  const handleActionClick = (action: QuickAction) => {
    router.push(action.href)
  }

  const renderActionButton = (action: QuickAction, isCompact = false) => {
    const IconComponent = action.icon
    
    return (
      <Button
        key={action.id}
        onClick={() => handleActionClick(action)}
        className={`${action.color} relative ${
          isCompact 
            ? 'p-2 aspect-square' 
            : 'px-4 py-2 h-auto flex-col space-y-1'
        } transition-all duration-200 hover:scale-105 focus:scale-105`}
        title={isCompact ? `${action.title}: ${action.description}` : undefined}
      >
        <div className={`flex items-center ${isCompact ? '' : 'flex-col'} space-y-0`}>
          <IconComponent className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5 mb-1'}`} />
          {!isCompact && (
            <>
              <span className="text-sm font-medium">{action.title}</span>
              <span className="text-xs opacity-90">{action.description}</span>
            </>
          )}
        </div>
        
        {action.badge && (
          <Badge 
            variant="secondary" 
            className={`absolute -top-1 -right-1 text-xs ${
              isCompact ? 'h-4 px-1' : 'h-5 px-2'
            }`}
          >
            {action.badge}
          </Badge>
        )}
      </Button>
    )
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {primaryActions.slice(0, 4).map(action => renderActionButton(action, true))}
        
        {(secondaryActions.length > 0 || utilityActions.length > 0) && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSecondary(!showSecondary)}
              className="p-2"
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            {showSecondary && (
              <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg p-2 z-50">
                <div className="grid grid-cols-2 gap-2 min-w-48">
                  {[...secondaryActions, ...utilityActions].map(action => renderActionButton(action, true))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Target className="h-4 w-4 mr-2" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {primaryActions.map(action => renderActionButton(action))}
        </div>
      </div>

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Management
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecondary(!showSecondary)}
              className="text-xs"
            >
              {showSecondary ? 'Show Less' : 'Show More'}
              <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${showSecondary ? 'rotate-90' : ''}`} />
            </Button>
          </div>
          
          {showSecondary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {secondaryActions.map(action => renderActionButton(action))}
            </div>
          )}
        </div>
      )}

      {/* Utility Actions */}
      {utilityActions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Tools
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUtility(!showUtility)}
              className="text-xs"
            >
              {showUtility ? 'Show Less' : 'Show More'}
              <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${showUtility ? 'rotate-90' : ''}`} />
            </Button>
          </div>
          
          {showUtility && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {utilityActions.map(action => renderActionButton(action))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Context-aware quick actions hook
export function useContextualActions(user: User, currentPath: string) {
  const getContextualActions = () => {
    const actions = []
    
    // Add contextual actions based on current page
    if (currentPath.includes('/grants')) {
      actions.push({
        title: 'Apply Now',
        href: '/dashboard/applications/create',
        icon: Plus,
        color: 'bg-green-600'
      })
    }
    
    if (currentPath.includes('/applications')) {
      actions.push({
        title: 'Find More Grants',
        href: '/dashboard/grants',
        icon: Search,
        color: 'bg-blue-600'
      })
    }
    
    return actions
  }

  return getContextualActions()
}