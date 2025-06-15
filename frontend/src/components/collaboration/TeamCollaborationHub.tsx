'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  File, 
  Clock, 
  Lock, 
  Unlock,
  Edit3,
  Eye,
  Send,
  Video,
  Phone,
  CheckCircle,
  Activity,
  AtSign,
  Paperclip,
  MoreVertical,
  Circle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

// Interfaces
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  avatar: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  currentSection?: string;
  color: string;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  section?: string;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: string;
  target?: string;
  timestamp: Date;
  type: 'edit' | 'comment' | 'file' | 'task' | 'status';
}

interface Comment {
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
}

interface Task {
  id: string;
  title: string;
  assignedTo: string[];
  createdBy: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  dueDate?: Date;
  section?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

interface Section {
  id: string;
  title: string;
  content: string;
  lockedBy?: string;
  lastModified: Date;
  lastModifiedBy: string;
  version: number;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  attachments?: string[];
  mentions?: string[];
}

interface CollaborationState {
  editMode: 'direct' | 'suggest';
  showPresence: boolean;
  showActivity: boolean;
  showChat: boolean;
}

// Mock data
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'owner',
    avatar: 'SC',
    status: 'online',
    currentSection: 'executive-summary',
    color: '#3B82F6'
  },
  {
    id: '2',
    name: 'Michael O\'Brien',
    email: 'michael.obrien@example.com',
    role: 'admin',
    avatar: 'MO',
    status: 'online',
    currentSection: 'budget',
    color: '#10B981'
  },
  {
    id: '3',
    name: 'Emma Thompson',
    email: 'emma.thompson@example.com',
    role: 'editor',
    avatar: 'ET',
    status: 'away',
    lastSeen: new Date(Date.now() - 15 * 60 * 1000),
    color: '#F59E0B'
  },
  {
    id: '4',
    name: 'David Kumar',
    email: 'david.kumar@example.com',
    role: 'viewer',
    avatar: 'DK',
    status: 'offline',
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
    color: '#EF4444'
  }
];

const mockSections: Section[] = [
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    content: 'Our organization seeks funding to expand our community outreach program...',
    lastModified: new Date(),
    lastModifiedBy: '1',
    version: 12
  },
  {
    id: 'project-description',
    title: 'Project Description',
    content: 'The project aims to provide educational resources to underserved communities...',
    lastModified: new Date(Date.now() - 30 * 60 * 1000),
    lastModifiedBy: '3',
    version: 8
  },
  {
    id: 'budget',
    title: 'Budget',
    content: 'Total project budget: €50,000. Breakdown: Personnel (60%), Materials (25%), Operations (15%)',
    lockedBy: '2',
    lastModified: new Date(),
    lastModifiedBy: '2',
    version: 15
  },
  {
    id: 'timeline',
    title: 'Timeline',
    content: 'Project duration: 12 months. Phase 1: Months 1-3, Phase 2: Months 4-9, Phase 3: Months 10-12',
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000),
    lastModifiedBy: '1',
    version: 5
  }
];

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete budget justification',
    assignedTo: ['2'],
    createdBy: '1',
    status: 'in-progress',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    section: 'budget',
    priority: 'high',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: '2',
    title: 'Review executive summary',
    assignedTo: ['1', '3'],
    createdBy: '1',
    status: 'review',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    section: 'executive-summary',
    priority: 'medium',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: '3',
    title: 'Add supporting documents',
    assignedTo: ['3'],
    createdBy: '2',
    status: 'todo',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    priority: 'low',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
  }
];

