'use client'

import { useEffect, useState } from 'react'
import Link from "next/link"
import { Button } from "../ui/button"
import { ArrowRight, Star } from "lucide-react"
import { PageContent, NavigationConfig, getPageContent, getNavigationConfig } from "../../../lib/sanity"
import { useTheme } from "../../../hooks/useTheme"

export default function CMSLandingPage() {
  const [pageContent, setPageContent] = useState<PageContent | null>(null)
  const [navigation, setNavigation] = useState<NavigationConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  useEffect(() => {
    async function loadContent() {
      try {
        const [content, nav] = await Promise.all([
          getPageContent('landing'),
          getNavigationConfig()
        ])
        setPageContent(content)
        setNavigation(nav)
      } catch (error) {
        console.error('Error loading CMS content:', error)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading content...</p>
        </div>
      </div>
    )
  }

  // Fallback to current content if CMS data is not available
  const heroTitle = pageContent?.hero?.title || "Discover & Apply for Irish Grants 10x Faster ⚡"
  const heroSubtitle = pageContent?.hero?.subtitle || "Stop wasting time searching through countless websites. Our AI-powered platform automatically discovers relevant grants, tracks deadlines, and helps you submit winning applications."
  const primaryCTA = pageContent?.hero?.ctaText || navigation?.ctaButtons?.primary?.text || "Start Free Trial"
  const secondaryCTA = pageContent?.hero?.secondaryCtaText || "See How It Works"
  const statsText = pageContent?.hero?.stats || "🚀 No credit card required • ✨ 14-day free trial • 🎯 Join 1,200+ Irish organizations"

  const logoText = navigation?.logo?.text || "eTownz Grants"
  const signInText = navigation?.ctaButtons?.secondary?.text || "Sign In"
  const getStartedText = navigation?.ctaButtons?.primary?.text || "Get Started"

  // Apply theme styles
  const containerClass = theme?.layout?.containerMaxWidth ? `container mx-auto px-4 ${theme.layout.containerMaxWidth}` : "container mx-auto px-4 max-w-6xl"
  const sectionSpacing = theme?.layout?.sectionSpacing || "py-20 sm:py-32"
  const borderRadius = theme?.layout?.borderRadius || "rounded-2xl"
  const enableAnimations = theme?.animations?.enableAnimations !== false

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-teal-100 relative overflow-hidden">
      {/* Animated background elements */}
      {enableAnimations && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl floating-animation"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl floating-animation" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-full blur-3xl floating-animation" style={{animationDelay: '4s'}}></div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6 sm:py-8">
        <nav className={`flex items-center justify-between ${enableAnimations ? 'slide-in-up' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-primary to-secondary ${borderRadius} flex items-center justify-center shadow-lg shadow-primary/25 ${enableAnimations ? 'pulse-glow' : ''}`}>
              <span className="w-5 h-5 sm:w-6 sm:h-6 text-white">🌍</span>
            </div>
            <span className="text-xl sm:text-2xl font-extrabold gradient-text">{logoText}</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className={`hidden sm:inline-flex text-base font-semibold hover:bg-primary/10 ${borderRadius} px-4 py-2`}>
                {signInText}
              </Button>
              <Button variant="ghost" className={`inline-flex sm:hidden px-3 text-base font-semibold hover:bg-primary/10 ${borderRadius}`}>
                {signInText}
              </Button>
            </Link>
            <Link href="/auth/register">
              <button className="btn-primary">
                {getStartedText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={`relative z-10 ${containerClass} ${sectionSpacing}`}>
        <div className="text-center">
          <div className={enableAnimations ? 'slide-in-up' : ''}>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-6 sm:mb-8 leading-tight">
              <span className="gradient-text block">{heroTitle}</span>
            </h1>
          </div>
          
          <div className={enableAnimations ? 'slide-in-up stagger-1' : ''}>
            <p className="text-lg sm:text-xl lg:text-2xl text-foreground/80 mb-8 sm:mb-12 leading-relaxed max-w-4xl mx-auto font-medium">
              {heroSubtitle}
            </p>
          </div>
          
          <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-xl mx-auto ${enableAnimations ? 'slide-in-up stagger-2' : ''}`}>
            <Link href="/auth/register" className="w-full sm:w-auto">
              <button className="btn-primary w-full text-lg sm:text-xl py-4 px-8">
                <Star className="w-5 h-5 mr-2" />
                {primaryCTA}
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto">
              <button className="btn-secondary w-full text-lg sm:text-xl py-4 px-8">
                <Star className="w-5 h-5 mr-2" />
                {secondaryCTA}
              </button>
            </Link>
          </div>
          
          <div className={enableAnimations ? 'slide-in-up stagger-3' : ''}>
            <p className="text-sm sm:text-base text-muted-foreground mt-6 font-medium">
              {statsText}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`relative z-10 ${containerClass} py-16 sm:py-24`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className={`card-interactive text-center ${enableAnimations ? 'slide-in-up stagger-1' : ''}`}>
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">500+</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Active Grants Tracked</div>
          </div>
          <div className={`card-interactive text-center ${enableAnimations ? 'slide-in-up stagger-2' : ''}`}>
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">95%</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Time Saved on Discovery</div>
          </div>
          <div className={`card-interactive text-center ${enableAnimations ? 'slide-in-up stagger-3' : ''}`}>
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">€50M+</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Funding Secured</div>
          </div>
          <div className={`card-interactive text-center ${enableAnimations ? 'slide-in-up stagger-4' : ''}`}>
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">1,200+</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Irish Organizations</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-card/50 backdrop-blur-sm py-16 sm:py-20">
        <div className={containerClass}>
          <div className="text-center">
            <p className="text-base sm:text-lg text-foreground/60 font-medium">
              {navigation?.footer?.copyright || "© 2024 eTownz Grants. All rights reserved. Made with ❤️ in Ireland."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}