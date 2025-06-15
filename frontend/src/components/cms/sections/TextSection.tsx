'use client'

import React from 'react'
import { CMSSection } from '../CMSPage'
import { PortableText } from '@portabletext/react'
import { cn } from '@/lib/utils'

interface TextSectionProps {
  section: CMSSection
}

export function TextSection({ section }: TextSectionProps) {
  const getColorSchemeClasses = (colorScheme?: string) => {
    switch (colorScheme) {
      case 'dark':
        return 'bg-gray-900 text-white'
      case 'primary':
        return 'bg-blue-50 text-gray-900'
      case 'secondary':
        return 'bg-purple-50 text-gray-900'
      default:
        return 'bg-white text-gray-900'
    }
  }

  const getTextAlignClasses = (textAlign?: string) => {
    switch (textAlign) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  const getLayoutClasses = (layout?: string) => {
    switch (layout) {
      case 'narrow':
        return 'max-w-3xl mx-auto'
      case 'wide':
        return 'max-w-6xl mx-auto'
      case 'full':
        return 'max-w-full'
      default:
        return 'max-w-4xl mx-auto'
    }
  }

  const getColumnClasses = (columns?: number) => {
    switch (columns) {
      case 2:
        return 'md:columns-2 md:gap-8'
      case 3:
        return 'md:columns-3 md:gap-6'
      default:
        return ''
    }
  }

  return (
    <section className={cn(
      'py-16 lg:py-24',
      getColorSchemeClasses(section.colorScheme)
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          getLayoutClasses(section.layout),
          getTextAlignClasses(section.textAlign)
        )}>
          {/* Title */}
          {section.title && (
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {section.title}
            </h2>
          )}

          {/* Subtitle */}
          {section.subtitle && (
            <p className="text-xl text-gray-600 mb-8">
              {section.subtitle}
            </p>
          )}

          {/* Content */}
          {section.content && (
            <div className={cn(
              'prose prose-lg max-w-none',
              section.colorScheme === 'dark' && 'prose-invert',
              getColumnClasses(section.columns)
            )}>
              <PortableText 
                value={section.content}
                components={{
                  block: {
                    // Custom block renderers
                    h1: ({ children }) => <h1 className="text-4xl font-bold mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-3xl font-bold mb-4">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-2xl font-bold mb-3">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-xl font-bold mb-3">{children}</h4>,
                    normal: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                  },
                  marks: {
                    // Custom mark renderers
                    link: ({ value, children }) => (
                      <a 
                        href={value?.href}
                        target={value?.blank ? '_blank' : '_self'}
                        rel={value?.blank ? 'noopener noreferrer' : undefined}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {children}
                      </a>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                  },
                  list: {
                    bullet: ({ children }) => (
                      <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                    ),
                    number: ({ children }) => (
                      <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
                    ),
                  },
                  listItem: {
                    bullet: ({ children }) => <li>{children}</li>,
                    number: ({ children }) => <li>{children}</li>,
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}