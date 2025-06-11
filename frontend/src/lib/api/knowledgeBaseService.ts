/**
 * Knowledge Base API Service
 * Handles RAG system interactions for intelligent Q&A
 */

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  tags: string[];
  createdAt: Date;
  relevanceScore?: number;
}

export interface SearchQuery {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
  useSemanticSearch?: boolean;
}

export interface SearchResult {
  entries: KnowledgeBaseEntry[];
  totalCount: number;
  searchTime: number;
  confidence: number;
}

export interface QuestionRequest {
  question: string;
  context?: string;
  organizationId?: string;
  includeRelatedDocs?: boolean;
}

export interface AnswerResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    title: string;
    excerpt: string;
    relevance: number;
    url?: string;
  }>;
  relatedQuestions: string[];
  processingTime: number;
}

export interface DocumentUploadRequest {
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  metadata?: Record<string, any>;
}

export class KnowledgeBaseService {
  private baseUrl: string;
  private headers: () => Record<string, string>;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://grants.etownz.com/api' 
      : 'http://localhost:8001';
    this.headers = () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return headers;
    };
  }

  /**
   * Search the knowledge base
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error('Failed to search knowledge base');
    }

    return response.json();
  }

  /**
   * Ask a question to the RAG system
   */
  async askQuestion(request: QuestionRequest): Promise<AnswerResponse> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/ask`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to get answer');
    }

    return response.json();
  }

  /**
   * Upload a document to the knowledge base
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<{ id: string; success: boolean }> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/documents`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<KnowledgeBaseEntry> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/documents/${id}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }

    return response.json();
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/categories`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return response.json();
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/tags?limit=${limit}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }

    return response.json();
  }

  /**
   * Get related questions
   */
  async getRelatedQuestions(question: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/related-questions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch related questions');
    }

    const data = await response.json();
    return data.questions;
  }

  /**
   * Index external content
   */
  async indexExternalContent(url: string): Promise<{ success: boolean; documentsIndexed: number }> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/index-external`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error('Failed to index content');
    }

    return response.json();
  }

  /**
   * Get knowledge base statistics
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    totalQuestions: number;
    avgConfidence: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    const response = await fetch(`${this.baseUrl}/knowledge-base/statistics`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return response.json();
  }
}

// Export singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();