import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { DEMO_APPLICATIONS, DEMO_GRANTS, DEMO_USERS } from '../data/demoUsers';
import { OpenAIService } from '../services/openaiService';
import { logger } from '../services/logger';
import { Request, Response } from 'express';

interface ApplicationRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

const openaiService = new OpenAIService();

const router = express.Router();

/**
 * @swagger
 * /applications:
 *   get:
 *     summary: Get user's applications
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, draft, submitted, under_review, approved, rejected]
 *         description: Filter by application status
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 */
router.get('/', authenticateToken, asyncHandler(async (req: ApplicationRequest, res: Response) => {
  const { status } = req.query;
  
  // TODO: Get user ID from JWT token
  // For demo, return all applications
  let applications = [...DEMO_APPLICATIONS];

  // Apply status filter
  if (status && typeof status === 'string' && status !== 'all') {
    applications = applications.filter(app => app.status === status);
  }

  // Transform applications with grant data
  const applicationsResponse = applications.map(app => {
    const grant = DEMO_GRANTS.find(g => g.id === app.grantId);
    const user = DEMO_USERS.find(u => u.id === app.userId);
    
    return {
      id: app.id,
      grantTitle: grant?.title || 'Unknown Grant',
      grantProvider: grant?.provider || 'Unknown Provider',
      amount: app.fundingAmount,
      currency: 'EUR',
      status: app.status,
      deadline: grant?.deadline || new Date(),
      submittedDate: app.submittedDate,
      lastModified: app.lastModified,
      progress: app.progress,
      assignedTo: user?.name || 'Unknown User',
      notes: app.notes
    };
  });

  res.json({
    applications: applicationsResponse,
    total: applicationsResponse.length
  });
}));

/**
 * @swagger
 * /applications/{id}:
 *   get:
 *     summary: Get application by ID
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved successfully
 *       404:
 *         description: Application not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const application = DEMO_APPLICATIONS.find(app => app.id === id);
  
  if (!application) {
    return res.status(404).json({ message: 'Application not found' });
  }

  const grant = DEMO_GRANTS.find(g => g.id === application.grantId);
  const user = DEMO_USERS.find(u => u.id === application.userId);

  const response = {
    id: application.id,
    grantTitle: grant?.title || 'Unknown Grant',
    grantProvider: grant?.provider || 'Unknown Provider',
    amount: application.fundingAmount,
    currency: 'EUR',
    status: application.status,
    deadline: grant?.deadline || new Date(),
    submittedDate: application.submittedDate,
    lastModified: application.lastModified,
    progress: application.progress,
    assignedTo: user?.name || 'Unknown User',
    notes: application.notes,
    grant: grant ? {
      id: grant.id,
      title: grant.title,
      description: grant.description,
      provider: grant.provider,
      url: grant.url,
      eligibility: grant.eligibility
    } : null
  };

  res.json(response);
}));

/**
 * @swagger
 * /applications:
 *   post:
 *     summary: Create new application
 *     tags: [Applications]
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
 *               - fundingAmount
 *             properties:
 *               grantId:
 *                 type: string
 *               fundingAmount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application created successfully
 */
router.post('/', asyncHandler(async (req, res) => {
  const { grantId, fundingAmount, notes } = req.body;
  
  // TODO: Get user ID from JWT token
  const userId = 'user-1'; // Demo user ID
  
  const grant = DEMO_GRANTS.find(g => g.id === grantId);
  if (!grant) {
    return res.status(404).json({ message: 'Grant not found' });
  }

  const newApplication = {
    id: `app-${Date.now()}`,
    userId,
    grantId,
    organizationId: 'org-1', // TODO: Get from user
    status: 'draft' as const,
    lastModified: new Date(),
    progress: 10,
    notes,
    fundingAmount
  };

  // In a real app, this would be saved to database
  DEMO_APPLICATIONS.push(newApplication);

  res.status(201).json({
    message: 'Application created successfully',
    application: {
      id: newApplication.id,
      grantTitle: grant.title,
      grantProvider: grant.provider,
      amount: newApplication.fundingAmount,
      status: newApplication.status,
      progress: newApplication.progress
    }
  });
}));

/**
 * @swagger
 * /applications/{id}/ai-generate:
 *   post:
 *     summary: Generate AI content for application field
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fieldPath
 *             properties:
 *               fieldPath:
 *                 type: string
 *                 description: The field path to generate content for
 *               grantContext:
 *                 type: object
 *                 description: Grant details for context
 *               organizationProfile:
 *                 type: object
 *                 description: Organization profile for personalization
 *               existingData:
 *                 type: object
 *                 description: Existing application data for context
 *     responses:
 *       200:
 *         description: AI content generated successfully
 */
