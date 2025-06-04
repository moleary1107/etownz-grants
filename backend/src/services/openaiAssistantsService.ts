import OpenAI from 'openai';
import { DatabaseService } from './database';
import { logger } from './logger';

export interface AssistantConfig {
  name: string;
  instructions: string;
  tools: OpenAI.Beta.Assistants.AssistantTool[];
  model: string;
  fileIds?: string[];
  metadata?: Record<string, string>;
}

export interface AssistantThread {
  id: string;
  assistantId: string;
  userId: string;
  grantApplicationId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface GeneratedContent {
  text: string;
  confidence: number;
  suggestions: string[];
  tokensUsed: number;
  processingTime: number;
  threadId: string;
  runId: string;
}

export class OpenAIAssistantsService {
  private openai: OpenAI;
  private assistants: Map<string, OpenAI.Beta.Assistants.Assistant> = new Map();
  private db: DatabaseService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.db = DatabaseService.getInstance();
  }

  async initializeAssistants(): Promise<void> {
    logger.info('Initializing OpenAI Assistants...');

    const assistantConfigs: Record<string, AssistantConfig> = {
      proposal_writer: {
        name: 'Grant Proposal Writer',
        instructions: `You are an expert grant proposal writer with deep knowledge of funding requirements and successful application strategies.

Your expertise includes:
- Writing compelling executive summaries and project descriptions
- Crafting methodology sections with clear objectives and outcomes
- Developing impact statements that align with funder priorities
- Creating budget justifications that demonstrate value
- Adapting tone and style to different funding bodies (EU, Irish government, private foundations)

Guidelines:
- Always maintain professional, persuasive tone
- Include specific metrics and evidence where possible
- Follow word limits strictly
- Ensure compliance with funding body requirements
- Provide alternative phrasings and suggestions
- Consider the target audience (reviewers, panels, decision-makers)

When generating content:
1. Analyze the grant scheme requirements thoroughly
2. Align content with evaluation criteria
3. Use evidence-based arguments
4. Include clear calls to action
5. Ensure logical flow and coherence`,
        tools: [
          { type: 'file_search' },
          { type: 'code_interpreter' }
        ],
        model: 'gpt-4-turbo-preview'
      },

      compliance_checker: {
        name: 'Grant Compliance Checker',
        instructions: `You are a meticulous grant compliance specialist with expertise in funding body requirements and application validation.

Your responsibilities:
- Analyze applications against specific grant requirements
- Identify mandatory vs. optional elements
- Check eligibility criteria compliance
- Validate document completeness
- Assess budget compliance with funding rules
- Review deadline and submission requirements

Focus areas:
- EU funding rules (Horizon Europe, LIFE, Erasmus+, etc.)
- Irish funding schemes (Enterprise Ireland, Science Foundation Ireland, etc.)
- Private foundation requirements
- Regulatory compliance (GDPR, ethics, safety)

When checking compliance:
1. Cross-reference every requirement systematically
2. Assign severity levels (Critical, Major, Minor)
3. Provide specific correction suggestions
4. Reference exact requirement sources
5. Calculate overall compliance score
6. Highlight missing mandatory elements`,
        tools: [
          { type: 'file_search' }
        ],
        model: 'gpt-4-turbo-preview'
      },

      budget_analyst: {
        name: 'Grant Budget Analyst',
        instructions: `You are a specialized grant budget analyst with expertise in funding body financial requirements and cost optimization.

Your expertise covers:
- Budget category allocation and limits
- Eligible vs. ineligible costs
- Cost justification and value demonstration
- Financial sustainability planning
- Multi-partner budget coordination
- Cost-effectiveness analysis

Key focus areas:
- EU funding rates and rules (25-100% depending on scheme)
- Irish state aid rules and limitations
- VAT and tax implications
- Personnel costs and overheads
- Equipment and consumables
- Travel and dissemination costs

When analyzing budgets:
1. Verify compliance with funding body rules
2. Optimize cost allocation across categories
3. Identify potential savings and reallocations
4. Ensure adequate contingency planning
5. Validate financial sustainability
6. Provide detailed justifications for major costs`,
        tools: [
          { type: 'file_search' },
          { type: 'code_interpreter' }
        ],
        model: 'gpt-4-turbo-preview'
      },

      requirements_analyzer: {
        name: 'Grant Requirements Analyzer',
        instructions: `You are an expert at extracting, analyzing, and structuring grant requirements from funding body documentation.

Your capabilities:
- Parse complex funding documentation
- Extract eligibility criteria and constraints
- Identify evaluation criteria and weightings
- Map application requirements to sections
- Analyze submission processes and deadlines
- Identify partnership and consortium requirements

Analysis framework:
- Mandatory vs. optional requirements
- Quantitative vs. qualitative criteria
- Application vs. post-award requirements
- Financial vs. technical criteria
- Individual vs. consortium elements

When analyzing requirements:
1. Create structured requirement hierarchies
2. Identify dependencies between requirements
3. Extract specific metrics and thresholds
4. Map requirements to application sections
5. Highlight potential compliance risks
6. Generate checklists for applicants`,
        tools: [
          { type: 'file_search' }
        ],
        model: 'gpt-4-turbo-preview'
      },

      impact_strategist: {
        name: 'Grant Impact Strategist',
        instructions: `You are a strategic advisor specializing in developing compelling impact narratives for grant applications.

Your expertise includes:
- Theory of change development
- Impact measurement frameworks
- Stakeholder analysis and mapping
- Risk assessment and mitigation
- Sustainability planning
- Communication and dissemination strategies

Strategic focus areas:
- Social impact and public benefit
- Economic development and job creation
- Environmental sustainability and climate goals
- Innovation and technological advancement
- Knowledge transfer and capacity building
- International collaboration and cooperation

When developing impact strategies:
1. Align with funder priorities and SDGs
2. Develop clear logic models and pathways
3. Define measurable outcomes and indicators
4. Identify key stakeholders and beneficiaries
5. Plan for long-term sustainability
6. Create compelling narrative arcs`,
        tools: [
          { type: 'file_search' },
          { type: 'code_interpreter' }
        ],
        model: 'gpt-4-turbo-preview'
      }
    };

    for (const [key, config] of Object.entries(assistantConfigs)) {
      try {
        const assistant = await this.openai.beta.assistants.create(config);
        this.assistants.set(key, assistant);
        logger.info(`Created assistant: ${key} (${assistant.id})`);

        // Store assistant info in database
        await this.storeAssistantInfo(key, assistant);
      } catch (error) {
        logger.error(`Failed to create assistant ${key}:`, error);
        throw error;
      }
    }

    logger.info(`Successfully initialized ${this.assistants.size} assistants`);
  }

