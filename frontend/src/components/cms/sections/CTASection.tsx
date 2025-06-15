'use client'

import React from 'react'
import { CMSSection } from '../CMSPage'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, Play } from 'lucide-react'

interface CTASectionProps {
  section: CMSSection
}

export function CTASection({ section }: CTASectionProps) {
  const getColorSchemeClasses = (colorScheme?: string) => {
    switch (colorScheme) {
      case 'dark':
        return 'bg-gray-900 text-white'
      case 'primary':
        return 'bg-blue-600 text-white'
      case 'secondary':
        return 'bg-purple-600 text-white'
      default:
        return 'bg-gray-100 text-gray-900'
    }
  }

  const backgroundStyle: React.CSSProperties = {}
  
  if (section.backgroundImage) {
    backgroundStyle.backgroundImage = `url(${section.backgroundImage.url})`
    backgroundStyle.backgroundSize = 'cover'
    backgroundStyle.backgroundPosition = 'center'
    backgroundStyle.backgroundRepeat = 'no-repeat'
  }

  return (
    <section 
      className={cn(
        'relative py-16 lg:py-24',
        getColorSchemeClasses(section.colorScheme),
        section.backgroundImage && 'bg-gray-900'
      )}
      style={backgroundStyle}
    >
      {/* Background overlay if image exists */}
      {section.backgroundImage && (
        <div className="absolute inset-0 bg-black bg-opacity-60" />
      )}

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Title */}
        {section.title && (
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {section.title}
          </h2>
        )}

        {/* Subtitle */}
        {section.subtitle && (
          <p className="text-xl mb-8 opacity-90">
            {section.subtitle}
          </p>
        )}

        {/* Buttons */}
        {section.buttons && section.buttons.length > 0 && (
          <div className="flex flex-wrap gap-4 justify-center">
            {section.buttons.map((button, index) => {
              const isPrimary = index === 0 || button.style === 'primary'
              
              return (
                <Button
                  key={button._key}
                  asChild
                  variant={isPrimary ? 'default' : 'outline'}
                  size="lg"
                  className={cn(
                    'text-lg px-8 py-3',
                    isPrimary && section.colorScheme === 'primary' && 'bg-white text-blue-600 hover:bg-gray-100',
                    isPrimary && section.colorScheme === 'dark' && 'bg-white text-gray-900 hover:bg-gray-100',
                    !isPrimary && (section.colorScheme === 'dark' || section.colorScheme === 'primary') && 'border-white text-white hover:bg-white hover:text-gray-900'
                  )}
                >
                  <a 
                    href={button.link.url}
                    target={button.link.target || '_self'}
                    className="flex items-center"
                  >
                    {button.text}
                    {button.icon === 'arrow-right' && (
                      <ArrowRight className="ml-2 h-5 w-5" />
                    )}
                    {button.icon === 'play' && (
                      <Play className="ml-2 h-5 w-5" />
                    )}
                  </a>
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}