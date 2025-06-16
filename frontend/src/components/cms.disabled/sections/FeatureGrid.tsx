'use client'

import React from 'react'
import Image from 'next/image'
import { CMSSection } from '../CMSPage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { imageSizes, buildSanityImageUrl } from '@/lib/imageUtils'
import * as LucideIcons from 'lucide-react'

interface FeatureGridProps {
  section: CMSSection
}

export function FeatureGrid({ section }: FeatureGridProps) {
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

  const getGridClasses = (columns?: number) => {
    switch (columns) {
      case 2:
        return 'grid-cols-1 md:grid-cols-2'
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      case 6:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    }
  }

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null
    
    const IconComponent = (LucideIcons as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[iconName]
    if (!IconComponent) return null
    
    return <IconComponent className="h-8 w-8 text-blue-600" />
  }

  return (
    <section className={cn(
      'py-16 lg:py-24',
      getColorSchemeClasses(section.colorScheme)
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {(section.title || section.subtitle) && (
          <div className="text-center mb-12">
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
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

        {/* Feature Grid */}
        {section.items && section.items.length > 0 && (
          <div className={cn(
            'grid gap-6',
            getGridClasses(section.columns)
          )}>
            {section.items.map((item) => (
              <Card key={item._key} className="h-full">
                <CardHeader>
                  {/* Icon */}
                  {item.icon && (
                    <div className="mb-4">
                      {renderIcon(item.icon)}
                    </div>
                  )}
                  
                  {/* Image */}
                  {item.image && (
                    <div className="mb-4 relative w-16 h-16">
                      <Image
                        src={buildSanityImageUrl(item.image.url, { 
                          width: 64, 
                          height: 64,
                          quality: 85,
                          fit: 'crop'
                        })}
                        alt={item.image.alt || item.title || ''}
                        width={64}
                        height={64}
                        className="object-cover rounded-lg"
                        sizes={imageSizes.featureIcon}
                      />
                    </div>
                  )}

                  {/* Title */}
                  {item.title && (
                    <CardTitle className="text-xl mb-2">
                      {item.title}
                    </CardTitle>
                  )}
                </CardHeader>

                <CardContent>
                  {/* Description */}
                  {item.description && (
                    <CardDescription className="text-gray-600 mb-4">
                      {item.description}
                    </CardDescription>
                  )}

                  {/* Link Button */}
                  {item.link && (
                    <Button 
                      asChild 
                      variant="outline" 
                      size="sm"
                      className="mt-auto"
                    >
                      <a href={item.link.url}>
                        {item.link.text || 'Learn More'}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}