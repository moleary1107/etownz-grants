"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "../../../components/layout/Sidebar"
import { GrantMatchingEngine } from "../../../components/ai/GrantMatchingEngine"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { 
  Brain,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  Building,
  MapPin,
  DollarSign
} from "lucide-react"
import { User } from "../../../lib/auth"

// Mock enhanced grants data for demonstration
const mockEnhancedGrants = [
  {
    id: "grant-1",
    title: "Enterprise Ireland Innovation Fund 2024",
    description: "Supporting innovative Irish companies with breakthrough technologies",
    amount: 50000,
    deadline: new Date("2024-12-15"),
    organization: "Enterprise Ireland",
    category: "Innovation",
    sector: ["technology", "manufacturing", "services"],
    eligibility: {
      organizationType: ["private", "limited"],
      minEmployees: 5,
      maxEmployees: 250,
      requiredSectors: ["technology", "innovation"],
      geographicRestrictions: ["Ireland"],
      previousFundingRestrictions: false
    },
    requirements: {
      businessPlan: true,
      financialStatements: true,
      projectProposal: true,
      teamInfo: true,
      sustainability: false,
      innovation: true
    },
    keywords: ["innovation", "technology", "R&D", "commercialization"],
    difficulty: "medium" as const,
    historicalData: {
      successRate: 35,
      averageAwardAmount: 42000,
      typicalApplicants: 180,
      processingTime: 90
    }
  },
  {
    id: "grant-2",
    title: "Science Foundation Ireland Discover Programme",
    description: "Fundamental research funding for scientific discovery",
    amount: 25000,
    deadline: new Date("2024-11-30"),
    organization: "Science Foundation Ireland",
    category: "Research",
    sector: ["research", "academia", "biotech"],
    eligibility: {
      organizationType: ["academic", "research", "private"],
      requiredSectors: ["research", "science"],
      geographicRestrictions: ["Ireland"]
    },
    requirements: {
      businessPlan: false,
      financialStatements: false,
      projectProposal: true,
      teamInfo: true,
      sustainability: true,
      innovation: true
    },
    keywords: ["research", "discovery", "science", "fundamental"],
    difficulty: "hard" as const,
    historicalData: {
      successRate: 15,
      averageAwardAmount: 23000,
      typicalApplicants: 320,
      processingTime: 120
    }
  },
  {
    id: "grant-3",
    title: "Dublin City Council Business Support Grant",
    description: "Local business development and community impact funding",
    amount: 15000,
    deadline: new Date("2024-10-31"),
    organization: "Dublin City Council",
    category: "Local Development",
    sector: ["retail", "services", "community"],
    eligibility: {
      organizationType: ["private", "social-enterprise"],
      maxEmployees: 50,
      requiredSectors: ["local-business"],
      geographicRestrictions: ["Dublin"]
    },
    requirements: {
      businessPlan: true,
      financialStatements: true,
      projectProposal: false,
      teamInfo: false,
      sustainability: true,
      innovation: false
    },
    keywords: ["local", "community", "business", "development"],
    difficulty: "easy" as const,
    historicalData: {
      successRate: 55,
      averageAwardAmount: 12000,
      typicalApplicants: 80,
      processingTime: 45
    }
  },
  {
    id: "grant-4",
    title: "Horizon Europe Digital Transformation",
    description: "EU funding for digital innovation and transformation projects",
    amount: 100000,
    deadline: new Date("2025-01-20"),
    organization: "Horizon Europe",
    category: "Digital Innovation",
    sector: ["technology", "digital", "AI"],
    eligibility: {
      organizationType: ["private", "academic", "consortium"],
      minEmployees: 10,
      requiredSectors: ["technology", "digital"],
      geographicRestrictions: ["EU", "Ireland"]
    },
    requirements: {
      businessPlan: true,
      financialStatements: true,
      projectProposal: true,
      teamInfo: true,
      sustainability: true,
      innovation: true
    },
    keywords: ["digital", "transformation", "AI", "innovation", "EU"],
    difficulty: "expert" as const,
    historicalData: {
      successRate: 8,
      averageAwardAmount: 85000,
      typicalApplicants: 450,
      processingTime: 180
    }
  },
  {
    id: "grant-5",
    title: "SEAI Sustainable Energy Communities Grant",
    description: "Supporting community-led sustainable energy projects",
    amount: 30000,
    deadline: new Date("2024-11-15"),
    organization: "SEAI",
    category: "Sustainability",
    sector: ["energy", "sustainability", "community"],
    eligibility: {
      organizationType: ["community", "social-enterprise", "private"],
      requiredSectors: ["energy", "sustainability"],
      geographicRestrictions: ["Ireland"]
    },
    requirements: {
      businessPlan: true,
      financialStatements: false,
      projectProposal: true,
      teamInfo: true,
      sustainability: true,
      innovation: false
    },
    keywords: ["sustainable", "energy", "community", "renewable"],
    difficulty: "medium" as const,
    historicalData: {
      successRate: 42,
      averageAwardAmount: 27000,
      typicalApplicants: 120,
      processingTime: 75
    }
  }
]

// Mock organization profile for demonstration
const mockOrganizationProfile = {
  type: "private",
  employees: 25,
  sectors: ["technology", "services"],
  annualRevenue: 500000,
  location: "Dublin",
  previousGrants: 2,
  innovationCapability: "high",
  capabilities: {
    businessPlan: true,
    financialStatements: true,
    projectProposal: true,
    teamInfo: true,
    sustainability: false,
    innovation: true
  }
}

export default function AIMatchingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [organizationProfile, setOrganizationProfile] = useState(mockOrganizationProfile)
  const [profileComplete, setProfileComplete] = useState(false)
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
      checkProfileCompleteness()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const checkProfileCompleteness = () => {
    const requiredFields = ['type', 'employees', 'sectors', 'location']
    const complete = requiredFields.every(field => organizationProfile[field as keyof typeof organizationProfile])
    setProfileComplete(complete)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleMatchesFound = (matches: any[]) => {
    console.log('Grant matches found:', matches)
    // Could trigger notifications, save to database, etc.
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Brain className="h-8 w-8 mr-3 text-purple-600" />
                  AI Grant Matching
                </h1>
                <p className="text-gray-600 mt-2">
                  Advanced machine learning algorithms to find your perfect grant opportunities
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/organization-analysis')}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Update Profile</span>
              </Button>
            </div>
          </div>

          {/* Profile Status */}
          {!profileComplete && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-orange-900 mb-1">
                      Complete Your Organization Profile
                    </h3>
                    <p className="text-orange-800 text-sm mb-3">
                      A complete profile enables more accurate AI matching. Please update your organization details.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dashboard/organization-analysis')}
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      Complete Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {profileComplete && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-1">
                      Profile Ready for AI Analysis
                    </h3>
                    <p className="text-green-800 text-sm">
                      Your organization profile is complete and optimized for accurate grant matching.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organization Profile Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Your Organization Profile
              </CardTitle>
              <CardDescription>
                Current profile used for AI matching analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Organization Type</p>
                    <p className="font-medium capitalize">{organizationProfile.type}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Employees</p>
                    <p className="font-medium">{organizationProfile.employees}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{organizationProfile.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Annual Revenue</p>
                    <p className="font-medium">€{organizationProfile.annualRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Sectors</p>
                <div className="flex flex-wrap gap-2">
                  {organizationProfile.sectors.map((sector, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Grant Matching Engine */}
          <GrantMatchingEngine
            user={user}
            organizationProfile={organizationProfile}
            grants={mockEnhancedGrants}
            onMatchFound={handleMatchesFound}
          />
        </div>
      </div>
    </div>
  )
}