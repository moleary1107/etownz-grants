'use client'

import React from 'react'
import { CMSSection } from './CMSPage'
import { HeroSection } from './sections/HeroSection'
import { TextSection } from './sections/TextSection'
import { FeatureGrid } from './sections/FeatureGrid'
import { StatsSection } from './sections/StatsSection'
import { ImageGallery } from './sections/ImageGallery'
import { CTASection } from './sections/CTASection'
import { ContactForm } from './sections/ContactForm'

interface CMSPageBuilderProps {
  sections: CMSSection[]
}

export function CMSPageBuilder({ sections }: CMSPageBuilderProps) {
  const renderSection = (section: CMSSection) => {
    switch (section._type) {
      case 'hero':
        return <HeroSection key={section._key} section={section} />
      
      case 'textSection':
        return <TextSection key={section._key} section={section} />
      
      case 'featureGrid':
        return <FeatureGrid key={section._key} section={section} />
      
      case 'statsSection':
        return <StatsSection key={section._key} section={section} />
      
      case 'imageGallery':
        return <ImageGallery key={section._key} section={section} />
      
      case 'ctaSection':
        return <CTASection key={section._key} section={section} />
      
      case 'contactForm':
        return <ContactForm key={section._key} section={section} />
      
      default:
        console.warn(`Unknown section type: ${section._type}`)
        return (
          <div key={section._key} className="py-12 bg-yellow-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-yellow-800">
                  Unknown Section Type: {section._type}
                </h3>
                <p className="text-yellow-600 mt-2">
                  This section type is not yet implemented.
                </p>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="cms-page-builder">
      {sections.map(renderSection)}
    </div>
  )
}