  private async storeAssistantInfo(key: string, assistant: OpenAI.Beta.Assistants.Assistant): Promise<void> {
    const query = `
      INSERT INTO openai_assistants (assistant_key, assistant_id, name, model, instructions, tools, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (assistant_key) 
      DO UPDATE SET 
        assistant_id = $2,
        name = $3,
        model = $4,
        instructions = $5,
        tools = $6,
        updated_at = NOW()
    `;

    await this.db.query(query, [
      key,
      assistant.id,
      assistant.name,
      assistant.model,
      assistant.instructions,
      JSON.stringify(assistant.tools)
    ]);
  }

  async getAssistant(assistantKey: string): Promise<OpenAI.Beta.Assistants.Assistant | null> {
    return this.assistants.get(assistantKey) || null;
  }

  async createThread(
    assistantKey: string,
    userId: string,
    grantApplicationId?: string,
    metadata: Record<string, any> = {}
  ): Promise<AssistantThread> {
    const assistant = this.assistants.get(assistantKey);
    if (!assistant) {
      throw new Error(`Assistant not found: ${assistantKey}`);
    }

    const thread = await this.openai.beta.threads.create({
      metadata: {
        assistantKey,
        userId,
        grantApplicationId: grantApplicationId || '',
        ...metadata
      }
    });

    const assistantThread: AssistantThread = {
      id: thread.id,
      assistantId: assistant.id,
      userId,
      grantApplicationId,
      metadata,
      createdAt: new Date()
    };

    // Store thread info in database
    await this.storeThreadInfo(assistantThread);

    return assistantThread;
  }

