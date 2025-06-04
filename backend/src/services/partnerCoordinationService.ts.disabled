import { DatabaseService } from './database';
import { openaiService } from './openaiService';
import { logger } from './logger';

export interface Partner {
  id: string;
  organizationName: string;
  type: 'academic' | 'industry' | 'nonprofit' | 'sme' | 'large_enterprise' | 'government';
  country: string;
  expertiseAreas: string[];
  capabilities: string[];
  previousCollaborations: string[];
  fundingHistory: {
    totalReceived: number;
    successfulProjects: number;
    successRate: number;
  };
  contactInfo: {
    primaryContact: string;
    email: string;
    phone?: string;
  };
  certifications: string[];
  languages: string[];
  availability: {
    startDate: Date;
    capacity: number; // percentage of resources available
  };
}

export interface Project {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  requiredExpertise: string[];
  budget: {
    total: number;
    currency: 'EUR' | 'USD' | 'GBP';
  };
  duration: number; // months
  expectedOutcomes: string[];
  riskFactors: string[];
  geographicRequirements?: {
    requiredCountries: string[];
    preferredRegions: string[];
  };
}

export interface WorkPackage {
  id: string;
  name: string;
  description: string;
  leadPartner: string;
  participatingPartners: string[];
  budget: number;
  duration: number;
  deliverables: string[];
  dependencies: string[];
  expertiseRequired: string[];
  effort: Record<string, number>; // partnerId -> person-months
}

export interface PartnershipAnalysis {
  compatibilityScore: number;
  strengthsAlignment: string[];
  potentialChallenges: string[];
  recommendedRoles: Record<string, string>;
  communicationStrategy: string[];
  riskMitigation: string[];
}

export interface CollaborationPlan {
  workPackages: WorkPackage[];
  budgetAllocation: Record<string, number>;
  timeline: {
    milestones: Array<{
      name: string;
      date: Date;
      responsiblePartner: string;
      deliverables: string[];
    }>;
  };
  governanceStructure: {
    coordinator: string;
    steeringCommittee: string[];
    workingGroups: Array<{
      name: string;
      lead: string;
      members: string[];
    }>;
  };
  communicationPlan: {
    meetingSchedule: string;
    reportingStructure: string[];
    collaborationTools: string[];
  };
}

