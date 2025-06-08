/**
 * AI Editor Service
 * Handles all communication with the AI editor backend endpoints
 */

import axios from 'axios';

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://grants.etownz.com' 
  : 'http://localhost:8000';

// Types for AI Editor
export interface EditorSession {
  id: string;
  application_id: string;
  section_type: string;
  title: string;
  created_by: string;
  collaborators: string[];
  editor_state?: object;
  content_text?: string;
  content_html?: string;
  word_count: number;
  character_count: number;
  auto_save_enabled: boolean;
  last_saved_at?: string;
  save_version: number;
  is_active: boolean;
  locked_by?: string;
  locked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentSuggestion {
  id: string;
  session_id: string;
  user_id: string;
  suggestion_type: 'insertion' | 'replacement' | 'enhancement' | 'structure';
  content_position?: number;
  original_text?: string;
  suggested_text: string;
  reasoning?: string;
  confidence_score?: number;
  context_data?: object;
  source_type?: string;
  source_references?: string[];
  similar_examples?: object;
  status: 'pending' | 'accepted' | 'rejected' | 'modified' | 'expired';
  user_action?: string;
  user_modification?: string;
  responded_at?: string;
  expires_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: 'text' | 'markdown' | 'code';
  model_used?: string;
  confidence?: number;
  reasoning?: string;
  token_usage?: number;
  cost_cents?: number;
  is_read: boolean;
  parent_message_id?: string;
  created_at: string;
}

export interface ContentAssessment {
  id: string;
  session_id: string;
  content_hash: string;
  section_type: string;
  word_count?: number;
  overall_score?: number;
  clarity_score?: number;
  completeness_score?: number;
  compliance_score?: number;
  impact_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: object;
  benchmark_comparison?: object;
  similar_content_references?: string[];
  model_used?: string;
  assessment_prompt?: string;
  confidence_score?: number;
  processing_time_ms?: number;
  created_at: string;
}

export interface GrantRequirement {
  id: string;
  grant_id: string;
  section_type: string;
  requirements: object;
  compliance_rules: object;
  success_patterns?: object;
  writing_guidelines?: object;
  analysis_model?: string;
  confidence_score?: number;
  last_analyzed_at: string;
  version: number;
  previous_version_id?: string;
  created_at: string;
}

class AIEditorService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Editor Sessions
  async createSession(data: {
    application_id: string;
    section_type: string;
    title: string;
    collaborators?: string[];
  }): Promise<EditorSession> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/sessions`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSession(sessionId: string): Promise<EditorSession> {
    const response = await axios.get(
      `${API_BASE}/ai/editor/sessions/${sessionId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async updateSession(sessionId: string, data: Partial<EditorSession>): Promise<EditorSession> {
    const response = await axios.put(
      `${API_BASE}/ai/editor/sessions/${sessionId}`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getApplicationSessions(applicationId: string): Promise<EditorSession[]> {
    const response = await axios.get(
      `${API_BASE}/ai/editor/sessions/application/${applicationId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Auto-save functionality
  async saveContent(sessionId: string, data: {
    editor_state: object;
    content_text?: string;
    save_type?: 'auto' | 'manual' | 'collaborative';
  }): Promise<{ success: boolean; save_id: string }> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/sessions/${sessionId}/save`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Content Suggestions
  async getContextualSuggestions(sessionId: string, data: {
    cursor_position: number;
    surrounding_text: string;
    section_context: string;
  }): Promise<ContentSuggestion[]> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/suggestions/contextual`,
      { session_id: sessionId, ...data },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async generateContent(sessionId: string, data: {
    content_type: string;
    context: string;
    requirements?: object;
  }): Promise<{ content: string; suggestions: ContentSuggestion[] }> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/generate`,
      { session_id: sessionId, ...data },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async respondToSuggestion(suggestionId: string, data: {
    action: 'accept' | 'reject' | 'modify';
    modification?: string;
  }): Promise<{ success: boolean }> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/suggestions/${suggestionId}/respond`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSuggestions(sessionId: string): Promise<ContentSuggestion[]> {
    const response = await axios.get(
      `${API_BASE}/ai/editor/suggestions/${sessionId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // AI Chat
  async sendChatMessage(sessionId: string, message: string): Promise<ChatMessage> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/chat`,
      { session_id: sessionId, message },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await axios.get(
      `${API_BASE}/ai/editor/chat/${sessionId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Semantic Search
  async semanticSearch(query: string, filters?: {
    grant_type?: string;
    section_type?: string;
    limit?: number;
  }): Promise<{
    results: Array<{
      content: string;
      source: string;
      similarity: number;
      metadata: object;
    }>;
  }> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/search`,
      { query, filters },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Content Assessment
  async assessContent(sessionId: string, content: string): Promise<ContentAssessment> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/assess`,
      { session_id: sessionId, content },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getAssessments(sessionId: string): Promise<ContentAssessment[]> {
    const response = await axios.get(
      `${API_BASE}/ai/editor/assessments/${sessionId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Grant Requirements
  async getGrantRequirements(grantId: string, sectionType?: string): Promise<GrantRequirement[]> {
    const params = sectionType ? `?section_type=${sectionType}` : '';
    const response = await axios.get(
      `${API_BASE}/ai/editor/requirements/${grantId}${params}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async analyzeGrantRequirements(grantId: string, content: string): Promise<GrantRequirement> {
    const response = await axios.post(
      `${API_BASE}/ai/editor/requirements/analyze`,
      { grant_id: grantId, content },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Health check for AI editor endpoints
  async healthCheck(): Promise<{ status: string; endpoints: object }> {
    const response = await axios.get(
      `${API_BASE}/ai/editor/health`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Get editor statistics
  async getEditorStats(timeframe?: '24h' | '7d' | '30d'): Promise<{
    sessions_created: number;
    suggestions_generated: number;
    content_generated: number;
    assessments_completed: number;
    chat_messages: number;
    active_sessions: number;
  }> {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    const response = await axios.get(
      `${API_BASE}/ai/editor/stats${params}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const aiEditorService = new AIEditorService();
export default aiEditorService;