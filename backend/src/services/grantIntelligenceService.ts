import { OpenAIService } from './openaiService';
import { VectorDatabaseService } from './vectorDatabase';
import { db } from './database';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
import { firecrawlIntegrationService } from './firecrawlIntegrationService';

export interface GrantRequirement {
  id: string;
  grantId: string;
  requirementType: 'eligibility' | 'technical' | 'financial' | 'administrative';
  category?: string;
  requirementText: string;
  mandatory: boolean;
  weight: number;
  extractedCriteria: any[];
  validationRules: any;
  sourceSection?: string;
  confidenceScore: number;
}

export interface ComplianceAssessment {
  grantId: string;
  organizationId: string;
  overallScore: number;
  eligibilityStatus: 'eligible' | 'not_eligible' | 'partially_eligible';
  complianceResults: Record<string, any>;
  gapsIdentified: any[];
  recommendations: string[];
  strengths: string[];
}

export interface OrganizationIntelligence {
  organizationId: string;
  dataSource: string;
  intelligenceType: string;
  extractedData: any;
  summary: string;
  keywords: string[];
  relevanceTags: string[];
  confidenceScore: number;
}

export interface GrantMatch {
  grantId: string;
  organizationId: string;
  matchScore: number;
  matchReasons: string[];
  missingRequirements: string[];
  improvementSuggestions: string[];
  priorityLevel: 'high' | 'medium' | 'low';
}

