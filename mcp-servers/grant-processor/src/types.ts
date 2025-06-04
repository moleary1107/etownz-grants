export interface GrantRequirement {
  id: string;
  description: string;
  type: 'mandatory' | 'preferred' | 'optional';
  category: 'financial' | 'technical' | 'legal' | 'organizational' | 'project';
  source: string;
  importance: number; // 1-10 scale
}

export interface EligibilityCriterion {
  id: string;
  criterion: string;
  type: 'location' | 'size' | 'sector' | 'legal' | 'financial' | 'experience';
  mandatory: boolean;
  conditions: string[];
  verification: string;
}

export interface GrantAnalysisResult {
  grantId: string;
  requirements: GrantRequirement[];
  eligibilityCriteria: EligibilityCriterion[];
  metadata: any;
  analysisDate: string;
  confidence: number;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  type: 'nonprofit' | 'sme' | 'startup' | 'university' | 'research' | 'public';
  size: 'micro' | 'small' | 'medium' | 'large';
  location: {
    country: string;
    region: string;
    city?: string;
  };
  sectors: string[];
  experience: {
    yearsActive: number;
    previousGrants: number;
    totalFundingReceived: number;
  };
  financial: {
    annualRevenue?: number;
    employees: number;
    legalForm: string;
  };
  capabilities: string[];
  certifications: string[];
  partnerships: string[];
}

export interface EligibilityCheck {
  organizationId: string;
  grantId: string;
  overallEligible: boolean;
  eligibilityScore: number; // 0-100
  checkDate: Date;
  criteria: {
    criterion: EligibilityCriterion;
    meets: boolean;
    confidence: number;
    reasoning: string;
    evidenceRequired?: string[];
  }[];
  recommendations: string[];
  missingRequirements: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface EligibilityResult {
  grantId: string;
  organizationId: string;
  overallEligible: boolean;
  checks: any[];
  recommendations: string[];
  checkDate: string;
}

export interface SuccessPattern {
  id: string;
  grantType: string;
  organizationType: string;
  pattern: {
    title: string;
    description: string;
    frequency: number; // How often this pattern appears in successful applications
    impact: number; // 1-10 scale of importance
  };
  examples: {
    applicationId: string;
    excerpt: string;
    outcome: 'funded' | 'rejected';
    score?: number;
  }[];
  applicabilityConditions: string[];
  implementationTips: string[];
}

export interface SuccessPatternResult {
  grantType: string;
  patterns: SuccessPattern[];
  analysisScope: string;
  sampleSize: number;
  analysisDate: string;
  confidence: number;
}

export interface ComplianceRule {
  id: string;
  rule: string;
  category: 'format' | 'content' | 'legal' | 'financial' | 'technical';
  severity: 'critical' | 'major' | 'minor' | 'warning';
  description: string;
  validation: string; // Regex or validation logic
  fixSuggestion: string;
}

export interface ComplianceCheck {
  id: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  recommendations?: string[];
}

export interface ComplianceResult {
  applicationId: string;
  overallCompliant: boolean;
  checks: ComplianceCheck[];
  criticalIssues: ComplianceCheck[];
  recommendations: string[];
  validationDate: string;
}

export interface ApplicationGuidance {
  grantId: string;
  organizationType: string;
  sections: {
    name: string;
    guidance: string;
    examples: string[];
    commonMistakes: string[];
    wordLimit?: number;
    requiredElements: string[];
  }[];
  timeline: {
    task: string;
    deadline: string;
    importance: number;
    dependencies: string[];
  }[];
  strategicAdvice: string[];
  competitiveFactors: string[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface GrantProcessorConfig {
  openaiApiKey: string;
  database: DatabaseConfig;
  enableCaching: boolean;
  cacheExpiryHours: number;
  maxConcurrentRequests: number;
}