  private async storeThreadInfo(thread: AssistantThread): Promise<void> {
    const query = `
      INSERT INTO openai_threads (thread_id, assistant_id, user_id, grant_application_id, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [
      thread.id,
      thread.assistantId,
      thread.userId,
      thread.grantApplicationId,
      JSON.stringify(thread.metadata),
      thread.createdAt
    ]);
  }

  async generateProposalSection(
    assistantKey: string,
    threadId: string,
    sectionType: string,
    context: {
      grantType: string;
      fundingBody: string;
      requirements: string[];
      wordLimit?: number;
      previousSections?: Record<string, string>;
      organizationProfile?: any;
    },
    streamCallback?: (chunk: string) => void
  ): Promise<GeneratedContent> {
    const startTime = Date.now();
    const assistant = this.assistants.get(assistantKey);
    
    if (!assistant) {
      throw new Error(`Assistant not found: ${assistantKey}`);
    }

    // Prepare context message
    const contextMessage = this.buildContextMessage(sectionType, context);

    // Add message to thread
    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: contextMessage
    });

    // Create and execute run
    const runStream = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: assistant.id,
      instructions: `Generate a ${sectionType} section for this grant application. 
                    Follow the specific requirements and maintain consistency with any previous sections.
                    ${context.wordLimit ? `Word limit: ${context.wordLimit} words.` : ''}`,
      stream: true
    });

    let generatedText = '';
    let tokensUsed = 0;
    let runId = '';

    // Handle streaming response
    for await (const event of runStream) {
      if (event.event === 'thread.message.delta') {
        const content = event.data.delta.content?.[0];
        if (content?.type === 'text' && content.text?.value) {
          const chunk = content.text.value;
          generatedText += chunk;
          streamCallback?.(chunk);
        }
      } else if (event.event === 'thread.run.completed') {
        tokensUsed = event.data.usage?.total_tokens || 0;
        runId = event.data.id;
      }
    }

    const processingTime = Date.now() - startTime;

    // Analyze generated content
    const confidence = await this.calculateConfidence(generatedText, context);
    const suggestions = await this.generateSuggestions(generatedText, sectionType);

    // Log the interaction
    await this.logAssistantInteraction(threadId, assistant.id, {
      sectionType,
      inputContext: context,
      generatedText,
      tokensUsed,
      processingTime,
      confidence
    });

    return {
      text: generatedText,
      confidence,
      suggestions,
      tokensUsed,
      processingTime,
      threadId,
      runId: runId
    };
  }

  private buildContextMessage(sectionType: string, context: any): string {
    let message = `Generate a ${sectionType} section for a grant application with the following context:\n\n`;
    
    message += `Grant Type: ${context.grantType}\n`;
    message += `Funding Body: ${context.fundingBody}\n`;
    message += `Requirements: ${context.requirements.join(', ')}\n`;
    
    if (context.wordLimit) {
      message += `Word Limit: ${context.wordLimit} words\n`;
    }
    
    if (context.organizationProfile) {
      message += `Organization: ${JSON.stringify(context.organizationProfile, null, 2)}\n`;
    }
    
    if (context.previousSections && Object.keys(context.previousSections).length > 0) {
      message += `\nPrevious sections for context:\n`;
      for (const [section, content] of Object.entries(context.previousSections)) {
        const contentStr = String(content);
        message += `${section}: ${contentStr.substring(0, 200)}...\n`;
      }
    }

    message += `\nPlease generate a compelling, compliant ${sectionType} section that addresses all requirements.`;
    
    return message;
  }

  async checkCompliance(
    threadId: string,
    applicationData: any,
    grantScheme: string
  ): Promise<{
    overallScore: number;
    issues: Array<{
      field: string;
      requirement: string;
      severity: 'critical' | 'major' | 'minor';
      suggestion: string;
    }>;
    suggestions: string[];
  }> {
    const assistant = this.assistants.get('compliance_checker');
    if (!assistant) {
      throw new Error('Compliance checker assistant not found');
    }

    const message = `Please check this grant application for compliance with ${grantScheme} requirements:

Application Data:
${JSON.stringify(applicationData, null, 2)}

Perform a thorough compliance check and provide:
1. Overall compliance score (0-100)
2. List of specific issues with severity levels
3. Actionable suggestions for improvement`;

    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    const run = await this.openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistant.id,
      tools: [{
        type: 'function',
        function: {
          name: 'report_compliance_results',
          description: 'Report compliance check results',
          parameters: {
            type: 'object',
            properties: {
              overallScore: { type: 'number', minimum: 0, maximum: 100 },
              issues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    requirement: { type: 'string' },
                    severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
                    suggestion: { type: 'string' }
                  },
                  required: ['field', 'requirement', 'severity', 'suggestion']
                }
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['overallScore', 'issues', 'suggestions']
          }
        }
      }]
    });

    // Extract function call results
    if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
      const toolCall = run.required_action.submit_tool_outputs.tool_calls[0];
      if (toolCall.function.name === 'report_compliance_results') {
        return JSON.parse(toolCall.function.arguments);
      }
    }

    // Fallback: extract from assistant messages
    const messages = await this.openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];
    
    if (lastMessage.content[0].type === 'text') {
      return this.parseComplianceResponse(lastMessage.content[0].text.value);
    }

    throw new Error('Failed to get compliance check results');
  }

  async optimizeBudget(
    threadId: string,
    budgetData: any,
    projectScope: any,
    fundingRules: any
  ): Promise<{
    optimizedBudget: any;
    savings: number;
    recommendations: string[];
    warnings: string[];
  }> {
    const assistant = this.assistants.get('budget_analyst');
    if (!assistant) {
      throw new Error('Budget analyst assistant not found');
    }

    const message = `Please analyze and optimize this project budget:

Project Scope:
${JSON.stringify(projectScope, null, 2)}

Current Budget:
${JSON.stringify(budgetData, null, 2)}

Funding Rules:
${JSON.stringify(fundingRules, null, 2)}

Provide:
1. Optimized budget allocation
2. Potential cost savings
3. Specific recommendations
4. Risk warnings`;

    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    const run = await this.openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistant.id
    });

    const messages = await this.openai.beta.threads.messages.list(threadId);
    const response = messages.data[0];

    if (response.content[0].type === 'text') {
      return this.parseBudgetOptimizationResponse(response.content[0].text.value);
    }

    throw new Error('Failed to get budget optimization results');
  }

  private async calculateConfidence(text: string, context: any): Promise<number> {
    // Simple confidence calculation based on text quality indicators
    let confidence = 0.5;

    // Check word count compliance
    if (context.wordLimit) {
      const wordCount = text.split(/\s+/).length;
      const ratio = wordCount / context.wordLimit;
      if (ratio >= 0.8 && ratio <= 1.0) {
        confidence += 0.2;
      }
    }

    // Check for requirement coverage
    if (context.requirements) {
      const coverageScore = context.requirements.filter(req => 
        text.toLowerCase().includes(req.toLowerCase())
      ).length / context.requirements.length;
      confidence += coverageScore * 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  private async generateSuggestions(text: string, sectionType: string): Promise<string[]> {
    // Generate improvement suggestions based on section type
    const suggestions: string[] = [];

    if (text.length < 100) {
      suggestions.push('Consider expanding the content with more detail and examples');
    }

    if (sectionType === 'methodology' && !text.includes('objective')) {
      suggestions.push('Include clear project objectives and outcomes');
    }

    if (sectionType === 'impact' && !text.includes('measure')) {
      suggestions.push('Add specific impact measurement criteria');
    }

    return suggestions;
  }

  private parseComplianceResponse(response: string): any {
    // Simple parser for compliance response
    // In production, this would be more sophisticated
    try {
      const scoreMatch = response.match(/score[:\s]*(\d+)/i);
      const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;

      return {
        overallScore,
        issues: [],
        suggestions: ['Review response for detailed compliance feedback']
      };
    } catch (error) {
      logger.error('Failed to parse compliance response:', error);
      return {
        overallScore: 0,
        issues: [],
        suggestions: ['Failed to parse compliance results']
      };
    }
  }

  private parseBudgetOptimizationResponse(response: string): any {
    // Simple parser for budget optimization response
    return {
      optimizedBudget: {},
      savings: 0,
      recommendations: ['Review response for detailed budget recommendations'],
      warnings: []
    };
  }

  private async logAssistantInteraction(
    threadId: string,
    assistantId: string,
    interaction: any
  ): Promise<void> {
    const query = `
      INSERT INTO openai_assistant_interactions 
      (thread_id, assistant_id, interaction_type, input_data, output_data, tokens_used, processing_time_ms, confidence_score, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;

    await this.db.query(query, [
      threadId,
      assistantId,
      interaction.sectionType,
      JSON.stringify(interaction.inputContext),
      JSON.stringify({ text: interaction.generatedText, suggestions: [] }),
      interaction.tokensUsed,
      interaction.processingTime,
      interaction.confidence
    ]);
  }

  async getAssistantThreads(userId: string): Promise<AssistantThread[]> {
    const query = `
      SELECT thread_id, assistant_id, user_id, grant_application_id, metadata, created_at
      FROM openai_threads 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.thread_id,
      assistantId: row.assistant_id,
      userId: row.user_id,
      grantApplicationId: row.grant_application_id,
      metadata: row.metadata,
      createdAt: row.created_at
    }));
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      await this.openai.beta.threads.del(threadId);
      
      const query = `DELETE FROM openai_threads WHERE thread_id = $1`;
      await this.db.query(query, [threadId]);
    } catch (error) {
      logger.error(`Failed to delete thread ${threadId}:`, error);
      throw error;
    }
  }
}

export const openaiAssistantsService = new OpenAIAssistantsService();