export default function TeamCollaborationHub() {
  // State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [sections, setSections] = useState<Section[]>(mockSections);
  const [tasks] = useState<Task[]>(mockTasks);
  // Future functionality: task management
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setTasks = (_tasks: Task[]) => {
    // Task management functionality to be implemented
  };
  const [comments, setComments] = useState<Comment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [collaborationState, setCollaborationState] = useState<CollaborationState>({
    editMode: 'direct',
    showPresence: true,
    showActivity: true,
    showChat: false
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newComment, setNewComment] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executive-summary']));

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);

  // Simulate real-time updates
  useEffect(() => {
    // Simulate cursor movements
    const cursorInterval = setInterval(() => {
      const activeMember = teamMembers.find(m => m.status === 'online' && m.id !== '1');
      if (activeMember) {
        setCursors(prev => {
          const filtered = prev.filter(c => c.userId !== activeMember.id);
          return [...filtered, {
            userId: activeMember.id,
            x: Math.random() * 100,
            y: Math.random() * 100,
            section: activeMember.currentSection
          }];
        });
      }
    }, 3000);

    // Simulate activities
    const activityInterval = setInterval(() => {
      const actions = [
        { action: 'edited', target: 'Budget section', type: 'edit' as const },
        { action: 'commented on', target: 'Executive Summary', type: 'comment' as const },
        { action: 'uploaded', target: 'Financial Report.pdf', type: 'file' as const },
        { action: 'completed', target: 'Review timeline', type: 'task' as const }
      ];
      
      const randomMember = teamMembers[Math.floor(Math.random() * teamMembers.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        userId: randomMember.id,
        userName: randomMember.name,
        userAvatar: randomMember.avatar,
        action: randomAction.action,
        target: randomAction.target,
        timestamp: new Date(),
        type: randomAction.type
      };
      
      setActivities(prev => [newActivity, ...prev].slice(0, 20));
    }, 15000);

    // Simulate member status changes
    const statusInterval = setInterval(() => {
      setTeamMembers(prev => prev.map(member => {
        if (member.id === '1') return member; // Keep current user online
        
        const random = Math.random();
        let newStatus = member.status;
        
        if (random > 0.9) {
          newStatus = member.status === 'online' ? 'away' : 
                     member.status === 'away' ? 'offline' : 'online';
        }
        
        return {
          ...member,
          status: newStatus,
          lastSeen: newStatus !== 'online' ? new Date() : member.lastSeen
        };
      }));
    }, 30000);

    return () => {
      clearInterval(cursorInterval);
      clearInterval(activityInterval);
      clearInterval(statusInterval);
    };
  }, [teamMembers]);

  // Scroll to bottom for chat and activity
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  // Handlers
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: '1',
      userName: 'Sarah Chen',
      userAvatar: 'SC',
      content: newMessage,
      timestamp: new Date(),
      mentions: newMessage.match(/@\w+/g) || undefined
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Add to activity
    setActivities(prev => [{
      id: Date.now().toString(),
      userId: '1',
      userName: 'Sarah Chen',
      userAvatar: 'SC',
      action: 'sent a message',
      timestamp: new Date(),
      type: 'comment'
    }, ...prev].slice(0, 20));
  };

  const handleAddComment = (sectionId: string) => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      userId: '1',
      userName: 'Sarah Chen',
      userAvatar: 'SC',
      content: newComment,
      timestamp: new Date(),
      sectionId,
      mentions: newComment.match(/@\w+/g) || undefined
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleSectionLock = (sectionId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          lockedBy: section.lockedBy ? undefined : '1'
        };
      }
      return section;
    }));

    // Add activity
    const section = sections.find(s => s.id === sectionId);
    setActivities(prev => [{
      id: Date.now().toString(),
      userId: '1',
      userName: 'Sarah Chen',
      userAvatar: 'SC',
      action: section?.lockedBy ? 'unlocked' : 'locked',
      target: section?.title,
      timestamp: new Date(),
      type: 'edit'
    }, ...prev].slice(0, 20));
  };

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'online':
        return <Circle className="w-2 h-2 fill-green-500 text-green-500" />;
      case 'away':
        return <Circle className="w-2 h-2 fill-yellow-500 text-yellow-500" />;
      case 'offline':
        return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />;
    }
  };

  const getTaskPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
    }
  };

  const getTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'review':
        return <Eye className="w-4 h-4 text-purple-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Community Outreach Grant Application</h1>
              <p className="text-sm text-gray-600 mt-1">Last saved 2 minutes ago • Version 15</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Edit Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCollaborationState(prev => ({ ...prev, editMode: 'direct' }))}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    collaborationState.editMode === 'direct' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4 inline mr-1" />
                  Direct Edit
                </button>
                <button
                  onClick={() => setCollaborationState(prev => ({ ...prev, editMode: 'suggest' }))}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    collaborationState.editMode === 'suggest' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Suggest
                </button>
              </div>

              {/* Presence Avatars */}
              <div className="flex -space-x-2">
                {teamMembers
                  .filter(m => m.status === 'online')
                  .map(member => (
                    <div
                      key={member.id}
                      className="relative"
                      title={`${member.name} - ${member.currentSection || 'Active'}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.avatar}
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white" />
                    </div>
                  ))}
                <button className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white hover:bg-gray-300">
                  +{teamMembers.filter(m => m.status !== 'online').length}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Start video call">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Start voice call">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Document Sections */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-6">
            {sections.map(section => {
              const isExpanded = expandedSections.has(section.id);
              const sectionComments = comments.filter(c => c.sectionId === section.id);
              const activeCursors = cursors.filter(c => c.section === section.id);
              const workingMembers = teamMembers.filter(m => m.currentSection === section.id && m.status === 'online');

              return (
                <div key={section.id} className="mb-6 bg-white rounded-lg shadow-sm">
                  <div
                    className="p-4 border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                        <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                        {section.lockedBy && (
                          <div className="flex items-center space-x-1 text-sm text-amber-600">
                            <Lock className="w-4 h-4" />
                            <span>Locked by {teamMembers.find(m => m.id === section.lockedBy)?.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {workingMembers.length > 0 && (
                          <div className="flex -space-x-2">
                            {workingMembers.map(member => (
                              <div
                                key={member.id}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                                style={{ backgroundColor: member.color }}
                                title={member.name}
                              >
                                {member.avatar}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-500">
                          v{section.version} • {new Date(section.lastModified).toLocaleTimeString()}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSectionLock(section.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {section.lockedBy ? (
                            <Unlock className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6">
                      <div className="relative">
                        {/* Simulated cursors */}
                        {activeCursors.map(cursor => {
                          const member = teamMembers.find(m => m.id === cursor.userId);
                          if (!member) return null;
                          
                          return (
                            <div
                              key={cursor.userId}
                              className="absolute pointer-events-none transition-all duration-300"
                              style={{
                                left: `${cursor.x}%`,
                                top: `${cursor.y}px`
                              }}
                            >
                              <div
                                className="w-0.5 h-4"
                                style={{ backgroundColor: member.color }}
                              />
                              <div
                                className="text-xs text-white px-1 py-0.5 rounded whitespace-nowrap"
                                style={{ backgroundColor: member.color }}
                              >
                                {member.name}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Content */}
                        <div
                          className={`prose max-w-none ${
                            section.lockedBy && section.lockedBy !== '1' 
                              ? 'opacity-60 pointer-events-none' 
                              : ''
                          }`}
                        >
                          <p className="text-gray-700">{section.content}</p>
                        </div>
                      </div>

                      {/* Comments */}
                      {sectionComments.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Comments</h4>
                          <div className="space-y-3">
                            {sectionComments.map(comment => (
                              <div key={comment.id} className="flex space-x-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                  {comment.userName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1">
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900">{comment.userName}</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(comment.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add comment */}
                      <div className="mt-4">
                        <div className="flex space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                            SC
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddComment(section.id);
                                }
                              }}
                              placeholder="Add a comment..."
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-96 bg-white border-l flex flex-col">
        {/* Sidebar Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setCollaborationState(prev => ({ ...prev, showChat: false }))}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                !collaborationState.showChat
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Team
            </button>
            <button
              onClick={() => setCollaborationState(prev => ({ ...prev, showChat: true }))}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                collaborationState.showChat
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Chat
            </button>
          </div>
        </div>

        {!collaborationState.showChat ? (
          /* Team View */
          <div className="flex-1 overflow-y-auto">
            {/* Team Members */}
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Team Members</h3>
              <div className="space-y-3">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.avatar}
                        </div>
                        <div className="absolute bottom-0 right-0">
                          {getStatusIcon(member.status)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.status === 'online' && member.currentSection && (
                        <span className="text-green-600">
                          Editing {sections.find(s => s.id === member.currentSection)?.title}
                        </span>
                      )}
                      {member.status === 'away' && member.lastSeen && (
                        <span>Away {Math.round((Date.now() - member.lastSeen.getTime()) / 60000)}m</span>
                      )}
                      {member.status === 'offline' && member.lastSeen && (
                        <span>Offline {Math.round((Date.now() - member.lastSeen.getTime()) / 3600000)}h</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Tasks</h3>
              <div className="space-y-2">
                {tasks.map(task => {
                  const assignedMembers = teamMembers.filter(m => task.assignedTo.includes(m.id));
                  
                  return (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start space-x-2">
                          {getTaskStatusIcon(task.status)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            {task.section && (
                              <p className="text-xs text-gray-500 mt-1">
                                {sections.find(s => s.id === task.section)?.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getTaskPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {assignedMembers.map(member => (
                            <div
                              key={member.id}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-gray-50"
                              style={{ backgroundColor: member.color }}
                              title={member.name}
                            >
                              {member.avatar}
                            </div>
                          ))}
                        </div>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="mt-1">
                      {activity.type === 'edit' && <Edit3 className="w-4 h-4 text-blue-600" />}
                      {activity.type === 'comment' && <MessageSquare className="w-4 h-4 text-green-600" />}
                      {activity.type === 'file' && <File className="w-4 h-4 text-purple-600" />}
                      {activity.type === 'task' && <CheckCircle className="w-4 h-4 text-orange-600" />}
                      {activity.type === 'status' && <Activity className="w-4 h-4 text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.userName}</span>
                        {' '}{activity.action}
                        {activity.target && (
                          <span className="font-medium"> {activity.target}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={activityEndRef} />
              </div>
            </div>
          </div>
        ) : (
          /* Chat View */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map(message => {
                    const isOwn = message.userId === '1';
                    const member = teamMembers.find(m => m.id === message.userId);
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex space-x-3 ${isOwn ? 'justify-end' : ''}`}
                      >
                        {!isOwn && member && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.avatar}
                          </div>
                        )}
                        <div className={`max-w-xs ${isOwn ? 'order-first' : ''}`}>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {!isOwn && (
                              <p className="text-xs font-medium mb-1 opacity-75">
                                {message.userName}
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : ''}`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
            
            {/* Chat Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <AtSign className="w-5 h-5 text-gray-600" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}