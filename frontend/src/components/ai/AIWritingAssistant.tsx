'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { AITransparencyWrapper } from './AITransparencyWrapper';
import { 
  Bot, 
  Loader2, 
  Wand2, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCcw,
  Settings,
  Volume2,
  Copy,
  Check,
  StopCircle,
  Play
} from 'lucide-react';

interface AIWritingAssistantProps {
  grantType?: string;
  fundingBody?: string;
  sectionType: 'executive_summary' | 'methodology' | 'budget_justification' | 'impact' | 'project_description' | 'technical_approach' | 'sustainability_plan';
  initialContent?: string;
  onContentChange?: (content: string) => void;
  maxLength?: number;
  requirements?: string[];
  className?: string;
}

interface GenerationSettings {
  tone: 'formal' | 'persuasive' | 'technical' | 'conversational';
  length: 'brief' | 'moderate' | 'detailed';
  focusArea?: string;
}

interface StreamingState {
  isStreaming: boolean;
  streamedText: string;
  isComplete: boolean;
  canCancel: boolean;
}

export const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({
  grantType = 'general',
  fundingBody = 'Various',
  sectionType,
  initialContent = '',
  onContentChange,
  maxLength,
  requirements = [],
  className = ''
}) => {
  const [content, setContent] = useState(initialContent);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    isComplete: false,
    canCancel: false
  });
  const [settings, setSettings] = useState<GenerationSettings>({
    tone: 'formal',
    length: 'moderate'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [confidence, setConfidence] = useState(0.85);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content, streamingState.streamedText]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);
  }, [onContentChange]);

  const getSectionPrompt = useCallback(() => {
    const basePrompts = {
      executive_summary: 'Generate a compelling executive summary for this grant application',
      methodology: 'Create a detailed methodology section explaining the approach and methods',
      budget_justification: 'Write a budget justification explaining the cost breakdown and necessity',
      impact: 'Describe the expected impact and outcomes of this project',
      project_description: 'Provide a comprehensive project description',
      technical_approach: 'Detail the technical approach and implementation strategy',
      sustainability_plan: 'Outline a sustainability plan for long-term project viability'
    };

    const toneModifiers = {
      formal: 'in a formal, academic tone',
      persuasive: 'in a persuasive, compelling manner',
      technical: 'with technical precision and detail',
      conversational: 'in a clear, accessible style'
    };

    const lengthModifiers = {
      brief: '(keep it concise, 150-300 words)',
      moderate: '(aim for 300-600 words)',
      detailed: '(provide comprehensive detail, 600-1000 words)'
    };

    return `${basePrompts[sectionType]} ${toneModifiers[settings.tone]} ${lengthModifiers[settings.length]}. 
    
    Grant Type: ${grantType}
    Funding Body: ${fundingBody}
    ${settings.focusArea ? `Focus Area: ${settings.focusArea}` : ''}
    ${requirements.length > 0 ? `Requirements: ${requirements.join(', ')}` : ''}
    ${maxLength ? `Maximum length: ${maxLength} characters` : ''}
    
    ${content ? `Existing content to improve: "${content}"` : 'Generate new content from scratch.'}`;
  }, [sectionType, settings, grantType, fundingBody, requirements, maxLength, content]);

  const generateStreamingContent = useCallback(async () => {
    if (streamingState.isStreaming) return;

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    setIsGenerating(true);
    setStreamingState({
      isStreaming: true,
      streamedText: '',
      isComplete: false,
      canCancel: true
    });
    setFeedback(null);
    setSuggestions([]);

    try {
      const prompt = getSectionPrompt();
      
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prompt,
          sectionType,
          settings,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                accumulatedText += data.text;
                setStreamingState(prev => ({
                  ...prev,
                  streamedText: accumulatedText
                }));
              } else if (data.type === 'metadata') {
                setConfidence(data.confidence || 0.85);
                setSuggestions(data.suggestions || []);
              } else if (data.type === 'complete') {
                setStreamingState(prev => ({
                  ...prev,
                  isComplete: true,
                  canCancel: false
                }));
                handleContentChange(accumulatedText);
                break;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Content generation cancelled');
      } else {
        console.error('Error generating content:', error);
        // Fallback to non-streaming generation
        await generateFallbackContent();
      }
    } finally {
      setIsGenerating(false);
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        canCancel: false
      }));
      abortControllerRef.current = null;
    }
  }, [streamingState.isStreaming, getSectionPrompt, sectionType, settings, handleContentChange]);

  const generateFallbackContent = useCallback(async () => {
    try {
      const prompt = getSectionPrompt();
      
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prompt,
          sectionType,
          settings,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const result = await response.json();
      handleContentChange(result.content);
      setConfidence(result.confidence || 0.85);
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Fallback generation failed:', error);
      // Use mock content as last resort
      const mockContent = getMockContent();
      handleContentChange(mockContent);
    }
  }, [getSectionPrompt, sectionType, settings, handleContentChange]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStreamingState({
      isStreaming: false,
      streamedText: '',
      isComplete: false,
      canCancel: false
    });
  }, []);

  const acceptStreamedContent = useCallback(() => {
    handleContentChange(streamingState.streamedText);
    setStreamingState({
      isStreaming: false,
      streamedText: '',
      isComplete: false,
      canCancel: false
    });
  }, [streamingState.streamedText, handleContentChange]);

  const rejectStreamedContent = useCallback(() => {
    setStreamingState({
      isStreaming: false,
      streamedText: '',
      isComplete: false,
      canCancel: false
    });
    setFeedback('negative');
  }, []);

  const getMockContent = useCallback(() => {
    const mockContents = {
      executive_summary: 'This innovative project addresses critical challenges through cutting-edge technology and proven methodologies. Our comprehensive approach ensures sustainable impact while delivering measurable outcomes for the target community.',
      methodology: 'Our methodology combines quantitative and qualitative research approaches, utilizing industry best practices and innovative techniques to ensure robust and reliable results.',
      budget_justification: 'The proposed budget reflects careful consideration of all project requirements, ensuring optimal resource allocation while maintaining cost-effectiveness throughout the project lifecycle.',
      impact: 'This project will deliver significant positive impact through improved outcomes, enhanced capabilities, and sustainable long-term benefits for all stakeholders.',
      project_description: 'This project leverages advanced technology and collaborative partnerships to address pressing challenges and deliver innovative solutions.',
      technical_approach: 'Our technical approach follows industry standards while incorporating innovative methodologies to ensure robust, scalable, and maintainable solutions.',
      sustainability_plan: 'Long-term sustainability will be achieved through diversified funding streams, strategic partnerships, and continuous innovation to maintain project viability beyond the grant period.'
    };
    
    return mockContents[sectionType] || 'Generated content for this section.';
  }, [sectionType]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [content]);

  const provideFeedback = useCallback(async (type: 'positive' | 'negative') => {
    setFeedback(type);
    
    // Send feedback to backend for learning
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
          feedback: type,
          settings,
          confidence
        })
      });
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
  }, [sectionType, content, settings, confidence]);

  const getSectionTitle = () => {
    const titles = {
      executive_summary: 'Executive Summary',
      methodology: 'Methodology',
      budget_justification: 'Budget Justification',
      impact: 'Impact Statement',
      project_description: 'Project Description',
      technical_approach: 'Technical Approach',
      sustainability_plan: 'Sustainability Plan'
    };
    return titles[sectionType] || 'Content Section';
  };

  const currentText = streamingState.isStreaming ? streamingState.streamedText : content;
  const wordCount = currentText.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = currentText.length;

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{getSectionTitle()}</h3>
              <p className="text-sm text-gray-600">AI Writing Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            {!streamingState.isStreaming && content && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                {copySuccess ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Generation Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tone</label>
                <select
                  value={settings.tone}
                  onChange={(e) => setSettings(prev => ({ ...prev, tone: e.target.value as any }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="formal">Formal</option>
                  <option value="persuasive">Persuasive</option>
                  <option value="technical">Technical</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Length</label>
                <select
                  value={settings.length}
                  onChange={(e) => setSettings(prev => ({ ...prev, length: e.target.value as any }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="brief">Brief (150-300 words)</option>
                  <option value="moderate">Moderate (300-600 words)</option>
                  <option value="detailed">Detailed (600-1000 words)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Focus Area (Optional)</label>
                <input
                  type="text"
                  value={settings.focusArea || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, focusArea: e.target.value }))}
                  placeholder="e.g., innovation, sustainability"
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          </div>
        )}

        {/* Generation Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {streamingState.canCancel ? (
              <Button
                onClick={cancelGeneration}
                variant="destructive"
                size="sm"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button
                onClick={generateStreamingContent}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    {content ? 'Regenerate' : 'Generate'} Content
                  </>
                )}
              </Button>
            )}
            
            {content && !streamingState.isStreaming && (
              <Button
                onClick={() => handleContentChange('')}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} characters</span>
            {maxLength && (
              <>
                <span>•</span>
                <span className={charCount > maxLength ? 'text-red-600' : ''}>
                  {maxLength - charCount} remaining
                </span>
              </>
            )}
          </div>
        </div>

        {/* Content Display */}
        <AITransparencyWrapper
          confidence={confidence}
          model="gpt-4o"
          reasoning={`Generated ${sectionType} content using ${settings.tone} tone and ${settings.length} length setting`}
        >
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={currentText}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={streamingState.isStreaming ? 'AI is writing...' : `Enter or generate ${getSectionTitle().toLowerCase()} content...`}
              className={`min-h-[200px] resize-none ${streamingState.isStreaming ? 'bg-blue-50 border-blue-200' : ''}`}
              disabled={streamingState.isStreaming}
            />
            
            {streamingState.isStreaming && (
              <div className="absolute bottom-3 right-3">
                <div className="flex items-center space-x-1 text-blue-600">
                  <div className="animate-pulse">✨</div>
                  <span className="text-sm">AI writing...</span>
                </div>
              </div>
            )}
          </div>
        </AITransparencyWrapper>

        {/* Streaming Controls */}
        {streamingState.isComplete && streamingState.streamedText && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700">
                AI has finished generating content. Would you like to accept this content?
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={rejectStreamedContent}
                  variant="outline"
                  size="sm"
                >
                  Reject
                </Button>
                <Button
                  onClick={acceptStreamedContent}
                  size="sm"
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && !streamingState.isStreaming && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">AI Suggestions:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {content && !streamingState.isStreaming && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Was this content helpful?</span>
              <div className="flex space-x-2">
                <Button
                  variant={feedback === 'positive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => provideFeedback('positive')}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant={feedback === 'negative' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => provideFeedback('negative')}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};