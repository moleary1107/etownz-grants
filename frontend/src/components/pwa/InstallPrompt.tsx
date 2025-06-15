"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Wifi, 
  Zap,
  Shield,
  Sparkles,
} from 'lucide-react'
import { usePWAInstallPrompt, useMobileDetection } from '../../lib/hooks/useMobileDetection'

interface InstallPromptProps {
  onInstall?: () => void
  onDismiss?: () => void
  className?: string
}

export function InstallPrompt({ onInstall, onDismiss, className = "" }: InstallPromptProps) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstallPrompt()
  const { isMobile, isIOS } = useMobileDetection()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      setIsDismissed(true)
    }
  }, [])

  const handleInstall = async () => {
    if (isIOS) {
      setShowInstructions(true)
      return
    }

    if (isInstallable) {
      const success = await promptInstall()
      if (success) {
        onInstall?.()
      }
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
    onDismiss?.()
  }

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
    return null
  }

  const features = [
    { icon: Zap, text: 'Instant loading', description: 'Works offline' },
    { icon: Shield, text: 'Secure', description: 'HTTPS encryption' },
    { icon: Smartphone, text: 'Native feel', description: 'App-like experience' },
    { icon: Wifi, text: 'Works offline', description: 'Access cached data' }
  ]

  if (showInstructions && isIOS) {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg text-blue-900">Install eTownz Grants</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-blue-700">
            Follow these steps to install the app on your iOS device:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Tap the Share button</p>
                <p className="text-xs text-blue-700">Look for the share icon in Safari&apos;s toolbar</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Select &quot;Add to Home Screen&quot;</p>
                <p className="text-xs text-blue-700">Scroll down in the share menu to find this option</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Tap &quot;Add&quot;</p>
                <p className="text-xs text-blue-700">The app will be added to your home screen</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Why install?</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {features.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <IconComponent className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-700">{feature.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-900">Install eTownz Grants</CardTitle>
              <CardDescription className="text-blue-700">
                Get the full app experience
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <div key={index} className="flex items-start space-x-2">
                <IconComponent className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{feature.text}</p>
                  <p className="text-xs text-blue-700">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {isIOS ? 'Show Instructions' : 'Install App'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            Later
          </Button>
        </div>
        
        {isMobile && (
          <div className="text-center">
            <Badge variant="outline" className="bg-white text-blue-700 border-blue-300">
              <Monitor className="h-3 w-3 mr-1" />
              {isMobile ? 'Mobile Optimized' : 'Desktop & Mobile'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for managing install prompt visibility
export function useInstallPromptManager() {
  const [showPrompt, setShowPrompt] = useState(false)
  const { isInstallable, isInstalled } = usePWAInstallPrompt()
  const [visitCount, setVisitCount] = useState(0)

  useEffect(() => {
    // Track visit count
    const visits = parseInt(localStorage.getItem('app-visits') || '0') + 1
    setVisitCount(visits)
    localStorage.setItem('app-visits', visits.toString())

    // Show prompt after 2nd visit if installable and not installed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (visits >= 2 && isInstallable && !isInstalled && !dismissed) {
      // Delay showing prompt by 3 seconds to not be intrusive
      setTimeout(() => setShowPrompt(true), 3000)
    }
  }, [isInstallable, isInstalled])

  const hidePrompt = () => {
    setShowPrompt(false)
  }

  const handleInstall = () => {
    setShowPrompt(false)
    // Track successful install
    localStorage.setItem('app-installed', 'true')
  }

  return {
    showPrompt,
    hidePrompt,
    handleInstall,
    visitCount
  }
}