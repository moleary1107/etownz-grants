import { db } from './database';
import { logger } from './logger';
import { OpenAIService } from './openaiService';
import { v4 as uuidv4 } from 'uuid';

export interface GrantTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  grant_type: string;
  section_templates: SectionTemplate[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateSectionTemplate {
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
}

export interface CreateGrantTemplate {
  name: string;
  description: string;
  category: string;
  grant_type: string;
  section_templates: CreateSectionTemplate[];
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
  created_at: Date;
  updated_at: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'organization' | 'grant' | 'list';
  description: string;
  required: boolean;
  default_value?: any;
  validation_rules?: any;
}

export interface GeneratedSection {
  section_name: string;
  content: string;
  word_count: number;
  metadata: {
    template_used: string;
    variables_filled: Record<string, any>;
    generation_time: number;
    confidence_score: number;
  };
}

export class TemplateService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  /**
   * Initialize template database tables
   */
  async initialize(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS grant_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          grant_type VARCHAR(100) NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_grant_templates_category ON grant_templates(category);
        CREATE INDEX IF NOT EXISTS idx_grant_templates_type ON grant_templates(grant_type);
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS section_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_id UUID NOT NULL REFERENCES grant_templates(id) ON DELETE CASCADE,
          section_name VARCHAR(255) NOT NULL,
          section_type VARCHAR(50) NOT NULL,
          content_template TEXT NOT NULL,
          prompts JSONB NOT NULL DEFAULT '{}',
          variables JSONB NOT NULL DEFAULT '[]',
          word_count_range JSONB NOT NULL DEFAULT '{"min": 100, "max": 500}',
          required BOOLEAN DEFAULT false,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_section_templates_template_id ON section_templates(template_id);
        CREATE INDEX IF NOT EXISTS idx_section_templates_type ON section_templates(section_type);
        CREATE INDEX IF NOT EXISTS idx_section_templates_order ON section_templates(template_id, order_index);
      `);

      logger.info('Template service tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize template tables:', error);
      throw error;
    }
  }

  /**
   * Create a new grant template with sections
   */
  async createTemplate(template: CreateGrantTemplate): Promise<GrantTemplate> {
    try {
      const templateId = uuidv4();

      // Create main template
      await db.query(`
        INSERT INTO grant_templates (id, name, description, category, grant_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [templateId, template.name, template.description, template.category, template.grant_type]);

      // Create section templates
      for (const section of template.section_templates) {
        await db.query(`
          INSERT INTO section_templates (
            template_id, section_name, section_type, content_template, 
            prompts, variables, word_count_range, required, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          templateId,
          section.section_name,
          section.section_type,
          section.content_template,
          JSON.stringify(section.prompts),
          JSON.stringify(section.variables),
          JSON.stringify(section.word_count_range),
          section.required,
          section.order_index
        ]);
      }

      logger.info('Grant template created', { templateId, name: template.name });
      return this.getTemplate(templateId);
    } catch (error) {
      logger.error('Failed to create template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID with all sections
   */
  async getTemplate(templateId: string): Promise<GrantTemplate> {
    try {
      const templateResult = await db.query(`
        SELECT * FROM grant_templates WHERE id = $1
      `, [templateId]);

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      const sectionsResult = await db.query(`
        SELECT * FROM section_templates 
        WHERE template_id = $1 
        ORDER BY order_index ASC
      `, [templateId]);

      const template = templateResult.rows[0];
      template.section_templates = sectionsResult.rows.map(row => ({
        ...row,
        prompts: row.prompts,
        variables: row.variables,
        word_count_range: row.word_count_range
      }));

      return template;
    } catch (error) {
      logger.error('Failed to get template:', error);
      throw error;
    }
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
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters.grant_type) {
        whereClause += ` AND grant_type = $${paramIndex}`;
        params.push(filters.grant_type);
        paramIndex++;
      }

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) FROM grant_templates ${whereClause}
      `, params);
      const total = parseInt(countResult.rows[0].count);

      // Get templates
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      
      const templatesResult = await db.query(`
        SELECT gt.*, COUNT(st.id) as sections_count
        FROM grant_templates gt
        LEFT JOIN section_templates st ON gt.id = st.template_id
        ${whereClause}
        GROUP BY gt.id
        ORDER BY gt.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      return {
        templates: templatesResult.rows,
        total
      };
    } catch (error) {
      logger.error('Failed to list templates:', error);
      throw error;
    }
  }

  /**
   * Generate content for a specific section using AI
   */
  async generateSectionContent(
    sectionId: string,
    variables: Record<string, any>,
    organizationId?: string,
    grantId?: string
  ): Promise<GeneratedSection> {
    try {
      const startTime = Date.now();

      // Get section template
      const sectionResult = await db.query(`
        SELECT st.*, gt.name as template_name, gt.grant_type
        FROM section_templates st
        JOIN grant_templates gt ON st.template_id = gt.id
        WHERE st.id = $1
      `, [sectionId]);

      if (sectionResult.rows.length === 0) {
        throw new Error('Section template not found');
      }

      const section = sectionResult.rows[0];

      // Get organization data if provided
      let organizationData = {};
      if (organizationId) {
        const orgResult = await db.query(`
          SELECT name, description, website, organization_type
          FROM organizations WHERE id = $1
        `, [organizationId]);
        
        if (orgResult.rows.length > 0) {
          organizationData = orgResult.rows[0];
          
          // Get organization capabilities
          const capResult = await db.query(`
            SELECT capability_type, capability_name, description
            FROM organization_capabilities WHERE organization_id = $1
          `, [organizationId]);
          
          organizationData = {
            ...organizationData,
            capabilities: capResult.rows
          };
        }
      }

      // Get grant data if provided
      let grantData = {};
      if (grantId) {
        const grantResult = await db.query(`
          SELECT title, description, amount as funding_amount_max, deadline, eligibility_criteria
          FROM grants WHERE id = $1
        `, [grantId]);
        
        if (grantResult.rows.length > 0) {
          grantData = grantResult.rows[0];
          
          // Get grant requirements
          const reqResult = await db.query(`
            SELECT requirement_type, requirement_text, mandatory
            FROM grant_requirements WHERE grant_id = $1
          `, [grantId]);
          
          grantData = {
            ...grantData,
            requirements: reqResult.rows
          };
        }
      }

      // Build generation prompt
      const prompt = this.buildGenerationPrompt(section, variables, organizationData, grantData);

      // Generate content using AI with simplified prompt for debugging
      const simplifiedPrompt = `Generate a ${section.section_name} section for a business grant application. 
        
Project: ${this.sanitizeText(String(variables.project_title || 'Business Innovation Project'))}
Funding: ${this.sanitizeText(String(variables.funding_amount || '50000'))}
Duration: ${this.sanitizeText(String(variables.project_duration || '2 years'))}

Write ${section.word_count_range.min}-${section.word_count_range.max} words in professional grant writing style.`;

      logger.info('Generated prompt for OpenAI', { 
        promptLength: simplifiedPrompt.length,
        sectionName: section.section_name 
      });

      const messages = [{ role: 'user' as const, content: this.sanitizeText(simplifiedPrompt) }];
      const response = await this.openaiService.chatCompletion(messages, {
        model: 'gpt-4o-mini', // Use cheaper model for testing
        temperature: 0.7,
        maxTokens: Math.min(section.word_count_range.max * 2, 2000)
      });

      const content = response.content.trim();
      const wordCount = content.split(/\s+/).length;
      const generationTime = Date.now() - startTime;

      // Calculate confidence score based on word count adherence and content quality
      const confidenceScore = this.calculateConfidenceScore(content, section.word_count_range, wordCount);

      logger.info('Section content generated', {
        sectionId,
        sectionName: section.section_name,
        wordCount,
        generationTime,
        confidenceScore
      });

      return {
        section_name: section.section_name,
        content,
        word_count: wordCount,
        metadata: {
          template_used: section.template_name,
          variables_filled: variables,
          generation_time: generationTime,
          confidence_score: confidenceScore
        }
      };
    } catch (error) {
      logger.error('Failed to generate section content:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sectionId
      });
      throw error;
    }
  }

  /**
   * Generate complete grant application using template
   */
  async generateApplication(
    templateId: string,
    variables: Record<string, any>,
    organizationId?: string,
    grantId?: string
  ): Promise<{
    sections: GeneratedSection[];
    metadata: {
      template_name: string;
      total_word_count: number;
      generation_time: number;
      sections_generated: number;
    };
  }> {
    try {
      const startTime = Date.now();
      const template = await this.getTemplate(templateId);

      const sections: GeneratedSection[] = [];

      // Generate each section
      for (const sectionTemplate of template.section_templates) {
        const generatedSection = await this.generateSectionContent(
          sectionTemplate.id,
          variables,
          organizationId,
          grantId
        );
        sections.push(generatedSection);
      }

      const totalWordCount = sections.reduce((sum, section) => sum + section.word_count, 0);
      const generationTime = Date.now() - startTime;

      logger.info('Complete application generated', {
        templateId,
        templateName: template.name,
        sectionsGenerated: sections.length,
        totalWordCount,
        generationTime
      });

      return {
        sections,
        metadata: {
          template_name: template.name,
          total_word_count: totalWordCount,
          generation_time: generationTime,
          sections_generated: sections.length
        }
      };
    } catch (error) {
      logger.error('Failed to generate application:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        templateId
      });
      throw error;
    }
  }

  /**
   * Get available template categories and types
   */
  async getTemplateCategories(): Promise<{
    categories: string[];
    grant_types: string[];
  }> {
    try {
      const categoriesResult = await db.query(`
        SELECT DISTINCT category FROM grant_templates ORDER BY category
      `);

      const typesResult = await db.query(`
        SELECT DISTINCT grant_type FROM grant_templates ORDER BY grant_type
      `);

      return {
        categories: categoriesResult.rows.map(row => row.category),
        grant_types: typesResult.rows.map(row => row.grant_type)
      };
    } catch (error) {
      logger.error('Failed to get template categories:', error);
      throw error;
    }
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/[\u2018\u2019]/g, "'")     // Smart single quotes
      .replace(/[\u201C\u201D]/g, '"')     // Smart double quotes  
      .replace(/\u2026/g, '...')           // Horizontal ellipsis
      .replace(/\u2013/g, '-')             // En dash
      .replace(/\u2014/g, '--')            // Em dash
      .replace(/\u00A0/g, ' ')             // Non-breaking space
      .replace(/[^\x00-\x7F]/g, '')        // Remove all non-ASCII characters
      .replace(/\s+/g, ' ')                // Normalize whitespace
      .trim();
  }

  private buildGenerationPrompt(
    section: any,
    variables: Record<string, any>,
    organizationData: any,
    grantData: any
  ): string {
    const { prompts, word_count_range } = section;
    
    let prompt = this.sanitizeText(prompts.generation_prompt || `Generate content for the ${section.section_name} section of a grant application.`);

    // Add context information
    prompt += `\n\nSection: ${this.sanitizeText(section.section_name)}`;
    prompt += `\nWord Count Target: ${word_count_range.min}-${word_count_range.max} words`;
    prompt += `\nSection Type: ${this.sanitizeText(section.section_type)}`;

    // Add organization context
    if (Object.keys(organizationData).length > 0) {
      prompt += `\n\nOrganization Information:`;
      prompt += `\nName: ${this.sanitizeText(organizationData.name || 'Not specified')}`;
      prompt += `\nDescription: ${this.sanitizeText(organizationData.description || 'Not specified')}`;
      prompt += `\nType: ${this.sanitizeText(organizationData.organization_type || 'Not specified')}`;
      
      if (organizationData.capabilities && organizationData.capabilities.length > 0) {
        const capabilities = organizationData.capabilities.map((c: any) => this.sanitizeText(c.capability_name)).join(', ');
        prompt += `\nKey Capabilities: ${capabilities}`;
      }
    }

    // Add grant context
    if (Object.keys(grantData).length > 0) {
      prompt += `\n\nGrant Information:`;
      prompt += `\nTitle: ${this.sanitizeText(grantData.title || 'Not specified')}`;
      prompt += `\nFunding Amount: ${this.sanitizeText(String(grantData.funding_amount_max || grantData.amount || 'Not specified'))}`;
      if (grantData.requirements && grantData.requirements.length > 0) {
        const requirements = grantData.requirements.map((r: any) => this.sanitizeText(r.requirement_text)).slice(0, 3).join('; ');
        prompt += `\nKey Requirements: ${requirements}`;
      }
    }

    // Add variables
    if (Object.keys(variables).length > 0) {
      prompt += `\n\nAdditional Variables:`;
      Object.entries(variables).forEach(([key, value]) => {
        prompt += `\n${this.sanitizeText(key)}: ${this.sanitizeText(String(value))}`;
      });
    }

    // Add content template if available
    if (section.content_template) {
      prompt += `\n\nContent Template/Structure:\n${this.sanitizeText(section.content_template)}`;
    }

    prompt += `\n\nGenerate professional, compelling content that addresses the specific requirements for this section. Ensure the content is within the specified word count range and follows grant writing best practices.`;

    return this.sanitizeText(prompt);
  }

  private calculateConfidenceScore(content: string, wordRange: any, actualWordCount: number): number {
    let score = 0.8; // Base score

    // Word count adherence (0.2 weight)
    const targetMin = wordRange.min;
    const targetMax = wordRange.max;
    
    if (actualWordCount >= targetMin && actualWordCount <= targetMax) {
      score += 0.2;
    } else if (actualWordCount < targetMin) {
      const shortfall = (targetMin - actualWordCount) / targetMin;
      score += Math.max(0, 0.2 - shortfall);
    } else {
      const excess = (actualWordCount - targetMax) / targetMax;
      score += Math.max(0, 0.2 - excess * 0.5);
    }

    // Content quality indicators (basic heuristics)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = actualWordCount / sentences.length;
    
    // Prefer moderate sentence lengths (10-25 words)
    if (avgSentenceLength >= 10 && avgSentenceLength <= 25) {
      // Good sentence structure
    } else {
      score -= 0.05;
    }

    // Check for paragraph structure
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length > 1) {
      // Good paragraph structure
    } else if (actualWordCount > 200) {
      score -= 0.05; // Penalize single paragraph for longer content
    }

    return Math.max(0.1, Math.min(1.0, score));
  }
}

// Create singleton instance
export const templateService = new TemplateService();