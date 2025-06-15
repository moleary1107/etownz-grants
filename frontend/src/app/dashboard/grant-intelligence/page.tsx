'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Grant {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  status: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Requirement {
  id: string;
  requirementType: string;
  category: string;
  requirementText: string;
  mandatory: boolean;
  weight: number;
  confidenceScore: number;
}

interface ComplianceAssessment {
  grantId: string;
  organizationId: string;
  overallScore: number;
  eligibilityStatus: string;
  strengths: string[];
  gapsIdentified: Array<{ type: string; requirement: string }>;
  recommendations: string[];
}

interface GrantMatch {
  grantId: string;
  matchScore: number;
  matchReasons: string[];
  missingRequirements: string[];
  improvementSuggestions: string[];
  priorityLevel: string;
}

interface IntelligenceFindings {
  intelligenceType: string;
  summary: string;
  keywords: string[];
  confidenceScore: number;
}

export default function GrantIntelligencePage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<string>('');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [activeTab, setActiveTab] = useState('extract');
  
  // State for different features
  const [documentContent, setDocumentContent] = useState('');
  const [websiteContent, setWebsiteContent] = useState('');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [compliance, setCompliance] = useState<ComplianceAssessment | null>(null);
  const [matches, setMatches] = useState<GrantMatch[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceFindings[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load grants and organizations
      const [grantsResponse, orgsResponse] = await Promise.all([
        fetch(process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api/grants' : 'http://localhost:8001/grants'),
        fetch(process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api/organizations' : 'http://localhost:8001/organizations')
      ]);
      
      if (grantsResponse.ok) {
        const grantsData = await grantsResponse.json();
        setGrants(grantsData.data || []);
      }
      
      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json();
        setOrganizations(orgsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load grants and organizations');
    }
  };

  const extractRequirements = async () => {
    if (!selectedGrant || !documentContent.trim()) {
      setError('Please select a grant and provide document content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api/grant-intelligence/extract-requirements' : 'http://localhost:8001/grant-intelligence/extract-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          grantId: selectedGrant,
          documentContent,
          documentType: 'call_document'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setRequirements(data.data.requirements || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to extract requirements');
      }
    } catch {
      setError('Network error extracting requirements');
    } finally {
      setLoading(false);
    }
  };

  const extractIntelligence = async () => {
    if (!selectedOrg || !websiteContent.trim()) {
      setError('Please select an organization and provide website content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api/grant-intelligence/extract-org-intelligence' : 'http://localhost:8001/grant-intelligence/extract-org-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          organizationId: selectedOrg,
          source: 'https://example.com',
          content: websiteContent,
          sourceType: 'website'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIntelligence(data.data.intelligence || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to extract intelligence');
      }
    } catch {
      setError('Network error extracting intelligence');
    } finally {
      setLoading(false);
    }
  };

  const assessCompliance = async () => {
    if (!selectedGrant || !selectedOrg) {
      setError('Please select both a grant and organization');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api/grant-intelligence/assess-compliance' : 'http://localhost:8001/grant-intelligence/assess-compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          grantId: selectedGrant,
          organizationId: selectedOrg
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCompliance(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to assess compliance');
      }
    } catch {
      setError('Network error assessing compliance');
    } finally {
      setLoading(false);
    }
  };

  const findMatches = async () => {
    if (!selectedOrg) {
      setError('Please select an organization');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api' : 'http://localhost:8001'}/grant-intelligence/find-matches/${selectedOrg}?minMatchScore=40`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setMatches(data.data.matches || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to find matches');
      }
    } catch {
      setError('Network error finding matches');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800';
      case 'not_eligible': return 'bg-red-100 text-red-800';
      case 'partially_eligible': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Grant Intelligence & Analysis</h1>
        <Badge variant="outline" className="text-sm">
          AI-Powered Grant Analysis
        </Badge>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Select Grant</h3>
          <select 
            value={selectedGrant} 
            onChange={(e) => setSelectedGrant(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select a grant...</option>
            {grants.map((grant) => (
              <option key={grant.id} value={grant.id}>
                {grant.title} - €{grant.amount?.toLocaleString()}
              </option>
            ))}
          </select>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Select Organization</h3>
          <select 
            value={selectedOrg} 
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select an organization...</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="extract">Extract Requirements</TabsTrigger>
          <TabsTrigger value="intelligence">Organization Intelligence</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Assessment</TabsTrigger>
          <TabsTrigger value="matches">Grant Matching</TabsTrigger>
        </TabsList>

        <TabsContent value="extract" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Extract Grant Requirements</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Grant Document Content</label>
                <Textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  className="w-full h-32 resize-none"
                  placeholder="Paste grant document content here..."
                />
              </div>
              <Button 
                onClick={extractRequirements} 
                disabled={loading || !selectedGrant || !documentContent.trim()}
                className="w-full"
              >
                {loading ? 'Extracting...' : 'Extract Requirements'}
              </Button>
            </div>

            {requirements.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Extracted Requirements ({requirements.length})</h4>
                <div className="space-y-3">
                  {requirements.map((req) => (
                    <Card key={req.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{req.requirementType}</Badge>
                            {req.category && <Badge variant="secondary">{req.category}</Badge>}
                            <Badge variant={req.mandatory ? "default" : "outline"}>
                              {req.mandatory ? 'Mandatory' : 'Optional'}
                            </Badge>
                          </div>
                          <p className="text-gray-700">{req.requirementText}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Weight: {req.weight}</div>
                          <div className="text-sm text-gray-500">Confidence: {(req.confidenceScore * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Extract Organization Intelligence</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Website/Document Content</label>
                <Textarea
                  value={websiteContent}
                  onChange={(e) => setWebsiteContent(e.target.value)}
                  className="w-full h-32 resize-none"
                  placeholder="Paste organization website or document content here..."
                />
              </div>
              <Button 
                onClick={extractIntelligence} 
                disabled={loading || !selectedOrg || !websiteContent.trim()}
                className="w-full"
              >
                {loading ? 'Extracting...' : 'Extract Intelligence'}
              </Button>
            </div>

            {intelligence.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Intelligence Findings ({intelligence.length})</h4>
                <div className="space-y-3">
                  {intelligence.map((intel, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{intel.intelligenceType}</Badge>
                            <span className="text-sm text-gray-500">
                              Confidence: {(intel.confidenceScore * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{intel.summary}</p>
                          <div className="flex flex-wrap gap-1">
                            {intel.keywords.map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Compliance Assessment</h3>
            <Button 
              onClick={assessCompliance} 
              disabled={loading || !selectedGrant || !selectedOrg}
              className="w-full mb-4"
            >
              {loading ? 'Assessing...' : 'Assess Compliance'}
            </Button>

            {compliance && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {compliance.overallScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Score</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <Badge className={getStatusColor(compliance.eligibilityStatus)}>
                      {compliance.eligibilityStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">Eligibility Status</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {compliance.strengths.length}
                    </div>
                    <div className="text-sm text-gray-600">Strengths</div>
                  </Card>
                </div>

                {compliance.strengths.length > 0 && (
                  <Card className="p-4">
                    <h5 className="font-semibold text-green-700 mb-2">Strengths</h5>
                    <ul className="space-y-1">
                      {compliance.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-gray-700">• {strength}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {compliance.gapsIdentified.length > 0 && (
                  <Card className="p-4">
                    <h5 className="font-semibold text-red-700 mb-2">Gaps Identified</h5>
                    <div className="space-y-2">
                      {compliance.gapsIdentified.map((gap, index) => (
                        <div key={index} className="text-sm">
                          <Badge variant="outline" className="mr-2">{gap.type}</Badge>
                          <span className="text-gray-700">{gap.requirement}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {compliance.recommendations.length > 0 && (
                  <Card className="p-4">
                    <h5 className="font-semibold text-blue-700 mb-2">Recommendations</h5>
                    <ul className="space-y-1">
                      {compliance.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700">• {rec}</li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Grant Matching</h3>
            <Button 
              onClick={findMatches} 
              disabled={loading || !selectedOrg}
              className="w-full mb-4"
            >
              {loading ? 'Finding Matches...' : 'Find Grant Matches'}
            </Button>

            {matches.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Found {matches.length} Matching Grants</h4>
                {matches.map((match) => (
                  <Card key={match.grantId} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold">
                          Match Score: {match.matchScore.toFixed(1)}%
                        </div>
                        <Badge className={getPriorityColor(match.priorityLevel)}>
                          {match.priorityLevel.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                    </div>

                    {match.matchReasons.length > 0 && (
                      <div className="mb-3">
                        <h6 className="font-medium text-green-700 mb-1">Match Reasons:</h6>
                        <ul className="text-sm text-gray-700">
                          {match.matchReasons.map((reason, i) => (
                            <li key={i}>• {reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.missingRequirements.length > 0 && (
                      <div className="mb-3">
                        <h6 className="font-medium text-red-700 mb-1">Missing Requirements:</h6>
                        <ul className="text-sm text-gray-700">
                          {match.missingRequirements.slice(0, 3).map((req, i) => (
                            <li key={i}>• {req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.improvementSuggestions.length > 0 && (
                      <div>
                        <h6 className="font-medium text-blue-700 mb-1">Improvement Suggestions:</h6>
                        <ul className="text-sm text-gray-700">
                          {match.improvementSuggestions.slice(0, 2).map((suggestion, i) => (
                            <li key={i}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}