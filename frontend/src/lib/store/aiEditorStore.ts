import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EditorState } from 'lexical';
import { aiEditorService, EditorSession, ChatMessage, ContentAssessment } from '../api/aiEditorService';

export interface AISuggestion {
  id: string;
  type: 'completion' | 'improvement' | 'grammar' | 'structure';
  content: string;
  originalText?: string;
  confidence: number;
  reasoning?: string;
  position?: {
    start: number;
    end: number;
  };
  metadata?: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface CollaboratorPresence {
  userId: string;
  email: string;
  name: string;
  cursor?: {
    position: number;
    selection?: { start: number; end: number };
  };
  isOnline: boolean;
  lastActive: string;
  color: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string;
  unreadCount: number;
}

export interface EditorAnalytics {
  wordCount: number;
  characterCount: number;
  timeSpent: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  collaborationEvents: number;
  lastActivity: string;
}

interface AIEditorStore {
  // Editor Session State
  currentSession?: EditorSession;
  sessions: EditorSession[];
  isSessionLoading: boolean;
  sessionError?: string;

  // Content State
  content: string;
  editorState?: EditorState;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  autoSaveInterval: number;

  // AI Suggestions State
  suggestions: AISuggestion[];
  isGeneratingSuggestion: boolean;
  activeSuggestion?: AISuggestion;
  suggestionHistory: AISuggestion[];

  // Chat State
  chat: ChatState;

  // Collaboration State
  collaborators: CollaboratorPresence[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Content Analysis State
  currentAssessment?: ContentAssessment;
  assessmentHistory: ContentAssessment[];
  isAnalyzing: boolean;

  // Requirements State
  requirements: Array<{
    id: string;
    text: string;
    status: 'met' | 'partial' | 'missing';
    suggestions?: string[];
  }>;
  requirementsScore: number;

  // Analytics State
  analytics: EditorAnalytics;

  // UI State
  sidebarOpen: boolean;
  activeTab: 'suggestions' | 'chat' | 'requirements' | 'analytics';
  showToolbar: boolean;
  focusMode: boolean;

  // Actions - Session Management
  createSession: (applicationId: string, sectionType: string, title: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadApplicationSessions: (applicationId: string) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<EditorSession>) => Promise<void>;
  setCurrentSession: (session: EditorSession) => void;

  // Actions - Content Management
  setContent: (content: string) => void;
  setEditorState: (state: EditorState) => void;
  saveContent: (force?: boolean) => Promise<void>;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  resetDirtyFlag: () => void;

  // Actions - AI Suggestions
  generateSuggestion: (context: { cursor: number; text: string; section: string }) => Promise<void>;
  addSuggestion: (suggestion: AISuggestion) => void;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;
  setActiveSuggestion: (suggestion?: AISuggestion) => void;
  clearSuggestions: () => void;

  // Actions - Chat
  sendChatMessage: (message: string) => Promise<void>;
  loadChatHistory: () => Promise<void>;
  markChatAsRead: () => void;
  clearChat: () => Promise<void>;

  // Actions - Collaboration
  addCollaborator: (collaborator: CollaboratorPresence) => void;
  removeCollaborator: (userId: string) => void;
  updateCollaboratorCursor: (userId: string, cursor: { position: number; selection?: { start: number; end: number } }) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

  // Actions - Content Analysis
  analyzeContent: () => Promise<void>;
  setCurrentAssessment: (assessment: ContentAssessment) => void;

  // Actions - Requirements
  loadRequirements: (grantId: string) => Promise<void>;
  updateRequirementStatus: (requirementId: string, status: 'met' | 'partial' | 'missing') => void;

  // Actions - Analytics
  updateAnalytics: (updates: Partial<EditorAnalytics>) => void;
  incrementWordCount: (delta: number) => void;
  trackSuggestionAction: (action: 'accepted' | 'rejected') => void;

  // Actions - UI
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'suggestions' | 'chat' | 'requirements' | 'analytics') => void;
  toggleToolbar: () => void;
  toggleFocusMode: () => void;

