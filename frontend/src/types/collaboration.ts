export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  avatar: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  currentSection?: string;
  color: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canInvite: boolean;
    canManageRoles: boolean;
  };
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  section?: string;
  timestamp: Date;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: string;
  target?: string;
  timestamp: Date;
  type: 'edit' | 'comment' | 'file' | 'task' | 'status' | 'join' | 'leave';
  metadata?: {
    oldValue?: string;
    newValue?: string;
    fileName?: string;
    taskId?: string;
  };
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  sectionId?: string;
  replies?: Comment[];
  mentions?: string[];
  resolved?: boolean;
  edited?: boolean;
  editedAt?: Date;
  reactions?: {
    emoji: string;
    userId: string;
    userName: string;
  }[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string[];
  createdBy: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  dueDate?: Date;
  section?: string;
  priority: 'low' | 'medium' | 'high';
  labels?: string[];
  checklist?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  attachments?: string[];
  comments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  lockedBy?: string;
  lockedAt?: Date;
  lastModified: Date;
  lastModifiedBy: string;
  version: number;
  type: 'text' | 'table' | 'list' | 'budget' | 'timeline';
  wordCount?: number;
  characterCount?: number;
  suggestions?: {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
    status: 'pending' | 'accepted' | 'rejected';
  }[];
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  mentions?: string[];
  replyTo?: string;
  edited?: boolean;
  editedAt?: Date;
  reactions?: {
    emoji: string;
    userId: string;
    userName: string;
  }[];
  type: 'text' | 'system' | 'file' | 'call';
}

export interface CollaborationSettings {
  editMode: 'direct' | 'suggest';
  showPresence: boolean;
  showActivity: boolean;
  showChat: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  notifications: {
    mentions: boolean;
    comments: boolean;
    taskAssignments: boolean;
    documentChanges: boolean;
    userJoined: boolean;
  };
  permissions: {
    allowGuestEditing: boolean;
    requireApprovalForChanges: boolean;
    lockSectionsWhileEditing: boolean;
  };
}

export interface VideoCallSession {
  id: string;
  roomId: string;
  participants: string[];
  startedBy: string;
  startedAt: Date;
  status: 'active' | 'ended';
  recordingEnabled: boolean;
}

export interface FileUpload {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  sectionId?: string;
  description?: string;
  version: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'mention' | 'comment' | 'task_assigned' | 'document_changed' | 'user_joined';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PresenceData {
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'online' | 'away' | 'offline';
  currentSection?: string;
  cursorPosition?: CursorPosition;
  lastActivity: Date;
  device?: 'desktop' | 'mobile' | 'tablet';
}

export interface CollaborationState {
  document: {
    id: string;
    title: string;
    type: 'grant_application' | 'report' | 'proposal';
    sections: DocumentSection[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    sharedWith: string[];
  };
  team: TeamMember[];
  presence: PresenceData[];
  activities: ActivityItem[];
  tasks: Task[];
  comments: Comment[];
  messages: Message[];
  files: FileUpload[];
  notifications: NotificationItem[];
  settings: CollaborationSettings;
  videoCall?: VideoCallSession;
}

// Utility types
export type CollaborationEvent = 
  | { type: 'user_joined'; data: { user: TeamMember } }
  | { type: 'user_left'; data: { userId: string } }
  | { type: 'section_locked'; data: { sectionId: string; userId: string } }
  | { type: 'section_unlocked'; data: { sectionId: string; userId: string } }
  | { type: 'content_changed'; data: { sectionId: string; content: string; userId: string } }
  | { type: 'comment_added'; data: { comment: Comment } }
  | { type: 'task_created'; data: { task: Task } }
  | { type: 'task_updated'; data: { taskId: string; changes: Partial<Task> } }
  | { type: 'message_sent'; data: { message: Message } }
  | { type: 'cursor_moved'; data: { cursorPosition: CursorPosition } }
  | { type: 'presence_updated'; data: { presence: PresenceData } };

export interface CollaborationContextType {
  state: CollaborationState;
  dispatch: (event: CollaborationEvent) => void;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}