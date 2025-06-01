import { client } from '../sanity/lib/client'
import { 
  themeConfigQuery, 
  pageContentQuery, 
  navigationConfigQuery,
  siteSettingsQuery,
  pageQuery,
  allPagesQuery,
  redirectsQuery
} from '../sanity/lib/queries'

export interface ThemeConfig {
  _id: string
  name: string
  colors: {
    primary: { hex: string }
    secondary: { hex: string }
    accent: { hex: string }
    background: { hex: string }
    foreground: { hex: string }
  }
  typography: {
    primaryFont: string
    headingFont: string
    fontSizes: {
      heroTitle: number
      title: number
      subtitle: number
      body: number
      small: number
    }
  }
  layout: {
    containerMaxWidth: string
    sectionSpacing: string
    borderRadius: string
  }
  animations: {
    enableAnimations: boolean
    animationSpeed: string
    hoverEffects: boolean
  }
}

export interface PageContent {
  _id: string
  pageId: string
  hero: {
    title: string
    subtitle: string
    ctaText: string
    secondaryCtaText: string
    stats: string
  }
  sections: Array<{
    _type: string
    [key: string]: unknown
  }>
  seo: {
    title: string
    description: string
  }
}

export interface NavigationConfig {
  _id: string
  logo: {
    text: string
    iconName: string
  }
  mainNavigation: Array<{
    label: string
    href: string
    isExternal: boolean
    showOnMobile: boolean
  }>
  ctaButtons: {
    primary: {
      text: string
      href: string
      iconName: string
    }
    secondary: {
      text: string
      href: string
      showOnMobile: boolean
    }
  }
  footer: {
    description: string
    links: Array<{
      category: string
      links: Array<{
        label: string
        href: string
      }>
    }>
    copyright: string
  }
}

export async function getThemeConfig(): Promise<ThemeConfig | null> {
  try {
    const theme = await client.fetch(themeConfigQuery)
    return theme
  } catch (error) {
    console.error('Error fetching theme config:', error)
    return null
  }
}

export async function getPageContent(pageId: string): Promise<PageContent | null> {
  try {
    const content = await client.fetch(pageContentQuery, { pageId })
    return content
  } catch (error) {
    console.error('Error fetching page content:', error)
    return null
  }
}

export async function getNavigationConfig(): Promise<NavigationConfig | null> {
  try {
    const nav = await client.fetch(navigationConfigQuery)
    return nav
  } catch (error) {
    console.error('Error fetching navigation config:', error)
    return null
  }
}

export interface SiteSettings {
  _id: string
  siteName: string
  siteDescription: string
  siteUrl: string
  favicon?: { asset: { url: string } }
  ogImage?: { asset: { url: string } }
  googleAnalytics: {
    trackingId: string
    enabled: boolean
  }
  socialMedia: {
    twitter?: string
    facebook?: string
    linkedin?: string
    instagram?: string
    youtube?: string
  }
  contact: {
    email?: string
    phone?: string
    address?: string
  }
  maintenance: {
    enabled: boolean
    message: string
  }
}

export interface Page {
  _id: string
  title: string
  slug: { current: string }
  status: string
  pageType: string
  template: string
  pageBuilder: Array<{
    _type: string
    [key: string]: unknown
  }>
  seo: {
    title?: string
    description?: string
    keywords?: string[]
    ogImage?: { asset: { url: string } }
    noIndex?: boolean
  }
  publishedAt: string
}

export interface Redirect {
  _id: string
  from: string
  to: string
  type: '301' | '302'
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const settings = await client.fetch(siteSettingsQuery)
    return settings
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return null
  }
}

export async function getPage(slug: string): Promise<Page | null> {
  try {
    const page = await client.fetch(pageQuery, { slug })
    return page
  } catch (error) {
    console.error('Error fetching page:', error)
    return null
  }
}

export async function getAllPages(): Promise<Page[]> {
  try {
    const pages = await client.fetch(allPagesQuery)
    return pages || []
  } catch (error) {
    console.error('Error fetching pages:', error)
    return []
  }
}

export async function getRedirects(): Promise<Redirect[]> {
  try {
    const redirects = await client.fetch(redirectsQuery)
    return redirects || []
  } catch (error) {
    console.error('Error fetching redirects:', error)
    return []
  }
}

export function hexToHsl(hex: string): string {
  // Convert hex to HSL for CSS custom properties
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  const sum = max + min
  const l = sum / 2

  let h = 0
  let s = 0

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum

    switch (max) {
      case r:
        h = ((g - b) / diff) + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / diff + 2
        break
      case b:
        h = (r - g) / diff + 4
        break
    }
    h /= 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}