  // Utility Actions
  reset: () => void;
  cleanup: () => void;
}

const initialState = {
  sessions: [],
  isSessionLoading: false,
  content: '',
  isDirty: false,
  saveStatus: 'idle' as const,
  autoSaveInterval: 30000,
  suggestions: [],
  isGeneratingSuggestion: false,
  suggestionHistory: [],
  chat: {
    messages: [],
    isLoading: false,
    unreadCount: 0,
  },
  collaborators: [],
  isConnected: false,
  connectionStatus: 'disconnected' as const,
  assessmentHistory: [],
  isAnalyzing: false,
  requirements: [],
  requirementsScore: 0,
  analytics: {
    wordCount: 0,
    characterCount: 0,
    timeSpent: 0,
    suggestionsAccepted: 0,
    suggestionsRejected: 0,
    collaborationEvents: 0,
    lastActivity: new Date().toISOString(),
  },
  sidebarOpen: true,
  activeTab: 'suggestions' as const,
  showToolbar: true,
  focusMode: false,
};

export const useAIEditorStore = create<AIEditorStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Session Management
    createSession: async (applicationId: string, sectionType: string, title: string) => {
      set({ isSessionLoading: true, sessionError: undefined });
      try {
        const session = await aiEditorService.createSession({
          application_id: applicationId,
          section_type: sectionType,
          title,
        });
        set((state) => ({
          currentSession: session,
          sessions: [...state.sessions, session],
          isSessionLoading: false,
        }));
      } catch (error) {
        console.error('Failed to create session:', error);
        set({ 
          isSessionLoading: false, 
          sessionError: error instanceof Error ? error.message : 'Failed to create session' 
        });
      }
    },

    loadSession: async (sessionId: string) => {
      set({ isSessionLoading: true, sessionError: undefined });
      try {
        const session = await aiEditorService.getSession(sessionId);
        set({
          currentSession: session,
          content: session.content_html || session.content_text || '',
          isSessionLoading: false,
        });
      } catch (error) {
        console.error('Failed to load session:', error);
        set({ 
          isSessionLoading: false, 
          sessionError: error instanceof Error ? error.message : 'Failed to load session' 
        });
      }
    },

    loadApplicationSessions: async (applicationId: string) => {
      set({ isSessionLoading: true });
      try {
        const sessions = await aiEditorService.getApplicationSessions(applicationId);
        set({ sessions, isSessionLoading: false });
      } catch (error) {
        console.error('Failed to load application sessions:', error);
        set({ isSessionLoading: false });
      }
    },

    updateSession: async (sessionId: string, updates: Partial<EditorSession>) => {
      try {
        const updatedSession = await aiEditorService.updateSession(sessionId, updates);
        set((state) => ({
          currentSession: state.currentSession?.id === sessionId ? updatedSession : state.currentSession,
          sessions: state.sessions.map(s => s.id === sessionId ? updatedSession : s),
        }));
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    },

    setCurrentSession: (session: EditorSession) => {
      set({ currentSession: session });
    },

    // Content Management
    setContent: (content: string) => {
      set({ 
        content, 
        isDirty: true,
        analytics: {
          ...get().analytics,
          characterCount: content.length,
          wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
          lastActivity: new Date().toISOString(),
        }
      });
    },

    setEditorState: (state: EditorState) => {
      set({ editorState: state, isDirty: true });
    },

    saveContent: async (force = false) => {
      const { currentSession, content, editorState, isDirty, saveStatus } = get();
      
      if (!currentSession || !isDirty && !force || saveStatus === 'saving') {
        return;
      }

      set({ saveStatus: 'saving' });
      
      try {
        await aiEditorService.saveContent(currentSession.id, {
          editor_state: editorState || {},
          content_text: content,
          save_type: force ? 'manual' : 'auto',
        });
        
        set({ 
          saveStatus: 'saved', 
          isDirty: false, 
          lastSaved: new Date() 
        });
        
        // Auto-reset save status after a delay
        setTimeout(() => {
          set({ saveStatus: 'idle' });
        }, 2000);
      } catch (error) {
        console.error('Failed to save content:', error);
        set({ saveStatus: 'error' });
        
        // Reset to idle after showing error
        setTimeout(() => {
          set({ saveStatus: 'idle' });
        }, 3000);
      }
    },

    setSaveStatus: (status) => {
      set({ saveStatus: status });
    },

    resetDirtyFlag: () => {
      set({ isDirty: false });
    },

    // AI Suggestions
    generateSuggestion: async (context: { cursor: number; text: string; section: string }) => {
      const { currentSession } = get();
      if (!currentSession || get().isGeneratingSuggestion) return;

      set({ isGeneratingSuggestion: true });
      
      try {
        const suggestions = await aiEditorService.getContextualSuggestions(currentSession.id, {
          cursor_position: context.cursor,
          surrounding_text: context.text,
          section_context: context.section,
        });

        const aiSuggestions = suggestions.map(s => ({
          id: s.id,
          type: s.suggestion_type as 'completion' | 'improvement' | 'grammar' | 'structure',
          content: s.suggested_text,
          originalText: s.original_text,
          confidence: s.confidence_score || 0.5,
          reasoning: s.reasoning,
          position: s.content_position ? { start: s.content_position, end: s.content_position } : undefined,
          metadata: s.context_data,
          status: 'pending' as const,
        }));

        set((state) => ({
          suggestions: [...state.suggestions, ...aiSuggestions],
          isGeneratingSuggestion: false,
        }));
      } catch (error) {
        console.error('Failed to generate suggestion:', error);
        set({ isGeneratingSuggestion: false });
      }
    },

    addSuggestion: (suggestion: AISuggestion) => {
      set((state) => ({
        suggestions: [...state.suggestions, suggestion],
      }));
    },

    acceptSuggestion: async (suggestionId: string) => {
      try {
        await aiEditorService.respondToSuggestion(suggestionId, { action: 'accept' });
        
        set((state) => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? { ...s, status: 'accepted' } : s
          ),
          suggestionHistory: [...state.suggestionHistory, 
            ...state.suggestions.filter(s => s.id === suggestionId)
          ],
          analytics: {
            ...state.analytics,
            suggestionsAccepted: state.analytics.suggestionsAccepted + 1,
          }
        }));

