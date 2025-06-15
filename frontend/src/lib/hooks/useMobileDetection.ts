import { useState, useEffect } from 'react'

interface NetworkConnection {
  effectiveType?: string
  type?: string
}

interface ExtendedNavigator extends Navigator {
  connection?: NetworkConnection
  mozConnection?: NetworkConnection
  webkitConnection?: NetworkConnection
  standalone?: boolean
}

interface MobileDetectionResult {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  orientation: 'portrait' | 'landscape'
  userAgent: {
    isIOS: boolean
    isAndroid: boolean
    isSafari: boolean
    isChrome: boolean
    isFirefox: boolean
  }
  capabilities: {
    supportsTouch: boolean
    supportsHover: boolean
    supportsServiceWorker: boolean
    supportsPWA: boolean
    supportsWebShare: boolean
  }
}

export function useMobileDetection(): MobileDetectionResult {
  const [detection, setDetection] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenSize: 'lg',
    orientation: 'landscape',
    userAgent: {
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false
    },
    capabilities: {
      supportsTouch: false,
      supportsHover: true,
      supportsServiceWorker: false,
      supportsPWA: false,
      supportsWebShare: false
    }
  })

  useEffect(() => {
    const detectDevice = () => {
      if (typeof window === 'undefined') return

      const userAgent = navigator.userAgent.toLowerCase()
      const width = window.innerWidth
      const height = window.innerHeight

      // Device type detection
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isTabletUA = /ipad|android(?!.*mobile)/i.test(userAgent)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Screen size detection
      const isMobileWidth = width < 768
      const isTabletWidth = width >= 768 && width < 1024

      // Final device classification
      const isMobile = isMobileUA || (isMobileWidth && isTouchDevice)
      const isTablet = isTabletUA || (isTabletWidth && isTouchDevice && !isMobile)
      const isDesktop = !isMobile && !isTablet

      // Screen size categories
      let screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'lg'
      if (width < 640) screenSize = 'sm'
      else if (width < 768) screenSize = 'md'
      else if (width < 1024) screenSize = 'lg'
      else if (width < 1280) screenSize = 'xl'
      else screenSize = '2xl'

      // Orientation
      const orientation = height > width ? 'portrait' : 'landscape'

      // User agent detection
      const isIOS = /iphone|ipad|ipod/i.test(userAgent)
      const isAndroid = /android/i.test(userAgent)
      const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent)
      const isChrome = /chrome/i.test(userAgent)
      const isFirefox = /firefox/i.test(userAgent)

      // Capability detection
      const supportsTouch = isTouchDevice
      const supportsHover = window.matchMedia('(hover: hover)').matches
      const supportsServiceWorker = 'serviceWorker' in navigator
      const supportsPWA = supportsServiceWorker && 'PushManager' in window
      const supportsWebShare = 'share' in navigator

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenSize,
        orientation,
        userAgent: {
          isIOS,
          isAndroid,
          isSafari,
          isChrome,
          isFirefox
        },
        capabilities: {
          supportsTouch,
          supportsHover,
          supportsServiceWorker,
          supportsPWA,
          supportsWebShare
        }
      })
    }

    // Initial detection
    detectDevice()

    // Listen for resize and orientation changes
    window.addEventListener('resize', detectDevice)
    window.addEventListener('orientationchange', detectDevice)

    return () => {
      window.removeEventListener('resize', detectDevice)
      window.removeEventListener('orientationchange', detectDevice)
    }
  }, [])

  return detection
}

// Hook for PWA installation prompt
export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppMode = (window.navigator as ExtendedNavigator).standalone === true
      setIsInstalled(isInStandaloneMode || isInWebAppMode)
    }

    checkIfInstalled()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return false

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }

  return {
    isInstallable,
    isInstalled,
    promptInstall
  }
}

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine)

      // Detect connection type if available
      const connection = (navigator as ExtendedNavigator).connection || 
                       (navigator as ExtendedNavigator).mozConnection || 
                       (navigator as ExtendedNavigator).webkitConnection

      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown')
        setIsSlowConnection(connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')
      }
    }

    updateNetworkStatus()

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    // Listen for connection change if available
    const connection = (navigator as ExtendedNavigator).connection
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [])

  return {
    isOnline,
    connectionType,
    isSlowConnection
  }
}

// Hook for mobile-specific features
export function useMobileFeatures() {
  const mobile = useMobileDetection()
  const pwa = usePWAInstallPrompt()
  const network = useNetworkStatus()

  const shareContent = async (data: { title: string; text: string; url?: string }) => {
    if (!mobile.capabilities.supportsWebShare) {
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(data.url || window.location.href)
        return { success: true, method: 'clipboard' }
      } catch {
        return { success: false, error: 'Share not supported' }
      }
    }

    try {
      await navigator.share(data)
      return { success: true, method: 'native' }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false, error: 'Share cancelled' }
      }
      return { success: false, error: 'Share failed' }
    }
  }

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
      return true
    }
    return false
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return 'not-supported'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  return {
    ...mobile,
    ...pwa,
    ...network,
    shareContent,
    vibrate,
    requestNotificationPermission
  }
}