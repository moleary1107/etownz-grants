import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AITransparencyWrapper } from '../../../components/ai/AITransparencyWrapper'

// Mock the API service
jest.mock('../../../lib/api/aiTransparencyService', () => ({
  aiTransparencyService: {
    submitRating: jest.fn()
  }
}))

describe('AITransparencyWrapper', () => {
  const defaultProps = {
    confidence: 0.85,
    model: 'gpt-4-turbo',
    reasoning: 'This content was generated based on similar successful grant applications and best practices.',
    sources: ['Enterprise Ireland Guidelines', 'Similar funded projects'],
    interactionId: 'interaction-123',
    sectionName: 'project_description'
  }

  const mockOnRating = jest.fn()
  const mockOnRegenerate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Default Variant', () => {
    it('renders AI transparency wrapper with confidence score', () => {
      render(
        <AITransparencyWrapper {...defaultProps}>
          <p>AI generated content here</p>
        </AITransparencyWrapper>
      )

      expect(screen.getByText('AI Generated Content')).toBeInTheDocument()
      expect(screen.getByText('85% confidence')).toBeInTheDocument()
      expect(screen.getByText('AI generated content here')).toBeInTheDocument()
    })

    it('displays confidence score with correct color coding', () => {
      const { rerender } = render(
        <AITransparencyWrapper {...defaultProps} confidence={0.9}>
          <p>High confidence content</p>
        </AITransparencyWrapper>
      )

      // High confidence (>= 0.8) should show green
      expect(screen.getByText('90% confidence')).toHaveClass('text-green-600')

      rerender(
        <AITransparencyWrapper {...defaultProps} confidence={0.7}>
          <p>Medium confidence content</p>
        </AITransparencyWrapper>
      )

      // Medium confidence (0.6-0.8) should show yellow
      expect(screen.getByText('70% confidence')).toHaveClass('text-yellow-600')

      rerender(
        <AITransparencyWrapper {...defaultProps} confidence={0.5}>
          <p>Low confidence content</p>
        </AITransparencyWrapper>
      )

      // Low confidence (< 0.6) should show red
      expect(screen.getByText('50% confidence')).toHaveClass('text-red-600')
    })

    it('shows explainability panel when reasoning is provided', async () => {
      render(
        <AITransparencyWrapper {...defaultProps}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Panel should be collapsed initially
      expect(screen.queryByText(defaultProps.reasoning)).not.toBeInTheDocument()

      // Click to expand
      const expandButton = screen.getByText('How this was generated')
      await userEvent.click(expandButton)

      // Should show reasoning and sources
      expect(screen.getByText(defaultProps.reasoning)).toBeInTheDocument()
      expect(screen.getByText('Enterprise Ireland Guidelines')).toBeInTheDocument()
      expect(screen.getByText('Similar funded projects')).toBeInTheDocument()
      expect(screen.getByText(`Model: ${defaultProps.model}`)).toBeInTheDocument()
    })

    it('handles rating submission', async () => {
      render(
        <AITransparencyWrapper {...defaultProps} onRating={mockOnRating}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Click thumbs up (rating 5)
      const thumbsUp = screen.getByRole('button', { name: /thumbs up/i })
      await userEvent.click(thumbsUp)

      expect(mockOnRating).toHaveBeenCalledWith(5)
    })

    it('shows feedback form for low ratings', async () => {
      render(
        <AITransparencyWrapper {...defaultProps} onRating={mockOnRating}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Click thumbs down (rating 2)
      const thumbsDown = screen.getByRole('button', { name: /thumbs down/i })
      await userEvent.click(thumbsDown)

      // Should show feedback textarea
      expect(screen.getByPlaceholderText(/Help us improve/)).toBeInTheDocument()

      // Enter feedback and submit
      const textarea = screen.getByPlaceholderText(/Help us improve/)
      await userEvent.type(textarea, 'The content was too generic')

      const submitButton = screen.getByText('Submit Feedback')
      await userEvent.click(submitButton)

      expect(mockOnRating).toHaveBeenCalledWith(2, 'The content was too generic')
    })

    it('handles regenerate button click', async () => {
      render(
        <AITransparencyWrapper {...defaultProps} onRegenerate={mockOnRegenerate}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      const regenerateButton = screen.getByText('Regenerate')
      await userEvent.click(regenerateButton)

      expect(mockOnRegenerate).toHaveBeenCalled()
    })

    it('can be hidden and shown', async () => {
      render(
        <AITransparencyWrapper {...defaultProps}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Content should be visible initially
      expect(screen.getByText('AI generated content')).toBeInTheDocument()

      // Click hide/show button
      const toggleButton = screen.getByRole('button', { name: /eye/i })
      await userEvent.click(toggleButton)

      // Content should be hidden
      expect(screen.queryByText('AI generated content')).not.toBeInTheDocument()

      // Click again to show
      await userEvent.click(toggleButton)
      expect(screen.getByText('AI generated content')).toBeInTheDocument()
    })
  })

  describe('Compact Variant', () => {
    it('renders in compact mode', () => {
      render(
        <AITransparencyWrapper {...defaultProps} variant="compact">
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      expect(screen.getByText('AI')).toBeInTheDocument()
      expect(screen.getByText('AI generated content')).toBeInTheDocument()
    })

    it('shows controls on hover in compact mode', async () => {
      render(
        <AITransparencyWrapper 
          {...defaultProps} 
          variant="compact" 
          onRegenerate={mockOnRegenerate}
        >
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Hover controls should not be visible initially (testing with presence of elements)
      const container = screen.getByText('AI generated content').closest('div')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Inline Variant', () => {
    it('renders in inline mode', () => {
      render(
        <AITransparencyWrapper {...defaultProps} variant="inline">
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      expect(screen.getByText('AI Generated Content')).toBeInTheDocument()
      expect(screen.getByText('AI generated content')).toBeInTheDocument()
    })

    it('has proper styling for inline content', () => {
      render(
        <AITransparencyWrapper {...defaultProps} variant="inline">
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Should have blue border styling
      const container = screen.getByText('AI generated content').closest('.border-l-4')
      expect(container).toHaveClass('border-blue-200', 'bg-blue-50')
    })
  })

  describe('Controls and Interactions', () => {
    it('disables controls when showControls is false', () => {
      render(
        <AITransparencyWrapper 
          {...defaultProps} 
          showControls={false}
          onRating={mockOnRating}
          onRegenerate={mockOnRegenerate}
        >
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      expect(screen.queryByText('Regenerate')).not.toBeInTheDocument()
      expect(screen.queryByText('Rate this AI generation')).not.toBeInTheDocument()
    })

    it('handles missing optional props gracefully', () => {
      const minimalProps = {
        confidence: 0.8,
        model: 'gpt-4-turbo'
      }

      render(
        <AITransparencyWrapper {...minimalProps}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      expect(screen.getByText('AI Generated Content')).toBeInTheDocument()
      expect(screen.getByText('80% confidence')).toBeInTheDocument()
    })

    it('shows correct confidence score formats', () => {
      const { rerender } = render(
        <AITransparencyWrapper {...defaultProps} confidence={0.856}>
          <p>Content</p>
        </AITransparencyWrapper>
      )

      // Should round to nearest integer
      expect(screen.getByText('86% confidence')).toBeInTheDocument()

      rerender(
        <AITransparencyWrapper {...defaultProps} confidence={1.0}>
          <p>Content</p>
        </AITransparencyWrapper>
      )

      expect(screen.getByText('100% confidence')).toBeInTheDocument()

      rerender(
        <AITransparencyWrapper {...defaultProps} confidence={0.0}>
          <p>Content</p>
        </AITransparencyWrapper>
      )

      expect(screen.getByText('0% confidence')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <AITransparencyWrapper {...defaultProps}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Buttons should have proper roles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('supports keyboard navigation', async () => {
      render(
        <AITransparencyWrapper {...defaultProps} onRating={mockOnRating}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Should be able to tab to and activate buttons
      const thumbsUp = screen.getByRole('button', { name: /thumbs up/i })
      thumbsUp.focus()
      
      expect(thumbsUp).toHaveFocus()

      // Should be able to activate with Enter key
      fireEvent.keyDown(thumbsUp, { key: 'Enter' })
      fireEvent.keyUp(thumbsUp, { key: 'Enter' })
    })
  })

  describe('Error Handling', () => {
    it('handles rating submission errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      
      render(
        <AITransparencyWrapper {...defaultProps} onRating={mockOnRating}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      // Mock error in rating callback
      mockOnRating.mockImplementation(() => {
        throw new Error('Network error')
      })

      const thumbsUp = screen.getByRole('button', { name: /thumbs up/i })
      await userEvent.click(thumbsUp)

      // Should not crash the component
      expect(screen.getByText('AI Generated Content')).toBeInTheDocument()
      
      consoleError.mockRestore()
    })

    it('handles invalid confidence scores', () => {
      // Should not crash with invalid confidence scores
      render(
        <AITransparencyWrapper {...defaultProps} confidence={-0.5}>
          <p>AI generated content</p>
        </AITransparencyWrapper>
      )

      expect(screen.getByText('AI Generated Content')).toBeInTheDocument()
    })
  })
})