router.post('/:id/ai-generate', authenticateToken, asyncHandler(async (req: ApplicationRequest, res: Response) => {
  const userId = req.user?.id;
  const applicationId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { fieldPath, grantContext, organizationProfile, existingData } = req.body;

  if (!fieldPath) {
    return res.status(400).json({ error: 'Field path is required' });
  }

  const startTime = Date.now();

  try {
    // Create AI prompt based on field type and context
    const prompt = createAIPrompt(fieldPath, grantContext, organizationProfile, existingData);

    // Generate content using OpenAI
    const { content, usage } = await openaiService.chatCompletion([
      {
        role: 'system',
        content: 'You are an expert grant writer helping organizations create compelling grant applications. Generate professional, specific, and persuasive content that addresses grant requirements.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000
    });

    const processingTime = Date.now() - startTime;

    logger.info(`Generated AI content for field ${fieldPath} in ${processingTime}ms`);

    res.json({
      content: content.trim(),
      fieldPath,
      metadata: {
        processingTime,
        model: 'gpt-4o-mini',
        tokenUsage: usage,
        timestamp: new Date().toISOString()
      },
      status: 'success'
    });

  } catch (error) {
    logger.error('Error generating AI content:', error);
    res.status(500).json({ error: 'Failed to generate AI content' });
  }
}));

/**
 * @swagger
 * /applications/{id}/validate-requirements:
 *   post:
 *     summary: Validate application against grant requirements using AI
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/validate-requirements', authenticateToken, asyncHandler(async (req: ApplicationRequest, res: Response) => {
  const userId = req.user?.id;
  const applicationId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { grantRequirements, applicationData } = req.body;

  if (!grantRequirements || !applicationData) {
    return res.status(400).json({ error: 'Grant requirements and application data are required' });
  }

  try {
    // Validate each requirement using AI
    const validationResults = await Promise.all(
      grantRequirements.map(async (requirement: any) => {
        try {
          const prompt = `
            Analyze whether the following grant application data meets this specific requirement:
            
            Requirement: ${requirement.requirement}
            Category: ${requirement.category}
            Mandatory: ${requirement.mandatory}
            Description: ${requirement.description || 'No additional description'}
            
            Application Data: ${JSON.stringify(applicationData, null, 2)}
            
            Provide a JSON response with:
            {
              "meets_requirement": boolean,
              "confidence": number (0-100),
              "explanation": "string",
              "suggestions": ["string array of improvements"],
              "missing_information": ["string array of missing data"]
            }
          `;

          const { content } = await openaiService.chatCompletion([
            {
              role: 'system',
              content: 'You are an expert grant reviewer. Analyze grant applications objectively and provide constructive feedback.'
            },
            {
              role: 'user',
              content: prompt
            }
          ], {
            model: 'gpt-4o-mini',
            responseFormat: 'json_object',
            temperature: 0.3
          });

          const analysis = JSON.parse(content);

          return {
            requirementId: requirement.id,
            requirement: requirement.requirement,
            mandatory: requirement.mandatory,
            ...analysis
          };
        } catch (error) {
          logger.error(`Error validating requirement ${requirement.id}:`, error);
          return {
            requirementId: requirement.id,
            requirement: requirement.requirement,
            mandatory: requirement.mandatory,
            meets_requirement: false,
            confidence: 0,
            explanation: 'Unable to validate requirement due to processing error',
            suggestions: [],
            missing_information: []
          };
        }
      })
    );

    // Calculate overall completion score
    const totalRequirements = grantRequirements.length;
    const metRequirements = validationResults.filter(r => r.meets_requirement).length;
    const mandatoryRequirements = grantRequirements.filter((r: any) => r.mandatory).length;
    const metMandatoryRequirements = validationResults.filter(r => 
      r.mandatory && r.meets_requirement
    ).length;

    const overallScore = totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 0;
    const mandatoryScore = mandatoryRequirements > 0 ? 
      (metMandatoryRequirements / mandatoryRequirements) * 100 : 100;

    res.json({
      validationResults,
      summary: {
        overallScore: Math.round(overallScore),
        mandatoryScore: Math.round(mandatoryScore),
        totalRequirements,
        metRequirements,
        mandatoryRequirements,
        metMandatoryRequirements,
        readyForSubmission: mandatoryScore === 100 && overallScore >= 80
      },
      timestamp: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    logger.error('Error validating requirements:', error);
    res.status(500).json({ error: 'Failed to validate requirements' });
  }
}));

/**
 * @swagger
 * /applications/{id}/generate-checklist:
 *   post:
 *     summary: Generate AI-powered application checklist
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/generate-checklist', authenticateToken, asyncHandler(async (req: ApplicationRequest, res: Response) => {
  const userId = req.user?.id;
  const applicationId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { grantDetails, organizationProfile } = req.body;

  if (!grantDetails) {
    return res.status(400).json({ error: 'Grant details are required' });
  }

  try {
    const prompt = `
      Create a comprehensive application checklist for this grant opportunity:
      
      Grant Title: ${grantDetails.title}
      Funder: ${grantDetails.funder}
      Description: ${grantDetails.description}
      Requirements: ${JSON.stringify(grantDetails.requirements || [])}
      Categories: ${grantDetails.categories?.join(', ') || 'General'}
      
      Organization: ${organizationProfile?.name || 'Applicant Organization'}
      
      Generate a detailed checklist with specific, actionable items that the organization needs to complete.
      Include items for:
      1. Documentation requirements
      2. Eligibility verification
      3. Technical specifications
      4. Financial planning
      5. Timeline development
      6. Risk assessment
      7. Sustainability planning
      
      Return JSON format:
      {
        "checklist": [
          {
            "id": "unique_id",
            "category": "category_name",
            "item": "specific task description",
            "priority": "high" | "medium" | "low",
            "mandatory": boolean,
            "estimated_time": "time estimate in hours",
            "dependencies": ["array of other item IDs this depends on"],
            "description": "detailed explanation of what this involves"
          }
        ]
      }
    `;

    const { content } = await openaiService.chatCompletion([
      {
        role: 'system',
        content: 'You are an expert grant consultant who creates detailed application checklists. Be specific and practical.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      model: 'gpt-4o-mini',
      responseFormat: 'json_object',
      temperature: 0.5
    });

    const checklistData = JSON.parse(content);

    res.json({
      checklist: checklistData.checklist,
      applicationId,
      grantId: grantDetails.id,
      generatedAt: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    logger.error('Error generating checklist:', error);
    res.status(500).json({ error: 'Failed to generate checklist' });
  }
}));

// Helper function to create AI prompts based on field type
function createAIPrompt(
  fieldPath: string, 
  grantContext: any, 
  organizationProfile: any, 
  existingData: any
): string {
  const fieldPrompts: Record<string, string> = {
    'project_title': `
      Create a compelling project title for a grant application.
      Grant: ${grantContext?.title || 'Technology Innovation Grant'}
      Funder: ${grantContext?.funder || 'Government Agency'}
      Organization: ${organizationProfile?.name || 'Technology Company'}
      Focus Areas: ${grantContext?.categories?.join(', ') || 'Innovation, Technology'}
      
      The title should be:
      - Clear and descriptive
      - Professional yet engaging
      - Specific to the project scope
      - Aligned with grant objectives
      - 50-100 characters long
    `,
    
    'project_description': `
      Write a comprehensive project description for a grant application.
      Grant: ${grantContext?.title || 'Innovation Grant'}
      Organization: ${organizationProfile?.name || 'Organization'}
      Existing project title: ${existingData?.project_title || 'Innovation Project'}
      
      The description should include:
      - Clear problem statement
      - Innovative solution approach
      - Expected outcomes and impact
      - Alignment with grant objectives
      - Unique value proposition
      
      Write 3-4 paragraphs, approximately 400-500 words.
    `,
    
    'application_data.technical_approach': `
      Develop a detailed technical approach for this grant application.
      Project: ${existingData?.project_title || 'Technology Project'}
      Organization: ${organizationProfile?.name || 'Organization'}
      Grant Focus: ${grantContext?.categories?.join(', ') || 'Technology Innovation'}
      
      Include:
      - Methodology and frameworks
      - Technology stack and tools
      - Implementation phases
      - Quality assurance approach
      - Risk mitigation strategies
      
      Write 2-3 paragraphs, approximately 300-400 words.
    `,
    
    'application_data.sustainability_plan': `
      Create a sustainability plan for this grant-funded project.
      Project: ${existingData?.project_title || 'Innovation Project'}
      Organization: ${organizationProfile?.name || 'Organization'}
      Requested Amount: ${existingData?.requested_amount || 'Grant Amount'}
      
      Address:
      - Long-term financial sustainability
      - Resource requirements post-grant
      - Revenue generation strategies
      - Partnership development
      - Knowledge transfer and scaling
      
      Write 2-3 paragraphs, approximately 250-350 words.
    `
  };

  return fieldPrompts[fieldPath] || `
    Generate professional content for the field "${fieldPath}" in a grant application.
    Context: ${JSON.stringify({ grantContext, organizationProfile, existingData }, null, 2)}
    
    Provide relevant, specific, and compelling content that would strengthen the grant application.
  `;
}

export default router;