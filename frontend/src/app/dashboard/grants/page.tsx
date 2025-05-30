"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  Search, 
  DollarSign, 
  MapPin,
  Clock,
  ExternalLink,
  BookmarkPlus,
  Star
} from "lucide-react"
import { User } from "../../../lib/auth"

interface Grant {
  id: string
  title: string
  description: string
  provider: string
  providerType: 'government' | 'council' | 'eu' | 'foundation'
  amount: {
    min: number
    max: number
    currency: string
  }
  deadline: Date
  location: string
  eligibility: string[]
  category: string
  url: string
  isFavorite: boolean
  matchScore: number
}

export default function GrantsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [grants, setGrants] = useState<Grant[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedProvider, setSelectedProvider] = useState("all")
  const [sortBy, setSortBy] = useState("deadline")
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
      loadGrants()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadGrants = async () => {
    try {
      // Mock grants data - replace with actual API call
      const mockGrants: Grant[] = [
        {
          id: '1',
          title: 'Enterprise Ireland R&D Fund',
          description: 'Funding for research and development projects that have clear commercial potential and involve a level of technical innovation.',
          provider: 'Enterprise Ireland',
          providerType: 'government',
          amount: { min: 25000, max: 250000, currency: 'EUR' },
          deadline: new Date('2024-03-15'),
          location: 'Ireland',
          eligibility: ['SME', 'Startup', 'Research Institution'],
          category: 'Research & Development',
          url: 'https://www.enterprise-ireland.com/en/research-innovation/companies/',
          isFavorite: false,
          matchScore: 85
        },
        {
          id: '2',
          title: 'Dublin City Council Community Grant',
          description: 'Supporting community groups and organizations in Dublin with funding for local initiatives and projects.',
          provider: 'Dublin City Council',
          providerType: 'council',
          amount: { min: 500, max: 15000, currency: 'EUR' },
          deadline: new Date('2024-02-28'),
          location: 'Dublin',
          eligibility: ['Community Group', 'Non-Profit', 'Social Enterprise'],
          category: 'Community Development',
          url: 'https://www.dublincity.ie/residential/community/community-grants',
          isFavorite: true,
          matchScore: 92
        },
        {
          id: '3',
          title: 'SFI Discover Programme',
          description: 'Science Foundation Ireland programme supporting public engagement with STEM research and education.',
          provider: 'Science Foundation Ireland',
          providerType: 'government',
          amount: { min: 1000, max: 50000, currency: 'EUR' },
          deadline: new Date('2024-04-30'),
          location: 'Ireland',
          eligibility: ['Research Institution', 'University', 'Non-Profit'],
          category: 'Education & STEM',
          url: 'https://www.sfi.ie/funding/sfi-discover/',
          isFavorite: false,
          matchScore: 78
        },
        {
          id: '4',
          title: 'Horizon Europe - EIC Accelerator',
          description: 'European Innovation Council support for high-risk, high-impact innovation with significant market potential.',
          provider: 'European Commission',
          providerType: 'eu',
          amount: { min: 500000, max: 2500000, currency: 'EUR' },
          deadline: new Date('2024-06-05'),
          location: 'EU',
          eligibility: ['SME', 'Startup'],
          category: 'Innovation',
          url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en',
          isFavorite: false,
          matchScore: 70
        },
        {
          id: '5',
          title: 'Ireland Funds Young Entrepreneur Grant',
          description: 'Supporting young entrepreneurs in Ireland with seed funding for innovative business ideas.',
          provider: 'The Ireland Funds',
          providerType: 'foundation',
          amount: { min: 5000, max: 25000, currency: 'EUR' },
          deadline: new Date('2024-05-15'),
          location: 'Ireland',
          eligibility: ['Entrepreneur', 'Startup', 'Young Professional'],
          category: 'Entrepreneurship',
          url: 'https://irelandfunds.org/',
          isFavorite: false,
          matchScore: 88
        }
      ]

      setGrants(mockGrants)
    } catch (error) {
      console.error('Error loading grants:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const toggleFavorite = (grantId: string) => {
    setGrants(prevGrants =>
      prevGrants.map(grant =>
        grant.id === grantId
          ? { ...grant, isFavorite: !grant.isFavorite }
          : grant
      )
    )
  }

  const formatAmount = (amount: Grant['amount']) => {
    if (amount.min === amount.max) {
      return `${amount.currency === 'EUR' ? '€' : '$'}${amount.min.toLocaleString()}`
    }
    return `${amount.currency === 'EUR' ? '€' : '$'}${amount.min.toLocaleString()} - ${amount.currency === 'EUR' ? '€' : '$'}${amount.max.toLocaleString()}`
  }

  const getProviderColor = (type: Grant['providerType']) => {
    switch (type) {
      case 'government': return 'bg-blue-100 text-blue-800'
      case 'council': return 'bg-green-100 text-green-800'
      case 'eu': return 'bg-purple-100 text-purple-800'
      case 'foundation': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilDeadline = (deadline: Date) => {
    const today = new Date()
    const diffTime = deadline.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredGrants = grants.filter(grant => {
    const matchesSearch = grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grant.provider.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || grant.category === selectedCategory
    const matchesProvider = selectedProvider === 'all' || grant.providerType === selectedProvider
    
    return matchesSearch && matchesCategory && matchesProvider
  }).sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        return a.deadline.getTime() - b.deadline.getTime()
      case 'amount':
        return b.amount.max - a.amount.max
      case 'match':
        return b.matchScore - a.matchScore
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Grant Discovery
            </h1>
            <p className="text-gray-600">
              Discover funding opportunities tailored to your organization
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search grants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="Research & Development">Research & Development</option>
                <option value="Community Development">Community Development</option>
                <option value="Education & STEM">Education & STEM</option>
                <option value="Innovation">Innovation</option>
                <option value="Entrepreneurship">Entrepreneurship</option>
              </select>
              
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Providers</option>
                <option value="government">Government</option>
                <option value="council">Local Council</option>
                <option value="eu">EU</option>
                <option value="foundation">Foundation</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="deadline">Deadline</option>
                  <option value="amount">Funding Amount</option>
                  <option value="match">Match Score</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600">
                {filteredGrants.length} grants found
              </div>
            </div>
          </div>

          {/* Grants Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGrants.map((grant) => {
              const daysLeft = getDaysUntilDeadline(grant.deadline)
              const isUrgent = daysLeft <= 7

              return (
                <Card key={grant.id} className="relative hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getProviderColor(grant.providerType)}`}>
                            {grant.providerType}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-gray-600">{grant.matchScore}% match</span>
                          </div>
                        </div>
                        <CardTitle className="text-lg leading-tight">{grant.title}</CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {grant.provider}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(grant.id)}
                        className="ml-2"
                      >
                        <BookmarkPlus 
                          className={`h-4 w-4 ${grant.isFavorite ? 'text-blue-600 fill-current' : 'text-gray-400'}`} 
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                      {grant.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            {formatAmount(grant.amount)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{grant.location}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className={`h-4 w-4 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {grant.eligibility.slice(0, 2).map((criteria, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {criteria}
                          </span>
                        ))}
                        {grant.eligibility.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{grant.eligibility.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button className="flex-1" size="sm">
                        Apply Now
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={grant.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredGrants.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No grants found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or filters to find more opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}