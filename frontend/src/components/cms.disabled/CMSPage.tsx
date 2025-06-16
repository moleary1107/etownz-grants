'use client'

import React from 'react'
import { CMSPageBuilder } from './CMSPageBuilder'

export interface CMSPageData {
  _id: string
  title: string
  description?: string
  slug: {
    current: string
  }
  seo?: {
    title?: string
    description?: string
    keywords?: string[]
    image?: {
      url: string
      alt?: string
    }
    noIndex?: boolean
    noFollow?: boolean
  }
  sections?: CMSSection[]
  publishedAt?: string
  _updatedAt: string
}

export interface CMSSection {
  _type: string
  _key: string
  title?: string
  subtitle?: string
  content?: unknown[] // Portable text
  backgroundImage?: {
    url: string
    alt?: string
  }
  backgroundVideo?: {
    url: string
  }
  layout?: string
  columns?: number
  items?: CMSItem[]
  buttons?: CMSButton[]
  style?: {
    backgroundColor?: string
    textColor?: string
    padding?: string
    margin?: string
    borderRadius?: string
  }
  padding?: string
  margin?: string
  textAlign?: 'left' | 'center' | 'right'
  colorScheme?: 'light' | 'dark' | 'primary' | 'secondary'
}

export interface CMSItem {
  _type: string
  _key: string
  title?: string
  description?: string
  icon?: string
  image?: {
    url: string
    alt?: string
  }
  link?: {
    url: string
    text: string
  }
  value?: string | number
  displayType?: string
}

export interface CMSButton {
  _type: string
  _key: string
  text: string
  link: {
    url: string
    target?: '_blank' | '_self'
  }
  style: 'primary' | 'secondary' | 'outline' | 'ghost'
  icon?: string
}

interface CMSPageProps {
  page: CMSPageData
}

export function CMSPage({ page }: CMSPageProps) {
  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600">The requested page could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Page Header - Only show if no hero section */}
      {page.sections && page.sections.length > 0 && page.sections[0]._type !== 'hero' && (
        <div className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {page.title}
              </h1>
              {page.description && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {page.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Sections */}
      {page.sections && page.sections.length > 0 ? (
        <CMSPageBuilder sections={page.sections} />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Content Coming Soon</h2>
            <p className="text-gray-600">This page is being updated with new content.</p>
          </div>
        </div>
      )}

      {/* Last Updated */}
      {page._updatedAt && (
        <div className="bg-gray-50 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-gray-500 text-center">
              Last updated: {new Date(page._updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}