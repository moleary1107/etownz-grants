'use client'

import React from 'react'
import Image from 'next/image'
import { CMSSection } from '../CMSPage'
import { cn } from '@/lib/utils'
import { imageSizes, buildSanityImageUrl } from '@/lib/imageUtils'

interface ImageGalleryProps {
  section: CMSSection
}

export function ImageGallery({ section }: ImageGalleryProps) {
  const getLayoutClasses = (layout?: string) => {
    switch (layout) {
      case 'masonry':
        return 'columns-1 md:columns-2 lg:columns-3 gap-4'
      case 'carousel':
        return 'flex overflow-x-auto space-x-4 pb-4'
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
    }
  }

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {(section.title || section.subtitle) && (
          <div className="text-center mb-12">
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {section.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Image Gallery */}
        {section.items && section.items.length > 0 && (
          <div className={cn(getLayoutClasses(section.layout))}>
            {section.items.map((item) => (
              <div 
                key={item._key} 
                className={cn(
                  "break-inside-avoid",
                  section.layout === 'carousel' && "flex-shrink-0 w-80"
                )}
              >
                {item.image && (
                  <div className="relative w-full aspect-[4/3] rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                    <Image
                      src={buildSanityImageUrl(item.image.url, { 
                        width: 600, 
                        quality: 85,
                        fit: 'crop'
                      })}
                      alt={item.image.alt || item.title || ''}
                      fill
                      className="object-cover"
                      sizes={imageSizes.gallery}
                    />
                  </div>
                )}
                {item.title && (
                  <h3 className="text-lg font-medium mt-4 text-gray-900">
                    {item.title}
                  </h3>
                )}
                {item.description && (
                  <p className="text-gray-600 mt-2">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}