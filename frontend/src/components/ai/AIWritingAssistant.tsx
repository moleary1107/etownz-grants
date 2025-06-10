'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { AITransparencyWrapper } from './AITransparencyWrapper';
import { assistantsService } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
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
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [threadId, setThreadId] = useState<string | null>(null);
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);
  }, [onContentChange]);

  const generateStreamingContent = useCallback(async () => {
    if (streamingState.isStreaming) return;

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
      // Create or reuse thread
      let currentThreadId = threadId;
      if (!currentThreadId) {
        const threadResult = await assistantsService.createThread('proposal_writer');
        currentThreadId = threadResult.threadId;
        setThreadId(currentThreadId);
      }

      // Generate content with streaming
      const result = await assistantsService.generateContent(
        'proposal_writer',
        {
          threadId: currentThreadId,
          sectionType,
          grantType,
          fundingBody,
          requirements,
          wordLimit: maxLength ? Math.floor(maxLength / 5) : undefined,
          previousSections: content ? { [sectionType]: content } : undefined
        },
        (chunk) => {
          setStreamingState(prev => ({
            ...prev,
            streamedText: prev.streamedText + chunk
          }));
        }
      );

      // Update UI with results
      setConfidence(result.confidence);
      setSuggestions(result.suggestions);
      setStreamingState(prev => ({
        ...prev,
        isComplete: true,
        canCancel: false
      }));
      handleContentChange(result.content);

      toast({
        title: "Content generated successfully",
        description: `${result.metadata.tokensUsed} tokens used in ${result.metadata.processingTime}ms`
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        canCancel: false
      }));
    }
  }, [streamingState.isStreaming, threadId, sectionType, grantType, fundingBody, requirements, maxLength, content, handleContentChange, toast]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        canCancel: false
      }));
      setIsGenerating(false);
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    const textToCopy = streamingState.streamedText || content;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard",
        variant: "destructive"
      });
    }
  }, [streamingState.streamedText, content, toast]);

  const speakText = useCallback(() => {
    const textToSpeak = streamingState.streamedText || content;
    if (!textToSpeak) return;

    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    }
  }, [streamingState.streamedText, content, isPlaying]);

  const submitFeedback = useCallback(async (type: 'positive' | 'negative') => {
    setFeedback(type);
    if (threadId) {
      try {
        await assistantsService.rateInteraction(
          threadId,
          type === 'positive' ? 5 : 1,
          type === 'negative' ? 'Content did not meet expectations' : undefined
        );
        toast({
          title: "Feedback submitted",
          description: "Thank you for your feedback!"
        });
      } catch (error) {
        console.error('Error submitting feedback:', error);
      }
    }
  }, [threadId, toast]);

  const getSectionLabel = (type: string): string => {
    const labels: Record<string, string> = {
      executive_summary: 'Executive Summary',
      methodology: 'Methodology',
      budget_justification: 'Budget Justification',
      impact: 'Impact Statement',
      project_description: 'Project Description',
      technical_approach: 'Technical Approach',
      sustainability_plan: 'Sustainability Plan'
    };
    return labels[type] || type;
  };

  return (
    <AITransparencyWrapper
      model="gpt-4"
      confidence={confidence}
    >
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">AI Writing Assistant</h3>
              <Badge variant="secondary">{getSectionLabel(sectionType)}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showSettings && (
            <Card className="p-4 bg-muted/50">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Tone</label>
                  <div className="flex gap-2 mt-1">
                    {(['formal', 'persuasive', 'technical', 'conversational'] as const).map(tone => (
                      <Button
                        key={tone}
                        size="sm"
                        variant={settings.tone === tone ? 'default' : 'outline'}
                        onClick={() => setSettings(prev => ({ ...prev, tone }))}
                      >
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Length</label>
                  <div className="flex gap-2 mt-1">
                    {(['brief', 'moderate', 'detailed'] as const).map(length => (
                      <Button
                        key={length}
                        size="sm"
                        variant={settings.length === length ? 'default' : 'outline'}
                        onClick={() => setSettings(prev => ({ ...prev, length }))}
                      >
                        {length.charAt(0).toUpperCase() + length.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={streamingState.isStreaming ? streamingState.streamedText : content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={`Write your ${getSectionLabel(sectionType).toLowerCase()} here...`}
              className="min-h-[200px] pr-12"
              maxLength={maxLength}
              disabled={streamingState.isStreaming}
            />
            {maxLength && (
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {(streamingState.isStreaming ? streamingState.streamedText : content).length}/{maxLength}
              </div>
            )}
          </div>

          {requirements.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <strong>Requirements:</strong> {requirements.join(', ')}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {streamingState.isStreaming ? (
                <Button
                  onClick={cancelGeneration}
                  variant="outline"
                  size="sm"
                  disabled={!streamingState.canCancel}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              ) : (
                <Button
                  onClick={generateStreamingContent}
                  disabled={isGenerating}
                  size="sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-1" />
                      Generate Content
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => handleContentChange('')}
                variant="outline"
                size="sm"
                disabled={streamingState.isStreaming || !content}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="h-8 w-8"
                disabled={!content && !streamingState.streamedText}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={speakText}
                className="h-8 w-8"
                disabled={!content && !streamingState.streamedText}
              >
                {isPlaying ? (
                  <StopCircle className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              {confidence > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant={feedback === 'positive' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => submitFeedback('positive')}
                    className="h-8 w-8"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={feedback === 'negative' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => submitFeedback('negative')}
                    className="h-8 w-8"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {suggestions.length > 0 && (
            <Card className="p-4 bg-primary/5">
              <h4 className="text-sm font-medium mb-2">Suggestions for Improvement</h4>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {streamingState.isComplete && confidence > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
              <span>AI-generated content</span>
            </div>
          )}
        </div>
      </Card>
    </AITransparencyWrapper>
  );
};