'use client';

import React, { useState } from 'react';
import { ProgressiveFormDisclosure } from '../../../../components/forms/ProgressiveFormDisclosure';

// Sample field definitions for testing
const sampleFields = [
  // Basic Information
  {
    name: 'project_title',
    label: 'Project Title',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter your project title',
    category: 'basic',
    helpText: 'A clear, descriptive title for your project'
  },
  {
    name: 'project_type',
    label: 'Project Type',
    type: 'select' as const,
    required: true,
    category: 'basic',
    options: [
      { value: 'research', label: 'Research' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'nonprofit', label: 'Non-profit' },
      { value: 'educational', label: 'Educational' }
    ],
    helpText: 'Select the type that best describes your project'
  },
  {
    name: 'project_description',
    label: 'Project Description',
    type: 'textarea' as const,
    required: true,
    placeholder: 'Provide a detailed description of your project',
    category: 'basic',
    helpText: 'Describe the problem you are solving and your approach'
  },
  {
    name: 'requested_amount',
    label: 'Requested Amount (€)',
    type: 'number' as const,
    required: true,
    placeholder: '0',
    category: 'basic',
    validation: { min: 1000, max: 10000000 },
    helpText: 'Total funding amount requested'
  },
  {
    name: 'project_duration',
    label: 'Project Duration (months)',
    type: 'number' as const,
    required: true,
    placeholder: '12',
    category: 'basic',
    validation: { min: 1, max: 60 }
  },
  {
    name: 'has_partners',
    label: 'Project has partners?',
    type: 'select' as const,
    category: 'basic',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ]
  },

  // Research-specific fields (shown when project_type = 'research')
  {
    name: 'methodology',
    label: 'Research Methodology',
    type: 'textarea' as const,
    placeholder: 'Describe your research methodology',
    category: 'research',
    helpText: 'Explain your research approach and methods'
  },
  {
    name: 'research_team',
    label: 'Research Team',
    type: 'textarea' as const,
    placeholder: 'List your research team members and their qualifications',
    category: 'research'
  },
  {
    name: 'publications_plan',
    label: 'Publications Plan',
    type: 'textarea' as const,
    placeholder: 'Describe your plan for publishing research results',
    category: 'research'
  },

  // Commercial-specific fields (shown when project_type = 'commercial')
  {
    name: 'market_analysis',
    label: 'Market Analysis',
    type: 'textarea' as const,
    placeholder: 'Provide market analysis for your product/service',
    category: 'commercial'
  },
  {
    name: 'revenue_model',
    label: 'Revenue Model',
    type: 'textarea' as const,
    placeholder: 'Describe how you will generate revenue',
    category: 'commercial'
  },
  {
    name: 'competitive_advantage',
    label: 'Competitive Advantage',
    type: 'textarea' as const,
    placeholder: 'Explain your competitive advantage',
    category: 'commercial'
  },

  // Large budget fields (shown when requested_amount > 100,000)
  {
    name: 'detailed_budget',
    label: 'Detailed Budget Breakdown',
    type: 'textarea' as const,
    placeholder: 'Provide detailed budget breakdown by category',
    category: 'financial'
  },
  {
    name: 'financial_management',
    label: 'Financial Management Plan',
    type: 'textarea' as const,
    placeholder: 'Describe your financial management approach',
    category: 'financial'
  },
  {
    name: 'audit_requirements',
    label: 'Audit Requirements',
    type: 'textarea' as const,
    placeholder: 'Detail how you will meet audit requirements',
    category: 'financial'
  },

  // Partnership fields (shown when has_partners = true)
  {
    name: 'partner_details',
    label: 'Partner Organizations',
    type: 'textarea' as const,
    placeholder: 'List partner organizations and their roles',
    category: 'partnership'
  },
  {
    name: 'collaboration_agreement',
    label: 'Collaboration Agreement',
    type: 'textarea' as const,
    placeholder: 'Describe the collaboration agreement terms',
    category: 'partnership'
  },
  {
    name: 'ip_management',
    label: 'IP Management',
    type: 'textarea' as const,
    placeholder: 'Explain intellectual property management approach',
    category: 'partnership'
  },

  // Environmental fields (shown for environmental projects)
  {
    name: 'project_category',
    label: 'Project Category',
    type: 'select' as const,
    category: 'impact',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'environment', label: 'Environment' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'education', label: 'Education' },
      { value: 'social', label: 'Social Impact' }
    ]
  },
  {
    name: 'environmental_impact',
    label: 'Environmental Impact',
    type: 'textarea' as const,
    placeholder: 'Describe the environmental impact of your project',
    category: 'environmental'
  },
  {
    name: 'sustainability_metrics',
    label: 'Sustainability Metrics',
    type: 'textarea' as const,
    placeholder: 'Define sustainability metrics and targets',
    category: 'environmental'
  },
  {
    name: 'carbon_footprint',
    label: 'Carbon Footprint Assessment',
    type: 'textarea' as const,
    placeholder: 'Assess the carbon footprint implications',
    category: 'environmental'
  },

  // Additional optional fields
  {
    name: 'innovation_level',
    label: 'Innovation Level',
    type: 'select' as const,
    category: 'innovation',
    options: [
      { value: 'incremental', label: 'Incremental' },
      { value: 'breakthrough', label: 'Breakthrough' },
      { value: 'disruptive', label: 'Disruptive' }
    ]
  },
  {
    name: 'risk_assessment',
    label: 'Risk Assessment',
    type: 'textarea' as const,
    placeholder: 'Identify and assess project risks',
    category: 'risk'
  },
  {
    name: 'success_metrics',
    label: 'Success Metrics',
    type: 'textarea' as const,
    placeholder: 'Define how you will measure project success',
    category: 'evaluation'
  }
];

export default function ProgressiveFormPage() {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleDataChange = (newData: Record<string, any>) => {
    setFormData(newData);
  };

  const handleSessionCreated = (newSessionId: string) => {
    setSessionId(newSessionId);
    console.log('Progressive form session created:', newSessionId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Progressive Form Disclosure</h1>
        <p className="mt-2 text-gray-600">
          Intelligent form that shows relevant fields based on your inputs and AI recommendations
        </p>
        {sessionId && (
          <div className="mt-2">
            <p className="text-sm text-gray-500">Session ID: {sessionId}</p>
          </div>
        )}
      </div>

      {/* Form Data Debug Panel (for testing) */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Current Form Data (Debug)</h3>
        <pre className="text-sm text-gray-700 overflow-x-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>

      {/* Progressive Form */}
      <ProgressiveFormDisclosure
        fields={sampleFields}
        formData={formData}
        onDataChange={handleDataChange}
        grantSchemeId="sample-research-grant"
        onSessionCreated={handleSessionCreated}
        className="max-w-4xl"
      />

      {/* Example Progressive Disclosure Triggers */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Progressive Disclosure Examples</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>Research Fields:</strong> Select "Research" as project type to see methodology, research team, and publications fields
          </div>
          <div>
            <strong>Commercial Fields:</strong> Select "Commercial" as project type to see market analysis, revenue model, and competitive advantage fields
          </div>
          <div>
            <strong>Large Budget Fields:</strong> Enter amount &gt; €100,000 to see detailed budget, financial management, and audit requirement fields
          </div>
          <div>
            <strong>Partnership Fields:</strong> Select "Yes" for partners to see partner details, collaboration agreement, and IP management fields
          </div>
          <div>
            <strong>Environmental Fields:</strong> Select "Environment" as project category to see environmental impact, sustainability metrics, and carbon footprint fields
          </div>
        </div>
      </div>
    </div>
  );
}