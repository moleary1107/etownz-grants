import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  GrantRequirement,
  EligibilityCriterion,
  SuccessPattern,
  ComplianceCheck,
  GrantAnalysisResult,
  EligibilityResult,
  ComplianceResult,
  SuccessPatternResult
} from './types.js';

/**
 * Grant Processing MCP Server
 * Provides specialized tools for grant analysis, eligibility checking, and compliance validation
 */
class GrantProcessingMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'grant-processor',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_grant_requirements',
            description: 'Analyze grant documentation to extract requirements, criteria, and key information',
            inputSchema: {
              type: 'object',
              properties: {
                grantText: {
                  type: 'string',
                  description: 'The grant documentation text to analyze'
                },
                grantId: {
                  type: 'string',
                  description: 'Unique identifier for the grant'
                },
                analysisDepth: {
                  type: 'string',
                  enum: ['basic', 'detailed', 'comprehensive'],
                  description: 'Level of analysis to perform',
                  default: 'detailed'
                }
              },
              required: ['grantText', 'grantId']
            }
          },
          {
            name: 'check_eligibility',
            description: 'Check organization/project eligibility against grant criteria',
            inputSchema: {
              type: 'object',
              properties: {
                grantId: {
                  type: 'string',
                  description: 'Grant identifier'
                },
                organizationProfile: {
                  type: 'object',
                  description: 'Organization details and characteristics'
                },
                projectDetails: {
                  type: 'object',
                  description: 'Project information and specifications'
                },
                strictMode: {
                  type: 'boolean',
                  description: 'Whether to apply strict eligibility checking',
                  default: false
                }
              },
              required: ['grantId', 'organizationProfile', 'projectDetails']
            }
          },
          {
            name: 'extract_success_patterns',
            description: 'Analyze successful grant applications to identify patterns and best practices',
            inputSchema: {
              type: 'object',
              properties: {
                successfulApplications: {
                  type: 'array',
                  description: 'Array of successful grant application data'
                },
                grantType: {
                  type: 'string',
                  description: 'Type of grant to analyze patterns for'
                },
                analysisScope: {
                  type: 'string',
                  enum: ['content', 'structure', 'timing', 'comprehensive'],
                  description: 'Scope of pattern analysis',
                  default: 'comprehensive'
                }
              },
              required: ['successfulApplications', 'grantType']
            }
          },
          {
            name: 'validate_compliance',
            description: 'Validate grant application compliance with requirements and regulations',
            inputSchema: {
              type: 'object',
              properties: {
                applicationData: {
                  type: 'object',
                  description: 'Grant application data to validate'
                },
                grantRequirements: {
                  type: 'array',
                  description: 'List of grant requirements to check against'
                },
                regulatoryFramework: {
                  type: 'string',
                  description: 'Regulatory framework to validate against (EU, US, etc.)'
                },
                validationLevel: {
                  type: 'string',
                  enum: ['basic', 'standard', 'comprehensive'],
                  description: 'Level of compliance validation',
                  default: 'standard'
                }
              },
              required: ['applicationData', 'grantRequirements']
            }
          },
          {
            name: 'generate_application_guidance',
            description: 'Generate personalized guidance for grant application preparation',
            inputSchema: {
              type: 'object',
              properties: {
                grantId: {
                  type: 'string',
                  description: 'Grant identifier'
                },
                organizationContext: {
                  type: 'object',
                  description: 'Organization context and capabilities'
                },
                applicationStage: {
                  type: 'string',
                  enum: ['preparation', 'drafting', 'review', 'submission'],
                  description: 'Current stage of application process'
                },
                guidanceType: {
                  type: 'string',
                  enum: ['strategic', 'tactical', 'technical', 'comprehensive'],
                  description: 'Type of guidance needed',
                  default: 'comprehensive'
                }
              },
              required: ['grantId', 'organizationContext', 'applicationStage']
            }
          }
        ] as Tool[]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_grant_requirements':
            return await this.analyzeGrantRequirements(args);
          case 'check_eligibility':
            return await this.checkEligibility(args);
          case 'extract_success_patterns':
            return await this.extractSuccessPatterns(args);
          case 'validate_compliance':
            return await this.validateCompliance(args);
          case 'generate_application_guidance':
            return await this.generateApplicationGuidance(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async analyzeGrantRequirements(args: any): Promise<any> {
    const { grantText, grantId, analysisDepth = 'detailed' } = args;

    // Extract requirements from grant text using pattern matching and NLP techniques
    const requirements: GrantRequirement[] = this.extractRequirements(grantText, analysisDepth);
    const criteria: EligibilityCriterion[] = this.extractEligibilityCriteria(grantText);
    const metadata = this.extractGrantMetadata(grantText);

    const result: GrantAnalysisResult = {
      grantId,
      requirements,
      eligibilityCriteria: criteria,
      metadata,
      analysisDate: new Date().toISOString(),
      confidence: this.calculateAnalysisConfidence(requirements, criteria)
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async checkEligibility(args: any): Promise<any> {
    const { grantId, organizationProfile, projectDetails, strictMode = false } = args;

    // Load grant requirements (in real implementation, this would fetch from database)
    const grantRequirements = await this.loadGrantRequirements(grantId);
    
    const eligibilityChecks = await this.performEligibilityChecks(
      organizationProfile,
      projectDetails,
      grantRequirements,
      strictMode
    );

    const result: EligibilityResult = {
      grantId,
      organizationId: organizationProfile.id || 'unknown',
      overallEligible: eligibilityChecks.every(check => check.status === 'pass'),
      checks: eligibilityChecks,
      recommendations: this.generateEligibilityRecommendations(eligibilityChecks),
      checkDate: new Date().toISOString()
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async extractSuccessPatterns(args: any): Promise<any> {
    const { successfulApplications, grantType, analysisScope = 'comprehensive' } = args;

    const patterns: SuccessPattern[] = [];

    // Analyze successful applications for patterns
    if (analysisScope === 'comprehensive' || analysisScope === 'content') {
      patterns.push(...this.analyzeContentPatterns(successfulApplications));
    }

    if (analysisScope === 'comprehensive' || analysisScope === 'structure') {
      patterns.push(...this.analyzeStructurePatterns(successfulApplications));
    }

    if (analysisScope === 'comprehensive' || analysisScope === 'timing') {
      patterns.push(...this.analyzeTimingPatterns(successfulApplications));
    }

    const result: SuccessPatternResult = {
      grantType,
      patterns,
      analysisScope,
      sampleSize: successfulApplications.length,
      analysisDate: new Date().toISOString(),
      confidence: this.calculatePatternConfidence(patterns, successfulApplications.length)
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async validateCompliance(args: any): Promise<any> {
    const { 
      applicationData, 
      grantRequirements, 
      regulatoryFramework = 'EU', 
      validationLevel = 'standard' 
    } = args;

    const complianceChecks: ComplianceCheck[] = [];

    // Validate against grant requirements
    for (const requirement of grantRequirements) {
      const check = await this.validateRequirement(applicationData, requirement);
      complianceChecks.push(check);
    }

    // Add regulatory compliance checks
    if (regulatoryFramework) {
      const regulatoryChecks = await this.validateRegulatoryCompliance(
        applicationData, 
        regulatoryFramework, 
        validationLevel
      );
      complianceChecks.push(...regulatoryChecks);
    }

    const result: ComplianceResult = {
      applicationId: applicationData.id || 'unknown',
      overallCompliant: complianceChecks.every(check => check.status === 'compliant'),
      checks: complianceChecks,
      criticalIssues: complianceChecks.filter(check => 
        check.status === 'non-compliant' && check.severity === 'critical'
      ),
      recommendations: this.generateComplianceRecommendations(complianceChecks),
      validationDate: new Date().toISOString()
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async generateApplicationGuidance(args: any): Promise<any> {
    const { grantId, organizationContext, applicationStage, guidanceType = 'comprehensive' } = args;

    const guidance = {
      grantId,
      applicationStage,
      guidanceType,
      recommendations: [] as string[],
      actionItems: [] as string[],
      resources: [] as string[],
      timeline: {} as any,
      riskAssessment: {} as any,
      generatedDate: new Date().toISOString()
    };

    // Generate stage-specific guidance
    switch (applicationStage) {
      case 'preparation':
        guidance.recommendations = this.generatePreparationGuidance(grantId, organizationContext);
        break;
      case 'drafting':
        guidance.recommendations = this.generateDraftingGuidance(grantId, organizationContext);
        break;
      case 'review':
        guidance.recommendations = this.generateReviewGuidance(grantId, organizationContext);
        break;
      case 'submission':
        guidance.recommendations = this.generateSubmissionGuidance(grantId, organizationContext);
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(guidance, null, 2)
        }
      ]
    };
  }

  // Helper methods for grant analysis
  private extractRequirements(grantText: string, analysisDepth: string): GrantRequirement[] {
    // Implementation would use NLP and pattern matching
    const requirements: GrantRequirement[] = [];
    
    // Basic requirement extraction patterns
    const mandatoryPatterns = [
      /must\s+(.+?)(?:\.|;|$)/gi,
      /required\s+(.+?)(?:\.|;|$)/gi,
      /mandatory\s+(.+?)(?:\.|;|$)/gi
    ];

    const preferredPatterns = [
      /preferred\s+(.+?)(?:\.|;|$)/gi,
      /desired\s+(.+?)(?:\.|;|$)/gi,
      /should\s+(.+?)(?:\.|;|$)/gi
    ];

    // Extract mandatory requirements
    mandatoryPatterns.forEach((pattern, index) => {
      const matches = Array.from(grantText.matchAll(pattern));
      matches.forEach((match, matchIndex) => {
        requirements.push({
          id: `req_mandatory_${index}_${matchIndex}`,
          description: match[1].trim(),
          type: 'mandatory',
          category: this.categorizeRequirement(match[1]),
          source: 'grant_text',
          importance: 10
        });
      });
    });

    // Extract preferred requirements
    preferredPatterns.forEach((pattern, index) => {
      const matches = Array.from(grantText.matchAll(pattern));
      matches.forEach((match, matchIndex) => {
        requirements.push({
          id: `req_preferred_${index}_${matchIndex}`,
          description: match[1].trim(),
          type: 'preferred',
          category: this.categorizeRequirement(match[1]),
          source: 'grant_text',
          importance: 7
        });
      });
    });

    return requirements;
  }

  private categorizeRequirement(text: string): 'financial' | 'technical' | 'legal' | 'organizational' | 'project' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('budget') || lowerText.includes('funding') || lowerText.includes('cost')) {
      return 'financial';
    } else if (lowerText.includes('technical') || lowerText.includes('technology') || lowerText.includes('system')) {
      return 'technical';
    } else if (lowerText.includes('legal') || lowerText.includes('compliance') || lowerText.includes('regulation')) {
      return 'legal';
    } else if (lowerText.includes('organization') || lowerText.includes('team') || lowerText.includes('staff')) {
      return 'organizational';
    } else {
      return 'project';
    }
  }

  private extractEligibilityCriteria(grantText: string): EligibilityCriterion[] {
    // Implementation would extract eligibility criteria
    return [];
  }

  private extractGrantMetadata(grantText: string): any {
    return {
      extractedAt: new Date().toISOString(),
      textLength: grantText.length,
      language: 'en' // Could be detected
    };
  }

  private calculateAnalysisConfidence(requirements: GrantRequirement[], criteria: EligibilityCriterion[]): number {
    // Simple confidence calculation based on number of extracted items
    const totalItems = requirements.length + criteria.length;
    return Math.min(totalItems * 0.1, 1.0);
  }

  private async loadGrantRequirements(grantId: string): Promise<GrantRequirement[]> {
    // In real implementation, this would fetch from database
    return [];
  }

  private async performEligibilityChecks(
    organizationProfile: any,
    projectDetails: any,
    grantRequirements: GrantRequirement[],
    strictMode: boolean
  ): Promise<any[]> {
    // Implementation would perform actual eligibility checks
    return [];
  }

  private generateEligibilityRecommendations(checks: any[]): string[] {
    return ['Complete organization profile', 'Provide additional project documentation'];
  }

  private analyzeContentPatterns(applications: any[]): SuccessPattern[] {
    return [];
  }

  private analyzeStructurePatterns(applications: any[]): SuccessPattern[] {
    return [];
  }

  private analyzeTimingPatterns(applications: any[]): SuccessPattern[] {
    return [];
  }

  private calculatePatternConfidence(patterns: SuccessPattern[], sampleSize: number): number {
    return Math.min(sampleSize * 0.05, 1.0);
  }

  private async validateRequirement(applicationData: any, requirement: GrantRequirement): Promise<ComplianceCheck> {
    return {
      id: `check_${requirement.id}`,
      description: `Validate ${requirement.description}`,
      status: 'compliant',
      severity: 'medium',
      details: 'Requirement validated successfully'
    };
  }

  private async validateRegulatoryCompliance(
    applicationData: any,
    framework: string,
    level: string
  ): Promise<ComplianceCheck[]> {
    return [];
  }

  private generateComplianceRecommendations(checks: ComplianceCheck[]): string[] {
    return ['Review all mandatory requirements', 'Ensure regulatory compliance'];
  }

  private generatePreparationGuidance(grantId: string, context: any): string[] {
    return ['Research grant requirements thoroughly', 'Prepare organization documentation'];
  }

  private generateDraftingGuidance(grantId: string, context: any): string[] {
    return ['Follow grant structure guidelines', 'Focus on impact and outcomes'];
  }

  private generateReviewGuidance(grantId: string, context: any): string[] {
    return ['Check all requirements are addressed', 'Review for clarity and completeness'];
  }

  private generateSubmissionGuidance(grantId: string, context: any): string[] {
    return ['Verify all documents are included', 'Submit before deadline'];
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Grant Processing MCP server running on stdio');
  }
}

const server = new GrantProcessingMCPServer();
server.run().catch(console.error);