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
  Sparkles
} from "lucide-react"
import { Button } from "../ui/button"
import { UserRole, hasPermission, User } from "../../lib/auth"
import { cn } from "../../lib/utils"

interface SidebarProps {
  user: User
  onLogout: () => void
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: null // Available to all
    },
    {
      name: "Grants Discovery",
      href: "/dashboard/grants",
      icon: Search,
      permission: null // Available to all
    },
    {
      name: "Applications",
      href: "/dashboard/applications",
      icon: FileText,
      permission: "canViewApplications"
    },
    {
      name: "Compliance Checker",
      href: "/dashboard/compliance",
      icon: Shield,
      permission: null // Available to all
    },
    {
      name: "Budget Optimizer",
      href: "/dashboard/budget-optimization",
      icon: Calculator,
      permission: null // Available to all
    },
    {
      name: "Monitoring & Alerts",
      href: "/dashboard/monitoring",
      icon: Bell,
      permission: null // Available to all
    },
    {
      name: "AI Grant Matching",
      href: "/dashboard/ai-matching",
      icon: Brain,
      permission: null // Available to all
    },
    {
      name: "Semantic Search",
      href: "/dashboard/semantic-search",
      icon: Brain,
      permission: null // Available to all
    },
    {
      name: "AI Document Analysis",
      href: "/dashboard/ai-document-analysis",
      icon: FileText,
      permission: null // Available to all
    },
    {
      name: "Personalized Recommendations",
      href: "/dashboard/personalized-recommendations",
      icon: Sparkles,
      permission: null // Available to all
    },
    {
      name: "Grant Intelligence",
      href: "/dashboard/grant-intelligence",
      icon: Brain,
      permission: "canAccessAnalytics" // Require higher permission for AI features
    },
    {
      name: "Content Templates",
      href: "/dashboard/templates",
      icon: FileText,
      permission: "canAccessAnalytics" // Require higher permission for AI features
    },
    {
      name: "Knowledge Base",
      href: "/dashboard/knowledge-base",
      icon: Database,
      permission: "canAccessAnalytics" // Require higher permission
    },
    {
      name: "Web Scraping",
      href: "/dashboard/scraping",
      icon: Zap,
      permission: "canAccessAnalytics"
    },
    {
      name: "Organization Analysis",
      href: "/dashboard/organization-analysis",
      icon: Building,
      permission: "canAccessAnalytics"
    },
    {
      name: "Organizations",
      href: "/dashboard/organizations",
      icon: Building,
      permission: "canViewAllOrganizations"
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: Users,
      permission: "canManageAllUsers"
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      permission: "canAccessAnalytics"
    },
    {
      name: "Deadlines",
      href: "/dashboard/deadlines",
      icon: Clock,
      permission: null // Available to all
    }
  ].filter(item => !item.permission || hasPermission(user, item.permission as keyof typeof import("../../lib/auth").ROLE_PERMISSIONS[keyof typeof import("../../lib/auth").ROLE_PERMISSIONS]))

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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
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
        })}
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
      <div className="hidden lg:flex h-full w-64 flex-col bg-white border-r border-gray-200">
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
          <div className="relative flex w-64 flex-col bg-white">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}