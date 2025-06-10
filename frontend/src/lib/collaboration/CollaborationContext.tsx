'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { 
  CollaborationState, 
  CollaborationEvent, 
  CollaborationContextType,
  TeamMember,
  ActivityItem
} from '@/types/collaboration';

// Mock initial state
const initialState: CollaborationState = {
  document: {
    id: 'doc-1',
    title: 'Community Outreach Grant Application',
    type: 'grant_application',
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: '1',
    sharedWith: ['1', '2', '3', '4']
  },
  team: [],
  presence: [],
  activities: [],
  tasks: [],
  comments: [],
  messages: [],
  files: [],
  notifications: [],
  settings: {
    editMode: 'direct',
    showPresence: true,
    showActivity: true,
    showChat: false,
    autoSave: true,
    autoSaveInterval: 3,
    notifications: {
      mentions: true,
      comments: true,
      taskAssignments: true,
      documentChanges: true,
      userJoined: true
    },
    permissions: {
      allowGuestEditing: false,
      requireApprovalForChanges: false,
      lockSectionsWhileEditing: true
    }
  }
};

// Reducer to handle collaboration events
function collaborationReducer(state: CollaborationState, event: CollaborationEvent): CollaborationState {
  switch (event.type) {
    case 'user_joined':
      return {
        ...state,
        team: [...state.team.filter(u => u.id !== event.data.user.id), event.data.user],
        activities: [
          {
            id: Date.now().toString(),
            userId: event.data.user.id,
            userName: event.data.user.name,
            userAvatar: event.data.user.avatar,
            action: 'joined the workspace',
            timestamp: new Date(),
            type: 'join'
          },
          ...state.activities.slice(0, 19)
        ]
      };

    case 'user_left':
      return {
        ...state,
        team: state.team.filter(u => u.id !== event.data.userId),
        presence: state.presence.filter(p => p.userId !== event.data.userId)
      };

    case 'section_locked':
      return {
        ...state,
        document: {
          ...state.document,
          sections: state.document.sections.map(section =>
            section.id === event.data.sectionId
              ? { ...section, lockedBy: event.data.userId, lockedAt: new Date() }
              : section
          )
        }
      };

    case 'section_unlocked':
      return {
        ...state,
        document: {
          ...state.document,
          sections: state.document.sections.map(section =>
            section.id === event.data.sectionId
              ? { ...section, lockedBy: undefined, lockedAt: undefined }
              : section
          )
        }
      };

    case 'content_changed':
      return {
        ...state,
        document: {
          ...state.document,
          sections: state.document.sections.map(section =>
            section.id === event.data.sectionId
              ? {
                  ...section,
                  content: event.data.content,
                  lastModified: new Date(),
                  lastModifiedBy: event.data.userId,
                  version: section.version + 1
                }
              : section
          ),
          updatedAt: new Date()
        }
      };

    case 'comment_added':
      return {
        ...state,
        comments: [event.data.comment, ...state.comments]
      };

    case 'task_created':
      return {
        ...state,
        tasks: [event.data.task, ...state.tasks]
      };

    case 'task_updated':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === event.data.taskId
            ? { ...task, ...event.data.changes, updatedAt: new Date() }
            : task
        )
      };

    case 'message_sent':
      return {
        ...state,
        messages: [...state.messages, event.data.message]
      };

    case 'presence_updated':
      const existingPresenceIndex = state.presence.findIndex(p => p.userId === event.data.presence.userId);
      const newPresence = existingPresenceIndex >= 0
        ? state.presence.map((p, i) => i === existingPresenceIndex ? event.data.presence : p)
        : [...state.presence, event.data.presence];

      return {
        ...state,
        presence: newPresence
      };

    default:
      return state;
  }
}

// Create context
const CollaborationContext = createContext<CollaborationContextType | null>(null);

