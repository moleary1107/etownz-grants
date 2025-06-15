/**
 * Utility functions for Next.js Image optimization with Sanity CMS
 */

/**
 * Generate optimized sizes prop for responsive images
 * @param breakpoints - Array of breakpoint configurations
 * @returns sizes string for Next.js Image component
 */
export function generateImageSizes(breakpoints: Array<{ maxWidth: string; vw: string }>): string {
  return breakpoints
    .map(({ maxWidth, vw }) => `(max-width: ${maxWidth}) ${vw}`)
    .join(', ')
}

/**
 * Common sizes configurations for different use cases
 */
export const imageSizes = {
  // Gallery images - responsive grid
  gallery: "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw",
  
  // Feature grid icons/images - small fixed size
  featureIcon: "64px",
  
  // Hero images - full width
  hero: "100vw",
  
  // Card images - responsive cards
  card: "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw",
  
  // Avatar images - small fixed
  avatar: "40px",
  
  // Large avatar
  avatarLarge: "80px"
} as const

/**
 * Extract image dimensions from Sanity URL if available
 * Sanity URLs can contain dimension info like: image-abc123-1920x1080-jpg
 */
export function extractSanityImageDimensions(url: string): { width?: number; height?: number } {
  const match = url.match(/-(\d+)x(\d+)-/)
  if (match) {
    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10)
    }
  }
  return {}
}

/**
 * Build optimized Sanity image URL with parameters
 * @param baseUrl - Original Sanity image URL
 * @param params - Optimization parameters
 */
export function buildSanityImageUrl(
  baseUrl: string,
  params: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpg' | 'png'
    fit?: 'crop' | 'fill' | 'max' | 'min'
    crop?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  } = {}
): string {
  // If it's not a Sanity URL, return as-is
  if (!baseUrl.includes('cdn.sanity.io')) {
    return baseUrl
  }

  const url = new URL(baseUrl)
  const searchParams = new URLSearchParams()

  if (params.width) searchParams.set('w', params.width.toString())
  if (params.height) searchParams.set('h', params.height.toString())
  if (params.quality) searchParams.set('q', params.quality.toString())
  if (params.format) searchParams.set('fm', params.format)
  if (params.fit) searchParams.set('fit', params.fit)
  if (params.crop) searchParams.set('crop', params.crop)

  // Add default quality if not specified
  if (!params.quality) {
    searchParams.set('q', '85')
  }

  // Add default format for better optimization
  if (!params.format) {
    searchParams.set('fm', 'webp')
  }

  url.search = searchParams.toString()
  return url.toString()
}

/**
 * Check if an image URL is from an allowed domain in Next.js config
 */
export function isOptimizedDomain(url: string): boolean {
  const allowedDomains = [
    'images.unsplash.com',
    'via.placeholder.com',
    'cdn.sanity.io'
  ]
  
  try {
    const urlObj = new URL(url)
    return allowedDomains.includes(urlObj.hostname)
  } catch {
    return false
  }
}

/**
 * Get fallback dimensions for images when dimensions are not available
 */
export function getFallbackDimensions(aspectRatio: '1:1' | '4:3' | '16:9' | '3:4' = '4:3') {
  const ratios = {
    '1:1': { width: 400, height: 400 },
    '4:3': { width: 400, height: 300 },
    '16:9': { width: 400, height: 225 },
    '3:4': { width: 300, height: 400 }
  }
  
  return ratios[aspectRatio]
}