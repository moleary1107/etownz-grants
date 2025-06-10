"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "../../../components/layout/Sidebar"
import { AdvancedAIWritingAssistant } from "../../../components/ai/AdvancedAIWritingAssistant"
import { User } from "../../../lib/auth"

export default function AdvancedAIWritingPage() {
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

  const handleSave = (project: any) => {
    console.log('Project saved:', project)
    // Could sync with backend API
  }

  const handleExport = (project: any, format: 'pdf' | 'docx' | 'txt') => {
    console.log('Exporting project:', { project, format })
    // Could trigger document export
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
                  Advanced AI Writing Assistant
                </h1>
                <p className="text-gray-600 mt-2">
                  Professional-grade AI-powered writing with real-time optimization and collaborative editing
                </p>
              </div>
            </div>
          </div>

          {/* Advanced AI Writing Assistant Component */}
          <AdvancedAIWritingAssistant
            user={user}
            onSave={handleSave}
            onExport={handleExport}
            className="max-w-none"
          />
        </div>
      </div>
    </div>
  )
}