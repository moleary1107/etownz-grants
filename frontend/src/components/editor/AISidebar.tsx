'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { useAIEditorStore } from '../../lib/store/aiEditorStore';
import { aiEditorService } from '../../lib/api/aiEditorService';

interface AISidebarProps {
  applicationId: string;
  grantId?: string;
  currentSection?: string;
  className?: string;
}

// AI Suggestions Panel
function SuggestionsPanel() {
  const { 
    suggestions, 
    isGeneratingSuggestion, 
    activeSuggestion, 
    acceptSuggestion, 
    rejectSuggestion, 
    setActiveSuggestion 
  } = useAIEditorStore();

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'completion':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'improvement':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'grammar':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'structure':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {isGeneratingSuggestion && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">Generating AI suggestions...</span>
          </div>
        </Card>
      )}

      {suggestions.length === 0 && !isGeneratingSuggestion && (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">No suggestions yet</h3>
              <p className="text-xs text-gray-500 mt-1">Start writing to get AI-powered suggestions</p>
            </div>
          </div>
        </Card>
      )}

      {suggestions.map((suggestion) => (
        <Card 
          key={suggestion.id} 
          className={`p-4 transition-all cursor-pointer ${
            activeSuggestion?.id === suggestion.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => setActiveSuggestion(suggestion)}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-blue-600">
                  {getSuggestionIcon(suggestion.type)}
                </div>
                <Badge variant="outline" className="text-xs">
                  {suggestion.type}
                </Badge>
                <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Original Text */}
            {suggestion.originalText && (
              <div className="text-xs">
                <span className="text-gray-500">Replace:</span>
                <div className="bg-red-50 border-l-2 border-red-200 pl-2 mt-1 text-gray-700">
                  "{suggestion.originalText}"
                </div>
              </div>
            )}

            {/* Suggested Content */}
            <div className="text-xs">
              <span className="text-gray-500">
                {suggestion.originalText ? 'With:' : 'Suggestion:'}
              </span>
              <div className="bg-green-50 border-l-2 border-green-200 pl-2 mt-1 text-gray-700">
                "{suggestion.content}"
              </div>
            </div>

            {/* Reasoning */}
            {suggestion.reasoning && (
              <div className="text-xs text-gray-600 italic">
                {suggestion.reasoning}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  acceptSuggestion(suggestion.id);
                }}
                size="sm"
                className="h-7 text-xs bg-green-600 hover:bg-green-700"
              >
                Accept
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  rejectSuggestion(suggestion.id);
                }}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Chat Panel
function ChatPanel({ applicationId }: { applicationId: string }) {
  const { 
    chat, 
    sendChatMessage, 
    loadChatHistory, 
    markChatAsRead,
    currentSession 
  } = useAIEditorStore();
  
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentSession) {
      loadChatHistory();
    }
  }, [currentSession, loadChatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  useEffect(() => {
    markChatAsRead();
  }, [chat.messages, markChatAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || chat.isLoading) return;

    const message = newMessage.trim();
    setNewMessage('');
    await sendChatMessage(message);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {chat.messages.length === 0 && !chat.isLoading && (
          <div className="text-center py-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Start a conversation</h3>
                <p className="text-xs text-gray-500 mt-1">Ask questions about grant writing, requirements, or get help with your content</p>
              </div>
            </div>
          </div>
        )}

        {chat.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {formatTime(message.created_at)}
              </div>
            </div>
          </div>
        ))}

        {chat.isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">AI is typing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask a question about your grant application..."
            className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </span>
            <Button
              type="submit"
              disabled={!newMessage.trim() || chat.isLoading}
              size="sm"
              className="h-7"
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Requirements Panel
function RequirementsPanel({ grantId }: { grantId?: string }) {
  const { 
    requirements, 
    requirementsScore, 
    loadRequirements, 
    updateRequirementStatus 
  } = useAIEditorStore();

  useEffect(() => {
    if (grantId) {
      loadRequirements(grantId);
    }
  }, [grantId, loadRequirements]);

  const getStatusIcon = (status: 'met' | 'partial' | 'missing') => {
    switch (status) {
      case 'met':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'partial':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.634 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'missing':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: 'met' | 'partial' | 'missing') => {
    switch (status) {
      case 'met': return 'bg-green-50 border-green-200';
      case 'partial': return 'bg-yellow-50 border-yellow-200';
      case 'missing': return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Compliance Score</h3>
            <span className="text-lg font-bold text-blue-600">
              {Math.round(requirementsScore)}%
            </span>
          </div>
          <Progress value={requirementsScore} className="h-2" />
          <div className="text-xs text-gray-600">
            {requirements.filter(r => r.status === 'met').length} of {requirements.length} requirements met
          </div>
        </div>
      </Card>

      {/* Requirements List */}
      {requirements.length === 0 ? (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">No requirements found</h3>
              <p className="text-xs text-gray-500 mt-1">
                {grantId ? 'Unable to load requirements for this grant' : 'Select a grant to view requirements'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {requirements.map((requirement) => (
            <Card key={requirement.id} className={`p-3 ${getStatusColor(requirement.status)}`}>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(requirement.status)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{requirement.text}</p>
                    {requirement.suggestions && requirement.suggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-gray-700">Suggestions:</p>
                        {requirement.suggestions.map((suggestion, index) => (
                          <p key={index} className="text-xs text-gray-600 italic">
                            • {suggestion}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Status Toggle */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <div className="flex gap-1">
                    {(['missing', 'partial', 'met'] as const).map((status) => (
                      <Button
                        key={status}
                        onClick={() => updateRequirementStatus(requirement.id, status)}
                        size="sm"
                        variant={requirement.status === status ? "default" : "outline"}
                        className="h-6 px-2 text-xs"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Analytics Panel
function AnalyticsPanel() {
  const { analytics, currentAssessment, analyzeContent, isAnalyzing } = useAIEditorStore();

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Writing Stats */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Writing Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-lg font-bold text-blue-600">{analytics.wordCount}</div>
            <div className="text-xs text-gray-500">Words</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">{analytics.characterCount}</div>
            <div className="text-xs text-gray-500">Characters</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">
              {formatDuration(analytics.timeSpent)}
            </div>
            <div className="text-xs text-gray-500">Time Spent</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">
              {analytics.suggestionsAccepted + analytics.suggestionsRejected}
            </div>
            <div className="text-xs text-gray-500">AI Interactions</div>
          </div>
        </div>
      </Card>

      {/* AI Suggestions Stats */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Assistance</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Suggestions Accepted</span>
            <span className="text-sm font-medium text-green-600">
              {analytics.suggestionsAccepted}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Suggestions Rejected</span>
            <span className="text-sm font-medium text-red-600">
              {analytics.suggestionsRejected}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Acceptance Rate</span>
            <span className="text-sm font-medium text-blue-600">
              {analytics.suggestionsAccepted + analytics.suggestionsRejected > 0
                ? Math.round((analytics.suggestionsAccepted / (analytics.suggestionsAccepted + analytics.suggestionsRejected)) * 100)
                : 0}%
            </span>
          </div>
        </div>
      </Card>

      {/* Content Quality */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Content Quality</h3>
          <Button
            onClick={analyzeContent}
            disabled={isAnalyzing}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
        
        {currentAssessment ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Overall Score</span>
              <span className="text-sm font-medium text-blue-600">
                {Math.round((currentAssessment.overall_score || 0) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Clarity</span>
              <span className="text-sm font-medium">
                {Math.round((currentAssessment.clarity_score || 0) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Completeness</span>
              <span className="text-sm font-medium">
                {Math.round((currentAssessment.completeness_score || 0) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Compliance</span>
              <span className="text-sm font-medium">
                {Math.round((currentAssessment.compliance_score || 0) * 100)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">Click "Analyze" to assess content quality</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// Main AI Sidebar Component
export default function AISidebar({
  applicationId,
  grantId,
  currentSection,
  className = ''
}: AISidebarProps) {
  const { 
    sidebarOpen, 
    activeTab, 
    setSidebarOpen, 
    setActiveTab,
    chat
  } = useAIEditorStore();

  if (!sidebarOpen) {
    return (
      <div className={`w-12 border-l border-gray-200 bg-white ${className}`}>
        <div className="p-2">
          <Button
            onClick={() => setSidebarOpen(true)}
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 border-l border-gray-200 bg-white flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        <Button
          onClick={() => setSidebarOpen(false)}
          variant="ghost"
          size="sm"
          className="w-8 h-8 p-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex flex-col h-full">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="suggestions" className="text-xs">
                AI
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs relative">
                Chat
                {chat.unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                    {chat.unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requirements" className="text-xs">
                Req
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">
                Stats
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="suggestions" className="h-full p-4 overflow-y-auto m-0">
              <SuggestionsPanel />
            </TabsContent>

            <TabsContent value="chat" className="h-full m-0">
              <ChatPanel applicationId={applicationId} />
            </TabsContent>

            <TabsContent value="requirements" className="h-full p-4 overflow-y-auto m-0">
              <RequirementsPanel grantId={grantId} />
            </TabsContent>

            <TabsContent value="analytics" className="h-full p-4 overflow-y-auto m-0">
              <AnalyticsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}