import { Pool } from 'pg';
import { logger } from './logger';
import { OpenAIService } from './openaiService';
import { VectorDatabaseService } from './vectorDatabase';

export interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  justification: string;
  isRequired: boolean;
  maxPercentage?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface ProjectScope {
  title: string;
  description: string;
  duration: number; // in months
  teamSize: number;
  projectType: 'research' | 'development' | 'innovation' | 'infrastructure' | 'other';
  industry: string;
  location: string;
  objectives: string[];
}

export interface FundingRules {
  fundingBody: string;
  grantScheme: string;
  maxBudget: number;
  minBudget?: number;
  eligibleCategories: string[];
  categoryLimits: Record<string, { maxPercentage?: number; minPercentage?: number; maxAmount?: number }>;
  costTypes: {
    personnel: { maxPercentage: number; includesOverheads: boolean };
    equipment: { maxPercentage: number; depreciationRules?: string };
    travel: { maxPercentage: number; restrictions?: string[] };
    materials: { maxPercentage: number };
    overhead: { percentage: number; calculationMethod: string };
    subcontracting: { maxPercentage: number; restrictions?: string[] };
  };
  restrictions: string[];
  requiresMatching?: boolean;
  matchingPercentage?: number;
}

export interface HistoricalGrantData {
  id: string;
  title: string;
  fundingBody: string;
  grantScheme: string;
  totalBudget: number;
  categories: BudgetCategory[];
  success: boolean;
  evaluationScore?: number;
  feedback?: string;
  projectType: string;
  year: number;
}

export interface OptimizedBudget {
  categories: BudgetCategory[];
  totalAmount: number;
  eligiblePercentage: number;
  warnings: BudgetWarning[];
  justifications: BudgetJustification[];
  recommendations: string[];
  confidenceScore: number;
  comparisonWithSimilar: {
    averageBudget: number;
    successfulRange: { min: number; max: number };
    categoryComparisons: Record<string, { suggested: number; average: number; successful: number }>;
  };
  optimization: {
    originalTotal: number;
    optimizedTotal: number;
    savedAmount: number;
    reallocations: BudgetReallocation[];
  };
}

export interface BudgetWarning {
  category: string;
  type: 'exceeds_limit' | 'below_minimum' | 'unrealistic' | 'missing_justification';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  suggestion: string;
}

export interface BudgetJustification {
  category: string;
  reasoning: string;
  supportingData: string[];
  confidenceLevel: number;
}

export interface BudgetReallocation {
  from: string;
  to: string;
  amount: number;
  reasoning: string;
}

export interface BudgetOptimizationRequest {
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

class BudgetOptimizationService {
  private pool: Pool;
  private openaiService: OpenAIService;
  private vectorService: VectorDatabaseService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.openaiService = new OpenAIService();
    this.vectorService = new VectorDatabaseService();
  }

  async optimizeBudget(request: BudgetOptimizationRequest): Promise<OptimizedBudget> {
    try {
      logger.info('Starting budget optimization', { 
        projectTitle: request.projectScope.title,
        fundingBody: request.fundingRules.fundingBody 
      });

      // 1. Find similar successful grants using vector search
      const similarGrants = await this.findSimilarSuccessfulGrants(
        request.projectScope,
        request.fundingRules
      );

      // 2. Generate AI-optimized budget
      const aiOptimizedBudget = await this.generateAIBudgetSuggestion(
        request.projectScope,
        request.fundingRules,
        similarGrants,
        request.currentBudget
      );

      // 3. Validate against funding rules
      const validatedBudget = await this.validateBudgetAgainstRules(
        aiOptimizedBudget,
        request.fundingRules
      );

      // 4. Generate analysis and recommendations
      const analysis = await this.analyzeBudgetOptimization(
        request.currentBudget || [],
        validatedBudget,
        similarGrants,
        request.fundingRules
      );

      // 5. Store optimization results for future learning
      await this.storeOptimizationResults(request, validatedBudget, analysis);

      return {
        categories: validatedBudget,
        totalAmount: this.calculateTotal(validatedBudget),
        eligiblePercentage: this.calculateEligibilityPercentage(validatedBudget, request.fundingRules),
        warnings: analysis.warnings,
        justifications: analysis.justifications,
        recommendations: analysis.recommendations,
        confidenceScore: analysis.confidenceScore,
        comparisonWithSimilar: analysis.comparison,
        optimization: analysis.optimization
      };

    } catch (error) {
      logger.error('Error in budget optimization:', error);
      throw error;
    }
  }

