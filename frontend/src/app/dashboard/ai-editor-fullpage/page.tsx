'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import GrantEditor from '../../../components/editor/GrantEditor';
import AISidebar from '../../../components/editor/AISidebar';
import { useAIEditorStore } from '../../../lib/store/aiEditorStore';
import { User as AuthUser } from '../../../lib/auth';

interface AIEditorPageProps {
  // Optional props for when called from other pages
  applicationId?: string;
  grantId?: string;
  section?: string;
}

function AIEditorFullPageContent({ 
  applicationId: propApplicationId,
  grantId: propGrantId,
  section: propSection
}: AIEditorPageProps = {}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get params from URL or props
  const applicationId = propApplicationId || searchParams.get('applicationId') || '';
  const grantId = propGrantId || searchParams.get('grantId') || '';
  const section = propSection || searchParams.get('section') || 'main';
  
  const {
    currentSession,
    createSession,
    loadSession,
    saveContent,
    sidebarOpen,
    setSidebarOpen,
    focusMode,
    toggleFocusMode,
    saveStatus,
    analytics,
    reset
  } = useAIEditorStore();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    // Initialize or load session when component mounts
    if (user && applicationId) {
      initializeSession();
    }

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, [user, applicationId, section]);

  const initializeSession = async () => {
    try {
      // Check if we have a session ID in URL params
      const sessionId = searchParams.get('sessionId');
      
      if (sessionId) {
        // Load existing session
        await loadSession(sessionId);
      } else {
        // Create new session
        const title = `${section.charAt(0).toUpperCase() + section.slice(1)} Section`;
        await createSession(applicationId, section, title);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const handleSave = async () => {
    await saveContent(true); // Force save
  };

  const handleExitEditor = () => {
    if (applicationId) {
      router.push(`/dashboard/applications/${applicationId}/edit`);
    } else {
      router.push('/dashboard/applications');
    }
  };

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saving': return 'text-blue-600';
      case 'saved': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'error': return 'Save failed';
      default: return 'Ready';
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!applicationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Application Selected</h2>
          <p className="text-gray-600 mb-6">
            Please select an application to start using the AI editor.
          </p>
          <Button onClick={() => router.push('/dashboard/applications')}>
            Go to Applications
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      {!focusMode && (
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitEditor}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Exit Editor
            </Button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI Grant Editor</h1>
              <p className="text-sm text-gray-500">
                Application: {applicationId} • Section: {section}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Analytics Display */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{analytics.wordCount} words</span>
              <span>•</span>
              <span>{analytics.suggestionsAccepted} suggestions accepted</span>
              <span>•</span>
              <div className={`flex items-center gap-1 ${getSaveStatusColor()}`}>
                {saveStatus === 'saving' && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                )}
                <span>{getSaveStatusText()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFocusMode}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Focus Mode
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                {sidebarOpen ? 'Hide' : 'Show'} AI Assistant
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className={`flex-1 ${focusMode ? 'p-8' : 'p-6'}`}>
          <GrantEditor
            applicationId={applicationId}
            grantId={grantId}
            section={section}
            placeholder={`Start writing your ${section} section...`}
          />
        </div>

        {/* AI Sidebar */}
        {!focusMode && (
          <AISidebar
            applicationId={applicationId}
            grantId={grantId}
            currentSection={section}
          />
        )}
      </div>

      {/* Focus Mode Controls */}
      {focusMode && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3">
          <Card className="flex items-center gap-3 px-4 py-2 shadow-lg">
            <div className="text-sm text-gray-600">
              {analytics.wordCount} words
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className={`text-sm ${getSaveStatusColor()}`}>
              {getSaveStatusText()}
            </div>
          </Card>

          <Button
            onClick={toggleFocusMode}
            className="shadow-lg"
          >
            Exit Focus Mode
          </Button>
        </div>
      )}

      {/* Session Info */}
      {currentSession && !focusMode && (
        <div className="bg-gray-100 px-6 py-2 text-xs text-gray-600 flex items-center justify-between">
          <div>
            Session: {currentSession.id} • Last saved: {currentSession.last_saved_at ? new Date(currentSession.last_saved_at).toLocaleTimeString() : 'Never'}
          </div>
          
          {currentSession.collaborators && currentSession.collaborators.length > 0 && (
            <div className="flex items-center gap-2">
              <span>Collaborators:</span>
              <div className="flex -space-x-2">
                {currentSession.collaborators.slice(0, 3).map((collaborator, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-xs text-white font-medium"
                    title={collaborator}
                  >
                    {collaborator.charAt(0).toUpperCase()}
                  </div>
                ))}
                {currentSession.collaborators.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                    +{currentSession.collaborators.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIEditorFullPage(props: AIEditorPageProps = {}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AIEditorFullPageContent {...props} />
    </Suspense>
  );
}