export class PartnerCoordinationService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async findPotentialPartners(
    project: Project,
    preferences: {
      maxPartners?: number;
      geographicDiversity?: boolean;
      industryMix?: boolean;
      minSuccessRate?: number;
    } = {}
  ): Promise<Partner[]> {
    try {
      logger.info('Finding potential partners for project', { projectId: project.id });

      // Get all partners from database
      const query = `
        SELECT p.*, 
               array_agg(DISTINCT pe.expertise_area) as expertise_areas,
               array_agg(DISTINCT pc.capability) as capabilities,
               array_agg(DISTINCT lang.language_code) as languages
        FROM partners p
        LEFT JOIN partner_expertise pe ON p.id = pe.partner_id
        LEFT JOIN partner_capabilities pc ON p.id = pc.partner_id
        LEFT JOIN partner_languages lang ON p.id = lang.partner_id
        WHERE p.status = 'active'
        GROUP BY p.id
      `;

      const result = await this.db.query(query);
      const availablePartners = result.rows.map(this.mapPartnerFromDb);

      // Use AI to analyze and score partners
      const scoredPartners = await this.scorePartnerCompatibility(
        project,
        availablePartners
      );

      // Apply filters and preferences
      let filteredPartners = scoredPartners.filter(partner => {
        if (preferences.minSuccessRate && 
            partner.fundingHistory.successRate < preferences.minSuccessRate) {
          return false;
        }
        return true;
      });

      // Sort by compatibility score
      filteredPartners.sort((a, b) => 
        (b as any).compatibilityScore - (a as any).compatibilityScore
      );

      // Apply geographic diversity if requested
      if (preferences.geographicDiversity) {
        filteredPartners = this.applyGeographicDiversity(filteredPartners);
      }

      // Apply industry mix if requested
      if (preferences.industryMix) {
        filteredPartners = this.applyIndustryMix(filteredPartners);
      }

      // Limit number of partners
      const maxPartners = preferences.maxPartners || 10;
      return filteredPartners.slice(0, maxPartners);

    } catch (error) {
      logger.error('Error finding potential partners:', error);
      throw error;
    }
  }

  private async scorePartnerCompatibility(
    project: Project,
    partners: Partner[]
  ): Promise<Partner[]> {
    const prompt = `
Analyze the compatibility between this project and potential partners.

Project:
${JSON.stringify(project, null, 2)}

Partners:
${JSON.stringify(partners.map(p => ({
  id: p.id,
  name: p.organizationName,
  type: p.type,
  expertise: p.expertiseAreas,
  capabilities: p.capabilities,
  successRate: p.fundingHistory.successRate
})), null, 2)}

For each partner, provide a compatibility score (0-100) based on:
1. Expertise alignment with project requirements
2. Organizational type fit for project needs
3. Previous success rate and funding history
4. Capability match for expected outcomes
5. Geographic considerations

Return a JSON array with partner IDs and their compatibility scores.
`;

    try {
      const response = await openaiService.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in partner selection for collaborative research and innovation projects.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      });

      const scores = JSON.parse(response.choices[0].message.content || '[]');
      
      // Apply scores to partners
      return partners.map(partner => {
        const scoreData = scores.find((s: any) => s.partnerId === partner.id);
        return {
          ...partner,
          compatibilityScore: scoreData?.score || 0
        };
      });

    } catch (error) {
      logger.error('Error scoring partner compatibility:', error);
      // Return partners with default score
      return partners.map(partner => ({ ...partner, compatibilityScore: 50 }));
    }
  }

  async analyzePartnership(
    project: Project,
    selectedPartners: Partner[]
  ): Promise<PartnershipAnalysis> {
    try {
      const prompt = `
Analyze this partnership configuration for a collaborative project.

Project:
${JSON.stringify(project, null, 2)}

Selected Partners:
${JSON.stringify(selectedPartners.map(p => ({
  name: p.organizationName,
  type: p.type,
  country: p.country,
  expertise: p.expertiseAreas,
  capabilities: p.capabilities
})), null, 2)}

Provide a comprehensive analysis including:
1. Overall compatibility score (0-100)
2. Key strengths and synergies
3. Potential challenges and risks
4. Recommended roles for each partner
5. Communication strategy recommendations
6. Risk mitigation strategies

Return as structured JSON.
`;

      const response = await openaiService.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert partnership analyst for collaborative research and innovation projects.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        compatibilityScore: analysis.compatibilityScore || 0,
        strengthsAlignment: analysis.strengths || [],
        potentialChallenges: analysis.challenges || [],
        recommendedRoles: analysis.roles || {},
        communicationStrategy: analysis.communication || [],
        riskMitigation: analysis.riskMitigation || []
      };

    } catch (error) {
      logger.error('Error analyzing partnership:', error);
      throw error;
    }
  }

  async generateWorkPackages(
    project: Project,
    partners: Partner[],
    preferences: {
      maxWorkPackages?: number;
      balanceWorkload?: boolean;
      minimizeInterdependencies?: boolean;
    } = {}
  ): Promise<WorkPackage[]> {
    try {
      const prompt = `
Generate work packages for this collaborative project.

Project:
${JSON.stringify(project, null, 2)}

Partners:
${JSON.stringify(partners.map(p => ({
  id: p.id,
  name: p.organizationName,
  type: p.type,
  expertise: p.expertiseAreas,
  capabilities: p.capabilities
})), null, 2)}

Create ${preferences.maxWorkPackages || 6} work packages that:
1. Cover all project objectives
2. Leverage each partner's strengths
3. ${preferences.balanceWorkload ? 'Balance workload across partners' : 'Optimize based on expertise'}
4. ${preferences.minimizeInterdependencies ? 'Minimize interdependencies between packages' : 'Allow reasonable interdependencies'}
5. Include clear deliverables and timelines

Return as structured JSON array of work packages.
`;

      const response = await openaiService.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert project manager for collaborative research and innovation projects.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4
      });

      const workPackages = JSON.parse(response.choices[0].message.content || '[]');
      
      return workPackages.map((wp: any, index: number) => ({
        id: `wp-${index + 1}`,
        name: wp.name || `Work Package ${index + 1}`,
        description: wp.description || '',
        leadPartner: wp.leadPartner || partners[0]?.id || '',
        participatingPartners: wp.participatingPartners || [],
        budget: wp.budget || Math.floor(project.budget.total / workPackages.length),
        duration: wp.duration || project.duration,
        deliverables: wp.deliverables || [],
        dependencies: wp.dependencies || [],
        expertiseRequired: wp.expertiseRequired || [],
        effort: wp.effort || {}
      }));

    } catch (error) {
      logger.error('Error generating work packages:', error);
      throw error;
    }
  }

  async createCollaborationPlan(
    project: Project,
    partners: Partner[],
    workPackages: WorkPackage[]
  ): Promise<CollaborationPlan> {
    try {
      // Generate budget allocation
      const budgetAllocation = this.generateBudgetAllocation(project, partners, workPackages);

      // Generate timeline and milestones
      const timeline = await this.generateTimeline(project, workPackages);

      // Generate governance structure
      const governanceStructure = this.generateGovernanceStructure(partners, workPackages);

      // Generate communication plan
      const communicationPlan = await this.generateCommunicationPlan(partners);

      return {
        workPackages,
        budgetAllocation,
        timeline,
        governanceStructure,
        communicationPlan
      };

    } catch (error) {
      logger.error('Error creating collaboration plan:', error);
      throw error;
    }
  }

  private generateBudgetAllocation(
    project: Project,
    partners: Partner[],
    workPackages: WorkPackage[]
  ): Record<string, number> {
    const allocation: Record<string, number> = {};
    
    // Initialize all partners with 0
    partners.forEach(partner => {
      allocation[partner.id] = 0;
    });

    // Allocate budget based on work package leadership and participation
    workPackages.forEach(wp => {
      // Lead partner gets 60% of work package budget
      if (wp.leadPartner && allocation[wp.leadPartner] !== undefined) {
        allocation[wp.leadPartner] += wp.budget * 0.6;
      }

      // Participating partners share remaining 40%
      const participatingBudget = wp.budget * 0.4;
      const budgetPerParticipant = participatingBudget / wp.participatingPartners.length;
      
      wp.participatingPartners.forEach(partnerId => {
        if (allocation[partnerId] !== undefined) {
          allocation[partnerId] += budgetPerParticipant;
        }
      });
    });

    return allocation;
  }

  private async generateTimeline(
    project: Project,
    workPackages: WorkPackage[]
  ): Promise<CollaborationPlan['timeline']> {
    const milestones: CollaborationPlan['timeline']['milestones'] = [];
    const startDate = new Date();

    // Generate key milestones based on work packages
    workPackages.forEach((wp, index) => {
      const milestoneDate = new Date(startDate);
      milestoneDate.setMonth(milestoneDate.getMonth() + Math.floor(wp.duration * 0.8));

      milestones.push({
        name: `${wp.name} Completion`,
        date: milestoneDate,
        responsiblePartner: wp.leadPartner,
        deliverables: wp.deliverables
      });
    });

    // Add project start and end milestones
    milestones.unshift({
      name: 'Project Kick-off',
      date: startDate,
      responsiblePartner: workPackages[0]?.leadPartner || '',
      deliverables: ['Project initiation', 'Consortium agreement']
    });

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + project.duration);
    
    milestones.push({
      name: 'Project Completion',
      date: endDate,
      responsiblePartner: workPackages[0]?.leadPartner || '',
      deliverables: ['Final report', 'Project evaluation']
    });

    return { milestones };
  }

  private generateGovernanceStructure(
    partners: Partner[],
    workPackages: WorkPackage[]
  ): CollaborationPlan['governanceStructure'] {
    // Select coordinator (usually largest or most experienced partner)
    const coordinator = partners.reduce((prev, current) => 
      current.fundingHistory.totalReceived > prev.fundingHistory.totalReceived ? current : prev
    );

    // Create steering committee with all partners
    const steeringCommittee = partners.map(p => p.id);

    // Create working groups based on expertise areas
    const expertiseGroups = new Map<string, string[]>();
    
    workPackages.forEach(wp => {
      wp.expertiseRequired.forEach(expertise => {
        if (!expertiseGroups.has(expertise)) {
          expertiseGroups.set(expertise, []);
        }
        expertiseGroups.get(expertise)?.push(wp.leadPartner);
        wp.participatingPartners.forEach(p => {
          expertiseGroups.get(expertise)?.push(p);
        });
      });
    });

    const workingGroups = Array.from(expertiseGroups.entries()).map(([expertise, members]) => ({
      name: `${expertise} Working Group`,
      lead: members[0] || coordinator.id,
      members: [...new Set(members)] // Remove duplicates
    }));

    return {
      coordinator: coordinator.id,
      steeringCommittee,
      workingGroups
    };
  }

  private async generateCommunicationPlan(
    partners: Partner[]
  ): Promise<CollaborationPlan['communicationPlan']> {
    // Determine common languages
    const allLanguages = partners.flatMap(p => p.languages);
    const languageCounts = allLanguages.reduce((acc, lang) => {
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const primaryLanguage = Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'en';

    return {
      meetingSchedule: 'Monthly steering committee meetings, bi-weekly working group meetings',
      reportingStructure: [
        'Monthly progress reports from each partner',
        'Quarterly consolidated reports from coordinator',
        'Annual review meetings with all stakeholders'
      ],
      collaborationTools: [
        'Microsoft Teams for daily communication',
        'SharePoint for document management',
        'Slack for informal coordination',
        `Primary language: ${primaryLanguage}`
      ]
    };
  }

  private applyGeographicDiversity(partners: Partner[]): Partner[] {
    const countryGroups = new Map<string, Partner[]>();
    
    partners.forEach(partner => {
      if (!countryGroups.has(partner.country)) {
        countryGroups.set(partner.country, []);
      }
      countryGroups.get(partner.country)?.push(partner);
    });

    // Select top partner from each country
    const diversePartners: Partner[] = [];
    countryGroups.forEach(countryPartners => {
      const topPartner = countryPartners.sort((a, b) => 
        (b as any).compatibilityScore - (a as any).compatibilityScore
      )[0];
      if (topPartner) {
        diversePartners.push(topPartner);
      }
    });

    return diversePartners;
  }

  private applyIndustryMix(partners: Partner[]): Partner[] {
    const typeGroups = new Map<string, Partner[]>();
    
    partners.forEach(partner => {
      if (!typeGroups.has(partner.type)) {
        typeGroups.set(partner.type, []);
      }
      typeGroups.get(partner.type)?.push(partner);
    });

    // Ensure mix of academic, industry, and other types
    const mixedPartners: Partner[] = [];
    const desiredTypes = ['academic', 'industry', 'sme', 'nonprofit'];
    
    desiredTypes.forEach(type => {
      const typePartners = typeGroups.get(type) || [];
      if (typePartners.length > 0) {
        const topPartner = typePartners.sort((a, b) => 
          (b as any).compatibilityScore - (a as any).compatibilityScore
        )[0];
        mixedPartners.push(topPartner);
      }
    });

    // Add remaining top-scored partners
    const remainingPartners = partners.filter(p => !mixedPartners.includes(p));
    mixedPartners.push(...remainingPartners.slice(0, 6));

    return mixedPartners;
  }

  private mapPartnerFromDb(row: any): Partner {
    return {
      id: row.id,
      organizationName: row.organization_name,
      type: row.organization_type,
      country: row.country,
      expertiseAreas: row.expertise_areas || [],
      capabilities: row.capabilities || [],
      previousCollaborations: row.previous_collaborations || [],
      fundingHistory: {
        totalReceived: row.total_funding_received || 0,
        successfulProjects: row.successful_projects || 0,
        successRate: row.success_rate || 0
      },
      contactInfo: {
        primaryContact: row.primary_contact,
        email: row.contact_email,
        phone: row.contact_phone
      },
      certifications: row.certifications || [],
      languages: row.languages || ['en'],
      availability: {
        startDate: row.available_from || new Date(),
        capacity: row.capacity_percentage || 100
      }
    };
  }

  async storePartnershipPlan(
    projectId: string,
    plan: CollaborationPlan
  ): Promise<string> {
    try {
      const planId = `plan-${Date.now()}`;
      
      const query = `
        INSERT INTO partnership_plans (
          id, project_id, work_packages, budget_allocation, 
          timeline, governance_structure, communication_plan, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `;

      const result = await this.db.query(query, [
        planId,
        projectId,
        JSON.stringify(plan.workPackages),
        JSON.stringify(plan.budgetAllocation),
        JSON.stringify(plan.timeline),
        JSON.stringify(plan.governanceStructure),
        JSON.stringify(plan.communicationPlan)
      ]);

      return result.rows[0].id;

    } catch (error) {
      logger.error('Error storing partnership plan:', error);
      throw error;
    }
  }
}

export const partnerCoordinationService = new PartnerCoordinationService();