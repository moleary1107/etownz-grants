import { 
  TeamMember, 
  ActivityItem, 
  Comment, 
  Task, 
  Message, 
  DocumentSection, 
  FileUpload,
  NotificationItem,
  VideoCallSession 
} from '@/types/collaboration';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class CollaborationService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // WebSocket connection management
  connectToDocument(documentId: string): WebSocket | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const wsUrl = this.baseUrl.replace('http', 'ws') + `/api/collaboration/documents/${documentId}/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to collaboration WebSocket');
      };
      
      ws.onclose = () => {
        console.log('Disconnected from collaboration WebSocket');
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      return ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      return null;
    }
  }

  // Team member operations
  async getTeamMembers(documentId: string): Promise<TeamMember[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/team`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      return await response.json();
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }

  async inviteTeamMember(documentId: string, email: string, role: TeamMember['role']): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      return response.ok;
    } catch (error) {
      console.error('Error inviting team member:', error);
      return false;
    }
  }

  async updateMemberRole(documentId: string, userId: string, role: TeamMember['role']): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/team/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating member role:', error);
      return false;
    }
  }

  async removeMember(documentId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/team/${userId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  }

  // Document operations
  async getDocument(documentId: string): Promise<{ sections: DocumentSection[] } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      return await response.json();
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }

  async updateSection(documentId: string, sectionId: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/sections/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating section:', error);
      return false;
    }
  }

  async lockSection(documentId: string, sectionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/sections/${sectionId}/lock`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error locking section:', error);
      return false;
    }
  }

  async unlockSection(documentId: string, sectionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/sections/${sectionId}/unlock`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error unlocking section:', error);
      return false;
    }
  }

  // Comments
  async getComments(documentId: string, sectionId?: string): Promise<Comment[]> {
    try {
      const url = sectionId 
        ? `${this.baseUrl}/api/collaboration/documents/${documentId}/sections/${sectionId}/comments`
        : `${this.baseUrl}/api/collaboration/documents/${documentId}/comments`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return await response.json();
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  async addComment(documentId: string, comment: Omit<Comment, 'id' | 'timestamp'>): Promise<Comment | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return await response.json();
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  async resolveComment(documentId: string, commentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/comments/${commentId}/resolve`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error resolving comment:', error);
      return false;
    }
  }

  // Tasks
  async getTasks(documentId: string): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async createTask(documentId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!response.ok) throw new Error('Failed to create task');
      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  }

  async updateTask(documentId: string, taskId: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  }

  async deleteTask(documentId: string, taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  // Messages/Chat
  async getMessages(documentId: string, limit: number = 50): Promise<Message[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/messages?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async sendMessage(documentId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      if (!response.ok) throw new Error('Failed to send message');
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  // File uploads
  async uploadFile(documentId: string, file: File, sectionId?: string): Promise<FileUpload | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (sectionId) formData.append('sectionId', sectionId);

      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/files`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload file');
      return await response.json();
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  async getFiles(documentId: string): Promise<FileUpload[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/files`);
      if (!response.ok) throw new Error('Failed to fetch files');
      return await response.json();
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  }

  async deleteFile(documentId: string, fileId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/files/${fileId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Activity feed
  async getActivities(documentId: string, limit: number = 20): Promise<ActivityItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/activities?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return await response.json();
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }

  // Notifications
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/users/${userId}/notifications`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Video calls (integration placeholder)
  async startVideoCall(documentId: string): Promise<VideoCallSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/video-call/start`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to start video call');
      return await response.json();
    } catch (error) {
      console.error('Error starting video call:', error);
      return null;
    }
  }

  async joinVideoCall(callId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/video-calls/${callId}/join`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to join video call');
      const data = await response.json();
      return data.joinUrl;
    } catch (error) {
      console.error('Error joining video call:', error);
      return null;
    }
  }

  async endVideoCall(callId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/video-calls/${callId}/end`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error ending video call:', error);
      return false;
    }
  }

  // Presence tracking
  async updatePresence(documentId: string, sectionId?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, timestamp: new Date().toISOString() })
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating presence:', error);
      return false;
    }
  }

  // Document export
  async exportDocument(documentId: string, format: 'pdf' | 'docx' | 'html'): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/export?format=${format}`);
      if (!response.ok) throw new Error('Failed to export document');
      return await response.blob();
    } catch (error) {
      console.error('Error exporting document:', error);
      return null;
    }
  }

  // Version history
  async getVersionHistory(documentId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/versions`);
      if (!response.ok) throw new Error('Failed to fetch version history');
      return await response.json();
    } catch (error) {
      console.error('Error fetching version history:', error);
      return [];
    }
  }

  async revertToVersion(documentId: string, versionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/collaboration/documents/${documentId}/versions/${versionId}/revert`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error reverting to version:', error);
      return false;
    }
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();
export default CollaborationService;