// Provider component
export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(collaborationReducer, initialState);
  const [isConnected, setIsConnected] = React.useState(false);

  // Simulate WebSocket connection
  const connect = useCallback(() => {
    console.log('Connecting to collaboration service...');
    setIsConnected(true);
    
    // Simulate initial data load
    setTimeout(() => {
      // Load mock team members
      const mockTeamMembers: TeamMember[] = [
        {
          id: '1',
          name: 'Sarah Chen',
          email: 'sarah.chen@example.com',
          role: 'owner',
          avatar: 'SC',
          status: 'online',
          currentSection: 'executive-summary',
          color: '#3B82F6',
          permissions: {
            canEdit: true,
            canComment: true,
            canInvite: true,
            canManageRoles: true
          }
        },
        {
          id: '2',
          name: 'Michael O\'Brien',
          email: 'michael.obrien@example.com',
          role: 'admin',
          avatar: 'MO',
          status: 'online',
          currentSection: 'budget',
          color: '#10B981',
          permissions: {
            canEdit: true,
            canComment: true,
            canInvite: true,
            canManageRoles: false
          }
        },
        {
          id: '3',
          name: 'Emma Thompson',
          email: 'emma.thompson@example.com',
          role: 'editor',
          avatar: 'ET',
          status: 'away',
          lastSeen: new Date(Date.now() - 15 * 60 * 1000),
          color: '#F59E0B',
          permissions: {
            canEdit: true,
            canComment: true,
            canInvite: false,
            canManageRoles: false
          }
        },
        {
          id: '4',
          name: 'David Kumar',
          email: 'david.kumar@example.com',
          role: 'viewer',
          avatar: 'DK',
          status: 'offline',
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
          color: '#EF4444',
          permissions: {
            canEdit: false,
            canComment: true,
            canInvite: false,
            canManageRoles: false
          }
        }
      ];

      mockTeamMembers.forEach(member => {
        dispatch({ type: 'user_joined', data: { user: member } });
      });
    }, 500);
  }, []);

  const disconnect = useCallback(() => {
    console.log('Disconnecting from collaboration service...');
    setIsConnected(false);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const intervals: NodeJS.Timeout[] = [];

    // Simulate presence updates
    const presenceInterval = setInterval(() => {
      const activeMembers = state.team.filter(m => m.status === 'online');
      activeMembers.forEach(member => {
        dispatch({
          type: 'presence_updated',
          data: {
            presence: {
              userId: member.id,
              userName: member.name,
              userAvatar: member.avatar,
              status: member.status,
              currentSection: member.currentSection,
              lastActivity: new Date(),
              device: 'desktop'
            }
          }
        });
      });
    }, 5000);
    intervals.push(presenceInterval);

    // Simulate random activities
    const activityInterval = setInterval(() => {
      const actions = [
        { action: 'edited', target: 'Budget section', type: 'edit' as const },
        { action: 'commented on', target: 'Executive Summary', type: 'comment' as const },
        { action: 'uploaded', target: 'Financial Report.pdf', type: 'file' as const },
        { action: 'completed', target: 'Review timeline', type: 'task' as const }
      ];
      
      const activeMembers = state.team.filter(m => m.status === 'online' && m.id !== '1');
      if (activeMembers.length > 0) {
        const randomMember = activeMembers[Math.floor(Math.random() * activeMembers.length)];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        const activity: ActivityItem = {
          id: Date.now().toString(),
          userId: randomMember.id,
          userName: randomMember.name,
          userAvatar: randomMember.avatar,
          action: randomAction.action,
          target: randomAction.target,
          timestamp: new Date(),
          type: randomAction.type
        };
        
        // Add activity through existing state instead of dispatch to avoid infinite loops
        // This would normally be handled by WebSocket events
        console.log('Simulated activity:', activity);
      }
    }, 20000);
    intervals.push(activityInterval);

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [isConnected, state.team]);

  const contextValue: CollaborationContextType = {
    state,
    dispatch,
    connect,
    disconnect,
    isConnected
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

// Hook to use collaboration context
export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}

// Hook for specific collaboration features
export function usePresence() {
  const { state } = useCollaboration();
  return {
    onlineUsers: state.presence.filter(p => p.status === 'online'),
    awayUsers: state.presence.filter(p => p.status === 'away'),
    totalUsers: state.team.length,
    currentUser: state.team.find(m => m.id === '1') // Assume current user ID is '1'
  };
}

export function useRealtimeActivities() {
  const { state } = useCollaboration();
  return {
    activities: state.activities.slice(0, 10), // Latest 10 activities
    addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
      // This would normally be handled by the backend
      console.log('Add activity:', activity);
    }
  };
}

export function useDocumentLocking() {
  const { state, dispatch } = useCollaboration();
  
  const lockSection = useCallback((sectionId: string, userId: string) => {
    dispatch({ type: 'section_locked', data: { sectionId, userId } });
  }, [dispatch]);

  const unlockSection = useCallback((sectionId: string, userId: string) => {
    dispatch({ type: 'section_unlocked', data: { sectionId, userId } });
  }, [dispatch]);

  return {
    lockedSections: state.document.sections.filter(s => s.lockedBy),
    lockSection,
    unlockSection,
    isLocked: (sectionId: string) => state.document.sections.find(s => s.id === sectionId)?.lockedBy
  };
}