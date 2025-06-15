'use client';

import React, { useState } from 'react';
import AIEditorV2 from './AIEditorV2';
import AutoGenerationPanel from './AutoGenerationPanel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  DollarSign, 
  Building, 
  User,
  Clock,
  CheckCircle,
  ArrowLeft,
  Save,
  Send
} from 'lucide-react';

interface GrantInfo {
  id: string;
  title: string;
  funder: string;
  deadline: string;
  amount: string;
  status: 'open' | 'closing_soon' | 'closed';
  eligibility: string[];
  requirements: string[];
  description: string;
}

interface ApplicationInfo {
  id: string;
  title: string;
  status: 'draft' | 'in_review' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  lastModified: string;
  completionPercentage: number;
  sections: {
    name: string;
    required: boolean;
    completed: boolean;
    wordLimit?: number;
    currentWords?: number;
  }[];
}

interface OrganizationInfo {
  id: string;
  name: string;
  type: string;
  location: string;
  size: string;
}

interface AIEditorAdminProps {
  grantId: string;
  applicationId: string;
  sectionType: string;
  sectionTitle: string;
  initialContent?: string;
  onBack?: () => void;
}

export default function AIEditorAdmin({
  grantId,
  applicationId,
  sectionType,
  sectionTitle,
  initialContent = '',
  onBack
}: AIEditorAdminProps) {
  // Mock data - in production this would come from APIs
  const [grantInfo] = useState<GrantInfo>({
    id: grantId,
    title: "Science Foundation Ireland Research Grant - Artificial Intelligence Initiative",
    funder: "Science Foundation Ireland (SFI)",
    deadline: "2025-08-15",
    amount: "€500,000 - €2,000,000",
    status: "open",
    eligibility: [
      "Irish Higher Education Institutions",
      "Research Performing Organizations", 
      "Industry partners with Irish connection"
    ],
    requirements: [
      "Executive Summary (max 2 pages)",
      "Project Description (max 10 pages)",
      "Methodology (max 5 pages)",
      "Budget Justification (max 3 pages)",
      "Impact Statement (max 2 pages)",
      "Team Expertise (max 3 pages)"
    ],
    description: "This programme supports excellent scientific research that has the potential to deliver significant economic and societal impact for Ireland in the area of Artificial Intelligence."
  });

  const [applicationInfo] = useState<ApplicationInfo>({
    id: applicationId,
    title: "AI-Powered Climate Prediction Models for Irish Agriculture",
    status: "draft",
    createdAt: "2025-05-15",
    lastModified: "2025-06-06",
    completionPercentage: 35,
    sections: [
      { name: "Executive Summary", required: true, completed: false, wordLimit: 1000, currentWords: 0 },
      { name: "Project Description", required: true, completed: false, wordLimit: 5000, currentWords: 1250 },
      { name: "Methodology", required: true, completed: false, wordLimit: 2500, currentWords: 0 },
      { name: "Budget Justification", required: true, completed: false, wordLimit: 1500, currentWords: 0 },
      { name: "Impact Statement", required: true, completed: false, wordLimit: 1000, currentWords: 0 },
      { name: "Team Expertise", required: true, completed: true, wordLimit: 1500, currentWords: 1450 }
    ]
  });

  const [organizationInfo] = useState<OrganizationInfo>({
    id: "org-1",
    name: "Trinity College Dublin",
    type: "University",
    location: "Dublin, Ireland",
    size: "Large (>1000 researchers)"
  });

  const [, _setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);

  const handleContentChange = (newContent: string) => {
    _setContent(newContent);
    const words = newContent.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const handleSave = (content: string) => {
    console.log('Saving content:', content);
    // In production, this would save to the backend
  };

  const currentSection = applicationInfo.sections.find(s => 
    s.name.toLowerCase().replace(/\s+/g, '_') === sectionType
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closing_soon': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDeadline = () => {
    const deadline = new Date(grantInfo.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysUntilDeadline();

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {sectionTitle}
              </h1>
              <p className="text-sm text-gray-600">
                {applicationInfo.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
              </div>
              <div className="text-xs text-gray-500">
                Deadline: {new Date(grantInfo.deadline).toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button size="sm">
                <Send className="h-4 w-4 mr-2" />
                Submit Section
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Context Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Tabs defaultValue="grant" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="grant" className="flex-1">Grant</TabsTrigger>
              <TabsTrigger value="application" className="flex-1">Application</TabsTrigger>
              <TabsTrigger value="progress" className="flex-1">Progress</TabsTrigger>
              <TabsTrigger value="autogen" className="flex-1">Auto-Gen</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="grant" className="space-y-4 mt-0">
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Grant Information</h3>
                    <Badge className={getStatusColor(grantInfo.status)}>
                      {grantInfo.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{grantInfo.funder}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>{grantInfo.amount}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Due {new Date(grantInfo.deadline).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Eligibility</h4>
                  <ul className="space-y-1">
                    {grantInfo.eligibility.map((item, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{grantInfo.description}</p>
                </Card>
              </TabsContent>

              <TabsContent value="application" className="space-y-4 mt-0">
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Application</h3>
                    <Badge className={getStatusColor(applicationInfo.status)}>
                      {applicationInfo.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{organizationInfo.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Last saved {new Date(applicationInfo.lastModified).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Current Section</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{currentSection?.name}</span>
                      <Badge variant={currentSection?.completed ? 'default' : 'secondary'}>
                        {currentSection?.completed ? 'Complete' : 'In Progress'}
                      </Badge>
                    </div>
                    
                    {currentSection?.wordLimit && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Words: {wordCount}</span>
                          <span>Limit: {currentSection.wordLimit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              wordCount > currentSection.wordLimit 
                                ? 'bg-red-500' 
                                : wordCount > currentSection.wordLimit * 0.8 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.min((wordCount / currentSection.wordLimit) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="progress" className="space-y-4 mt-0">
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Application Progress</h3>
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Overall completion</span>
                      <span>{applicationInfo.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${applicationInfo.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Sections</h4>
                  <div className="space-y-2">
                    {applicationInfo.sections.map((section, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          {section.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : section.currentWords && section.currentWords > 0 ? (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span className="text-sm font-medium">{section.name}</span>
                          {section.required && (
                            <span className="text-xs text-red-500">*</span>
                          )}
                        </div>
                        
                        {section.wordLimit && (
                          <span className="text-xs text-gray-500">
                            {section.currentWords || 0}/{section.wordLimit}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="autogen" className="space-y-4 mt-0">
                <AutoGenerationPanel
                  grantId={grantId}
                  organizationId="test-org"
                  applicationId={applicationId}
                  onSectionGenerated={(sectionType, content) => {
                    // Update the editor content
                    _setContent(content);
                    const words = content.split(/\s+/).filter(word => word.length > 0);
                    setWordCount(words.length);
                  }}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Main Editor */}
        <div className="flex-1">
          <AIEditorV2
            applicationId={applicationId}
            grantId={grantId}
            sectionType={sectionType}
            sectionTitle={sectionTitle}
            initialContent={initialContent}
            onSave={handleSave}
            onContentChange={handleContentChange}
            fullPage={true}
          />
        </div>
      </div>
    </div>
  );
}