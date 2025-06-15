'use client'

import React from 'react'
import { CMSSection } from '../CMSPage'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

interface StatsSectionProps {
  section: CMSSection
}

export function StatsSection({ section }: StatsSectionProps) {
  const getColorSchemeClasses = (colorScheme?: string) => {
    switch (colorScheme) {
      case 'dark':
        return 'bg-gray-900 text-white'
      case 'primary':
        return 'bg-blue-600 text-white'
      case 'secondary':
        return 'bg-purple-600 text-white'
      default:
        return 'bg-gray-50 text-gray-900'
    }
  }

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null
    
    const IconComponent = (LucideIcons as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[iconName]
    if (!IconComponent) return null
    
    return <IconComponent className="h-8 w-8 mb-4 text-blue-400" />
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
              <p className="text-xl opacity-80 max-w-3xl mx-auto">
                {section.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Stats Grid */}
        {section.items && section.items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {section.items.map((item) => (
              <div key={item._key} className="text-center">
                {renderIcon(item.icon)}
                <div className="text-4xl font-bold mb-2">
                  {item.value}
                </div>
                {item.title && (
                  <div className="text-lg font-medium opacity-90">
                    {item.title}
                  </div>
                )}
                {item.description && (
                  <div className="text-sm opacity-70 mt-2">
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}