/**
 * OpenAI Assistants API Service
 * Handles communication with the OpenAI Assistants backend endpoints
 */

export interface Assistant {
  key: string;
  name: string;
  description: string;
  capabilities: string[];
}

export interface AssistantThread {
  id: string;
  assistantId: string;
  grantApplicationId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface GenerateContentRequest {
  threadId?: string;
  sectionType: string;
  grantType: string;
  fundingBody: string;
  requirements?: string[];
  wordLimit?: number;
  previousSections?: Record<string, string>;
  organizationProfile?: any;
}

export interface GeneratedContent {
  success: boolean;
  content: string;
  confidence: number;
  suggestions: string[];
  metadata: {
    tokensUsed: number;
    processingTime: number;
    threadId: string;
    runId: string;
  };
}

export interface ComplianceCheckRequest {
  threadId: string;
  applicationData: any;
  grantScheme: any;
}

export interface ComplianceCheckResult {
  success: boolean;
  overallScore: number;
  issues: Array<{
    type: 'missing' | 'incomplete' | 'non_compliant';
    section: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  suggestions: string[];
  timestamp: string;
}

export interface BudgetOptimizationRequest {
  threadId: string;
  budgetData: any;
  projectScope: any;
  fundingRules: any;
}

export interface BudgetOptimizationResult {
  success: boolean;
  optimizedBudget: any;
  savings: number;
  recommendations: string[];
  warnings: string[];
  timestamp: string;
}

export class AssistantsService {
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
   * Get list of available assistants
   */
  async getAssistants(): Promise<{ assistants: Assistant[]; totalCount: number }> {
    const response = await fetch(`${this.baseUrl}/assistants`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch assistants');
    }

    return response.json();
  }

  /**
   * Create a new thread for an assistant
   */
  async createThread(
    assistantKey: string,
    grantApplicationId?: string,
    metadata?: Record<string, any>
  ): Promise<{ threadId: string; assistantKey: string; createdAt: Date }> {
    const response = await fetch(`${this.baseUrl}/assistants/${assistantKey}/threads`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ grantApplicationId, metadata })
    });

    if (!response.ok) {
      throw new Error('Failed to create thread');
    }

    return response.json();
  }

  /**
   * Get user's threads
   */
  async getThreads(assistantKey?: string, grantApplicationId?: string): Promise<{
    threads: AssistantThread[];
    totalCount: number;
  }> {
    const params = new URLSearchParams();
    if (assistantKey) params.append('assistantKey', assistantKey);
    if (grantApplicationId) params.append('grantApplicationId', grantApplicationId);

    const response = await fetch(`${this.baseUrl}/assistants/threads?${params}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch threads');
    }

    return response.json();
  }

  /**
   * Generate content with streaming support
   */
  async generateContent(
    assistantKey: string,
    request: GenerateContentRequest,
    onChunk?: (chunk: string) => void
  ): Promise<GeneratedContent> {
    const headers = this.headers();
    
    // Request streaming if callback provided
    if (onChunk) {
      headers['Accept'] = 'text/stream';
    }

    const response = await fetch(
      `${this.baseUrl}/assistants/${assistantKey}/generate-section`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate content');
    }

    // Handle streaming response
    if (onChunk && response.headers.get('content-type')?.includes('text/stream')) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result: GeneratedContent | null = null;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk') {
                  onChunk(data.content);
                } else if (data.type === 'complete') {
                  result = data.result;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      if (!result) {
        throw new Error('No result received from stream');
      }

      return result;
    }

    // Non-streaming response
    return response.json();
  }

  /**
   * Check compliance
   */
  async checkCompliance(request: ComplianceCheckRequest): Promise<ComplianceCheckResult> {
    const response = await fetch(`${this.baseUrl}/assistants/compliance-checker/check`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to check compliance');
    }

    return response.json();
  }

  /**
   * Optimize budget
   */
  async optimizeBudget(request: BudgetOptimizationRequest): Promise<BudgetOptimizationResult> {
    const response = await fetch(`${this.baseUrl}/assistants/budget-analyst/optimize`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to optimize budget');
    }

    return response.json();
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/assistants/threads/${threadId}`, {
      method: 'DELETE',
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to delete thread');
    }
  }

  /**
   * Rate an interaction
   */
  async rateInteraction(
    threadId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/assistants/threads/${threadId}/rate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ rating, feedback })
    });

    if (!response.ok) {
      throw new Error('Failed to submit rating');
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(startDate?: Date, endDate?: Date, assistantKey?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    if (assistantKey) params.append('assistantKey', assistantKey);

    const response = await fetch(`${this.baseUrl}/assistants/analytics?${params}`, {
      headers: this.headers()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }

    return response.json();
  }
}

// Export singleton instance
export const assistantsService = new AssistantsService();