import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AIEditorService } from '../services/aiEditorService';
import { OpenAIService } from '../services/openaiService';
import { logger } from '../services/logger';
import { db } from '../services/database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const aiEditorService = new AIEditorService();
const openaiService = new OpenAIService();

/**
 * @swagger
 * /ai/editor/suggestions:
 *   post:
 *     summary: Generate contextual AI suggestions for editor content
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - cursorPosition
 *               - context
 *             properties:
 *               content:
 *                 type: string
 *                 description: Current editor content
 *               cursorPosition:
 *                 type: integer
 *                 description: Current cursor position in the editor
 *               context:
 *                 type: object
 *                 required:
 *                   - sessionId
 *                   - applicationId
 *                   - grantId
 *                   - section
 *                   - grantType
 *                 properties:
 *                   sessionId:
 *                     type: string
 *                   applicationId:
 *                     type: string
 *                   grantId:
 *                     type: string
 *                   section:
 *                     type: string
 *                   grantType:
 *                     type: string
 *     responses:
 *       200:
 *         description: AI suggestions generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [insertion, replacement, enhancement, structure]
 *                       content:
 *                         type: string
 *                       position:
 *                         type: integer
 *                       reasoning:
 *                         type: string
 *                       confidence:
 *                         type: number
 */
router.post('/suggestions', asyncHandler(async (req, res) => {
  try {
    const { content, cursorPosition, context } = req.body;
    const userId = req.user?.id;

    // Validate required parameters
    if (!content || cursorPosition === undefined || !context) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'content, cursorPosition, and context are required'
      });
    }

    // Validate context
    const requiredContextFields = ['sessionId', 'applicationId', 'grantId', 'section', 'grantType'];
    for (const field of requiredContextFields) {
      if (!context[field]) {
        return res.status(400).json({
          error: `Missing context field: ${field}`
        });
      }
    }

    // Add user info to context
    const editorContext = {
      ...context,
      userId,
      organizationId: req.user?.organizationId
    };

    // Generate suggestions
    const suggestions = await aiEditorService.generateContextualSuggestions(
      content,
      cursorPosition,
      editorContext
    );

    res.json({
      suggestions,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate AI suggestions:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/generate-content:
 *   post:
 *     summary: Generate content based on user prompt
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - context
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: User prompt for content generation
 *               context:
 *                 type: object
 *               options:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [completion, enhancement, full_section]
 *                   style:
 *                     type: string
 *                     enum: [formal, academic, concise]
 *                   length:
 *                     type: string
 *                     enum: [short, medium, long]
 *     responses:
 *       200:
 *         description: Content generated successfully
 */
router.post('/generate-content', asyncHandler(async (req, res) => {
  try {
    const { prompt, context, options = {} } = req.body;
    const userId = req.user?.id;

    if (!prompt || !context) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'prompt and context are required'
      });
    }

    const editorContext = {
      ...context,
      userId,
      organizationId: req.user?.organizationId
    };

    const result = await aiEditorService.generateContent(
      prompt,
      editorContext,
      options
    );

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate content:', error);
    res.status(500).json({
      error: 'Failed to generate content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/semantic-search:
 *   post:
 *     summary: Perform semantic search for relevant content
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/semantic-search', asyncHandler(async (req, res) => {
  try {
    const { query, context, options = {} } = req.body;
    const userId = req.user?.id;

    if (!query || !context) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'query and context are required'
      });
    }

    const editorContext = {
      ...context,
      userId,
      organizationId: req.user?.organizationId
    };

    const results = await aiEditorService.performSemanticSearch(
      query,
      editorContext,
      options
    );

    res.json({
      query,
      results,
      searchType: options.searchType || 'content',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to perform semantic search:', error);
    res.status(500).json({
      error: 'Failed to perform search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/analyze-content:
 *   post:
 *     summary: Analyze content quality and compliance
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/analyze-content', asyncHandler(async (req, res) => {
  try {
    const { content, context, analysisType = 'quality' } = req.body;
    const userId = req.user?.id;

    if (!content || !context) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'content and context are required'
      });
    }

    const editorContext = {
      ...context,
      userId,
      organizationId: req.user?.organizationId
    };

    let analysis;
    if (analysisType === 'compliance') {
      analysis = await aiEditorService.checkCompliance(content, editorContext);
    } else {
      analysis = await aiEditorService.analyzeContentQuality(content, editorContext);
    }

    res.json({
      analysis,
      analysisType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to analyze content:', error);
    res.status(500).json({
      error: 'Failed to analyze content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/chat:
 *   post:
 *     summary: Process chat message with AI assistant
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chat', asyncHandler(async (req, res) => {
  try {
    const { message, context, conversationHistory = [] } = req.body;
    const userId = req.user?.id;

    if (!message || !context) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'message and context are required'
      });
    }

    const editorContext = {
      ...context,
      userId,
      organizationId: req.user?.organizationId
    };

    const response = await aiEditorService.processChat(
      message,
      editorContext,
      conversationHistory
    );

    res.json({
      message: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to process chat:', error);
    res.status(500).json({
      error: 'Failed to process chat',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/sessions:
 *   post:
 *     summary: Create new editor session
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sessions', asyncHandler(async (req, res) => {
  try {
    const { applicationId, grantId, section, title } = req.body;
    const userId = req.user?.id;

    if (!applicationId || !grantId || !section || !title) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'applicationId, grantId, section, and title are required'
      });
    }

    const sessionId = uuidv4();

    // Create editor session
    await db.query(`
      INSERT INTO editor_sessions (
        id, application_id, section_type, title, created_by, collaborators
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [sessionId, applicationId, section, title, userId, [userId]]);

    // Load initial content if exists
    const contentResult = await db.query(`
      SELECT content_text, editor_state
      FROM editor_auto_saves
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [sessionId]);

    const initialContent = contentResult.rows[0] || null;

    res.json({
      sessionId,
      applicationId,
      grantId,
      section,
      title,
      initialContent,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create editor session:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/sessions/{sessionId}/save:
 *   post:
 *     summary: Auto-save editor content
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sessions/:sessionId/save', asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { editorState, content, saveType = 'auto' } = req.body;
    const userId = req.user?.id;

    if (!editorState && !content) {
      return res.status(400).json({
        error: 'Missing content',
        message: 'Either editorState or content is required'
      });
    }

    // Verify session belongs to user
    const sessionResult = await db.query(`
      SELECT id FROM editor_sessions
      WHERE id = $1 AND (created_by = $2 OR $2 = ANY(collaborators))
    `, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this session'
      });
    }

    // Calculate word and character counts
    const wordCount = content ? content.split(/\s+/).filter(word => word.length > 0).length : 0;
    const characterCount = content ? content.length : 0;

    // Save content
    await db.query(`
      INSERT INTO editor_auto_saves (
        session_id, editor_state, content_text, save_type,
        word_count, character_count
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      sessionId,
      editorState ? JSON.stringify(editorState) : null,
      content,
      saveType,
      wordCount,
      characterCount
    ]);

    // Update session last activity
    await db.query(`
      UPDATE editor_sessions
      SET updated_at = NOW(), last_saved_at = NOW()
      WHERE id = $1
    `, [sessionId]);

    res.json({
      success: true,
      savedAt: new Date().toISOString(),
      wordCount,
      characterCount
    });

  } catch (error) {
    logger.error('Failed to save editor content:', error);
    res.status(500).json({
      error: 'Failed to save content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/suggestions/{suggestionId}/feedback:
 *   post:
 *     summary: Record feedback on AI suggestion
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/suggestions/:suggestionId/feedback', asyncHandler(async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { action, modification } = req.body;
    const userId = req.user?.id;

    if (!action || !['accepted', 'rejected', 'modified', 'ignored'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: 'action must be one of: accepted, rejected, modified, ignored'
      });
    }

    // Update suggestion status
    await db.query(`
      UPDATE ai_content_suggestions 
      SET status = $1, user_action = $2, user_modification = $3, responded_at = NOW()
      WHERE id = $4 AND user_id = $5
    `, [action, action, modification, suggestionId, userId]);

    res.json({
      success: true,
      suggestionId,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to record suggestion feedback:', error);
    res.status(500).json({
      error: 'Failed to record feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/sessions/{sessionId}/suggestions:
 *   get:
 *     summary: Get pending suggestions for session
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.get('/sessions/:sessionId/suggestions', asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    // Get suggestions for session
    const result = await db.query(`
      SELECT 
        id, suggestion_type, content_position, original_text,
        suggested_text, reasoning, confidence_score, status,
        created_at, expires_at
      FROM ai_content_suggestions
      WHERE session_id = $1 
      AND status = 'pending'
      AND expires_at > NOW()
      ORDER BY content_position, created_at
    `, [sessionId]);

    res.json({
      suggestions: result.rows,
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get session suggestions:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/sessions/{sessionId}/chat-history:
 *   get:
 *     summary: Get chat history for session
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.get('/sessions/:sessionId/chat-history', asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    const result = await db.query(`
      SELECT 
        id, role, content, confidence, reasoning,
        created_at, parent_message_id
      FROM ai_editor_chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `, [sessionId, limit]);

    res.json({
      messages: result.rows,
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get chat history:', error);
    res.status(500).json({
      error: 'Failed to get chat history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * @swagger
 * /ai/editor/auto-generate:
 *   post:
 *     summary: Auto-generate section content for grant applications
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grantId
 *               - organizationId
 *               - sectionType
 *               - grantInfo
 *               - organizationProfile
 *             properties:
 *               grantId:
 *                 type: string
 *                 description: Grant ID
 *               organizationId:
 *                 type: string
 *                 description: Organization ID
 *               sectionType:
 *                 type: string
 *                 enum: [executive_summary, project_description, methodology, budget_justification, impact_statement, team_expertise]
 *                 description: Type of section to generate
 *               grantInfo:
 *                 type: object
 *                 description: Grant information
 *               organizationProfile:
 *                 type: object
 *                 description: Organization profile data
 *               requirements:
 *                 type: object
 *                 description: Additional requirements
 *     responses:
 *       200:
 *         description: Section content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                   description: Generated section content
 *                 metadata:
 *                   type: object
 *                   description: Generation metadata
 */
router.post('/auto-generate', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { grantId, organizationId, sectionType, grantInfo, organizationProfile, requirements } = req.body;

  if (!grantId || !organizationId || !sectionType || !grantInfo || !organizationProfile) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'grantId, organizationId, sectionType, grantInfo, and organizationProfile are required'
    });
  }

  try {
    logger.info('Auto-generating section content', {
      grantId,
      organizationId,
      sectionType
    });

    // Create a comprehensive prompt for content generation
    const prompt = `Generate a comprehensive ${sectionType.replace('_', ' ')} section for a grant application.

Grant Information:
- Title: ${grantInfo.title || 'Grant Application'}
- Funder: ${grantInfo.funder || 'Funding Organization'}
- Amount: ${grantInfo.amount || 'To be determined'}
- Deadline: ${grantInfo.deadline || 'TBD'}
- Focus Areas: ${grantInfo.focus_areas?.join(', ') || 'Research and Innovation'}

Organization Profile:
- Name: ${organizationProfile.name || 'Organization'}
- Type: ${organizationProfile.type || 'Organization'}
- Location: ${organizationProfile.location || 'Location'}
- Expertise: ${organizationProfile.expertise?.join(', ') || 'Domain expertise'}
- Track Record: ${organizationProfile.track_record || 'Proven experience'}

Section Type: ${sectionType}

Please generate detailed, professional content that:
1. Is specific to the grant requirements and organization capabilities
2. Demonstrates clear alignment between organization strengths and grant objectives
3. Includes specific examples and quantifiable outcomes where appropriate
4. Follows academic/professional grant writing standards
5. Is compelling and persuasive while remaining factual

Word count: Aim for 800-1200 words for this section.`;

    // Use OpenAI to generate the content
    const generatedContent = await openaiService.generateText(prompt, {
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      temperature: 0.7
    });

    const processingTime = Date.now() - startTime;

    logger.info('Section content generated successfully', {
      grantId,
      organizationId,
      sectionType,
      contentLength: generatedContent.length,
      processingTime
    });

    res.json({
      content: generatedContent,
      metadata: {
        generated_at: new Date().toISOString(),
        grant_id: grantId,
        organization_id: organizationId,
        section_type: sectionType,
        word_count: generatedContent.split(/\s+/).length,
        processing_time: processingTime,
        ai_model: 'gpt-4o-mini'
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to generate section content', {
      error: error instanceof Error ? error.message : String(error),
      grantId,
      organizationId,
      sectionType,
      processingTime
    });

    res.status(500).json({
      error: 'Content generation failed',
      message: 'Unable to generate section content',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/editor/auto-generate-application:
 *   post:
 *     summary: Auto-generate complete grant application
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grantId
 *               - organizationId
 *               - grantInfo
 *               - organizationProfile
 *             properties:
 *               grantId:
 *                 type: string
 *               organizationId:
 *                 type: string
 *               grantInfo:
 *                 type: object
 *               organizationProfile:
 *                 type: object
 *               projectIdea:
 *                 type: string
 *     responses:
 *       200:
 *         description: Complete application generated successfully
 */
router.post('/auto-generate-application', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { grantId, organizationId, grantInfo, organizationProfile, projectIdea } = req.body;

  if (!grantId || !organizationId || !grantInfo || !organizationProfile) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'grantId, organizationId, grantInfo, and organizationProfile are required'
    });
  }

  try {
    logger.info('Auto-generating complete application', {
      grantId,
      organizationId
    });

    const sections = ['executive_summary', 'project_description', 'methodology', 'budget_justification', 'impact_statement', 'team_expertise'];
    const generatedSections: Array<{
      name: string;
      type: string;
      content: string;
      word_count: number;
      required: boolean;
      completed: boolean;
    }> = [];

    for (const sectionType of sections) {
      const prompt = `Generate a comprehensive ${sectionType.replace('_', ' ')} section for a grant application.

Grant Information:
- Title: ${grantInfo.title || 'Grant Application'}
- Funder: ${grantInfo.funder || 'Funding Organization'}
- Project Idea: ${projectIdea || 'Innovative research project'}

Organization Profile:
- Name: ${organizationProfile.name || 'Organization'}
- Type: ${organizationProfile.type || 'Organization'}

Please generate detailed, professional content for the ${sectionType} section.`;

      const content = await openaiService.generateText(prompt, {
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.7
      });

      generatedSections.push({
        name: sectionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: sectionType,
        content,
        word_count: content.split(/\s+/).length,
        required: true,
        completed: true
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info('Complete application generated successfully', {
      grantId,
      organizationId,
      sectionsCount: generatedSections.length,
      processingTime
    });

    res.json({
      sections: generatedSections,
      metadata: {
        generated_at: new Date().toISOString(),
        grant_id: grantId,
        organization_id: organizationId,
        total_words: generatedSections.reduce((sum, section) => sum + section.word_count, 0),
        completion_percentage: 100,
        processing_time: processingTime,
        ai_model: 'gpt-4o-mini'
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to generate complete application', {
      error: error instanceof Error ? error.message : String(error),
      grantId,
      organizationId,
      processingTime
    });

    res.status(500).json({
      error: 'Application generation failed',
      message: 'Unable to generate complete application',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/editor/analyze-organization:
 *   post:
 *     summary: Analyze organization data for relevant capabilities
 *     tags: [AI Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/analyze-organization', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { organizationId, website, documents } = req.body;

  if (!organizationId) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'organizationId is required'
    });
  }

  try {
    logger.info('Analyzing organization data', {
      organizationId,
      website: website ? 'provided' : 'not provided',
      documentsCount: documents?.length || 0
    });

    // For now, return mock analysis data
    // TODO: Implement actual website scraping and document analysis
    const analysisResult = {
      profile: {
        expertise: ['Artificial Intelligence', 'Machine Learning', 'Agricultural Technology'],
        facilities: ['High Performance Computing Lab', 'Agricultural Research Center'],
        track_record: 'Leading research institution with 150+ AI publications and €10M+ in research funding'
      },
      capabilities: {
        technical: ['Deep Learning', 'Computer Vision', 'Data Analytics', 'IoT Systems'],
        domain: ['Climate Modeling', 'Crop Prediction', 'Sustainable Agriculture'],
        infrastructure: ['GPU Clusters', 'Field Monitoring Equipment', 'Data Storage Systems']
      },
      experience: {
        recent_projects: [
          'EU Horizon 2020 Climate-Smart Agriculture (€2.5M, 2020-2023)',
          'SFI Frontiers for the Future: Precision Agriculture (€1.2M, 2019-2022)'
        ],
        collaborations: ['Teagasc', 'Irish Farmers Association', 'Met Éireann'],
        publications: 45
      }
    };

    const processingTime = Date.now() - startTime;

    logger.info('Organization analysis completed', {
      organizationId,
      processingTime
    });

    res.json(analysisResult);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to analyze organization', {
      error: error instanceof Error ? error.message : String(error),
      organizationId,
      processingTime
    });

    res.status(500).json({
      error: 'Organization analysis failed',
      message: 'Unable to analyze organization data',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/editor/health:
 *   get:
 *     summary: Check AI editor service health
 *     tags: [AI Editor]
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    // Test OpenAI connection
    let aiStatus = 'offline';
    try {
      await openaiService.generateText('Test', { max_tokens: 1 });
      aiStatus = 'online';
    } catch (error) {
      logger.warn('OpenAI service not available:', error);
    }

    // Test database connection
    let dbStatus = 'offline';
    try {
      await db.query('SELECT 1');
      dbStatus = 'online';
    } catch (error) {
      logger.warn('Database not available:', error);
    }

    const status = aiStatus === 'online' && dbStatus === 'online' ? 'healthy' : 'limited';

    res.json({
      status,
      services: {
        ai: aiStatus,
        database: dbStatus,
        vector: 'offline' // TODO: Add Pinecone health check
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      services: {
        ai: 'unknown',
        database: 'unknown',
        vector: 'unknown'
      },
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;