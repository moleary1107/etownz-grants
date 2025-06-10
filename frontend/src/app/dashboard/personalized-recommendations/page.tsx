"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "../../../components/layout/Sidebar"
import { PersonalizedGrantRecommendations } from "../../../components/ai/PersonalizedGrantRecommendations"
import { User } from "../../../lib/auth"

export default function PersonalizedRecommendationsPage() {
  const [user, setUser] = useState<User | null>(null)
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
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleRecommendationBookmark = (recommendationId: string, bookmarked: boolean) => {
    console.log('Recommendation bookmarked:', { recommendationId, bookmarked })
    // Could sync with backend API
  }

  const handleRecommendationFeedback = (recommendationId: string, feedback: 'relevant' | 'not_relevant') => {
    console.log('Recommendation feedback:', { recommendationId, feedback })
    // Could send feedback to improve ML models
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Personalized Recommendations
                </h1>
                <p className="text-gray-600 mt-2">
                  AI-powered grant discovery tailored specifically to your organization and success patterns
                </p>
              </div>
            </div>
          </div>

          {/* Personalized Grant Recommendations Component */}
          <PersonalizedGrantRecommendations
            user={user}
            onRecommendationBookmark={handleRecommendationBookmark}
            onRecommendationFeedback={handleRecommendationFeedback}
            className="max-w-none"
          />
        </div>
      </div>
    </div>
  )
}