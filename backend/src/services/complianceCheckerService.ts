import OpenAI from 'openai';
import { Pool } from 'pg';
import { logger } from './logger';
import { OpenAIService } from './openaiService';

export interface ComplianceRule {
  id: string;
  grantSchemeId: string;
  ruleCategory: string;
  ruleDescription: string;
  severity: 'critical' | 'major' | 'minor';
  automatedCheck: boolean;
  checkQuery?: any;
}

export interface ComplianceIssue {
  field: string;
  requirement: string;
  severity: 'critical' | 'major' | 'minor';
  suggestion: string;
  ruleId?: string;
}

export interface ComplianceReport {
  applicationId: string;
  overallScore: number;
  issues: ComplianceIssue[];
  suggestions: string[];
  checkedAt: Date;
  criticalIssuesCount: number;
  majorIssuesCount: number;
  minorIssuesCount: number;
}

export interface GrantApplication {
  id: string;
  grantSchemeId: string;
  sections: {
    [key: string]: {
      content: string;
      metadata?: any;
    };
  };
  budget?: {
    total: number;
    categories: Array<{
      name: string;
      amount: number;
      justification?: string;
    }>;
  };
  organizationProfile?: {
    type: string;
    size: string;
    location: string;
    yearsInOperation: number;
  };
}

