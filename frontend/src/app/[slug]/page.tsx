import { notFound } from 'next/navigation'
import { client } from '@/lib/sanity'
import { groq } from 'next-sanity'
import { CMSPage } from '@/components/cms/CMSPage'

interface PageProps {
  params: { slug: string }
}

// Define the GROQ query for fetching page data
const pageQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    title,
    description,
    slug,
    seo,
    sections[] {
      _type,
      _key,
      title,
      subtitle,
      content,
      backgroundImage,
      backgroundVideo,
      layout,
      columns,
      items[] {
        _type,
        _key,
        title,
        description,
        icon,
        image,
        link,
        value,
        displayType
      },
      buttons[] {
        _type,
        _key,
        text,
        link,
        style,
        icon
      },
      style,
      padding,
      margin,
      textAlign,
      colorScheme
    },
    publishedAt,
    _updatedAt
  }
`

// Generate static params for all pages
export async function generateStaticParams() {
  // Skip if Sanity is not configured
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return []
  }

  try {
    const pages = await client.fetch(groq`
      *[_type == "page" && defined(slug.current) && slug.current != "/"] {
        "slug": slug.current
      }
    `)

    return pages.map((page: { slug: string }) => ({
      slug: page.slug,
    }))
  } catch (error) {
    console.warn('Failed to fetch pages for static generation:', error)
    return []
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  // Skip if Sanity is not configured
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
    }
  }

  try {
    const page = await client.fetch(pageQuery, { slug: params.slug })

    if (!page) {
      return {
        title: 'Page Not Found',
        description: 'The requested page could not be found.',
      }
    }

    return {
      title: page.seo?.title || page.title,
      description: page.seo?.description || page.description,
      keywords: page.seo?.keywords?.join(', '),
      openGraph: {
        title: page.seo?.title || page.title,
        description: page.seo?.description || page.description,
        images: page.seo?.image ? [page.seo.image.url] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: page.seo?.title || page.title,
        description: page.seo?.description || page.description,
        images: page.seo?.image ? [page.seo.image.url] : [],
      },
      robots: {
        index: page.seo?.noIndex ? false : true,
        follow: page.seo?.noFollow ? false : true,
      },
    }
  } catch (error) {
    console.warn('Failed to fetch page metadata:', error)
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
    }
  }
}

export default async function DynamicPage({ params }: PageProps) {
  // Skip if Sanity is not configured
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    notFound()
  }

  try {
    const page = await client.fetch(pageQuery, { slug: params.slug })

    if (!page) {
      notFound()
    }

    return <CMSPage page={page} />
  } catch (error) {
    console.warn('Failed to fetch page:', error)
    notFound()
  }
}

// Export for static generation
export const revalidate = 60 // Revalidate every minute