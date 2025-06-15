export interface GrantTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  grant_type: string;
  section_templates: SectionTemplate[];
  sections_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SectionTemplate {
  id: string;
  template_id: string;
  section_name: string;
  section_type: 'executive_summary' | 'project_description' | 'methodology' | 'budget' | 'timeline' | 'team' | 'impact' | 'sustainability' | 'evaluation' | 'references' | 'appendix' | 'custom';
  content_template: string;
  prompts: {
    generation_prompt: string;
    improvement_prompt: string;
    validation_prompt: string;
  };
  variables: TemplateVariable[];
  word_count_range: {
    min: number;
    max: number;
  };
  required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  allowed_values?: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'organization' | 'grant' | 'list';
  description: string;
  required: boolean;
  default_value?: string | number | string[];
  validation_rules?: ValidationRule;
}

export interface GeneratedSection {
  section_name: string;
  content: string;
  word_count: number;
  metadata: {
    template_used: string;
    variables_filled: Record<string, string | number | string[]>;
    generation_time: number;
    confidence_score: number;
  };
}

export interface GeneratedApplication {
  sections: GeneratedSection[];
  metadata: {
    template_name: string;
    total_word_count: number;
    generation_time: number;
    sections_generated: number;
  };
}

export interface TemplateCategories {
  categories: string[];
  grant_types: string[];
}

class TemplatesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get available template categories and grant types
   */
  async getCategories(): Promise<TemplateCategories> {
    return this.makeRequest<TemplateCategories>('/api/templates/categories');
  }

  /**
   * List all templates with filtering
   */
  async listTemplates(filters: {
    category?: string;
    grant_type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: GrantTemplate[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.grant_type) params.append('grant_type', filters.grant_type);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    return this.makeRequest<{ templates: GrantTemplate[]; total: number }>(
      `/api/templates?${params.toString()}`
    );
  }

  /**
   * Get specific template by ID
   */
  async getTemplate(templateId: string): Promise<GrantTemplate> {
    return this.makeRequest<GrantTemplate>(`/api/templates/${templateId}`);
  }

  /**
   * Create new template
   */
  async createTemplate(template: Omit<GrantTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<GrantTemplate> {
    return this.makeRequest<GrantTemplate>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  /**
   * Generate content for a specific section
   */
  async generateSectionContent(
    sectionId: string,
    variables: Record<string, string | number | string[]>,
    organizationId?: string,
    grantId?: string
  ): Promise<GeneratedSection> {
    return this.makeRequest<GeneratedSection>(`/api/templates/sections/${sectionId}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        variables,
        organizationId,
        grantId
      }),
    });
  }

  /**
   * Generate complete grant application using template
   */
  async generateApplication(
    templateId: string,
    variables: Record<string, string | number | string[]>,
    organizationId?: string,
    grantId?: string
  ): Promise<GeneratedApplication> {
    return this.makeRequest<GeneratedApplication>(`/api/templates/${templateId}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        variables,
        organizationId,
        grantId
      }),
    });
  }

  /**
   * Seed default templates
   */
  async seedDefaultTemplates(): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>('/api/templates/seed-defaults', {
      method: 'POST',
    });
  }

  /**
   * Get section type display name
   */
  getSectionTypeDisplayName(sectionType: string): string {
    const displayNames: Record<string, string> = {
      executive_summary: 'Executive Summary',
      project_description: 'Project Description',
      methodology: 'Methodology',
      budget: 'Budget & Justification',
      timeline: 'Timeline',
      team: 'Team & Capabilities',
      impact: 'Impact & Dissemination',
      sustainability: 'Sustainability',
      evaluation: 'Evaluation',
      references: 'References',
      appendix: 'Appendix',
      custom: 'Custom Section'
    };
    return displayNames[sectionType] || sectionType;
  }

  /**
   * Get section type icon
   */
  getSectionTypeIcon(sectionType: string): string {
    const icons: Record<string, string> = {
      executive_summary: '📋',
      project_description: '📝',
      methodology: '🔬',
      budget: '💰',
      timeline: '📅',
      team: '👥',
      impact: '🎯',
      sustainability: '♻️',
      evaluation: '📊',
      references: '📚',
      appendix: '📎',
      custom: '⚙️'
    };
    return icons[sectionType] || '📄';
  }

  /**
   * Validate template variables
   */
  validateVariables(variables: Record<string, unknown>, templateVariables: TemplateVariable[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const templateVar of templateVariables) {
      const value = variables[templateVar.name];
      
      if (templateVar.required && (value === undefined || value === null || value === '')) {
        errors.push(`${templateVar.description} is required`);
      }

      if (value !== undefined && value !== null && value !== '') {
        switch (templateVar.type) {
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push(`${templateVar.description} must be a valid number`);
            }
            break;
          case 'date':
            if (typeof value === 'string' && isNaN(Date.parse(value))) {
              errors.push(`${templateVar.description} must be a valid date`);
            } else if (typeof value !== 'string') {
              errors.push(`${templateVar.description} must be a valid date string`);
            }
            break;
          case 'list':
            if (!Array.isArray(value) && typeof value === 'string') {
              // Convert comma-separated string to array
              variables[templateVar.name] = value.split(',').map(item => item.trim()).filter(item => item);
            } else if (!Array.isArray(value) && typeof value !== 'string') {
              errors.push(`${templateVar.description} must be a list or comma-separated string`);
            }
            break;
          case 'text':
          case 'organization':
          case 'grant':
            if (typeof value !== 'string') {
              errors.push(`${templateVar.description} must be a string`);
            }
            break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract variables from all sections in a template
   */
  extractAllVariables(template: GrantTemplate): TemplateVariable[] {
    const allVariables: TemplateVariable[] = [];
    const seenVariables = new Set<string>();

    for (const section of template.section_templates) {
      for (const variable of section.variables) {
        if (!seenVariables.has(variable.name)) {
          allVariables.push(variable);
          seenVariables.add(variable.name);
        }
      }
    }

    return allVariables.sort((a, b) => {
      // Sort by required first, then alphabetically
      if (a.required !== b.required) {
        return a.required ? -1 : 1;
      }
      return a.description.localeCompare(b.description);
    });
  }
}

export const templatesService = new TemplatesService();
export default templatesService;