class ComplianceCheckerService {
  private pool: Pool;
  private rulesCache: Map<string, ComplianceRule[]> = new Map();
  private openaiService: OpenAIService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.openaiService = new OpenAIService();
  }

  async checkCompliance(
    application: GrantApplication,
    grantSchemeId: string
  ): Promise<ComplianceReport> {
    try {
      logger.info(`Checking compliance for application ${application.id}`);

      // Get compliance rules for the grant scheme
      const rules = await this.getComplianceRules(grantSchemeId);

      // Use GPT-4 to check compliance
      const aiComplianceCheck = await this.performAIComplianceCheck(
        application,
        rules,
        grantSchemeId
      );

      // Perform automated rule-based checks
      const ruleBasedIssues = await this.performRuleBasedChecks(
        application,
        rules
      );

      // Merge AI and rule-based results
      const allIssues = [...aiComplianceCheck.issues, ...ruleBasedIssues];
      
      // Calculate overall score
      const overallScore = this.calculateComplianceScore(allIssues);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(allIssues, application);

      const report: ComplianceReport = {
        applicationId: application.id,
        overallScore,
        issues: allIssues,
        suggestions,
        checkedAt: new Date(),
        criticalIssuesCount: allIssues.filter(i => i.severity === 'critical').length,
        majorIssuesCount: allIssues.filter(i => i.severity === 'major').length,
        minorIssuesCount: allIssues.filter(i => i.severity === 'minor').length
      };

      // Store the compliance check results
      await this.storeComplianceResults(report, application.id);

      return report;
    } catch (error) {
      logger.error('Error checking compliance:', error);
      throw error;
    }
  }

  private async getComplianceRules(grantSchemeId: string): Promise<ComplianceRule[]> {
    // Check cache first
    if (this.rulesCache.has(grantSchemeId)) {
      return this.rulesCache.get(grantSchemeId)!;
    }

    try {
      const result = await this.pool.query(
        'SELECT * FROM compliance_rules WHERE grant_scheme_id = $1',
        [grantSchemeId]
      );

      const rules = result.rows.map(row => ({
        id: row.id,
        grantSchemeId: row.grant_scheme_id,
        ruleCategory: row.rule_category,
        ruleDescription: row.rule_description,
        severity: row.severity,
        automatedCheck: row.automated_check,
        checkQuery: row.check_query
      }));

      // Cache the rules
      this.rulesCache.set(grantSchemeId, rules);

      return rules;
    } catch (error) {
      logger.error('Error fetching compliance rules:', error);
      return [];
    }
  }

  private async performAIComplianceCheck(
    application: GrantApplication,
    rules: ComplianceRule[],
    grantSchemeId: string
  ): Promise<{ issues: ComplianceIssue[] }> {
    const systemPrompt = `You are an expert grant compliance checker. Check the application against these specific requirements and report any compliance issues.

Grant Scheme ID: ${grantSchemeId}

Compliance Rules:
${rules.map(r => `- ${r.ruleCategory}: ${r.ruleDescription} (Severity: ${r.severity})`).join('\n')}

Check for:
1. Missing required sections
2. Insufficient detail in responses
3. Budget compliance issues
4. Eligibility criteria violations
5. Word count/length requirements
6. Technical requirements compliance`;

    const userPrompt = `Please analyze this grant application for compliance issues:

Application Sections:
${JSON.stringify(application.sections, null, 2)}

Budget:
${JSON.stringify(application.budget, null, 2)}

Organization Profile:
${JSON.stringify(application.organizationProfile, null, 2)}`;

    try {
      const completion = await this.openaiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4-turbo',
        temperature: 0.3
      });

      // For now, return empty issues since we need to implement proper parsing
      // In a real implementation, we would parse the AI response for compliance issues
      const aiResponse = completion.content || '';
      
      // Simple parsing - in production, this would be more sophisticated
      const issues: ComplianceIssue[] = [];
      if (aiResponse.toLowerCase().includes('critical')) {
        issues.push({
          field: 'ai_analysis',
          requirement: 'AI detected potential compliance issues',
          severity: 'minor',
          suggestion: 'Please review the AI analysis for detailed feedback'
        });
      }

      return { issues };
    } catch (error) {
      logger.error('Error in AI compliance check:', error);
      return { issues: [] };
    }
  }

  private async performRuleBasedChecks(
    application: GrantApplication,
    rules: ComplianceRule[]
  ): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Check for missing required sections
    const requiredSections = ['executive_summary', 'methodology', 'budget_justification', 'impact'];
    for (const section of requiredSections) {
      if (!application.sections[section] || !application.sections[section].content?.trim()) {
        issues.push({
          field: section,
          requirement: `${section.replace(/_/g, ' ')} is required`,
          severity: 'critical',
          suggestion: `Please provide a complete ${section.replace(/_/g, ' ')} section`
        });
      }
    }

    // Check word counts
    const wordCountRequirements = {
      executive_summary: { min: 200, max: 500 },
      methodology: { min: 500, max: 2000 },
      impact: { min: 300, max: 1000 }
    };

    for (const [section, limits] of Object.entries(wordCountRequirements)) {
      const content = application.sections[section]?.content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      if (wordCount < limits.min) {
        issues.push({
          field: section,
          requirement: `Minimum ${limits.min} words required`,
          severity: 'major',
          suggestion: `Current word count: ${wordCount}. Please expand this section to meet the minimum requirement.`
        });
      } else if (wordCount > limits.max) {
        issues.push({
          field: section,
          requirement: `Maximum ${limits.max} words allowed`,
          severity: 'minor',
          suggestion: `Current word count: ${wordCount}. Please reduce this section to meet the maximum limit.`
        });
      }
    }

    // Check budget limits
    if (application.budget) {
      const budgetRules = rules.filter(r => r.ruleCategory === 'budget');
      for (const rule of budgetRules) {
        if (rule.checkQuery?.maxBudget && application.budget.total > rule.checkQuery.maxBudget) {
          issues.push({
            field: 'budget',
            requirement: `Budget must not exceed €${rule.checkQuery.maxBudget.toLocaleString()}`,
            severity: 'critical',
            suggestion: `Current budget: €${application.budget.total.toLocaleString()}. Please reduce the budget to meet the requirement.`,
            ruleId: rule.id
          });
        }
      }
    }

    return issues;
  }

  private calculateComplianceScore(issues: ComplianceIssue[]): number {
    let score = 100;
    
    // Deduct points based on issue severity
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'major':
          score -= 10;
          break;
        case 'minor':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private async generateSuggestions(
    issues: ComplianceIssue[],
    application: GrantApplication
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Group issues by field
    const issuesByField = issues.reduce((acc, issue) => {
      if (!acc[issue.field]) {
        acc[issue.field] = [];
      }
      acc[issue.field].push(issue);
      return acc;
    }, {} as Record<string, ComplianceIssue[]>);

    // Generate field-specific suggestions
    for (const [field, fieldIssues] of Object.entries(issuesByField)) {
      if (fieldIssues.some(i => i.severity === 'critical')) {
        suggestions.push(`Priority: Address critical issues in ${field} section immediately`);
      }
    }

    // Add general suggestions based on overall compliance
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) {
      suggestions.push(`You have ${criticalCount} critical compliance issues that must be resolved before submission`);
    }

    const score = this.calculateComplianceScore(issues);
    if (score < 70) {
      suggestions.push('Consider reviewing successful grant applications for this scheme to improve compliance');
    }

    return suggestions;
  }

  private async storeComplianceResults(
    report: ComplianceReport,
    applicationId: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Store each compliance check
      for (const issue of report.issues) {
        await client.query(
          `INSERT INTO compliance_checks 
           (application_id, rule_id, status, ai_confidence, details, checked_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            applicationId,
            issue.ruleId || null,
            'fail',
            0.9, // High confidence for rule-based checks
            JSON.stringify({
              field: issue.field,
              requirement: issue.requirement,
              suggestion: issue.suggestion
            }),
            report.checkedAt
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error storing compliance results:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Method to get recent compliance checks for an application
  async getRecentComplianceChecks(
    applicationId: string,
    limit: number = 5
  ): Promise<ComplianceReport[]> {
    try {
      const result = await this.pool.query(
        `SELECT DISTINCT checked_at, details 
         FROM compliance_checks 
         WHERE application_id = $1 
         ORDER BY checked_at DESC 
         LIMIT $2`,
        [applicationId, limit]
      );

      // Reconstruct compliance reports from stored data
      const reports: ComplianceReport[] = [];
      // Implementation details omitted for brevity

      return reports;
    } catch (error) {
      logger.error('Error fetching compliance checks:', error);
      return [];
    }
  }
}

export const createComplianceChecker = (pool: Pool) => {
  return new ComplianceCheckerService(pool);
};

export default ComplianceCheckerService;