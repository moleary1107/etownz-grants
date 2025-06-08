'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, EditorState } from 'lexical';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Save, 
  Lightbulb, 
  MessageSquare, 
  Search, 
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { aiEditorService, type EditorSession, type ContentSuggestion, type ChatMessage } from '@/lib/api/aiEditorService';

// Editor configuration
const editorConfig = {
  namespace: 'AIEditor',
  nodes: [HeadingNode, ListNode, ListItemNode, CodeNode, LinkNode],
  onError: (error: Error) => {
    console.error('Lexical error:', error);
  },
  theme: {
    root: 'p-4 border border-gray-200 rounded-lg focus-within:border-blue-500 min-h-[300px]',
    paragraph: 'mb-4',
    heading: {
      h1: 'text-2xl font-bold mb-4',
      h2: 'text-xl font-semibold mb-3',
      h3: 'text-lg font-medium mb-2',
    },
    list: {
      nested: {
        listitem: 'list-none',
      },
      ol: 'list-decimal ml-4',
      ul: 'list-disc ml-4',
    },
    listitem: 'mb-1',
    code: 'bg-gray-100 px-2 py-1 rounded font-mono text-sm',
    link: 'text-blue-600 hover:text-blue-800 underline',
  },
};

interface AIEditorProps {
  applicationId: string;
  grantId: string;
  sectionType: string;
  sectionTitle: string;
  initialContent?: string;
  onSave?: (content: string, editorState: EditorState) => void;
  onContentChange?: (content: string) => void;
}

// Auto-save plugin
function AutoSavePlugin({ 
  sessionId, 
  onSave 
}: { 
  sessionId: string; 
  onSave: (editorState: EditorState) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleSave = useCallback((editorState: EditorState) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onSave(editorState);
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, [onSave]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      handleSave(editorState);
    });
  }, [editor, handleSave]);

  return null;
}

