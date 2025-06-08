'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wand2, 
  FileText, 
  Building2, 
  Globe, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { aiEditorService } from '@/lib/api/aiEditorServiceV2';

interface AutoGenerationPanelProps {
  grantId: string;
  organizationId: string;
  applicationId: string;
  onSectionGenerated: (sectionType: string, content: string) => void;
}

interface GenerationProgress {
  stage: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

export default function AutoGenerationPanel({
  grantId,
  organizationId,
  applicationId,
  onSectionGenerated
}: AutoGenerationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress[]>([]);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [grantData, setGrantData] = useState<any>(null);
  const [generatedSections, setGeneratedSections] = useState<string[]>([]);

  // Mock grant and organization data
  const mockGrantData = {
    id: grantId,
    title: "Science Foundation Ireland Research Grant - Artificial Intelligence Initiative",
    funder: "Science Foundation Ireland (SFI)",
    deadline: "2025-08-15",
    amount: "€500,000 - €2,000,000",
    focus_areas: ["Artificial Intelligence", "Machine Learning", "Agricultural Technology"],
    requirements: {
      executive_summary: "Max 2 pages - overview of research and expected impact",
      project_description: "Max 10 pages - detailed research plan and methodology",
      methodology: "Max 5 pages - technical approach and validation plan",
      budget_justification: "Max 3 pages - detailed cost breakdown and justification",
      impact_statement: "Max 2 pages - economic and societal benefits",
      team_expertise: "Max 3 pages - team qualifications and experience"
    }
  };

  const mockOrganizationData = {
    id: organizationId,
    name: "Trinity College Dublin",
    type: "University",
    location: "Dublin, Ireland",
    website: "https://www.tcd.ie",
    expertise: ["Artificial Intelligence", "Computer Science", "Agricultural Research"],
    facilities: ["High Performance Computing Center", "AI Research Lab"],
    track_record: "Leading research institution with €50M+ in research funding",
    recent_projects: [
      "EU Horizon 2020 Climate-Smart Agriculture",
      "SFI Frontiers for the Future: Precision Agriculture"
    ]
  };

  const sections = [
    { id: 'executive_summary', name: 'Executive Summary', icon: FileText, estimatedTime: '2-3 min' },
    { id: 'project_description', name: 'Project Description', icon: FileText, estimatedTime: '5-7 min' },
    { id: 'methodology', name: 'Methodology', icon: FileText, estimatedTime: '4-6 min' },
    { id: 'budget_justification', name: 'Budget Justification', icon: FileText, estimatedTime: '3-4 min' },
    { id: 'impact_statement', name: 'Impact Statement', icon: FileText, estimatedTime: '3-4 min' },
    { id: 'team_expertise', name: 'Team Expertise', icon: FileText, estimatedTime: '3-5 min' }
  ];

  const handleAnalyzeOrganization = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress([
        { stage: 'Analyzing organization data', progress: 30, status: 'in_progress' }
      ]);

      const orgAnalysis = await aiEditorService.analyzeOrganizationData({
        organizationId,
        website: mockOrganizationData.website,
        documents: []
      });

      setOrganizationData({ ...mockOrganizationData, ...orgAnalysis });
      setGrantData(mockGrantData);
      
      setGenerationProgress([
        { stage: 'Organization analysis complete', progress: 100, status: 'completed' }
      ]);
    } catch (error) {
      setGenerationProgress([
        { stage: 'Analysis failed', progress: 0, status: 'error' }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSection = async (sectionType: string) => {
    if (!organizationData || !grantData) {
      await handleAnalyzeOrganization();
    }

    try {
      setIsGenerating(true);
      setGenerationProgress([
        { stage: `Generating ${sectionType.replace('_', ' ')}`, progress: 0, status: 'in_progress' }
      ]);

      // Simulate progress updates
      for (let i = 20; i <= 80; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setGenerationProgress([
          { stage: `Generating ${sectionType.replace('_', ' ')}`, progress: i, status: 'in_progress' }
        ]);
      }

      const result = await aiEditorService.autoGenerateSection({
        grantId,
        organizationId,
        sectionType,
        grantInfo: grantData,
        organizationProfile: organizationData
      });

      setGenerationProgress([
        { stage: `${sectionType.replace('_', ' ')} generated successfully`, progress: 100, status: 'completed' }
      ]);

      setGeneratedSections(prev => [...prev, sectionType]);
      onSectionGenerated(sectionType, result.content);

    } catch (error) {
      setGenerationProgress([
        { stage: 'Generation failed', progress: 0, status: 'error' }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFullApplication = async () => {
    if (!organizationData || !grantData) {
      await handleAnalyzeOrganization();
    }

    try {
      setIsGenerating(true);
      const totalStages = sections.length + 1;
      let currentStage = 0;

      // Analyze organization first
      setGenerationProgress([
        { stage: 'Preparing application framework', progress: (currentStage / totalStages) * 100, status: 'in_progress' }
      ]);
      currentStage++;

      const result = await aiEditorService.autoGenerateApplication({
        grantId,
        organizationId,
        grantInfo: grantData,
        organizationProfile: organizationData,
        projectIdea: "AI-powered agricultural prediction system for Irish farming"
      });

      // Generate each section with progress updates
      for (const section of result.sections) {
        setGenerationProgress([
          { stage: `Generating ${section.name}`, progress: (currentStage / totalStages) * 100, status: 'in_progress' }
        ]);
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
        onSectionGenerated(section.type, section.content);
        setGeneratedSections(prev => [...prev, section.type]);
        currentStage++;
      }

      setGenerationProgress([
        { stage: 'Complete application generated successfully', progress: 100, status: 'completed' }
      ]);

    } catch (error) {
      setGenerationProgress([
        { stage: 'Application generation failed', progress: 0, status: 'error' }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Organization Status */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Analysis
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{mockOrganizationData.name}</span>
            </div>
            {organizationData ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Analyzed
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
          
          {!organizationData && (
            <Button 
              onClick={handleAnalyzeOrganization}
              disabled={isGenerating}
              size="sm"
              className="w-full"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Analyze Organization Profile
            </Button>
          )}
        </div>
      </Card>

      {/* Generation Progress */}
      {generationProgress.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Generation Progress</h3>
          
          {generationProgress.map((progress, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{progress.stage}</span>
                <div className="flex items-center gap-2">
                  {progress.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {progress.status === 'error' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  {progress.status === 'in_progress' && (
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                  )}
                  <span className="text-sm font-medium">{progress.progress}%</span>
                </div>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          ))}
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Auto-Generation
        </h3>
        
        <div className="space-y-3">
          <Button 
            onClick={handleGenerateFullApplication}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Generate Complete Application
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Creates all sections based on grant requirements and organization profile
          </p>
        </div>
      </Card>

      {/* Individual Sections */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Generate Individual Sections</h3>
        
        <div className="space-y-2">
          {sections.map((section) => {
            const isGenerated = generatedSections.includes(section.id);
            const Icon = section.icon;
            
            return (
              <div
                key={section.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {section.name}
                    </span>
                    <div className="text-xs text-gray-500">
                      Est. {section.estimatedTime}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isGenerated && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Generated
                    </Badge>
                  )}
                  
                  <Button
                    size="sm"
                    variant={isGenerated ? "outline" : "default"}
                    onClick={() => handleGenerateSection(section.id)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : isGenerated ? (
                      <RefreshCw className="h-3 w-3" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Export Options */}
      {generatedSections.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Export</h3>
          
          <div className="space-y-2">
            <Button variant="outline" className="w-full" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </Button>
            <Button variant="outline" className="w-full" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export as Word Document
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}