import { groq } from 'next-sanity'

export const themeConfigQuery = groq`
  *[_type == "themeConfig" && isActive == true][0] {
    _id,
    name,
    colors,
    typography,
    layout,
    animations
  }
`

export const pageContentQuery = groq`
  *[_type == "pageContent" && pageId == $pageId][0] {
    _id,
    pageId,
    hero,
    sections,
    seo
  }
`

export const navigationConfigQuery = groq`
  *[_type == "navigationConfig"][0] {
    _id,
    logo,
    mainNavigation,
    ctaButtons,
    footer
  }
`

export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    _id,
    siteName,
    siteDescription,
    siteUrl,
    favicon,
    ogImage,
    googleAnalytics,
    socialMedia,
    contact,
    maintenance
  }
`

export const pageQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    status,
    pageType,
    template,
    pageBuilder,
    seo,
    publishedAt
  }
`

export const allPagesQuery = groq`
  *[_type == "page" && status == "published"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    pageType,
    publishedAt
  }
`

export const redirectsQuery = groq`
  *[_type == "redirect" && enabled == true] {
    _id,
    from,
    to,
    type
  }
`