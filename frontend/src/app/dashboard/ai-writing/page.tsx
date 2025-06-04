'use client';

import React, { useState } from 'react';
import { AIWritingAssistant } from '../../../components/ai/AIWritingAssistant';

export default function AIWritingPage() {
  const [sectionType, setSectionType] = useState<'executive_summary' | 'methodology' | 'budget_justification' | 'impact' | 'project_description' | 'technical_approach' | 'sustainability_plan'>('project_description');
  const [content, setContent] = useState('');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Writing Assistant</h1>
        <p className="mt-2 text-gray-600">
          Enhanced AI writing assistant with streaming responses and real-time feedback
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Section Type</label>
        <select
          value={sectionType}
          onChange={(e) => setSectionType(e.target.value as any)}
          className="p-2 border rounded-md"
        >
          <option value="project_description">Project Description</option>
          <option value="executive_summary">Executive Summary</option>
          <option value="methodology">Methodology</option>
          <option value="technical_approach">Technical Approach</option>
          <option value="budget_justification">Budget Justification</option>
          <option value="impact">Impact Statement</option>
          <option value="sustainability_plan">Sustainability Plan</option>
        </select>
      </div>
      
      <AIWritingAssistant
        grantType="Research and Innovation"
        fundingBody="European Commission"
        sectionType={sectionType}
        initialContent={content}
        onContentChange={setContent}
        maxLength={2000}
        requirements={[
          'Innovation focus',
          'European collaboration',
          'Measurable outcomes',
          'Sustainability plan'
        ]}
      />
    </div>
  );
}