// AI Suggestions Plugin
function AISuggestionsPlugin({ 
  sessionId, 
  suggestions, 
  onAcceptSuggestion 
}: { 
  sessionId: string;
  suggestions: ContentSuggestion[];
  onAcceptSuggestion: (suggestion: ContentSuggestion) => void;
}) {
  const [editor] = useLexicalComposerContext();

  const applySuggestion = useCallback((suggestion: ContentSuggestion) => {
    editor.update(() => {
      const root = $getRoot();
      
      if (suggestion.suggestion_type === 'insertion') {
        // Insert at cursor position
        const parser = new DOMParser();
        const dom = parser.parseFromString(suggestion.suggested_text, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        $insertNodes(nodes);
      } else if (suggestion.suggestion_type === 'replacement') {
        // Replace selected text or text at position
        root.clear();
        const parser = new DOMParser();
        const dom = parser.parseFromString(suggestion.suggested_text, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        $insertNodes(nodes);
      }
    });
    
    onAcceptSuggestion(suggestion);
  }, [editor, onAcceptSuggestion]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute top-2 right-2 max-w-sm">
      {suggestions.map((suggestion, index) => (
        <div key={suggestion.id} className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              AI Suggestion
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Math.round((suggestion.confidence_score || 0) * 100)}%
            </Badge>
          </div>
          <p className="text-sm text-gray-700 mb-2">{suggestion.reasoning}</p>
          <div className="text-xs text-gray-600 mb-3 max-h-20 overflow-y-auto">
            {suggestion.suggested_text}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => applySuggestion(suggestion)}
              className="text-xs"
            >
              Apply
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onAcceptSuggestion(suggestion)}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIEditor({
  applicationId,
  grantId,
  sectionType,
  sectionTitle,
  initialContent = '',
  onSave,
  onContentChange
}: AIEditorProps) {
  const [session, setSession] = useState<EditorSession | null>(null);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState({
    session: false,
    suggestions: false,
    chat: false,
    save: false
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentContent, setCurrentContent] = useState(initialContent);

  // Initialize editor session
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(prev => ({ ...prev, session: true }));
      try {
        const newSession = await aiEditorService.createSession({
          application_id: applicationId,
          section_type: sectionType,
          title: sectionTitle,
          collaborators: []
        });
        setSession(newSession);
        
        // Load existing suggestions and chat history
        const [existingSuggestions, chatHistory] = await Promise.all([
          aiEditorService.getSuggestions(newSession.id),
          aiEditorService.getChatHistory(newSession.id)
        ]);
        
        setSuggestions(existingSuggestions);
        setChatMessages(chatHistory);
      } catch (error) {
        console.error('Failed to initialize AI editor session:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, session: false }));
      }
    };

    if (applicationId && grantId) {
      initializeSession();
    }
  }, [applicationId, grantId, sectionType, sectionTitle]);

  // Handle content changes
  const handleContentChange = useCallback((editorState: EditorState) => {
    let htmlContent = '';
    let textContent = '';
    
    editorState.read(() => {
      htmlContent = $generateHtmlFromNodes(editorState._nodeMap.get('root')!, null);
      textContent = $getRoot().getTextContent();
    });
    
    setCurrentContent(textContent);
    onContentChange?.(textContent);
  }, [onContentChange]);

  // Auto-save function
  const handleAutoSave = useCallback(async (editorState: EditorState) => {
    if (!session) return;
    
    setIsLoading(prev => ({ ...prev, save: true }));
    try {
      let textContent = '';
      editorState.read(() => {
        textContent = $getRoot().getTextContent();
      });

      await aiEditorService.saveContent(session.id, {
        editor_state: editorState.toJSON(),
        content_text: textContent,
        save_type: 'auto'
      });
      
      setLastSaved(new Date());
      onSave?.(textContent, editorState);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, save: false }));
    }
  }, [session, onSave]);

  // Generate AI suggestions
  const generateSuggestions = useCallback(async () => {
    if (!session || !currentContent) return;
    
    setIsLoading(prev => ({ ...prev, suggestions: true }));
    try {
      const newSuggestions = await aiEditorService.getContextualSuggestions(session.id, {
        cursor_position: currentContent.length,
        surrounding_text: currentContent.slice(-500), // Last 500 characters
        section_context: sectionType
      });
      
      setSuggestions(prev => [...prev, ...newSuggestions]);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, suggestions: false }));
    }
  }, [session, currentContent, sectionType]);

  // Handle AI chat
  const handleChatSubmit = useCallback(async () => {
    if (!session || !chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: session.id,
      user_id: 'current-user', // Would be actual user ID
      role: 'user',
      content: chatInput,
      content_type: 'text',
      is_read: true,
      created_at: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(prev => ({ ...prev, chat: true }));
    
    try {
      const aiResponse = await aiEditorService.sendChatMessage(session.id, chatInput);
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chat failed:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: session.id,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        content_type: 'text',
        is_read: true,
        created_at: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(prev => ({ ...prev, chat: false }));
    }
  }, [session, chatInput]);

  // Accept suggestion
  const handleAcceptSuggestion = useCallback(async (suggestion: ContentSuggestion) => {
    try {
      await aiEditorService.respondToSuggestion(suggestion.id, { action: 'accept' });
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  }, []);

  if (isLoading.session) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Initializing AI Editor...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">{sectionTitle}</h3>
          <Badge variant="outline">AI Enhanced</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {lastSaved && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
          {isLoading.save && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="suggestions">
            AI Suggestions {suggestions.length > 0 && <Badge className="ml-1">{suggestions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="chat">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <div className="relative">
            <LexicalComposer initialConfig={editorConfig}>
              <div className="relative">
                <RichTextPlugin
                  contentEditable={<ContentEditable />}
                  placeholder={
                    <div className="absolute top-4 left-4 text-gray-500 pointer-events-none">
                      Start writing your {sectionType} section...
                    </div>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <OnChangePlugin onChange={handleContentChange} />
                <HistoryPlugin />
                {session && <AutoSavePlugin sessionId={session.id} onSave={handleAutoSave} />}
                {session && (
                  <AISuggestionsPlugin 
                    sessionId={session.id}
                    suggestions={suggestions}
                    onAcceptSuggestion={handleAcceptSuggestion}
                  />
                )}
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    onClick={generateSuggestions}
                    disabled={isLoading.suggestions || !currentContent}
                    size="sm"
                    variant="outline"
                  >
                    {isLoading.suggestions ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Lightbulb className="h-4 w-4 mr-2" />
                    )}
                    Get AI Suggestions
                  </Button>
                </div>
                
                <div className="text-sm text-gray-500">
                  {currentContent.length} characters
                </div>
              </div>
            </LexicalComposer>
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <div className="space-y-4">
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No suggestions yet. Start writing to get AI-powered suggestions!</p>
              </div>
            ) : (
              suggestions.map(suggestion => (
                <Card key={suggestion.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">
                      {suggestion.suggestion_type}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round((suggestion.confidence_score || 0) * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{suggestion.reasoning}</p>
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <p className="text-sm">{suggestion.suggested_text}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcceptSuggestion(suggestion)}>
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleAcceptSuggestion(suggestion)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <div className="space-y-4">
            <div className="h-64 border rounded-lg p-4 overflow-y-auto bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Ask the AI assistant for help with your {sectionType} section!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white border shadow-sm'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading.chat && (
                    <div className="flex justify-start">
                      <div className="bg-white border shadow-sm p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                placeholder="Ask for help with your content..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading.chat}
              />
              <Button 
                onClick={handleChatSubmit}
                disabled={isLoading.chat || !chatInput.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}