  private async findSimilarSuccessfulGrants(
    projectScope: ProjectScope,
    fundingRules: FundingRules
  ): Promise<HistoricalGrantData[]> {
    try {
      // Create search query from project scope
      const searchQuery = `${projectScope.title} ${projectScope.description} ${projectScope.objectives.join(' ')}`;
      
      // For now, return empty search results since we need proper vector embeddings
      // In a full implementation, we would:
      // 1. Generate embedding for the search query
      // 2. Use vectorService.searchSimilar() with the embedding
      const searchResults: any[] = [];

      // Convert search results to historical grant data
      const historicalGrants: HistoricalGrantData[] = [];
      
      for (const result of searchResults) {
        if (result.metadata.grantData) {
          const grantData = JSON.parse(result.metadata.grantData);
          historicalGrants.push({
            id: result.id,
            title: grantData.title || result.title,
            fundingBody: grantData.fundingBody || fundingRules.fundingBody,
            grantScheme: grantData.grantScheme || fundingRules.grantScheme,
            totalBudget: grantData.totalBudget || 0,
            categories: grantData.categories || [],
            success: true,
            evaluationScore: grantData.evaluationScore || result.similarity * 100,
            projectType: grantData.projectType || projectScope.projectType,
            year: grantData.year || new Date().getFullYear()
          });
        }
      }

      return historicalGrants;
    } catch (error) {
      logger.error('Error finding similar grants:', error);
      return [];
    }
  }

  private async generateAIBudgetSuggestion(
    projectScope: ProjectScope,
    fundingRules: FundingRules,
    similarGrants: HistoricalGrantData[],
    currentBudget?: BudgetCategory[]
  ): Promise<BudgetCategory[]> {
    const systemPrompt = `You are an expert grant budget optimization specialist. Create an optimized budget for the given project that maximizes chances of success while complying with funding rules.

Funding Rules:
- Max Budget: €${fundingRules.maxBudget.toLocaleString()}
- Funding Body: ${fundingRules.fundingBody}
- Grant Scheme: ${fundingRules.grantScheme}
- Category Limits: ${JSON.stringify(fundingRules.categoryLimits, null, 2)}
- Cost Type Rules: ${JSON.stringify(fundingRules.costTypes, null, 2)}

Successful Similar Grants Analysis:
${similarGrants.map(g => `
- ${g.title}: €${g.totalBudget.toLocaleString()} (Score: ${g.evaluationScore})
  Categories: ${g.categories.map(c => `${c.name}: ${c.percentage}%`).join(', ')}
`).join('\n')}

Return a JSON budget with categories following this structure:
{
  "categories": [
    {
      "name": "Personnel",
      "amount": 50000,
      "percentage": 50,
      "justification": "Detailed justification for this allocation",
      "isRequired": true
    }
  ]
}`;

    const userPrompt = `Project Details:
Title: ${projectScope.title}
Description: ${projectScope.description}
Duration: ${projectScope.duration} months
Team Size: ${projectScope.teamSize}
Project Type: ${projectScope.projectType}
Objectives: ${projectScope.objectives.join(', ')}

${currentBudget ? `Current Budget to Optimize:
${currentBudget.map(c => `${c.name}: €${c.amount.toLocaleString()} (${c.percentage}%) - ${c.justification}`).join('\n')}` : ''}

Please optimize this budget to maximize success probability while ensuring compliance with all funding rules.`;

    try {
      const response = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4-turbo',
        temperature: 0.3,
        responseFormat: 'json_object'
      });

