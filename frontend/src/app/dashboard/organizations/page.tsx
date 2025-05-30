"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  Plus,
  Search, 
  Building, 
  Users, 
  MapPin,
  Globe,
  Edit,
  Shield,
  CheckCircle,
  AlertCircle,
  MoreVertical
} from "lucide-react"
import { User, UserRole, hasPermission, Organization } from "../../../lib/auth"

interface OrganizationWithStats extends Organization {
  activeUsers: number
  totalApplications: number
  fundingSecured: number
  lastActivity: Date
}

export default function OrganizationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSector, setSelectedSector] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

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
      
      // Check if user has permission to view organizations
      if (!hasPermission(userData, 'canViewAllOrganizations') && userData.role !== UserRole.ORGANIZATION_ADMIN) {
        router.push('/dashboard')
        return
      }
      
      loadOrganizations()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadOrganizations = async () => {
    try {
      // Mock organizations data - replace with actual API call
      const mockOrganizations: OrganizationWithStats[] = [
        {
          id: '1',
          name: 'TechStart Ireland',
          description: 'Innovative technology startup focused on AI solutions for healthcare',
          location: 'Dublin',
          sector: 'Technology',
          size: '11-50',
          website: 'https://techstart.ie',
          verified: true,
          createdAt: new Date('2023-06-15'),
          activeUsers: 8,
          totalApplications: 12,
          fundingSecured: 125000,
          lastActivity: new Date('2024-01-25')
        },
        {
          id: '2',
          name: 'Dublin Community Center',
          description: 'Non-profit organization providing community services and education programs',
          location: 'Dublin',
          sector: 'Non-Profit',
          size: '1-10',
          website: 'https://dublincc.ie',
          verified: true,
          createdAt: new Date('2022-03-20'),
          activeUsers: 5,
          totalApplications: 8,
          fundingSecured: 45000,
          lastActivity: new Date('2024-01-20')
        },
        {
          id: '3',
          name: 'Cork Research Institute',
          description: 'Leading research institution specializing in renewable energy and sustainability',
          location: 'Cork',
          sector: 'Research',
          size: '51-200',
          website: 'https://corkresearch.ie',
          verified: true,
          createdAt: new Date('2021-09-10'),
          activeUsers: 25,
          totalApplications: 35,
          fundingSecured: 450000,
          lastActivity: new Date('2024-01-24')
        },
        {
          id: '4',
          name: 'Green Earth Initiative',
          description: 'Environmental organization working on climate action and sustainable development',
          location: 'Galway',
          sector: 'Environment',
          size: '11-50',
          website: 'https://greenearth.ie',
          verified: false,
          createdAt: new Date('2023-11-05'),
          activeUsers: 3,
          totalApplications: 2,
          fundingSecured: 0,
          lastActivity: new Date('2024-01-18')
        },
        {
          id: '5',
          name: 'MedTech Innovations',
          description: 'Medical device company developing cutting-edge diagnostic equipment',
          location: 'Limerick',
          sector: 'Healthcare',
          size: '11-50',
          website: 'https://medtechinnovations.ie',
          verified: true,
          createdAt: new Date('2022-12-08'),
          activeUsers: 12,
          totalApplications: 18,
          fundingSecured: 280000,
          lastActivity: new Date('2024-01-26')
        }
      ]

      setOrganizations(mockOrganizations)
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const getSectorColor = (sector: string) => {
    switch (sector.toLowerCase()) {
      case 'technology': return 'bg-blue-100 text-blue-800'
      case 'healthcare': return 'bg-red-100 text-red-800'
      case 'non-profit': return 'bg-green-100 text-green-800'
      case 'research': return 'bg-purple-100 text-purple-800'
      case 'environment': return 'bg-emerald-100 text-emerald-800'
      case 'education': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString()}`
  }

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         org.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSector = selectedSector === 'all' || org.sector.toLowerCase() === selectedSector.toLowerCase()
    
    return matchesSearch && matchesSector
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'funding':
        return b.fundingSecured - a.fundingSecured
      case 'users':
        return b.activeUsers - a.activeUsers
      case 'applications':
        return b.totalApplications - a.totalApplications
      case 'activity':
        return b.lastActivity.getTime() - a.lastActivity.getTime()
      default:
        return 0
    }
  })

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Organizations
              </h1>
              <p className="text-gray-600">
                {user.role === UserRole.SUPER_ADMIN 
                  ? "Manage all organizations on the platform"
                  : "Manage your organization settings and users"
                }
              </p>
            </div>
            
            {hasPermission(user, 'canManageAllUsers') && (
              <Button onClick={() => router.push('/dashboard/organizations/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Sectors</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="non-profit">Non-Profit</option>
                <option value="research">Research</option>
                <option value="environment">Environment</option>
                <option value="education">Education</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="name">Name</option>
                <option value="funding">Funding Secured</option>
                <option value="users">Active Users</option>
                <option value="applications">Applications</option>
                <option value="activity">Last Activity</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                {filteredOrganizations.length} organizations found
              </div>
            </div>
          </div>

          {/* Organizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrganizations.map((organization) => (
              <Card key={organization.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getSectorColor(organization.sector)}`}>
                          {organization.sector}
                        </span>
                        {organization.verified ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        {organization.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        {organization.size} employees • {organization.location}
                      </CardDescription>
                    </div>
                    
                    {hasPermission(user, 'canManageAllUsers') && (
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {organization.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-600">{organization.activeUsers}</div>
                          <div className="text-gray-500 text-xs">Active Users</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-600">{organization.totalApplications}</div>
                          <div className="text-gray-500 text-xs">Applications</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="text-gray-500">Funding Secured:</div>
                      </div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(organization.fundingSecured)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{organization.location}</span>
                    </div>
                    
                    {organization.website && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Globe className="h-3 w-3" />
                        <a 
                          href={organization.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 truncate"
                        >
                          {organization.website.replace('https://', '')}
                        </a>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Last activity: {organization.lastActivity.toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/organizations/${organization.id}`)}
                    >
                      View Details
                    </Button>
                    
                    {(hasPermission(user, 'canManageAllUsers') || 
                      (user.organizationId === organization.id)) && (
                      <Button 
                        size="sm"
                        onClick={() => router.push(`/dashboard/organizations/${organization.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredOrganizations.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Building className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
              <p className="text-gray-600 mb-4">
                {hasPermission(user, 'canManageAllUsers')
                  ? "Get started by adding your first organization."
                  : "No organizations match your current search criteria."
                }
              </p>
              {hasPermission(user, 'canManageAllUsers') && (
                <Button onClick={() => router.push('/dashboard/organizations/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Organization
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}