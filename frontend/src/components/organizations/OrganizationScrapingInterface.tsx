'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  FileText, 
  Play, 
  Eye, 
  RefreshCw,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  ExternalLink,
  Brain,
  Zap,
  Building,
  TrendingUp,
  Target,
  Lightbulb,
  Database,
  Download,
  Settings
} from 'lucide-react';
import { firecrawlService } from '@/lib/api/firecrawlService';

interface Organization {
  id: string;
  name: string;
  website?: string;
  type?: string;
  description?: string;
}

interface OrganizationCapability {
  id: string;
  capability_type: string;
  capability_name: string;
  description: string;
  proficiency_level: string;
  evidence_sources: string[];
  keywords: string[];
  created_at: string;
}

interface OrganizationIntelligence {
  id: string;
  data_source: string;
  intelligence_type: string;
  extracted_data: any;
  summary: string;
  keywords: string[];
  relevance_tags: string[];
  confidence_score: number;
  created_at: string;
}

interface ScrapingResult {
  success: boolean;
  organizationId: string;
  websiteUrl: string;
  pagesScraped: number;
  intelligenceExtracted: number;
  capabilitiesIdentified: number;
  scrapedPages: string[];
  error?: string;
}

export default function OrganizationScrapingInterface() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [capabilities, setCapabilities] = useState<OrganizationCapability[]>([]);
  const [intelligence, setIntelligence] = useState<OrganizationIntelligence[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [scrapingResults, setScrapingResults] = useState<ScrapingResult[]>([]);

  // Scraping options
  const [scrapingOptions, setScrapingOptions] = useState({
    maxPages: 5,
    includePdfs: true,
    followLinks: true
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadOrganizationData(selectedOrg.id);
    }
  }, [selectedOrg]);

  const loadOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadOrganizationData = async (orgId: string) => {
    setLoading(true);
    try {
      // Load capabilities and intelligence in parallel
      const [capabilitiesRes, intelligenceRes] = await Promise.all([
        firecrawlService.getOrganizationCapabilities(orgId),
        firecrawlService.getOrganizationIntelligence(orgId)
      ]);

      setCapabilities(capabilitiesRes.capabilities || []);
      setIntelligence(intelligenceRes.intelligence || []);
    } catch (error) {
      console.error('Failed to load organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startScraping = async (websiteUrl: string) => {
    if (!selectedOrg) return;

    setScraping(true);
    try {
      const result = await firecrawlService.scrapeAndAnalyzeOrganization(
        selectedOrg.id,
        websiteUrl,
        scrapingOptions
      );

      setScrapingResults(prev => [result, ...prev]);
      
      if (result.success) {
        // Reload organization data to show new capabilities and intelligence
        await loadOrganizationData(selectedOrg.id);
      }
    } catch (error) {
      console.error('Scraping failed:', error);
    } finally {
      setScraping(false);
    }
  };

  const createOrganization = async (name: string, website: string, description: string) => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          website,
          description,
          type: 'research'
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadOrganizations();
        setSelectedOrg(data.organization);
        setShowNewOrgModal(false);
        
        // Auto-start scraping if website provided
        if (website) {
          await startScraping(website);
        }
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCapabilityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      technical_capabilities: 'bg-blue-100 text-blue-800',
      research_expertise: 'bg-purple-100 text-purple-800',
      infrastructure: 'bg-green-100 text-green-800',
      partnerships: 'bg-orange-100 text-orange-800',
      team_expertise: 'bg-pink-100 text-pink-800',
      financial_strength: 'bg-indigo-100 text-indigo-800',
      track_record: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getIntelligenceTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      technical_capabilities: <Zap className="h-4 w-4" />,
      research_expertise: <Brain className="h-4 w-4" />,
      track_record: <TrendingUp className="h-4 w-4" />,
      infrastructure: <Building className="h-4 w-4" />,
      partnerships: <Target className="h-4 w-4" />,
      team_expertise: <Eye className="h-4 w-4" />,
      financial_strength: <Database className="h-4 w-4" />
    };
    return icons[type] || <Lightbulb className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organization Intelligence</h1>
          <p className="text-gray-600">Analyze organizations by scraping their websites and extracting capabilities</p>
        </div>
        <Button onClick={() => setShowNewOrgModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organizations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {filteredOrganizations.map(org => (
                <div
                  key={org.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedOrg?.id === org.id 
                      ? 'bg-blue-50 border-blue-200 border' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedOrg(org)}
                >
                  <div className="font-medium">{org.name}</div>
                  {org.website && (
                    <div className="text-sm text-gray-500 truncate">{org.website}</div>
                  )}
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">{org.type || 'Unknown'}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {capabilities.filter(c => c.id === org.id).length} capabilities
                    </Badge>
                  </div>
                </div>
              ))}
              {filteredOrganizations.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No organizations found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOrg ? (
            <>
              {/* Organization Header & Scraping */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        {selectedOrg.name}
                      </CardTitle>
                      <CardDescription>{selectedOrg.description}</CardDescription>
                      {selectedOrg.website && (
                        <div className="flex items-center gap-2 mt-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a 
                            href={selectedOrg.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {selectedOrg.website}
                          </a>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => loadOrganizationData(selectedOrg.id)}
                        disabled={loading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Website Scraping Form */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Website Analysis</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Input
                            placeholder="https://organization-website.com"
                            defaultValue={selectedOrg.website || ''}
                            id="website-url"
                            className="bg-white"
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Max Pages</label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={scrapingOptions.maxPages}
                              onChange={(e) => setScrapingOptions(prev => ({
                                ...prev,
                                maxPages: Number(e.target.value)
                              }))}
                              className="bg-white"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={scrapingOptions.includePdfs}
                                onChange={(e) => setScrapingOptions(prev => ({
                                  ...prev,
                                  includePdfs: e.target.checked
                                }))}
                              />
                              Include PDFs
                            </label>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={scrapingOptions.followLinks}
                                onChange={(e) => setScrapingOptions(prev => ({
                                  ...prev,
                                  followLinks: e.target.checked
                                }))}
                              />
                              Follow Links
                            </label>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => {
                            const url = (document.getElementById('website-url') as HTMLInputElement)?.value;
                            if (url) startScraping(url);
                          }}
                          disabled={scraping}
                          className="w-full"
                        >
                          {scraping ? (
                            <>
                              <Activity className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing Website...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start Analysis
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Recent Scraping Results */}
                    {scrapingResults.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recent Analysis Results</h4>
                        <div className="space-y-2">
                          {scrapingResults.slice(0, 3).map((result, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {result.success ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className="text-sm font-medium truncate">
                                      {result.websiteUrl}
                                    </span>
                                  </div>
                                  {result.success ? (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {result.pagesScraped} pages • {result.intelligenceExtracted} insights • {result.capabilitiesIdentified} capabilities
                                    </div>
                                  ) : (
                                    <div className="text-xs text-red-600 mt-1">
                                      {result.error}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">{intelligence.length}</div>
                        <div className="text-sm text-gray-600">Intelligence Items</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="text-2xl font-bold">{capabilities.length}</div>
                        <div className="text-sm text-gray-600">Capabilities</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">
                          {Math.round((intelligence.reduce((sum, item) => sum + item.confidence_score, 0) / intelligence.length || 0) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Avg. Confidence</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Organization Capabilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Capabilities ({capabilities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {capabilities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Zap className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No capabilities found. Try running a website analysis.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {capabilities.map(capability => (
                        <div key={capability.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-medium">{capability.capability_name}</div>
                              <div className="text-sm text-gray-600">{capability.description}</div>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getCapabilityTypeColor(capability.capability_type)}>
                                {capability.capability_type.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline">{capability.proficiency_level}</Badge>
                            </div>
                          </div>
                          {capability.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {capability.keywords.slice(0, 5).map((keyword, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {capability.keywords.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{capability.keywords.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Organization Intelligence */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Intelligence ({intelligence.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {intelligence.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No intelligence data found. Try running a website analysis.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {intelligence.map(item => (
                        <div key={item.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {getIntelligenceTypeIcon(item.intelligence_type)}
                              <span className="font-medium">{item.intelligence_type.replace('_', ' ')}</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline">{item.data_source}</Badge>
                              <Badge variant={item.confidence_score >= 0.8 ? 'default' : 'outline'}>
                                {Math.round(item.confidence_score * 100)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{item.summary}</div>
                          {item.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.keywords.slice(0, 5).map((keyword, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {item.keywords.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.keywords.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Select an Organization</h3>
                <p className="text-gray-500 mb-4">Choose an organization from the list to view and analyze its capabilities</p>
                <Button onClick={() => setShowNewOrgModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Organization Modal */}
      {showNewOrgModal && (
        <NewOrganizationModal
          onClose={() => setShowNewOrgModal(false)}
          onSubmit={createOrganization}
        />
      )}
    </div>
  );
}

// New Organization Modal Component
function NewOrganizationModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (name: string, website: string, description: string) => void;
}) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, website, description);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add New Organization</CardTitle>
          <CardDescription>
            Add an organization to analyze its capabilities and intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Organization Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Research Institute"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Website (Optional)</label>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.organization.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the organization..."
                rows={3}
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Auto-Analysis</span>
              </div>
              <p className="text-xs text-blue-700">
                If a website is provided, we'll automatically analyze it to extract capabilities and intelligence
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={!name.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}