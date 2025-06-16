import { createClient } from '@sanity/client'
import { groq } from 'next-sanity'

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID')
}

if (!process.env.NEXT_PUBLIC_SANITY_DATASET) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SANITY_DATASET')
}

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
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