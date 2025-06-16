import { createClient } from '@sanity/client'
import { groq } from 'next-sanity'

// Use dummy values if environment variables are not set (for build time)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'dummy-project-id'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export const client = createClient({
  projectId: projectId,
  dataset: dataset,
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2023-05-03'
})

export { groq }

export async function getPage(slug: string) {
  return client.fetch(
    groq`*[_type == "page" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      content
    }`,
    { slug }
  )
}

export async function getAllPages() {
  return client.fetch(
    groq`*[_type == "page"]{
      _id,
      title,
      slug
    }`
  )
}