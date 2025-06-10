"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { 
  WifiOff, 
  RefreshCw, 
  FileText, 
  Clock,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Database
} from "lucide-react"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [cachedData, setCachedData] = useState<any>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Check if we're back online
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    setIsOnline(navigator.onLine)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Try to load cached data
    loadCachedData()
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadCachedData = async () => {
    try {
      // Try to get cached data from localStorage or IndexedDB
      const cached = localStorage.getItem('offline-dashboard-data')
      if (cached) {
        setCachedData(JSON.parse(cached))
      }
    } catch (error) {
      console.error('Error loading cached data:', error)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    window.location.reload()
  }

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard'
  }

  if (isOnline) {
    // Redirect to dashboard if back online
    handleGoToDashboard()
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Offline</h1>
          <p className="text-gray-600">
            No internet connection detected. Don't worry, you can still access some features.
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Smartphone className="h-5 w-5 mr-2" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Offline Mode</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={retryCount >= 3}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry ({retryCount}/3)</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Database className="h-5 w-5 mr-2" />
              Available Offline
            </CardTitle>
            <CardDescription>
              These features work without an internet connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Cached Dashboard</p>
                <p className="text-xs text-gray-500">View your last loaded dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Draft Applications</p>
                <p className="text-xs text-gray-500">Continue working on saved drafts</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Cached Grant List</p>
                <p className="text-xs text-gray-500">Browse previously loaded grants</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Local Notes</p>
                <p className="text-xs text-gray-500">Take notes that sync when online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cached Data Preview */}
        {cachedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                Your Last Session
              </CardTitle>
              <CardDescription>
                Cached from your last online session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {cachedData.activeApplications || 0}
                  </div>
                  <div className="text-xs text-gray-500">Applications</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {cachedData.upcomingDeadlines || 0}
                  </div>
                  <div className="text-xs text-gray-500">Deadlines</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleGoToDashboard}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Cached Dashboard
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard/applications'}
            className="w-full"
          >
            <Clock className="h-4 w-4 mr-2" />
            Continue Draft Applications
          </Button>
        </div>

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Offline Tips</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Your work is automatically saved locally</li>
                  <li>• Changes will sync when you're back online</li>
                  <li>• Use mobile data if WiFi isn't available</li>
                  <li>• Check your connection and try refreshing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-retry indicator */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Automatically checking for connection...
          </p>
        </div>
      </div>
    </div>
  )
}