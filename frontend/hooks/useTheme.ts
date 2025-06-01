'use client'

import { useEffect, useState } from 'react'
import { ThemeConfig, getThemeConfig, hexToHsl } from '../lib/sanity'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTheme() {
      try {
        const themeConfig = await getThemeConfig()
        setTheme(themeConfig)
        
        if (themeConfig) {
          // Apply theme to CSS custom properties
          const root = document.documentElement
          
          if (themeConfig.colors) {
            if (themeConfig.colors.primary?.hex) {
              root.style.setProperty('--primary', hexToHsl(themeConfig.colors.primary.hex))
            }
            if (themeConfig.colors.secondary?.hex) {
              root.style.setProperty('--secondary', hexToHsl(themeConfig.colors.secondary.hex))
            }
            if (themeConfig.colors.accent?.hex) {
              root.style.setProperty('--accent', hexToHsl(themeConfig.colors.accent.hex))
            }
            if (themeConfig.colors.background?.hex) {
              root.style.setProperty('--background', hexToHsl(themeConfig.colors.background.hex))
            }
            if (themeConfig.colors.foreground?.hex) {
              root.style.setProperty('--foreground', hexToHsl(themeConfig.colors.foreground.hex))
            }
          }
          
          if (themeConfig.typography?.primaryFont) {
            root.style.setProperty('--font-family', themeConfig.typography.primaryFont)
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTheme()
  }, [])

  return { theme, loading }
}