export class GrantIntelligenceService {
  private openaiService: OpenAIService;
  private vectorService: VectorDatabaseService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.vectorService = new VectorDatabaseService();
  }

  /**
   * Extract grant requirements from grant document content
   */
  async extractGrantRequirements(
    grantId: string,
    documentContent: string,
    documentType: string = 'call_document'
  ): Promise<GrantRequirement[]> {
    try {
      logger.info('Extracting grant requirements', { grantId, documentType });

      const prompt = `Analyze this grant document and extract all requirements. Focus on:

1. **Eligibility Requirements**: Who can apply, organization types, location restrictions, sector requirements
2. **Technical Requirements**: Technical capabilities, expertise, infrastructure needed
3. **Financial Requirements**: Budget limits, co-funding, financial health requirements
4. **Administrative Requirements**: Documentation, certifications, compliance needs

Grant Document Content:
${documentContent.substring(0, 12000)}

Return ONLY a JSON object with this exact structure:
{
  "requirements": [
    {
      "text": "The exact requirement text from the document",
      "type": "eligibility|technical|financial|administrative",
      "category": "organization_type|location|sector|experience|budget|etc",
      "mandatory": true|false,
      "weight": 0.8,
      "criteria": ["specific", "measurable", "criteria"],
      "sourceSection": "section name or null",
      "confidence": 0.9
    }
  ]
}

Ensure every requirement has a non-empty "text" field with the actual requirement description.`;

      const messages = [{ role: 'user' as const, content: prompt }];
      const response = await this.openaiService.chatCompletion(messages, {
        model: 'gpt-4o',
        responseFormat: 'json_object',
        temperature: 0.3
      });

      const parsedRequirements = JSON.parse(response.content).requirements || [];
      
      const requirements: GrantRequirement[] = [];
      
      for (const req of parsedRequirements) {
        // Validate required fields
        if (!req.text || req.text.trim() === '') {
          logger.warn('Skipping requirement with empty text', { req });
          continue;
        }

        const requirementId = uuidv4();
        
        // Store in database
        await db.query(`
          INSERT INTO grant_requirements (
            id, grant_id, requirement_type, category, requirement_text,
            mandatory, weight, extracted_criteria, validation_rules,
            source_section, confidence_score, extracted_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          requirementId,
          grantId,
          req.type || 'eligibility',
          req.category || 'general',
          req.text.trim(),
          req.mandatory !== false,
          req.weight || 1.0,
          JSON.stringify(req.criteria || []),
          JSON.stringify(req.validationRules || {}),
          req.sourceSection || null,
          req.confidence || 0.8,
          'ai'
        ]);

        // Store in vector database for semantic search
        await this.openaiService.storeTextAsVector(
          req.text,
          {
            id: requirementId,
            type: 'grant',
            grantId,
            requirementType: req.type,
            category: req.category,
            content: req.text,
            title: `${req.type} requirement for grant ${grantId}`,
            source: 'ai_extraction',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          'grant_requirements'
        );

        requirements.push({
          id: requirementId,
          grantId,
          requirementType: req.type,
          category: req.category,
          requirementText: req.text,
          mandatory: req.mandatory !== false,
          weight: req.weight || 1.0,
          extractedCriteria: req.criteria || [],
          validationRules: req.validationRules || {},
          sourceSection: req.sourceSection,
          confidenceScore: req.confidence || 0.8
        });
      }

      logger.info(`Extracted ${requirements.length} requirements for grant ${grantId}`);
      return requirements;
    } catch (error) {
      logger.error('Failed to extract grant requirements:', error);
      throw error;
    }
  }

  /**
   * Assess organization compliance with grant requirements
   */
  async assessGrantCompliance(
    grantId: string,
    organizationId: string
  ): Promise<ComplianceAssessment> {
    try {
      logger.info('Assessing grant compliance', { grantId, organizationId });

      // Get grant requirements
      const requirementsResult = await db.query(`
        SELECT * FROM grant_requirements 
        WHERE grant_id = $1 
        ORDER BY mandatory DESC, weight DESC
      `, [grantId]);

      // Get organization intelligence
      const orgIntelResult = await db.query(`
        SELECT * FROM organization_intelligence 
        WHERE organization_id = $1
      `, [organizationId]);

      // Get organization capabilities
      const orgCapResult = await db.query(`
        SELECT * FROM organization_capabilities 
        WHERE organization_id = $1
      `, [organizationId]);

      const requirements = requirementsResult.rows;
      const orgIntelligence = orgIntelResult.rows;
      const orgCapabilities = orgCapResult.rows;

      // Prepare organization profile for analysis
      const orgProfile = {
        intelligence: orgIntelligence.map(i => ({
          type: i.intelligence_type,
          data: i.extracted_data,
          summary: i.summary
        })),
        capabilities: orgCapabilities.map(c => ({
          type: c.capability_type,
          name: c.capability_name,
          description: c.description
        }))
      };

      // Analyze compliance for each requirement
      const complianceResults: Record<string, any> = {};
      const gapsIdentified: any[] = [];
      const strengths: string[] = [];
      let totalScore = 0;
      let totalWeight = 0;

      for (const req of requirements) {
        const complianceCheck = await this.checkRequirementCompliance(
          req,
          orgProfile
        );

        complianceResults[req.id] = complianceCheck;
        
        if (complianceCheck.compliant) {
          totalScore += complianceCheck.score * req.weight;
          if (complianceCheck.score > 80) {
            strengths.push(complianceCheck.strength || req.requirement_text);
          }
        } else {
          // Only add gaps when NOT compliant
          if (req.mandatory) {
            gapsIdentified.push({
              requirement: req.requirement_text,
              type: req.requirement_type,
              gap: complianceCheck.gap,
              severity: 'high'
            });
          } else {
            gapsIdentified.push({
              requirement: req.requirement_text,
              type: req.requirement_type,
              gap: complianceCheck.gap,
              severity: 'medium'
            });
          }
        }
        
        totalWeight += req.weight;
      }

      const overallScore = totalWeight > 0 ? (totalScore / totalWeight) : 0;
      const hasMandatoryGaps = gapsIdentified.some(g => g.severity === 'high');
      
      const eligibilityStatus = hasMandatoryGaps ? 'not_eligible' : 
                               overallScore >= 70 ? 'eligible' : 'partially_eligible';

      // Generate recommendations
      const recommendations = await this.generateComplianceRecommendations(
        gapsIdentified,
        requirements,
        orgProfile
      );

      // Store assessment
      const assessmentId = uuidv4();
      await db.query(`
        INSERT INTO grant_compliance_assessments (
          id, grant_id, organization_id, assessment_status, overall_score,
          eligibility_status, compliance_results, gaps_identified,
          recommendations, strengths
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        assessmentId,
        grantId,
        organizationId,
        'completed',
        overallScore,
        eligibilityStatus,
        JSON.stringify(complianceResults),
        JSON.stringify(gapsIdentified),
        JSON.stringify(recommendations),
        JSON.stringify(strengths)
      ]);

      return {
        grantId,
        organizationId,
        overallScore,
        eligibilityStatus,
        complianceResults,
        gapsIdentified,
        recommendations,
        strengths
      };
    } catch (error) {
      logger.error('Failed to assess grant compliance:', error);
      throw error;
    }
  }

  /**
   * Extract organization intelligence from website or documents
   */
  async extractOrganizationIntelligence(
    organizationId: string,
    source: string,
    content: string,
    sourceType: 'website' | 'document' | 'linkedin' = 'website'
  ): Promise<OrganizationIntelligence[]> {
    try {
      logger.info('Extracting organization intelligence', { 
        organizationId, 
        sourceType,
        contentLength: content.length 
      });

      const prompt = `Analyze this ${sourceType} content and extract intelligence about the organization's:

1. **Technical Capabilities**: Technologies, tools, methodologies, patents
2. **Research Expertise**: Areas of expertise, publications, research projects
3. **Track Record**: Past projects, achievements, awards, success stories
4. **Infrastructure**: Facilities, equipment, labs, computing resources
5. **Partnerships**: Collaborations, industry connections, academic partnerships
6. **Team Expertise**: Key personnel, qualifications, experience
7. **Financial Strength**: Funding received, revenue, sustainability
8. **Impact & Outcomes**: Measurable results, societal impact, innovations

For each type of intelligence found, provide:
- Type of intelligence
- Extracted data points
- Summary of findings
- Relevant keywords
- Tags for grant matching
- Confidence score (0-1)

Content to analyze:
${content.substring(0, 10000)}

Return a JSON object with an array of intelligence findings.`;

      const messages = [{ role: 'user' as const, content: prompt }];
      const response = await this.openaiService.chatCompletion(messages, {
        model: 'gpt-4o-mini',
        responseFormat: 'json_object',
        temperature: 0.3
      });

      const intelligenceFindings = JSON.parse(response.content).findings || [];
      const results: OrganizationIntelligence[] = [];

      for (const finding of intelligenceFindings) {
        const intelligenceId = uuidv4();

        // Store in database
        await db.query(`
          INSERT INTO organization_intelligence (
            id, organization_id, data_source, source_url, intelligence_type,
            extracted_data, summary, keywords, relevance_tags, confidence_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          intelligenceId,
          organizationId,
          sourceType,
          source,
          finding.type,
          JSON.stringify(finding.data || {}),
          finding.summary,
          finding.keywords || [],
          finding.tags || [],
          finding.confidence || 0.7
        ]);

        // Store capabilities if found
        if (finding.type === 'capabilities' && finding.data.capabilities) {
          for (const cap of finding.data.capabilities) {
            await this.storeOrganizationCapability(
              organizationId,
              cap.type || 'technical',
              cap.name,
              cap.description,
              [source]
            );
          }
        }

        results.push({
          organizationId,
          dataSource: sourceType,
          intelligenceType: finding.type,
          extractedData: finding.data || {},
          summary: finding.summary,
          keywords: finding.keywords || [],
          relevanceTags: finding.tags || [],
          confidenceScore: finding.confidence || 0.7
        });
      }

      logger.info(`Extracted ${results.length} intelligence findings for organization ${organizationId}`);
      return results;
    } catch (error) {
      logger.error('Failed to extract organization intelligence:', error);
      throw error;
    }
  }

  /**
   * Match organizations to grants based on requirements and capabilities
   */
  async findGrantMatches(
    organizationId: string,
    minMatchScore: number = 60
  ): Promise<GrantMatch[]> {
    try {
      logger.info('Finding grant matches for organization', { organizationId, minMatchScore });

      // Get active grants
      const grantsResult = await db.query(`
        SELECT id, title, description, amount as funding_amount_max, deadline 
        FROM grants 
        WHERE is_active = true 
        ORDER BY deadline ASC NULLS LAST
      `);

      logger.info(`Found ${grantsResult.rows.length} active grants`);
      const matches: GrantMatch[] = [];

      // Simple matching for now - create matches for all grants with basic scoring
      for (const grant of grantsResult.rows) {
        try {
          // Simple scoring based on organization capabilities
          const orgCapabilities = await db.query(`
            SELECT capability_type, capability_name 
            FROM organization_capabilities 
            WHERE organization_id = $1
          `, [organizationId]);

          // Basic match score calculation
          let matchScore = 50; // Base score
          
          // Add points for having capabilities
          if (orgCapabilities.rows.length > 0) {
            matchScore += Math.min(orgCapabilities.rows.length * 10, 40);
          }

          if (matchScore >= minMatchScore) {
            const match: GrantMatch = {
              grantId: grant.id,
              organizationId,
              matchScore,
              matchReasons: ['Organization has relevant capabilities'],
              missingRequirements: [],
              improvementSuggestions: ['Continue developing capabilities'],
              priorityLevel: matchScore >= 85 ? 'high' : matchScore >= 70 ? 'medium' : 'low'
            };

            // Store match suggestion
            try {
              await db.query(`
                INSERT INTO grant_matching_suggestions (
                  organization_id, grant_id, match_score, match_reasons,
                  missing_requirements, improvement_suggestions, priority_level
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [
                organizationId,
                grant.id,
                match.matchScore,
                JSON.stringify(match.matchReasons),
                JSON.stringify(match.missingRequirements),
                JSON.stringify(match.improvementSuggestions),
                match.priorityLevel
              ]);
            } catch (dbError) {
              logger.warn('Failed to store match suggestion', { grantId: grant.id, error: dbError });
            }

            matches.push(match);
          }
        } catch (error) {
          logger.warn('Failed to process grant match', { 
            grantId: grant.id, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);

      logger.info(`Found ${matches.length} grant matches for organization ${organizationId}`);
      return matches;
    } catch (error) {
      logger.error('Failed to find grant matches:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async checkRequirementCompliance(
    requirement: any,
    orgProfile: any
  ): Promise<any> {
    try {
      const prompt = `Assess if this organization meets the following grant requirement:

Requirement:
- Type: ${requirement.requirement_type}
- Category: ${requirement.category || 'N/A'}
- Text: ${requirement.requirement_text}
- Criteria: ${JSON.stringify(requirement.extracted_criteria)}

Organization Profile:
${JSON.stringify(orgProfile, null, 2).substring(0, 4000)}

Provide:
1. Compliant: true/false
2. Score: 0-100 (how well they meet it)
3. Evidence: specific evidence from profile
4. Gap: what's missing if not compliant
5. Strength: if they exceed the requirement

Return as JSON.`;

      const messages = [{ role: 'user' as const, content: prompt }];
      const response = await this.openaiService.chatCompletion(messages, {
        model: 'gpt-4o-mini',
        responseFormat: 'json_object',
        temperature: 0.2
      });

      const result = JSON.parse(response.content);
      
      // Normalize field names to handle case variations
      return {
        compliant: result.compliant || result.Compliant || false,
        score: result.score || result.Score || 0,
        evidence: result.evidence || result.Evidence || null,
        gap: result.gap || result.Gap || null,
        strength: result.strength || result.Strength || null
      };
    } catch (error) {
      logger.error('Failed to check requirement compliance:', error);
      return {
        compliant: false,
        score: 0,
        gap: 'Unable to assess compliance',
        evidence: null
      };
    }
  }

  private async generateComplianceRecommendations(
    gaps: any[],
    requirements: any[],
    orgProfile: any
  ): Promise<string[]> {
    if (gaps.length === 0) {
      return ['Organization meets all requirements - focus on strengthening the application narrative'];
    }

    try {
      const prompt = `Based on these compliance gaps, provide specific recommendations:

Gaps Identified:
${JSON.stringify(gaps, null, 2)}

Grant Requirements:
${requirements.map(r => `- ${r.requirement_type}: ${r.requirement_text}`).join('\n')}

Organization Profile Summary:
${JSON.stringify(orgProfile, null, 2).substring(0, 2000)}

Provide 3-5 actionable recommendations to improve grant eligibility and compliance.
Focus on practical steps the organization can take.

Return as a JSON array of recommendation strings.`;

      const messages = [{ role: 'user' as const, content: prompt }];
      const response = await this.openaiService.chatCompletion(messages, {
        model: 'gpt-4o-mini',
        responseFormat: 'json_object',
        temperature: 0.4
      });

      const result = JSON.parse(response.content);
      return result.recommendations || ['Work on addressing identified compliance gaps'];
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return ['Review and address identified compliance gaps'];
    }
  }

  private async storeOrganizationCapability(
    organizationId: string,
    capabilityType: string,
    capabilityName: string,
    description: string,
    evidenceUrls: string[]
  ): Promise<void> {
    try {
      await db.query(`
        INSERT INTO organization_capabilities (
          organization_id, capability_type, capability_name, 
          description, evidence_urls
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (organization_id, capability_type, capability_name) 
        DO UPDATE SET 
          description = EXCLUDED.description,
          evidence_urls = array_cat(organization_capabilities.evidence_urls, EXCLUDED.evidence_urls),
          updated_at = NOW()
      `, [
        organizationId,
        capabilityType,
        capabilityName,
        description,
        evidenceUrls
      ]);
    } catch (error) {
      logger.error('Failed to store organization capability:', error);
    }
  }

  /**
   * Queue grant document for analysis
   */
  async queueGrantDocumentAnalysis(
    grantId: string,
    documentUrl: string,
    documentType: string = 'call_document',
    analysisType: string = 'requirements'
  ): Promise<string> {
    try {
      const queueId = uuidv4();
      
      await db.query(`
        INSERT INTO grant_document_analysis_queue (
          id, grant_id, document_url, document_type, 
          analysis_type, analysis_status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        queueId,
        grantId,
        documentUrl,
        documentType,
        analysisType,
        'pending'
      ]);

      logger.info('Queued grant document for analysis', {
        queueId,
        grantId,
        documentUrl,
        analysisType
      });

      return queueId;
    } catch (error) {
      logger.error('Failed to queue grant document:', error);
      throw error;
    }
  }

  /**
   * Process grant document analysis queue
   */
  async processAnalysisQueue(): Promise<void> {
    try {
      // Get pending items from queue
      const pendingResult = await db.query(`
        SELECT * FROM grant_document_analysis_queue
        WHERE analysis_status = 'pending'
        AND retry_count < 3
        ORDER BY created_at ASC
        LIMIT 5
      `);

      for (const item of pendingResult.rows) {
        await this.processQueueItem(item);
      }
    } catch (error) {
      logger.error('Failed to process analysis queue:', error);
    }
  }

  private async processQueueItem(item: any): Promise<void> {
    try {
      // Update status to processing
      await db.query(`
        UPDATE grant_document_analysis_queue
        SET analysis_status = 'processing',
            processing_started_at = NOW()
        WHERE id = $1
      `, [item.id]);

      // Fetch document content (would integrate with Firecrawl here)
      // For now, this is a placeholder
      const documentContent = await this.fetchDocumentContent(item.document_url);

      let extractedData: any = {};

      if (item.analysis_type === 'requirements') {
        const requirements = await this.extractGrantRequirements(
          item.grant_id,
          documentContent,
          item.document_type
        );
        extractedData = { requirements };
      }

      // Update with results
      await db.query(`
        UPDATE grant_document_analysis_queue
        SET analysis_status = 'completed',
            processing_completed_at = NOW(),
            extracted_data = $1
        WHERE id = $2
      `, [JSON.stringify(extractedData), item.id]);

    } catch (error) {
      logger.error('Failed to process queue item:', error);
      
      // Update with error
      await db.query(`
        UPDATE grant_document_analysis_queue
        SET analysis_status = 'failed',
            error_message = $1,
            retry_count = retry_count + 1
        WHERE id = $2
      `, [error instanceof Error ? error.message : 'Unknown error', item.id]);
    }
  }

  private async fetchDocumentContent(url: string): Promise<string> {
    // This would integrate with Firecrawl or other document fetching service
    // For now, return placeholder
    return `Grant document content from ${url}`;
  }

  /**
   * Scrape organization website and extract intelligence using Firecrawl
   */
  async scrapeAndAnalyzeOrganization(
    organizationId: string,
    websiteUrl: string,
    options: {
      maxPages?: number;
      includePdfs?: boolean;
      followLinks?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    pagesScraped: number;
    intelligenceExtracted: number;
    capabilitiesIdentified: number;
    scrapedPages: string[];
    error?: string;
  }> {
    try {
      logger.info('Starting organization website scraping and analysis', {
        organizationId,
        websiteUrl,
        options
      });

      const {
        maxPages = 5,
        includePdfs = true,
        followLinks = true
      } = options;

      // Start crawl job with Firecrawl
      const crawlResult = await firecrawlIntegrationService.crawlWebsite(websiteUrl, {
        maxPages,
        includePdfs,
        followInternalLinks: followLinks,
        excludePatterns: ['/privacy', '/terms', '/cookies', '/legal'],
        includePatterns: ['/about', '/team', '/research', '/products', '/services'],
        extractContacts: true,
        extractImages: false,
        extractMetadata: true
      });

      if (!crawlResult.success) {
        throw new Error(crawlResult.error || 'Crawl failed');
      }

      logger.info('Firecrawl completed successfully', {
        jobId: crawlResult.jobId,
        pagesScraped: crawlResult.pages?.length || 0
      });

      const scrapedPages: string[] = [];
      let intelligenceExtracted = 0;
      let capabilitiesIdentified = 0;

      // Process each scraped page for organization intelligence
      if (crawlResult.pages) {
        for (const page of crawlResult.pages) {
          scrapedPages.push(page.url);

          // Extract organization intelligence from page content
          if (page.content && page.content.trim().length > 100) {
            try {
              const intelligence = await this.extractOrganizationIntelligence(
                organizationId,
                page.url,
                page.content,
                'website'
              );

              intelligenceExtracted += intelligence.length;

              // Extract capabilities from intelligence findings
              for (const intel of intelligence) {
                if (intel.intelligenceType === 'technical_capabilities' || 
                    intel.intelligenceType === 'research_expertise') {
                  
                  // Store as organization capabilities
                  const capabilityId = uuidv4();
                  await db.query(`
                    INSERT INTO organization_capabilities (
                      id, organization_id, capability_type, capability_name,
                      description, proficiency_level, years_experience,
                      evidence_sources, keywords, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                  `, [
                    capabilityId,
                    organizationId,
                    intel.intelligenceType,
                    intel.summary.substring(0, 255),
                    intel.summary,
                    'advanced', // Default proficiency
                    null, // Years experience not specified
                    JSON.stringify([page.url]),
                    JSON.stringify(intel.keywords || [])
                  ]);

                  capabilitiesIdentified++;
                }
              }

              logger.info('Extracted intelligence from page', {
                url: page.url,
                intelligenceCount: intelligence.length
              });

            } catch (error) {
              logger.warn('Failed to extract intelligence from page', {
                url: page.url,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        }
      }

      // Note: Document processing would be added here if the crawl service returns documents

      logger.info('Organization scraping and analysis completed', {
        organizationId,
        pagesScraped: scrapedPages.length,
        intelligenceExtracted,
        capabilitiesIdentified
      });

      return {
        success: true,
        pagesScraped: scrapedPages.length,
        intelligenceExtracted,
        capabilitiesIdentified,
        scrapedPages
      };

    } catch (error) {
      logger.error('Organization scraping and analysis failed', {
        organizationId,
        websiteUrl,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        pagesScraped: 0,
        intelligenceExtracted: 0,
        capabilitiesIdentified: 0,
        scrapedPages: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Create singleton instance
export const grantIntelligenceService = new GrantIntelligenceService();

export default GrantIntelligenceService;