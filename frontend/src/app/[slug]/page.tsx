import { notFound } from 'next/navigation'

interface PageProps {
  params: { slug: string }
}

// This is a disabled CMS page - redirect to 404
export default function DynamicPage({ params }: PageProps) {
  notFound()
}