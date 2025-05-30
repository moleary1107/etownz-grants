export interface GrantDocument {
  id: string;
  source: 'pdf' | 'docx' | 'web' | 'upload';
  metadata: {
    title: string;
    provider: string;
    deadline?: Date;
    amount?: AmountRange;
    extractedAt: Date;
    originalFilename?: string;
    fileSize?: number;
    pageCount?: number;
  };
  structure: {
    sections: GrantSection[];
    requirements: Requirement[];
    eligibility: EligibilityCriteria[];
    applicationProcess: ProcessStep[];
    deadlines: DeadlineInfo[];
  };
  content: {
    rawText: string;
    extractedTables: TableData[];
    images: ImageInfo[];
    forms: FormField[];
  };
  aiAnalysis: {
    difficulty: 'low' | 'medium' | 'high';
    matchScore: number;
    keyTerms: string[];
    similarGrants: string[];
    requiredDocuments: string[];
    estimatedEffort: string;
    successFactors: string[];
  };
  renderableHtml: string;
}

export interface AmountRange {
  min: number;
  max: number;
  currency: string;
  notes?: string;
}

export interface GrantSection {
  id: string;
  title: string;
  content: string;
  type: 'overview' | 'eligibility' | 'requirements' | 'process' | 'deadline' | 'funding' | 'contact';
  subsections?: GrantSection[];
  importance: 'critical' | 'important' | 'optional';
}

export interface Requirement {
  id: string;
  description: string;
  type: 'mandatory' | 'preferred' | 'optional';
  category: 'financial' | 'technical' | 'legal' | 'organizational' | 'project';
  documents?: string[];
  evidence?: string[];
}

export interface EligibilityCriteria {
  id: string;
  criterion: string;
  type: 'location' | 'size' | 'sector' | 'legal' | 'financial' | 'experience';
  mandatory: boolean;
  details?: string;
}

export interface ProcessStep {
  id: string;
  step: number;
  title: string;
  description: string;
  deadline?: Date;
  documents?: string[];
  estimatedTime?: string;
}

export interface DeadlineInfo {
  id: string;
  type: 'application' | 'expression_of_interest' | 'final_report' | 'interim_report';
  date: Date;
  description: string;
  isRecurring?: boolean;
  recurringPattern?: string;
}

export interface TableData {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
  type: 'funding_levels' | 'deadlines' | 'requirements' | 'criteria' | 'other';
}

export interface ImageInfo {
  id: string;
  filename: string;
  caption?: string;
  altText?: string;
  extractedText?: string;
  isChart?: boolean;
  isDiagram?: boolean;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'number';
  required: boolean;
  options?: string[];
  validation?: string;
  description?: string;
}

export interface UserWritingProfile {
  id: string;
  userId: string;
  organizationId: string;
  analysisDate: Date;
  characteristics: {
    tone: 'formal' | 'professional' | 'conversational' | 'technical';
    vocabulary: 'simple' | 'advanced' | 'technical' | 'academic';
    structure: 'concise' | 'detailed' | 'narrative' | 'analytical';
    approach: 'direct' | 'persuasive' | 'collaborative' | 'innovative';
  };
  patterns: {
    averageSentenceLength: number;
    commonPhrases: string[];
    technicalTermUsage: number;
    persuasionTechniques: string[];
    organizationMentions: string[];
  };
  sampleDocuments: string[];
  confidence: number;
}

export interface LessonLearned {
  id: string;
  grantId: string;
  organizationId: string;
  applicationId: string;
  outcome: 'rejected' | 'incomplete' | 'late_submission' | 'withdrawn';
  submissionDate: Date;
  analysis: {
    rejectionReasons: string[];
    weakSections: string[];
    missingRequirements: string[];
    scoringBreakdown?: { [section: string]: number };
    competitorAdvantages: string[];
    timingIssues: string[];
  };
  recommendations: {
    contentImprovements: string[];
    processChanges: string[];
    futureStrategy: string[];
    documentationNeeds: string[];
    skillGaps: string[];
  };
  aiInsights: {
    patternAnalysis: string;
    rootCauseAnalysis: string;
    successProbabilityFactors: string[];
    recommendedGrants: string[];
    improvementPriority: string[];
  };
  preventionMeasures: {
    checklistItems: string[];
    warningSignals: string[];
    reviewMilestones: string[];
  };
}

export interface SuccessPattern {
  id: string;
  patternType: 'content' | 'structure' | 'timing' | 'approach' | 'collaboration';
  description: string;
  grantTypes: string[];
  organizationTypes: string[];
  successRate: number;
  sampleSize: number;
  keyElements: string[];
  implementation: {
    steps: string[];
    resources: string[];
    timeline: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  evidence: {
    successfulApplications: string[];
    metrics: { [key: string]: number };
    testimonials: string[];
  };
}