        // Remove accepted suggestion after delay
        setTimeout(() => {
          set((state) => ({
            suggestions: state.suggestions.filter(s => s.id !== suggestionId),
          }));
        }, 1000);
      } catch (error) {
        console.error('Failed to accept suggestion:', error);
      }
    },

    rejectSuggestion: async (suggestionId: string) => {
      try {
        await aiEditorService.respondToSuggestion(suggestionId, { action: 'reject' });
        
        set((state) => ({
          suggestions: state.suggestions.filter(s => s.id !== suggestionId),
          analytics: {
            ...state.analytics,
            suggestionsRejected: state.analytics.suggestionsRejected + 1,
          }
        }));
      } catch (error) {
        console.error('Failed to reject suggestion:', error);
      }
    },

    setActiveSuggestion: (suggestion?: AISuggestion) => {
      set({ activeSuggestion: suggestion });
    },

    clearSuggestions: () => {
      set({ suggestions: [], activeSuggestion: undefined });
    },

    // Chat
    sendChatMessage: async (message: string) => {
      const { currentSession } = get();
      if (!currentSession) return;

      set((state) => ({
        chat: {
          ...state.chat,
          isLoading: true,
          messages: [...state.chat.messages, {
            id: `temp-${Date.now()}`,
            session_id: currentSession.id,
            role: 'user',
            content: message,
            content_type: 'text',
            is_read: true,
            created_at: new Date().toISOString(),
          }],
        },
      }));

      try {
        const response = await aiEditorService.sendChatMessage(currentSession.id, message);
        
        set((state) => ({
          chat: {
            ...state.chat,
            isLoading: false,
            messages: [
              ...state.chat.messages.filter(m => !m.id.startsWith('temp-')),
              {
                id: `user-${Date.now()}`,
                session_id: currentSession.id,
                role: 'user',
                content: message,
                content_type: 'text',
                is_read: true,
                created_at: new Date().toISOString(),
              },
              response,
            ],
          },
        }));
      } catch (error) {
        console.error('Failed to send chat message:', error);
        set((state) => ({
          chat: {
            ...state.chat,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to send message',
            messages: state.chat.messages.filter(m => !m.id.startsWith('temp-')),
          },
        }));
      }
    },

    loadChatHistory: async () => {
      const { currentSession } = get();
      if (!currentSession) return;

      set((state) => ({ chat: { ...state.chat, isLoading: true } }));
      
      try {
        const messages = await aiEditorService.getChatHistory(currentSession.id);
        set((state) => ({
          chat: {
            ...state.chat,
            messages,
            isLoading: false,
          },
        }));
      } catch (error) {
        console.error('Failed to load chat history:', error);
        set((state) => ({
          chat: {
            ...state.chat,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load chat history',
          },
        }));
      }
    },

    markChatAsRead: () => {
      set((state) => ({
        chat: {
          ...state.chat,
          unreadCount: 0,
        },
      }));
    },

    clearChat: async () => {
      const { currentSession } = get();
      if (!currentSession) return;

      try {
        // Note: Backend doesn't have clear chat endpoint yet
        set((state) => ({
          chat: {
            ...state.chat,
            messages: [],
          },
        }));
      } catch (error) {
        console.error('Failed to clear chat:', error);
      }
    },

    // Collaboration
    addCollaborator: (collaborator: CollaboratorPresence) => {
      set((state) => ({
        collaborators: [...state.collaborators.filter(c => c.userId !== collaborator.userId), collaborator],
        analytics: {
          ...state.analytics,
          collaborationEvents: state.analytics.collaborationEvents + 1,
        }
      }));
    },

    removeCollaborator: (userId: string) => {
      set((state) => ({
        collaborators: state.collaborators.filter(c => c.userId !== userId),
      }));
    },

    updateCollaboratorCursor: (userId: string, cursor: { position: number; selection?: { start: number; end: number } }) => {
      set((state) => ({
        collaborators: state.collaborators.map(c => 
          c.userId === userId ? { ...c, cursor, lastActive: new Date().toISOString() } : c
        ),
      }));
    },

    setConnectionStatus: (status) => {
      set({ 
        connectionStatus: status, 
        isConnected: status === 'connected' 
      });
    },

    // Content Analysis
    analyzeContent: async () => {
      const { currentSession, content } = get();
      if (!currentSession || !content.trim()) return;

      set({ isAnalyzing: true });
      
      try {
        const assessment = await aiEditorService.assessContent(currentSession.id, content);
        set((state) => ({
          currentAssessment: assessment,
          assessmentHistory: [...state.assessmentHistory, assessment],
          isAnalyzing: false,
        }));
      } catch (error) {
        console.error('Failed to analyze content:', error);
        set({ isAnalyzing: false });
      }
    },

    setCurrentAssessment: (assessment: ContentAssessment) => {
      set({ currentAssessment: assessment });
    },

    // Requirements
    loadRequirements: async (grantId: string) => {
      try {
        const requirements = await aiEditorService.getGrantRequirements(grantId);
        // Transform backend requirements to frontend format
        const transformedRequirements = requirements.flatMap(req => 
          Object.entries(req.requirements || {}).map(([key, value]) => ({
            id: `${req.id}-${key}`,
            text: String(value),
            status: 'missing' as const,
          }))
        );
        
        set({ requirements: transformedRequirements });
      } catch (error) {
        console.error('Failed to load requirements:', error);
      }
    },

    updateRequirementStatus: (requirementId: string, status: 'met' | 'partial' | 'missing') => {
      set((state) => ({
        requirements: state.requirements.map(req => 
          req.id === requirementId ? { ...req, status } : req
        ),
        requirementsScore: state.requirements.filter(req => 
          req.id === requirementId ? status === 'met' : req.status === 'met'
        ).length / state.requirements.length * 100,
      }));
    },

    // Analytics
    updateAnalytics: (updates: Partial<EditorAnalytics>) => {
      set((state) => ({
        analytics: { ...state.analytics, ...updates },
      }));
    },

    incrementWordCount: (delta: number) => {
      set((state) => ({
        analytics: {
          ...state.analytics,
          wordCount: Math.max(0, state.analytics.wordCount + delta),
        },
      }));
    },

    trackSuggestionAction: (action: 'accepted' | 'rejected') => {
      set((state) => ({
        analytics: {
          ...state.analytics,
          [action === 'accepted' ? 'suggestionsAccepted' : 'suggestionsRejected']: 
            state.analytics[action === 'accepted' ? 'suggestionsAccepted' : 'suggestionsRejected'] + 1,
        },
      }));
    },

    // UI
    setSidebarOpen: (open: boolean) => {
      set({ sidebarOpen: open });
    },

    setActiveTab: (tab: 'suggestions' | 'chat' | 'requirements' | 'analytics') => {
      set({ activeTab: tab });
    },

    toggleToolbar: () => {
      set((state) => ({ showToolbar: !state.showToolbar }));
    },

    toggleFocusMode: () => {
      set((state) => ({ focusMode: !state.focusMode }));
    },

    // Utility
    reset: () => {
      set(initialState);
    },

    cleanup: () => {
      // Cleanup any subscriptions, intervals, etc.
      set({ isConnected: false, connectionStatus: 'disconnected' });
    },
  }))
);

// Auto-save functionality
let autoSaveInterval: NodeJS.Timeout;

useAIEditorStore.subscribe(
  (state) => state.isDirty,
  (isDirty) => {
    if (isDirty) {
      clearTimeout(autoSaveInterval);
      autoSaveInterval = setTimeout(() => {
        useAIEditorStore.getState().saveContent();
      }, useAIEditorStore.getState().autoSaveInterval);
    }
  }
);

// Cleanup on unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useAIEditorStore.getState().cleanup();
  });
}