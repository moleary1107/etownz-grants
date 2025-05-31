import OpenAI from 'openai'
import { DiscoveredGrant, GrantSource, EligibilityRequirement, OrganizationProfile, EligibilityMatch, EligibilityScore } from '../types/grants'
import { logger } from '../utils/logger'

export class GrantAnalysisService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
  }

  async extractGrantsFromPage(content: string, url: string, source: GrantSource): Promise<DiscoveredGrant[]> {
    try {
      const prompt = this.buildExtractionPrompt(content, source)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a grant discovery AI assistant. Your job is to extract detailed grant information from web content and format it as structured JSON data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })

      const result = response.choices[0]?.message?.content
      if (!result) {
        logger.warning('No response from OpenAI for grant extraction', { url })
        return []
      }

      // Parse the JSON response
      const extractedData = this.parseExtractionResult(result)
      
      // Convert to DiscoveredGrant objects
      const grants = this.convertToDiscoveredGrants(extractedData, url, source)
      
      logger.info(`Extracted ${grants.length} grants from page`, { url })
      return grants

    } catch (error) {
      logger.error('Error extracting grants from page', { url, error })
      return []
    }
  }

  async extractGrantsFromDocument(content: string, url: string, documentType: 'pdf' | 'docx'): Promise<DiscoveredGrant[]> {
    // Similar to page extraction but optimized for document content
    try {
      const prompt = this.buildDocumentExtractionPrompt(content, documentType)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis AI. Extract grant information from document content with high precision.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })

      const result = response.choices[0]?.message?.content
      if (!result) return []

      const extractedData = this.parseExtractionResult(result)
      return this.convertDocumentToGrants(extractedData, url, documentType)

    } catch (error) {
      logger.error('Error extracting grants from document', { url, documentType, error })
      return []
    }
  }

  async checkEligibility(grant: DiscoveredGrant, organization: OrganizationProfile): Promise<EligibilityMatch> {
    try {
      const prompt = this.buildEligibilityPrompt(grant, organization)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert grant eligibility analyst. Analyze how well an organization matches grant requirements and provide detailed scoring and recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      })

      const result = response.choices[0]?.message?.content
      if (!result) {
        throw new Error('No response from OpenAI for eligibility check')
      }

      return this.parseEligibilityResult(result, grant.id, organization.id)

    } catch (error) {
      logger.error('Error checking eligibility', { grantId: grant.id, orgId: organization.id, error })
      
      // Return a default match with low score
      return {
        grantId: grant.id,
        organizationId: organization.id,
        overallScore: 0,
        matches: [],
        reasons: ['Error occurred during eligibility analysis'],
        recommendations: ['Please review manually'],
        matchedAt: new Date()
      }
    }
  }

  private buildExtractionPrompt(content: string, source: GrantSource): string {
    return `
Extract grant information from the following web content. The content is from ${source.name} (${source.category}) located in ${source.location}.

CONTENT:
${content.substring(0, 8000)} // Limit content to avoid token limits

INSTRUCTIONS:
1. Identify all grants, funding opportunities, or financial support programs mentioned
2. For each grant, extract:
   - Title (exact name)
   - Description (comprehensive summary)
   - Provider/Organization offering the grant
   - Amount (min/max if range, or single amount)
   - Currency (EUR, USD, etc.)
   - Deadline (if mentioned)
   - Location/Geographic scope
   - Eligibility requirements (who can apply)
   - Category/Type of grant
   - Application URL or contact information
   - Any PDF/document links

3. Return as JSON array with this structure:
[
  {
    "title": "Grant Name",
    "description": "Detailed description",
    "provider": "Organization Name",
    "amount": {
      "min": 1000,
      "max": 50000,
      "currency": "EUR",
      "description": "Up to €50,000"
    },
    "deadline": "2024-12-31",
    "location": "Ireland",
    "eligibility": [
      {
        "type": "sector",
        "condition": "in",
        "value": ["Technology", "Healthcare"],
        "description": "Must be in tech or healthcare sector"
      }
    ],
    "category": "Innovation",
    "applicationUrl": "https://...",
    "documentUrls": ["https://example.com/guidelines.pdf"],
    "tags": ["innovation", "startup", "sme"]
  }
]

4. Only include legitimate grants/funding opportunities, not general information
5. If no grants found, return empty array []
6. Be precise with amounts, dates, and requirements
`
  }

  private buildEligibilityPrompt(grant: DiscoveredGrant, organization: OrganizationProfile): string {
    return `
Analyze eligibility match between this organization and grant:

ORGANIZATION:
- Name: ${organization.name}
- Sector: ${organization.sector}
- Location: ${organization.location}
- Size: ${organization.size}
- Year Established: ${organization.yearEstablished || 'Unknown'}
- Annual Revenue: ${organization.annualRevenue || 'Unknown'}
- Employee Count: ${organization.employeeCount || 'Unknown'}
- Description: ${organization.description}
- Keywords: ${organization.keywords.join(', ')}

GRANT:
- Title: ${grant.title}
- Provider: ${grant.provider}
- Description: ${grant.description}
- Amount: ${grant.amount.min || 0} - ${grant.amount.max || 0} ${grant.amount.currency}
- Location: ${grant.location}
- Category: ${grant.category}
- Eligibility Requirements: ${JSON.stringify(grant.eligibility)}

TASK:
Analyze how well this organization matches the grant requirements. Provide:

1. Overall eligibility score (0-100)
2. Detailed analysis for each requirement
3. Reasons why they match/don't match
4. Recommendations for improving eligibility
5. Key strengths and weaknesses

Return as JSON:
{
  "overallScore": 85,
  "matches": [
    {
      "requirement": {...},
      "score": 90,
      "reasoning": "Organization matches sector requirement perfectly",
      "matched": true
    }
  ],
  "reasons": ["Strong match in technology sector", "Location aligns with grant scope"],
  "recommendations": ["Consider highlighting AI capabilities", "Prepare revenue documentation"],
  "strengths": ["Perfect sector match", "Appropriate company size"],
  "weaknesses": ["Limited track record in grants", "May need more documentation"]
}
`
  }

  private buildDocumentExtractionPrompt(content: string, documentType: string): string {
    return `
Extract grant information from this ${documentType.toUpperCase()} document content:

${content.substring(0, 10000)}

Focus on:
1. Official grant programs and funding schemes
2. Application deadlines and requirements
3. Funding amounts and criteria
4. Contact information and application processes

Return as JSON array following the same format as web content extraction.
`
  }

  private parseExtractionResult(result: string): any[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // If no JSON array found, try to parse the entire result
      return JSON.parse(result)
    } catch (error) {
      logger.warning('Failed to parse extraction result as JSON', { result, error })
      return []
    }
  }

  private parseEligibilityResult(result: string, grantId: string, organizationId: string): EligibilityMatch {
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result)
      
      return {
        grantId,
        organizationId,
        overallScore: parsed.overallScore || 0,
        matches: parsed.matches || [],
        reasons: parsed.reasons || [],
        recommendations: parsed.recommendations || [],
        aiAnalysis: result,
        matchedAt: new Date()
      }
    } catch (error) {
      logger.warning('Failed to parse eligibility result', { result, error })
      return {
        grantId,
        organizationId,
        overallScore: 0,
        matches: [],
        reasons: ['Failed to parse AI analysis'],
        recommendations: ['Review manually'],
        matchedAt: new Date()
      }
    }
  }

  private convertToDiscoveredGrants(extractedData: any[], url: string, source: GrantSource): DiscoveredGrant[] {
    return extractedData.map(data => ({
      id: this.generateGrantId(),
      sourceId: source.id,
      sourceUrl: url,
      title: data.title || 'Unknown Grant',
      description: data.description || '',
      provider: data.provider || source.name,
      providerType: source.category,
      amount: {
        min: data.amount?.min,
        max: data.amount?.max,
        currency: data.amount?.currency || 'EUR',
        description: data.amount?.description
      },
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      location: data.location || source.location,
      eligibility: data.eligibility || [],
      category: data.category || 'General',
      tags: data.tags || [],
      applicationUrl: data.applicationUrl,
      documentUrls: data.documentUrls || [],
      extractedContent: JSON.stringify(data),
      isActive: true,
      discoveredAt: new Date(),
      lastUpdated: new Date()
    }))
  }

  private convertDocumentToGrants(extractedData: any[], url: string, documentType: string): DiscoveredGrant[] {
    // Similar conversion but for documents
    return extractedData.map(data => ({
      id: this.generateGrantId(),
      sourceId: `document_${documentType}`,
      sourceUrl: url,
      title: data.title || 'Document Grant',
      description: data.description || '',
      provider: data.provider || 'Unknown',
      providerType: 'government' as const,
      amount: {
        min: data.amount?.min,
        max: data.amount?.max,
        currency: data.amount?.currency || 'EUR'
      },
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      location: data.location || 'Ireland',
      eligibility: data.eligibility || [],
      category: data.category || 'General',
      tags: [...(data.tags || []), documentType],
      applicationUrl: data.applicationUrl,
      documentUrls: [url],
      extractedContent: JSON.stringify(data),
      isActive: true,
      discoveredAt: new Date(),
      lastUpdated: new Date()
    }))
  }

  private generateGrantId(): string {
    return `grant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}