'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AutoGenerateButton from './AutoGenerateButton';
import LexicalEditor from './LexicalEditor';
import { aiEditorService } from '@/lib/api/aiEditorServiceV2';
import type { EditorSession, AISuggestion, ChatMessage } from '@/lib/api/aiEditorServiceV2';
import { Lightbulb, MessageCircle, Save, Loader2, AlertCircle, CheckCircle, Users, Send, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks/use-toast';

interface AIEditorV2Props {
  applicationId: string;
  grantId: string;
  sectionType: string;
  sectionTitle: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onContentChange?: (content: string) => void;
  className?: string;
  fullPage?: boolean;
}

export default function AIEditorV2({
  applicationId,
  grantId,
  sectionType,
  sectionTitle,
  initialContent = '',
  onSave,
  onContentChange,
  className = '',
  fullPage = false
}: AIEditorV2Props) {
  const [isClient, setIsClient] = useState(false);
  const [session, setSession] = useState<EditorSession | null>(null);
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [activeTab, setActiveTab] = useState('editor');
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Initialize component on client side
  useEffect(() => {
    setIsClient(true);
    // Set initial character count
    setCharacterCount(initialContent.length);
    setWordCount(initialContent.split(/\s+/).filter(word => word.length > 0).length);
  }, [initialContent]);

  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create session with correct parameter names
      const newSession = await aiEditorService.createSession({
        applicationId,
        grantId,
        section: sectionType,
        title: sectionTitle
      });
      setSession(newSession);

      // Load any existing suggestions
      if (newSession.sessionId) {
        try {
          const existingSuggestions = await aiEditorService.getSessionSuggestions(newSession.sessionId);
          setSuggestions(existingSuggestions);
        } catch (suggestionsError) {
          console.warn('Failed to load existing suggestions:', suggestionsError);
        }
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setError('Failed to connect to AI service');
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to AI editor service. Some features may be limited.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, grantId, sectionType, sectionTitle, toast]);

  useEffect(() => {
    if (isClient && applicationId && grantId) {
      initializeSession();
    }
  }, [isClient, initializeSession, applicationId, grantId]);

  const scheduleAutoSave = useCallback((editorState: any, textContent: string) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (session) {
        try {
          setIsSaving(true);
          await aiEditorService.saveSession(session.sessionId, {
            editorState,
            content: textContent,
            saveType: 'auto'
          });
          setLastSaved(new Date());
          onSave?.(textContent);
        } catch (error) {
          console.warn('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }
    }, 2000);
  }, [session, onSave]);

  const handleContentChange = useCallback((editorState: any) => {
    try {
      // Get text content safely without using HTML generation
      let textContent = '';
      
      editorState.read(() => {
        try {
          // Try to get root node safely
          const root = editorState._nodeMap?.get?.('root') || editorState.getRootNode?.();
          if (root && typeof root.getTextContent === 'function') {
            textContent = root.getTextContent();
          } else {
            // Fallback to current content
            textContent = content || '';
          }
        } catch (innerError) {
          console.warn('Error reading editor state:', innerError);
          textContent = content || '';
        }
      });
      
      setContent(textContent);
      onContentChange?.(textContent);
      
      // Update word and character counts
      const words = textContent.split(/\s+/).filter((word: string) => word.length > 0);
      setWordCount(words.length);
      setCharacterCount(textContent.length);
      
      // Schedule auto-save
      scheduleAutoSave(editorState, textContent);
    } catch (error) {
      console.warn('Error updating content:', error);
      // Fallback: just update with current text
      const textContent = content || '';
      setWordCount(textContent.split(/\s+/).filter(word => word.length > 0).length);
      setCharacterCount(textContent.length);
    }
  }, [content, onContentChange, scheduleAutoSave]);

  const generateSuggestions = useCallback(async () => {
    if (!session || !content.trim()) {
      toast({
        title: 'No Content',
        description: 'Please write some content first to get AI suggestions.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsGeneratingSuggestions(true);
      setError(null);
      
      const newSuggestions = await aiEditorService.generateSuggestions({
        content,
        cursorPosition: content.length,
        context: {
          sessionId: session.sessionId,
          applicationId: session.applicationId,
          grantId: session.grantId || '',
          section: session.section,
          grantType: 'research' // Default for now
        }
      });
      
      setSuggestions(prev => [...prev, ...newSuggestions]);
      setActiveTab('suggestions');
      
      toast({
        title: 'AI Suggestions Ready',
        description: `Generated ${newSuggestions.length} suggestions for your ${sectionType} section`,
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      setError('Failed to generate suggestions');
      toast({
        title: 'AI Service Unavailable',
        description: 'Unable to generate suggestions right now. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [session, content, sectionType, toast]);

  const sendChatMessage = useCallback(async () => {
    if (!session || !chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');
    
    try {
      setIsLoading(true);
      const response = await aiEditorService.sendChatMessage(session.sessionId, {
        message: currentInput,
        context: {
          sessionId: session.sessionId,
          applicationId: session.applicationId,
          grantId: session.grantId || '',
          section: session.section,
          currentContent: content,
          sectionType
        }
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message || 'I can help you improve your grant application content.',
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat failed:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I\'m sorry, I\'m having trouble connecting right now. You can still use the editor, and I\'ll try to help you later.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [session, chatInput, content, sectionType]);

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading AI Editor...</span>
      </div>
    );
  }

  const containerClass = fullPage 
    ? "flex h-screen bg-gray-50" 
    : `${className}`;

  const editorClass = fullPage 
    ? "flex-1 flex flex-col bg-white" 
    : "";

  const sidebarClass = fullPage 
    ? "w-80 bg-white border-l border-gray-200 flex flex-col" 
    : "";

  if (fullPage) {
    return (
      <div className={containerClass}>
        {/* Main Editor Area */}
        <div className={editorClass}>
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold">{sectionTitle}</h1>
                <Badge variant="outline">AI Enhanced</Badge>
              </div>
              <div className="flex items-center gap-4">
                {error && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Limited Mode</span>
                  </div>
                )}
                {lastSaved && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
                {isSaving && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {wordCount} words • {characterCount} characters
                </div>
              </div>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 p-6">
            <div className="h-full">
              {renderEditor()}
            </div>
          </div>
        </div>

        {/* AI Sidebar */}
        <div className={sidebarClass}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-600 mt-1">Get help with your grant application</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="suggestions" className="flex-1">
                <Lightbulb className="h-4 w-4 mr-2" />
                Suggestions
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{suggestions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1">
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="suggestions" className="h-full p-4 overflow-y-auto">
                {renderSuggestions()}
              </TabsContent>
              
              <TabsContent value="chat" className="h-full flex flex-col">
                {renderChat()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">{sectionTitle}</h3>
          <Badge variant="outline">AI Enhanced</Badge>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Limited Mode</span>
            </div>
          )}
          {lastSaved && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
          {isSaving && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="suggestions">
            AI Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">{suggestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          {renderEditor()}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          {renderSuggestions()}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          {renderChat()}
        </TabsContent>
      </Tabs>
    </Card>
  );

  function renderEditor() {
    return (
      <div className="relative">
        <LexicalEditor
          content={content}
          onContentChange={(newContent) => {
            setContent(newContent);
            const words = newContent.split(/\s+/).filter(word => word.length > 0);
            setWordCount(words.length);
            setCharacterCount(newContent.length);
            onContentChange?.(newContent);
            scheduleAutoSave(null, newContent);
          }}
          placeholder={`Start writing your ${sectionType} section...`}
          minHeight={fullPage ? '400px' : '200px'}
        />
        
        {!fullPage && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <AutoGenerateButton
                sectionType={sectionType}
                grantId={session?.grantId || ''}
                organizationId="test-org"
                onContentGenerated={(generatedContent) => {
                  setContent(generatedContent);
                  onContentChange?.(generatedContent);
                }}
                size="sm"
                variant="outline"
              />
              <Button 
                onClick={generateSuggestions}
                disabled={isGeneratingSuggestions || !content.trim()}
                size="sm"
                variant="outline"
              >
                {isGeneratingSuggestions ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Lightbulb className="h-4 w-4 mr-2" />Get AI Suggestions</>
                )}
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              {wordCount} words • {characterCount} characters
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSuggestions() {
    return (
      <div className="space-y-4">
        {fullPage && (
          <div className="flex gap-2 mb-4">
            <AutoGenerateButton
              sectionType={sectionType}
              grantId={session?.grantId || ''}
              organizationId="test-org"
              onContentGenerated={(generatedContent) => {
                setContent(generatedContent);
                onContentChange?.(generatedContent);
              }}
              size="sm"
              className="flex-1"
            />
            <Button 
              onClick={generateSuggestions}
              disabled={isGeneratingSuggestions || !content.trim()}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              {isGeneratingSuggestions ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Lightbulb className="h-4 w-4 mr-2" />Get AI Suggestions</>
              )}
            </Button>
          </div>
        )}
        
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No suggestions yet</p>
            <p className="text-sm">Write some content and generate suggestions to see AI recommendations for your grant application</p>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <Card key={suggestion.id || index} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge variant={suggestion.type === 'enhancement' ? 'default' : 'secondary'}>
                  {suggestion.type}
                </Badge>
                <div className="text-xs text-gray-500">
                  {(suggestion.confidence * 100).toFixed(0)}% confidence
                </div>
              </div>
              <p className="text-sm mb-3">{suggestion.content}</p>
              {suggestion.reasoning && (
                <p className="text-xs text-gray-600 mb-3 italic">{suggestion.reasoning}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Accept</Button>
                <Button size="sm" variant="ghost">Dismiss</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    );
  }

  function renderChat() {
    return (
      <div className={`flex flex-col ${fullPage ? 'h-full' : 'h-96'}`}>
        <div className="flex-1 overflow-y-auto p-4 border border-gray-200 rounded-t-md bg-gray-50">
          {chatMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">AI Assistant Ready</p>
              <p className="text-sm">Ask me about grant writing best practices for your {sectionType} section</p>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium">Try asking:</p>
                <div className="space-y-1 text-xs">
                  <p>• "What should I include in this section?"</p>
                  <p>• "How can I make this more compelling?"</p>
                  <p>• "What are common mistakes to avoid?"</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <div key={message.id || index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    {message.role === 'assistant' && message.confidence && (
                      <div className="text-xs text-gray-500 mt-1">
                        Confidence: {(message.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-x border-b border-gray-200 rounded-b-md">
          <div className="flex gap-2 p-3">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask about your ${sectionType} section...`}
              className="flex-1 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
            />
            <Button 
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}