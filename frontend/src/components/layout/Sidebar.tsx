"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { 
  LayoutDashboard, 
  Search, 
  FileText, 
  Users, 
  Building, 
  Settings, 
  BarChart3, 
  Clock,
  Globe,
  LogOut,
  Menu,
  X,
  Zap,
  Plus,
  Bell,
  Shield,
  Calculator,
  Brain,
  Database,
  Sparkles,
  Edit,
  MessageSquare,
  Workflow,
  GitBranch,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen
} from "lucide-react"
import { Button } from "../ui/button"
import { UserRole, hasPermission, User } from "../../lib/auth"
import { cn } from "../../lib/utils"

interface NavigationItem {
  name: string
  href?: string
  icon: React.ElementType
  permission?: string | null
  items?: NavigationItem[]
}

interface SidebarProps {
  user: User
  onLogout: () => void
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['grants-applications', 'ai-tools'])
  const pathname = usePathname()

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    )
  }

  const navigationStructure: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: null
    },
    {
      name: "Grants & Applications",
      icon: Search,
      permission: null,
      items: [
        {
          name: "Grants Discovery",
          href: "/dashboard/grants",
          icon: Search,
          permission: null
        },
        {
          name: "Grant Sources",
          href: "/dashboard/grants/sources",
          icon: Database,
          permission: null
        },
        {
          name: "Applications",
          href: "/dashboard/applications",
          icon: FileText,
          permission: "canViewApplications"
        },
        {
          name: "Deadlines",
          href: "/dashboard/deadlines",
          icon: Clock,
          permission: null
        },
        {
          name: "Content Templates",
          href: "/dashboard/templates",
          icon: FileText,
          permission: "canAccessAnalytics"
        }
      ]
    },
    {
      name: "AI Tools",
      icon: Brain,
      permission: null,
      items: [
        {
          name: "AI Grant Matching",
          href: "/dashboard/ai-matching",
          icon: Brain,
          permission: null
        },
        {
          name: "Semantic Search",
          href: "/dashboard/semantic-search",
          icon: Search,
          permission: null
        },
        {
          name: "AI Document Analysis",
          href: "/dashboard/ai-document-analysis",
          icon: FileText,
          permission: null
        },
        {
          name: "AI Writing Assistant",
          href: "/dashboard/ai-writing-advanced",
          icon: Edit,
          permission: null
        },
        {
          name: "Personalized Recommendations",
          href: "/dashboard/personalized-recommendations",
          icon: Sparkles,
          permission: null
        },
        {
          name: "Grant Intelligence",
          href: "/dashboard/grant-intelligence",
          icon: Brain,
          permission: "canAccessAnalytics"
        }
      ]
    },
    {
      name: "Workflow & Process",
      icon: Workflow,
      permission: null,
      items: [
        {
          name: "Review & Approval",
          href: "/dashboard/review-approval",
          icon: CheckCircle,
          permission: "canAccessAnalytics"
        },
        {
          name: "Workflow Management",
          href: "/dashboard/workflow-management",
          icon: Settings,
          permission: "canAccessAnalytics"
        },
        {
          name: "Workflow Automation",
          href: "/dashboard/workflow-automation",
          icon: Workflow,
          permission: null
        },
        {
          name: "Version Control",
          href: "/dashboard/version-control",
          icon: GitBranch,
          permission: null
        },
        {
          name: "Progressive Forms",
          href: "/dashboard/forms/progressive",
          icon: FileText,
          permission: null
        }
      ]
    },
    {
      name: "Compliance & Finance",
      icon: Shield,
      permission: null,
      items: [
        {
          name: "Compliance Checker",
          href: "/dashboard/compliance",
          icon: Shield,
          permission: null
        },
        {
          name: "Budget Optimizer",
          href: "/dashboard/budget-optimization",
          icon: Calculator,
          permission: null
        }
      ]
    },
    {
      name: "Collaboration",
      icon: MessageSquare,
      permission: null,
      items: [
        {
          name: "Team Collaboration",
          href: "/dashboard/collaboration",
          icon: MessageSquare,
          permission: null
        },
        {
          name: "Knowledge Base",
          href: "/dashboard/knowledge-base",
          icon: Database,
          permission: "canAccessAnalytics"
        }
      ]
    },
    {
      name: "Analytics & Monitoring",
      icon: BarChart3,
      permission: "canAccessAnalytics",
      items: [
        {
          name: "Analytics Dashboard",
          href: "/dashboard/analytics",
          icon: BarChart3,
          permission: "canAccessAnalytics"
        },
        {
          name: "Monitoring & Alerts",
          href: "/dashboard/monitoring",
          icon: Bell,
          permission: null
        },
        {
          name: "Web Scraping",
          href: "/dashboard/scraping",
          icon: Zap,
          permission: "canAccessAnalytics"
        }
      ]
    },
    {
      name: "Administration",
      icon: Building,
      permission: "canAccessAnalytics",
      items: [
        {
          name: "Organizations",
          href: "/dashboard/organizations",
          icon: Building,
          permission: "canViewAllOrganizations"
        },
        {
          name: "Organization Analysis",
          href: "/dashboard/organization-analysis",
          icon: Building,
          permission: "canAccessAnalytics"
        },
        {
          name: "Users",
          href: "/dashboard/users",
          icon: Users,
          permission: "canManageAllUsers"
        }
      ]
    }
  ]

  // Filter items based on permissions
  const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter(item => {
      if (item.permission && !hasPermission(user, item.permission as keyof typeof import("../../lib/auth").ROLE_PERMISSIONS[keyof typeof import("../../lib/auth").ROLE_PERMISSIONS])) {
        return false
      }
      if (item.items) {
        item.items = filterNavigationItems(item.items)
        return item.items.length > 0
      }
      return true
    })
  }

  const filteredNavigation = filterNavigationItems(navigationStructure)

  const NavigationSection = ({ 
    item, 
    pathname, 
    expandedSections, 
    toggleSection, 
    onItemClick 
  }: {
    item: NavigationItem
    pathname: string
    expandedSections: string[]
    toggleSection: (sectionName: string) => void
    onItemClick: () => void
  }) => {
    const sectionKey = item.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')
    const isExpanded = expandedSections.includes(sectionKey)
    
    // If it's a single item (no subitems), render as a regular link
    if (!item.items) {
      const isActive = pathname === item.href
      return (
        <Link
          href={item.href!}
          className={cn(
            "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            isActive
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
          onClick={onItemClick}
        >
          <item.icon
            className={cn(
              "mr-3 h-5 w-5",
              isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
            )}
          />
          {item.name}
        </Link>
      )
    }

    // Check if any child item is active
    const hasActiveChild = item.items.some(child => pathname === child.href)

    return (
      <div className="space-y-1">
        {/* Section Header */}
        <button
          onClick={() => toggleSection(sectionKey)}
          className={cn(
            "group w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            hasActiveChild
              ? "bg-blue-50 text-blue-700"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <item.icon
            className={cn(
              "mr-3 h-5 w-5",
              hasActiveChild ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
            )}
          />
          <span className="flex-1 text-left">{item.name}</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* Section Items */}
        {isExpanded && (
          <div className="ml-6 space-y-1">
            {item.items.map((subItem) => {
              const isActive = pathname === subItem.href
              return (
                <Link
                  key={subItem.name}
                  href={subItem.href!}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={onItemClick}
                >
                  <subItem.icon
                    className={cn(
                      "mr-3 h-4 w-4",
                      isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {subItem.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">eTownz Grants</span>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.role === UserRole.SUPER_ADMIN ? 'Super Admin' :
               user.role === UserRole.ORGANIZATION_ADMIN ? 'Org Admin' :
               user.role === UserRole.GRANT_WRITER ? 'Grant Writer' : 'Viewer'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <NavigationSection 
            key={item.name} 
            item={item} 
            pathname={pathname}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            onItemClick={() => setIsMobileMenuOpen(false)}
          />
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        <Link
          href="/dashboard/settings"
          className={cn(
            "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Settings className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
          Settings
        </Link>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          onClick={() => {
            setIsMobileMenuOpen(false)
            onLogout()
          }}
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400" />
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full w-72 flex-col bg-white border-r border-gray-200">
        <SidebarContent />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">eTownz Grants</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-white">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}