import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth';
import { 
  createBudgetOptimizer, 
  BudgetOptimizationRequest, 
  ProjectScope, 
  FundingRules,
  BudgetCategory,
  OptimizedBudget 
} from '../services/budgetOptimizationService';
import { db } from '../services/database';
import { logger } from '../services/logger';

const router = Router();
const budgetOptimizer = createBudgetOptimizer(db.getPool());

// Rate limiting for AI operations
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 budget optimizations per windowMs
  message: {
    error: 'Too many budget optimization requests, please try again later.',
    retryAfter: 15 * 60
  }
});

interface OptimizeBudgetRequestBody {
  projectScope: ProjectScope;
  currentBudget?: BudgetCategory[];
  fundingRules: FundingRules;
  organizationProfile?: {
    type: string;
    size: string;
    previousGrants: number;
    successRate: number;
  };
  priorities?: string[];
}

interface BudgetTemplateRequest {
  projectType: string;
  fundingBody: string;
  budgetRange: { min: number; max: number };
}

// Optimize budget for a project
router.post('/optimize', authenticateToken, aiRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const requestData = req.body as OptimizeBudgetRequestBody;
    
    // Validate required fields
    if (!requestData.projectScope || !requestData.fundingRules) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectScope and fundingRules' 
      });
    }

    // Validate project scope
    const { projectScope, fundingRules } = requestData;
    if (!projectScope.title || !projectScope.description || !fundingRules.fundingBody) {
      return res.status(400).json({ 
        error: 'Invalid project scope or funding rules' 
      });
    }

    logger.info(`Optimizing budget for project: ${projectScope.title}`, { userId });

    // Create optimization request
    const optimizationRequest: BudgetOptimizationRequest = {
      projectScope,
      currentBudget: requestData.currentBudget,
      fundingRules,
      organizationProfile: requestData.organizationProfile,
      priorities: requestData.priorities
    };

    // Perform budget optimization
    const optimizedBudget = await budgetOptimizer.optimizeBudget(optimizationRequest);

    // Track AI usage
    await db.query(
      `INSERT INTO ai_grant_interactions 
       (application_id, interaction_type, model_used, processing_time_ms, created_at, interaction_metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'budget_optimization', // Use a placeholder since this might not be tied to a specific application
        'budget_optimization',
        'gpt-4-turbo',
        Date.now(), // This should be actual processing time
        new Date(),
        JSON.stringify({
          projectType: projectScope.projectType,
          fundingBody: fundingRules.fundingBody,
          budgetAmount: optimizedBudget.totalAmount
        })
      ]
    );

    res.json({
      success: true,
      data: optimizedBudget
    });

  } catch (error) {
    logger.error('Error in budget optimization:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get budget template for project type
router.post('/template', authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestData = req.body as BudgetTemplateRequest;
    
    if (!requestData.projectType || !requestData.fundingBody || !requestData.budgetRange) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectType, fundingBody, and budgetRange' 
      });
    }

    const template = await budgetOptimizer.getBudgetTemplate(
      requestData.projectType,
      requestData.fundingBody,
      requestData.budgetRange
    );

    res.json({
      success: true,
      data: {
        template,
        projectType: requestData.projectType,
        fundingBody: requestData.fundingBody,
        budgetRange: requestData.budgetRange
      }
    });

  } catch (error) {
    logger.error('Error getting budget template:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get budget optimization history for user
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const history = await budgetOptimizer.getOptimizationHistory(userId, limit);

    res.json({
      success: true,
      data: history.map(item => ({
        id: item.id,
        projectScope: item.project_scope,
        fundingRules: item.funding_rules,
        optimizedBudget: item.optimized_budget,
        analysisResults: item.analysis_results,
        createdAt: item.created_at
      }))
    });

  } catch (error) {
    logger.error('Error fetching budget optimization history:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Analyze existing budget for compliance and optimization opportunities
router.post('/analyze', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { budget, fundingRules, projectScope } = req.body;
    
    if (!budget || !fundingRules) {
      return res.status(400).json({ 
        error: 'Missing required fields: budget and fundingRules' 
      });
    }

    // Validate budget against funding rules
    const analysis = {
      complianceIssues: [] as any[],
      optimizationOpportunities: [] as any[],
      riskAssessment: [] as any[],
      recommendations: [] as string[]
    };

    const totalBudget = budget.reduce((sum: number, cat: BudgetCategory) => sum + cat.amount, 0);

    // Check total budget compliance
    if (totalBudget > fundingRules.maxBudget) {
      analysis.complianceIssues.push({
        type: 'budget_exceeded',
        severity: 'critical',
        message: `Total budget (€${totalBudget.toLocaleString()}) exceeds maximum allowed (€${fundingRules.maxBudget.toLocaleString()})`,
        suggestion: `Reduce total budget by €${(totalBudget - fundingRules.maxBudget).toLocaleString()}`
      });
    }

    // Check category limits
    for (const category of budget) {
      const categoryLimits = fundingRules.categoryLimits[category.name.toLowerCase()];
      if (categoryLimits) {
        if (categoryLimits.maxPercentage && category.percentage > categoryLimits.maxPercentage) {
          analysis.complianceIssues.push({
            type: 'category_exceeded',
            severity: 'major',
            category: category.name,
            message: `${category.name} (${category.percentage}%) exceeds maximum allowed (${categoryLimits.maxPercentage}%)`,
            suggestion: `Reduce ${category.name} to ${categoryLimits.maxPercentage}% or below`
          });
        }
      }
    }

    // Identify optimization opportunities
    const personnelCategory = budget.find((cat: BudgetCategory) => cat.name.toLowerCase().includes('personnel'));
    if (personnelCategory && personnelCategory.percentage > 70) {
      analysis.optimizationOpportunities.push({
        type: 'personnel_heavy',
        category: 'Personnel',
        message: 'Personnel costs are high relative to other categories',
        suggestion: 'Consider if some tasks could be automated or outsourced to reduce personnel costs'
      });
    }

    // Generate recommendations
    if (analysis.complianceIssues.length === 0) {
      analysis.recommendations.push('Budget is compliant with all funding rules');
    } else {
      analysis.recommendations.push(`Address ${analysis.complianceIssues.length} compliance issues before submission`);
    }

    if (analysis.optimizationOpportunities.length > 0) {
      analysis.recommendations.push('Consider the identified optimization opportunities to strengthen your proposal');
    }

    res.json({
      success: true,
      data: {
        analysis,
        totalBudget,
        complianceScore: Math.max(0, 100 - (analysis.complianceIssues.length * 15)),
        optimizationScore: Math.max(0, 100 - (analysis.optimizationOpportunities.length * 10))
      }
    });

  } catch (error) {
    logger.error('Error analyzing budget:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get budget statistics and insights
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Get budget optimization statistics
    const result = await db.query(
      `SELECT 
         COUNT(*) as total_optimizations,
         AVG(CAST(analysis_results->>'confidenceScore' AS FLOAT)) as avg_confidence,
         COUNT(CASE WHEN CAST(analysis_results->'optimization'->>'savedAmount' AS FLOAT) > 0 THEN 1 END) as optimizations_with_savings,
         AVG(CAST(analysis_results->'optimization'->>'savedAmount' AS FLOAT)) as avg_savings
       FROM budget_optimizations bo
       JOIN grant_applications ga ON bo.project_scope->>'title' = ga.title
       WHERE ga.user_id = $1
       AND bo.created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const stats = result.rows[0];

    // Get most common project types
    const projectTypesResult = await db.query(
      `SELECT 
         bo.project_scope->>'projectType' as project_type,
         COUNT(*) as count
       FROM budget_optimizations bo
       JOIN grant_applications ga ON bo.project_scope->>'title' = ga.title
       WHERE ga.user_id = $1
       GROUP BY bo.project_scope->>'projectType'
       ORDER BY count DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        totalOptimizations: parseInt(stats.total_optimizations) || 0,
        averageConfidence: parseFloat(stats.avg_confidence) || 0,
        optimizationsWithSavings: parseInt(stats.optimizations_with_savings) || 0,
        averageSavings: parseFloat(stats.avg_savings) || 0,
        commonProjectTypes: projectTypesResult.rows
      }
    });

  } catch (error) {
    logger.error('Error fetching budget optimization stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Compare budget with successful similar grants
router.post('/compare', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { budget, projectScope, fundingRules } = req.body;
    
    if (!budget || !projectScope || !fundingRules) {
      return res.status(400).json({ 
        error: 'Missing required fields: budget, projectScope, and fundingRules' 
      });
    }

    // This would typically use the vector database to find similar grants
    // For now, we'll provide a simplified comparison
    const totalBudget = budget.reduce((sum: number, cat: BudgetCategory) => sum + cat.amount, 0);
    
    const comparison = {
      totalBudget,
      averageForSimilar: fundingRules.maxBudget * 0.7, // Simulated average
      percentile: totalBudget <= fundingRules.maxBudget * 0.5 ? 25 : 
                 totalBudget <= fundingRules.maxBudget * 0.7 ? 50 :
                 totalBudget <= fundingRules.maxBudget * 0.9 ? 75 : 90,
      categoryComparison: budget.map((cat: BudgetCategory) => ({
        category: cat.name,
        yourPercentage: cat.percentage,
        averagePercentage: cat.name.toLowerCase().includes('personnel') ? 60 : 
                          cat.name.toLowerCase().includes('equipment') ? 25 : 10,
        recommendation: cat.percentage > (cat.name.toLowerCase().includes('personnel') ? 70 : 30) ? 
                       'Consider reducing' : 'Within normal range'
      })),
      riskLevel: totalBudget > fundingRules.maxBudget * 0.8 ? 'high' : 
                totalBudget > fundingRules.maxBudget * 0.6 ? 'medium' : 'low',
      successProbability: Math.max(20, Math.min(95, 
        100 - (totalBudget / fundingRules.maxBudget) * 30
      ))
    };

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    logger.error('Error comparing budget:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get funding rules for a specific grant scheme
router.get('/funding-rules/:grantScheme', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { grantScheme } = req.params;
    
    // Get funding rules from database or provide defaults
    const result = await db.query(
      'SELECT funding_rules FROM grant_schemes WHERE id = $1 OR name = $1',
      [grantScheme]
    );

    let fundingRules;
    if (result.rows.length > 0 && result.rows[0].funding_rules) {
      fundingRules = result.rows[0].funding_rules;
    } else {
      // Provide default funding rules
      fundingRules = {
        fundingBody: 'Generic',
        grantScheme: grantScheme,
        maxBudget: 100000,
        eligibleCategories: ['personnel', 'equipment', 'travel', 'materials'],
        categoryLimits: {
          personnel: { maxPercentage: 70 },
          equipment: { maxPercentage: 30 },
          travel: { maxPercentage: 15 },
          materials: { maxPercentage: 20 }
        },
        costTypes: {
          personnel: { maxPercentage: 70, includesOverheads: true },
          equipment: { maxPercentage: 30 },
          travel: { maxPercentage: 15 },
          materials: { maxPercentage: 20 },
          overhead: { percentage: 25, calculationMethod: 'direct_costs' },
          subcontracting: { maxPercentage: 25 }
        },
        restrictions: []
      };
    }

    res.json({
      success: true,
      data: fundingRules
    });

  } catch (error) {
    logger.error('Error fetching funding rules:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

export default router;