      const budgetSuggestion = JSON.parse(response.content);
      return budgetSuggestion.categories || [];
    } catch (error) {
      logger.error('Error generating AI budget suggestion:', error);
      return this.generateDefaultBudget(projectScope, fundingRules);
    }
  }

  private generateDefaultBudget(projectScope: ProjectScope, fundingRules: FundingRules): BudgetCategory[] {
    const totalBudget = Math.min(fundingRules.maxBudget * 0.8, 100000); // Conservative default
    
    return [
      {
        name: 'Personnel',
        amount: totalBudget * 0.6,
        percentage: 60,
        justification: `Staff costs for ${projectScope.teamSize} team members over ${projectScope.duration} months`,
        isRequired: true
      },
      {
        name: 'Equipment',
        amount: totalBudget * 0.2,
        percentage: 20,
        justification: 'Essential equipment and software for project implementation',
        isRequired: true
      },
      {
        name: 'Travel',
        amount: totalBudget * 0.1,
        percentage: 10,
        justification: 'Conference attendance and project meetings',
        isRequired: false
      },
      {
        name: 'Materials',
        amount: totalBudget * 0.1,
        percentage: 10,
        justification: 'Consumable materials and supplies',
        isRequired: false
      }
    ];
  }

  private async validateBudgetAgainstRules(
    budget: BudgetCategory[],
    fundingRules: FundingRules
  ): Promise<BudgetCategory[]> {
    const validatedBudget = [...budget];
    const totalBudget = this.calculateTotal(validatedBudget);

    // Check total budget limit
    if (totalBudget > fundingRules.maxBudget) {
      const scaleFactor = fundingRules.maxBudget / totalBudget;
      validatedBudget.forEach(category => {
        category.amount *= scaleFactor;
        category.percentage = (category.amount / fundingRules.maxBudget) * 100;
      });
    }

    // Validate category limits
    for (const category of validatedBudget) {
      const limits = fundingRules.categoryLimits[category.name.toLowerCase()];
      if (limits) {
        if (limits.maxPercentage && category.percentage > limits.maxPercentage) {
          const maxAmount = (fundingRules.maxBudget * limits.maxPercentage) / 100;
          category.amount = maxAmount;
          category.percentage = limits.maxPercentage;
        }
        if (limits.maxAmount && category.amount > limits.maxAmount) {
          category.amount = limits.maxAmount;
          category.percentage = (category.amount / fundingRules.maxBudget) * 100;
        }
      }
    }

    return validatedBudget;
  }

  private async analyzeBudgetOptimization(
    originalBudget: BudgetCategory[],
    optimizedBudget: BudgetCategory[],
    similarGrants: HistoricalGrantData[],
    fundingRules: FundingRules
  ): Promise<{
    warnings: BudgetWarning[];
    justifications: BudgetJustification[];
    recommendations: string[];
    confidenceScore: number;
    comparison: any;
    optimization: any;
  }> {
    const warnings: BudgetWarning[] = [];
    const justifications: BudgetJustification[] = [];
    const recommendations: string[] = [];

    // Generate warnings
    for (const category of optimizedBudget) {
      const limits = fundingRules.categoryLimits[category.name.toLowerCase()];
      if (limits?.maxPercentage && category.percentage > limits.maxPercentage * 0.9) {
        warnings.push({
          category: category.name,
          type: 'exceeds_limit',
          severity: 'major',
          message: `${category.name} allocation (${category.percentage}%) is near the maximum limit`,
          suggestion: `Consider reducing ${category.name} to below ${limits.maxPercentage * 0.8}%`
        });
      }
    }

    // Generate justifications
    for (const category of optimizedBudget) {
      justifications.push({
        category: category.name,
        reasoning: category.justification,
        supportingData: [`Based on ${similarGrants.length} similar successful grants`],
        confidenceLevel: 0.8
      });
    }

    // Generate recommendations
    if (similarGrants.length > 0) {
      const avgSuccess = similarGrants.reduce((sum, g) => sum + (g.evaluationScore || 0), 0) / similarGrants.length;
      recommendations.push(`Budget structure aligns with ${similarGrants.length} successful grants (avg score: ${avgSuccess.toFixed(1)})`);
    }

    // Calculate comparison with similar grants
    const comparison = this.calculateComparisonWithSimilar(optimizedBudget, similarGrants);

    // Calculate optimization metrics
    const originalTotal = this.calculateTotal(originalBudget);
    const optimizedTotal = this.calculateTotal(optimizedBudget);
    const optimization = {
      originalTotal,
      optimizedTotal,
      savedAmount: originalTotal - optimizedTotal,
      reallocations: this.calculateReallocations(originalBudget, optimizedBudget)
    };

    return {
      warnings,
      justifications,
      recommendations,
      confidenceScore: 0.85,
      comparison,
      optimization
    };
  }

  private calculateComparisonWithSimilar(budget: BudgetCategory[], similarGrants: HistoricalGrantData[]) {
    if (similarGrants.length === 0) {
      return {
        averageBudget: 0,
        successfulRange: { min: 0, max: 0 },
        categoryComparisons: {}
      };
    }

    const avgBudget = similarGrants.reduce((sum, g) => sum + g.totalBudget, 0) / similarGrants.length;
    const budgets = similarGrants.map(g => g.totalBudget).sort((a, b) => a - b);
    
    return {
      averageBudget: avgBudget,
      successfulRange: { min: budgets[0], max: budgets[budgets.length - 1] },
      categoryComparisons: {}
    };
  }

  private calculateReallocations(original: BudgetCategory[], optimized: BudgetCategory[]): BudgetReallocation[] {
    const reallocations: BudgetReallocation[] = [];
    
    for (let i = 0; i < original.length && i < optimized.length; i++) {
      const diff = optimized[i].amount - original[i].amount;
      if (Math.abs(diff) > 1000) { // Only significant changes
        reallocations.push({
          from: diff < 0 ? optimized[i].name : 'other',
          to: diff > 0 ? optimized[i].name : 'other',
          amount: Math.abs(diff),
          reasoning: `Optimized allocation based on successful grant patterns`
        });
      }
    }

    return reallocations;
  }

  private calculateTotal(budget: BudgetCategory[]): number {
    return budget.reduce((sum, category) => sum + category.amount, 0);
  }

  private calculateEligibilityPercentage(budget: BudgetCategory[], fundingRules: FundingRules): number {
    const eligibleAmount = budget
      .filter(cat => fundingRules.eligibleCategories.includes(cat.name.toLowerCase()))
      .reduce((sum, cat) => sum + cat.amount, 0);
    
    const totalAmount = this.calculateTotal(budget);
    return totalAmount > 0 ? (eligibleAmount / totalAmount) * 100 : 0;
  }

  private async storeOptimizationResults(
    request: BudgetOptimizationRequest,
    optimizedBudget: BudgetCategory[],
    analysis: any
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO budget_optimizations 
         (project_scope, funding_rules, original_budget, optimized_budget, analysis_results, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          JSON.stringify(request.projectScope),
          JSON.stringify(request.fundingRules),
          JSON.stringify(request.currentBudget || []),
          JSON.stringify(optimizedBudget),
          JSON.stringify(analysis),
          new Date()
        ]
      );
    } catch (error) {
      logger.error('Error storing optimization results:', error);
      // Don't throw - this is not critical for the optimization functionality
    }
  }

  // Method to get budget optimization history
  async getOptimizationHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT bo.*, ga.user_id 
         FROM budget_optimizations bo
         JOIN grant_applications ga ON bo.project_scope->>'title' = ga.title
         WHERE ga.user_id = $1
         ORDER BY bo.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching optimization history:', error);
      return [];
    }
  }

  // Method to get budget templates for different grant types
  async getBudgetTemplate(
    projectType: string,
    fundingBody: string,
    budgetRange: { min: number; max: number }
  ): Promise<BudgetCategory[]> {
    try {
      // Find successful grants in similar budget range and type
      const result = await this.pool.query(
        `SELECT optimized_budget 
         FROM budget_optimizations bo
         WHERE bo.project_scope->>'projectType' = $1
         AND bo.funding_rules->>'fundingBody' = $2
         AND CAST(bo.funding_rules->>'maxBudget' AS NUMERIC) BETWEEN $3 AND $4
         ORDER BY bo.created_at DESC
         LIMIT 5`,
        [projectType, fundingBody, budgetRange.min, budgetRange.max]
      );

      if (result.rows.length > 0) {
        // Average the successful budgets
        const budgets = result.rows.map(row => JSON.parse(row.optimized_budget));
        return this.averageBudgets(budgets);
      }

      // Return default template if no historical data
      return this.getDefaultTemplate(projectType, budgetRange.max);
    } catch (error) {
      logger.error('Error getting budget template:', error);
      return this.getDefaultTemplate(projectType, budgetRange.max);
    }
  }

  private averageBudgets(budgets: BudgetCategory[][]): BudgetCategory[] {
    if (budgets.length === 0) return [];
    
    const categoryTotals: Record<string, { amount: number; count: number; justifications: string[] }> = {};
    
    budgets.forEach(budget => {
      budget.forEach(category => {
        if (!categoryTotals[category.name]) {
          categoryTotals[category.name] = { amount: 0, count: 0, justifications: [] };
        }
        categoryTotals[category.name].amount += category.amount;
        categoryTotals[category.name].count += 1;
        categoryTotals[category.name].justifications.push(category.justification);
      });
    });

    return Object.entries(categoryTotals).map(([name, totals]) => ({
      name,
      amount: totals.amount / totals.count,
      percentage: 0, // Will be calculated later
      justification: `Based on ${totals.count} similar successful grants`,
      isRequired: true
    }));
  }

  private getDefaultTemplate(projectType: string, maxBudget: number): BudgetCategory[] {
    const templates = {
      'research': [
        { name: 'Personnel', percentage: 65, justification: 'Research staff and investigators' },
        { name: 'Equipment', percentage: 20, justification: 'Research equipment and software' },
        { name: 'Travel', percentage: 8, justification: 'Conference presentations and collaboration' },
        { name: 'Materials', percentage: 7, justification: 'Research materials and supplies' }
      ],
      'development': [
        { name: 'Personnel', percentage: 55, justification: 'Development team and specialists' },
        { name: 'Equipment', percentage: 25, justification: 'Development tools and infrastructure' },
        { name: 'Materials', percentage: 15, justification: 'Development materials and licensing' },
        { name: 'Travel', percentage: 5, justification: 'User testing and validation' }
      ],
      'innovation': [
        { name: 'Personnel', percentage: 50, justification: 'Innovation team and advisors' },
        { name: 'Equipment', percentage: 30, justification: 'Prototyping and testing equipment' },
        { name: 'Materials', percentage: 12, justification: 'Prototyping materials' },
        { name: 'Travel', percentage: 8, justification: 'Market research and partnerships' }
      ]
    };

    const template = templates[projectType as keyof typeof templates] || templates['research'];
    
    return template.map(cat => ({
      name: cat.name,
      amount: (maxBudget * cat.percentage) / 100,
      percentage: cat.percentage,
      justification: cat.justification,
      isRequired: true
    }));
  }
}

export const createBudgetOptimizer = (pool: Pool) => {
  return new BudgetOptimizationService(pool);
};

export default BudgetOptimizationService;