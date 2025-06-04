'use client';

import { useState, useCallback } from 'react';
import { useStreamingResponse } from './useStreamingResponse';

interface GenerationSettings {
  tone: 'formal' | 'persuasive' | 'technical' | 'conversational';
  length: 'brief' | 'moderate' | 'detailed';
  focusArea?: string;
}

interface GenerationRequest {
  sectionType: string;
  grantType?: string;
  fundingBody?: string;
  requirements?: string[];
  existingContent?: string;
  settings: GenerationSettings;
}

interface GenerationMetadata {
  confidence?: number;
  suggestions?: string[];
  wordCount?: number;
  tokenCount?: number;
}

export const useAIWriting = () => {
  const [metadata, setMetadata] = useState<GenerationMetadata>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  const {
    isStreaming,
    streamedText,
    isComplete,
    error,
    canCancel,
    startStream,
    cancelStream,
    reset
  } = useStreamingResponse();

  const generateContent = useCallback(async (
    request: GenerationRequest,
    streaming: boolean = true
  ): Promise<string> => {
    setIsGenerating(true);
    setMetadata({});

    try {
      if (streaming) {
        const result = await startStream('/api/ai/generate-content', {
          prompt: buildPrompt(request),
          sectionType: request.sectionType,
          settings: request.settings,
          stream: true,
          existingContent: request.existingContent
        }, {
          onMetadata: (meta) => {
            setMetadata(prev => ({ ...prev, ...meta }));
          },
          onComplete: (fullText) => {
            setIsGenerating(false);
            return fullText;
          },
          onError: (error) => {
            setIsGenerating(false);
            console.error('Streaming generation failed:', error);
          }
        });
        
        return result || streamedText;
      } else {
        // Non-streaming fallback
        const response = await fetch('/api/ai/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            prompt: buildPrompt(request),
            sectionType: request.sectionType,
            settings: request.settings,
            stream: false,
            existingContent: request.existingContent
          })
        });

        if (!response.ok) {
          throw new Error('Failed to generate content');
        }

        const result = await response.json();
        setMetadata({
          confidence: result.confidence,
          suggestions: result.suggestions,
          wordCount: result.wordCount
        });
        
        return result.content;
      }
    } catch (error) {
      setIsGenerating(false);
      throw error;
    }
  }, [startStream, streamedText]);

  const generateSuggestions = useCallback(async (
    content: string,
    sectionType: string,
    grantType?: string,
    fundingBody?: string
  ) => {
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content,
          sectionType,
          grantType,
          fundingBody
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return { suggestions: [], contentAnalysis: {} };
    }
  }, []);

  const provideFeedback = useCallback(async (
    sectionType: string,
    content: string,
    feedback: 'positive' | 'negative',
    settings: GenerationSettings,
    confidence?: number
  ) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sectionType,
          content,
          feedback,
          settings,
          confidence
        })
      });
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  }, []);

  const buildPrompt = useCallback((request: GenerationRequest): string => {
    const {
      sectionType,
      grantType = 'general',
      fundingBody = 'Various',
      requirements = [],
      existingContent = '',
      settings
    } = request;

    const sectionDescriptions = {
      executive_summary: 'a compelling executive summary',
      methodology: 'a detailed methodology section',
      budget_justification: 'a budget justification',
      impact: 'an impact statement',
      project_description: 'a project description',
      technical_approach: 'a technical approach',
      sustainability_plan: 'a sustainability plan'
    };

    const toneDescriptions = {
      formal: 'formal, academic tone',
      persuasive: 'persuasive, compelling manner',
      technical: 'technical precision and detail',
      conversational: 'clear, accessible style'
    };

    const lengthDescriptions = {
      brief: 'concise (150-300 words)',
      moderate: 'moderate detail (300-600 words)', 
      detailed: 'comprehensive (600-1000 words)'
    };

    let prompt = `Generate ${sectionDescriptions[sectionType as keyof typeof sectionDescriptions] || sectionType} for a grant application.

Guidelines:
- Grant Type: ${grantType}
- Funding Body: ${fundingBody}
- Tone: ${toneDescriptions[settings.tone]}
- Length: ${lengthDescriptions[settings.length]}`;

    if (settings.focusArea) {
      prompt += `\n- Focus Area: ${settings.focusArea}`;
    }

    if (requirements.length > 0) {
      prompt += `\n- Requirements: ${requirements.join(', ')}`;
    }

    if (existingContent) {
      prompt += `\n\nExisting content to improve:\n"${existingContent}"\n\nPlease enhance or rewrite this content.`;
    }

    prompt += '\n\nGenerate high-quality, professional content that meets these specifications.';

    return prompt;
  }, []);

  return {
    // Generation state
    isGenerating: isGenerating || isStreaming,
    isStreaming,
    streamedText,
    isComplete,
    error,
    canCancel,
    metadata,
    
    // Actions
    generateContent,
    generateSuggestions,
    provideFeedback,
    cancelGeneration: cancelStream,
    reset
  };
};