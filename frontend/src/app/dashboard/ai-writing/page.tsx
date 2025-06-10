'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AIWritingAssistant } from '../../../components/ai/AIWritingAssistant';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

export default function AIWritingPage() {
  const [sectionType, setSectionType] = useState<'executive_summary' | 'methodology' | 'budget_justification' | 'impact' | 'project_description' | 'technical_approach' | 'sustainability_plan'>('project_description');
  const [content, setContent] = useState('');
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Writing Assistant</h1>
        <p className="mt-2 text-gray-600">
          Enhanced AI writing assistant with streaming responses and real-time feedback
        </p>
      </div>

      {/* Upgrade Notice */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Sparkles className="h-5 w-5 mr-2" />
            Advanced AI Writing Assistant Available
          </CardTitle>
          <CardDescription className="text-blue-700">
            Experience our newest professional-grade writing assistant with real-time optimization, collaborative editing, and advanced content analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-blue-800">
                <Zap className="h-4 w-4" />
                <span>Real-time content analysis and quality scoring</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-800">
                <Zap className="h-4 w-4" />
                <span>Advanced suggestions with reasoning and confidence scores</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-800">
                <Zap className="h-4 w-4" />
                <span>Multiple content alternatives and tone variations</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-800">
                <Zap className="h-4 w-4" />
                <span>Text-to-speech and collaborative editing features</span>
              </div>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/ai-writing-advanced')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Advanced Version
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

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