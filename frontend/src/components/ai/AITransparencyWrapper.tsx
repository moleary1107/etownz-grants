"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Bot, 
  Info, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react'

interface AITransparencyWrapperProps {
  confidence: number
  model: string
  reasoning?: string
  sources?: string[]
  interactionId?: string
  sectionName?: string
  onRating?: (rating: number, feedback?: string) => void
  onRegenerate?: () => void
  showControls?: boolean
  variant?: 'default' | 'compact' | 'inline'
  children: React.ReactNode
}

interface ConfidenceScoreProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
}

const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ value, size = 'md' }) => {
  const getColorClass = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-3 w-3" />
    if (confidence >= 0.6) return <AlertTriangle className="h-3 w-3" />
    return <AlertTriangle className="h-3 w-3" />
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border ${getColorClass(value)} ${sizeClasses[size]}`}>
      {getIcon(value)}
      <span className="font-medium">{Math.round(value * 100)}% confidence</span>
    </div>
  )
}

interface ExplainabilityPanelProps {
  reasoning: string
  sources?: string[]
  model: string
  isExpanded: boolean
  onToggle: () => void
}

const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ 
  reasoning, 
  sources, 
  model, 
  isExpanded, 
  onToggle 
}) => {
  return (
    <div className="border-t bg-gray-50">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>How this was generated</span>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">AI Reasoning</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{reasoning}</p>
          </div>
          
          {sources && sources.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Sources Referenced</h4>
              <ul className="space-y-1">
                {sources.map((source, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Technical Details</h4>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Model: {model}</span>
              <span>Generated: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface RatingControlsProps {
  onRating: (rating: number, feedback?: string) => void
  currentRating?: number
}

const RatingControls: React.FC<RatingControlsProps> = ({ onRating, currentRating }) => {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [selectedRating, setSelectedRating] = useState<number | null>(currentRating || null)

  const handleRating = (rating: number) => {
    setSelectedRating(rating)
    if (rating >= 4) {
      onRating(rating)
    } else {
      setShowFeedback(true)
    }
  }

  const submitFeedback = () => {
    if (selectedRating) {
      onRating(selectedRating, feedback)
      setShowFeedback(false)
      setFeedback('')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Rate this AI generation:</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={selectedRating === 5 ? "default" : "outline"}
            onClick={() => handleRating(5)}
            className="p-1"
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={selectedRating && selectedRating <= 3 ? "default" : "outline"}
            onClick={() => handleRating(2)}
            className="p-1"
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {showFeedback && (
        <div className="space-y-2">
          <textarea
            className="w-full p-2 text-sm border rounded-md resize-none"
            rows={3}
            placeholder="Help us improve: What could be better about this AI generation?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitFeedback}>
              Submit Feedback
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowFeedback(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const AITransparencyWrapper: React.FC<AITransparencyWrapperProps> = ({
  confidence,
  model,
  reasoning,
  sources,
  interactionId,
  sectionName,
  onRating,
  onRegenerate,
  showControls = true,
  variant = 'default',
  children
}) => {
  const [isExplainabilityExpanded, setIsExplainabilityExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const handleRating = (rating: number, feedback?: string) => {
    if (onRating) {
      onRating(rating, feedback)
    }
    // Here you would typically send this to your backend
    console.log('AI Rating submitted:', { rating, feedback, interactionId, sectionName })
  }

  // Compact variant for inline usage
  if (variant === 'compact') {
    return (
      <div className="relative group">
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 text-xs">
            <Bot className="h-3 w-3 mr-1" />
            AI
          </Badge>
        </div>
        {children}
        
        {showControls && (
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-lg rounded-lg p-2 border">
            <div className="flex items-center gap-2">
              <ConfidenceScore value={confidence} size="sm" />
              {onRegenerate && (
                <Button size="sm" variant="ghost" onClick={onRegenerate} className="p-1">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Inline variant for text content
  if (variant === 'inline') {
    return (
      <div className="relative border-l-4 border-blue-200 bg-blue-50 pl-4 my-2">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">AI Generated Content</span>
            <ConfidenceScore value={confidence} size="sm" />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsVisible(!isVisible)}
            className="p-1"
          >
            {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </div>
        
        {isVisible && (
          <div className="space-y-3">
            {children}
            
            {showControls && onRating && (
              <RatingControls onRating={handleRating} />
            )}
            
            {reasoning && (
              <ExplainabilityPanel
                reasoning={reasoning}
                sources={sources}
                model={model}
                isExpanded={isExplainabilityExpanded}
                onToggle={() => setIsExplainabilityExpanded(!isExplainabilityExpanded)}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  // Default card variant
  return (
    <Card className="relative border-blue-200 bg-gradient-to-r from-blue-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-blue-700">
              <Bot className="h-5 w-5" />
              <span className="font-medium">AI Generated Content</span>
            </div>
            <ConfidenceScore value={confidence} />
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2">
              {onRegenerate && (
                <Button size="sm" variant="outline" onClick={onRegenerate}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(!isVisible)}
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      {isVisible && (
        <CardContent className="space-y-4">
          {children}
          
          {showControls && onRating && (
            <RatingControls onRating={handleRating} />
          )}
        </CardContent>
      )}
      
      {isVisible && reasoning && (
        <ExplainabilityPanel
          reasoning={reasoning}
          sources={sources}
          model={model}
          isExpanded={isExplainabilityExpanded}
          onToggle={() => setIsExplainabilityExpanded(!isExplainabilityExpanded)}
        />
      )}
    </Card>
  )
}

// Helper hook for managing AI transparency state
export const useAITransparency = () => {
  const [interactions, setInteractions] = useState<Map<string, Record<string, unknown>>>(new Map())

  const recordInteraction = (id: string, data: Record<string, unknown>) => {
    setInteractions(prev => new Map(prev.set(id, data)))
  }

  const updateInteraction = (id: string, updates: Record<string, unknown>) => {
    setInteractions(prev => {
      const existing = prev.get(id) || {}
      return new Map(prev.set(id, { ...existing, ...updates }))
    })
  }

  const getInteraction = (id: string) => {
    return interactions.get(id)
  }

  return {
    interactions,
    recordInteraction,
    updateInteraction,
    getInteraction
  }
}

export default AITransparencyWrapper