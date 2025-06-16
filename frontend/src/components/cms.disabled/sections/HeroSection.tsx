'use client'

import React from 'react'
import { CMSSection } from '../CMSPage'
import { PortableText } from '@portabletext/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, Play } from 'lucide-react'

interface HeroSectionProps {
  section: CMSSection
}

export function HeroSection({ section }: HeroSectionProps) {
  const getColorSchemeClasses = (colorScheme?: string) => {
    switch (colorScheme) {
      case 'dark':
        return 'bg-gray-900 text-white'
      case 'primary':
        return 'bg-blue-600 text-white'
      case 'secondary':
        return 'bg-purple-600 text-white'
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
        'relative py-20 lg:py-32',
        getColorSchemeClasses(section.colorScheme),
        section.backgroundImage && 'bg-gray-900'
      )}
      style={backgroundStyle}
    >
      {/* Background overlay if image exists */}
      {section.backgroundImage && (
        <div className="absolute inset-0 bg-black bg-opacity-50" />
      )}
      
      {/* Background video if exists */}
      {section.backgroundVideo && (
        <>
          <video
            autoPlay
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={section.backgroundVideo.url} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black bg-opacity-40" />
        </>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          'max-w-4xl',
          getTextAlignClasses(section.textAlign),
          section.textAlign === 'center' && 'mx-auto'
        )}>
          {/* Title */}
          {section.title && (
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {section.title}
            </h1>
          )}

          {/* Subtitle */}
          {section.subtitle && (
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              {section.subtitle}
            </p>
          )}

          {/* Content */}
          {section.content && (
            <div className="text-lg mb-10 opacity-80 prose prose-lg max-w-none">
              <PortableText value={section.content} />
            </div>
          )}

          {/* Buttons */}
          {section.buttons && section.buttons.length > 0 && (
            <div className={cn(
              'flex flex-wrap gap-4',
              section.textAlign === 'center' && 'justify-center',
              section.textAlign === 'right' && 'justify-end'
            )}>
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
      </div>
    </section>
  )
}