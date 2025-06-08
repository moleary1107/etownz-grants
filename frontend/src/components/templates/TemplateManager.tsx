'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Play, 
  Eye, 
  RefreshCw,
  Search,
  Plus,
  CheckCircle,
  Clock,
  Activity,
  Download,
  Settings,
  Zap,
  BookOpen,
  PenTool,
  Layers,
  Target,
  Users,
  Calendar,
  DollarSign,
  BarChart,
  Archive,
  Copy,
  Edit
} from 'lucide-react';
import { templatesService, GrantTemplate, SectionTemplate, GeneratedSection, TemplateVariable } from '@/lib/api/templatesService';

interface Organization {
  id: string;
  name: string;
  website?: string;
}

interface Grant {
  id: string;
  title: string;
  funding_amount_max?: number;
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<GrantTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<GrantTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  
  // Generation state
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedGrant, setSelectedGrant] = useState<string>('');
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Available options
  const [categories, setCategories] = useState<string[]>([]);
  const [grantTypes, setGrantTypes] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);

  useEffect(() => {
    loadTemplates();
    loadCategories();
    loadOrganizations();
    loadGrants();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter, typeFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await templatesService.listTemplates({
        category: categoryFilter || undefined,
        grant_type: typeFilter || undefined,
        limit: 50
      });
      setTemplates(result.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await templatesService.getCategories();
      setCategories(result.categories);
      setGrantTypes(result.grant_types);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

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

  const loadGrants = async () => {
    try {
      const response = await fetch('/api/grants', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGrants(data.grants || []);
      }
    } catch (error) {
      console.error('Failed to load grants:', error);
    }
  };

  const seedDefaultTemplates = async () => {
    try {
      await templatesService.seedDefaultTemplates();
      await loadTemplates();
    } catch (error) {
      console.error('Failed to seed default templates:', error);
    }
  };

  const generateApplication = async () => {
    if (!selectedTemplate) return;

    setGenerating(true);
    setGenerationProgress(0);
    setGeneratedSections([]);

    try {
      // Validate variables
      const allVariables = templatesService.extractAllVariables(selectedTemplate);
      const validation = templatesService.validateVariables(variables, allVariables);
      
      if (!validation.isValid) {
        alert('Please fill in all required fields:\n' + validation.errors.join('\n'));
        return;
      }

      // Generate complete application
      const result = await templatesService.generateApplication(
        selectedTemplate.id,
        variables,
        selectedOrganization || undefined,
        selectedGrant || undefined
      );

      setGeneratedSections(result.sections);
      setGenerationProgress(100);
    } catch (error) {
      console.error('Failed to generate application:', error);
      alert('Failed to generate application. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const generateSection = async (sectionId: string) => {
    if (!selectedTemplate) return;

    try {
      const section = selectedTemplate.section_templates.find(s => s.id === sectionId);
      if (!section) return;

      setGenerating(true);

      const result = await templatesService.generateSectionContent(
        sectionId,
        variables,
        selectedOrganization || undefined,
        selectedGrant || undefined
      );

      // Update or add the generated section
      setGeneratedSections(prev => {
        const index = prev.findIndex(s => s.section_name === result.section_name);
        if (index >= 0) {
          const newSections = [...prev];
          newSections[index] = result;
          return newSections;
        } else {
          return [...prev, result];
        }
      });
    } catch (error) {
      console.error('Failed to generate section:', error);
      alert('Failed to generate section. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const exportApplication = () => {
    if (generatedSections.length === 0) return;

    const content = generatedSections
      .sort((a, b) => {
        const templateSection = selectedTemplate?.section_templates.find(s => s.section_name === a.section_name);
        const templateSectionB = selectedTemplate?.section_templates.find(s => s.section_name === b.section_name);
        return (templateSection?.order_index || 0) - (templateSectionB?.order_index || 0);
      })
      .map(section => `# ${section.section_name}\n\n${section.content}\n\n`)
      .join('---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate?.name || 'grant-application'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSectionIcon = (sectionType: string) => {
    const icons: Record<string, any> = {
      executive_summary: <FileText className="h-4 w-4" />,
      project_description: <BookOpen className="h-4 w-4" />,
      methodology: <Settings className="h-4 w-4" />,
      budget: <DollarSign className="h-4 w-4" />,
      timeline: <Calendar className="h-4 w-4" />,
      team: <Users className="h-4 w-4" />,
      impact: <Target className="h-4 w-4" />,
      evaluation: <BarChart className="h-4 w-4" />,
      references: <Archive className="h-4 w-4" />,
      custom: <Layers className="h-4 w-4" />
    };
    return icons[sectionType] || <FileText className="h-4 w-4" />;
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Grant Application Templates</h1>
          <p className="text-gray-600">Create and manage section-specific content templates for grant applications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seedDefaultTemplates}>
            <Plus className="h-4 w-4 mr-2" />
            Seed Defaults
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Templates
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Zap className="h-4 w-4 mr-2" />
            Generate Content
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview & Export
          </TabsTrigger>
        </TabsList>

        {/* Browse Templates Tab */}
        <TabsContent value="browse" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Grant Types</option>
              {grantTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <Button variant="outline" onClick={loadTemplates}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-gray-500 mb-4">Create or seed default templates to get started</p>
              <Button onClick={seedDefaultTemplates}>
                <Plus className="h-4 w-4 mr-2" />
                Seed Default Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex gap-1">
                        <Badge variant="outline">{template.category}</Badge>
                        <Badge variant="secondary">{template.grant_type}</Badge>
                      </div>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>{template.sections_count || template.section_templates?.length || 0} sections</span>
                      <span>{new Date(template.created_at).toLocaleDateString()}</span>
                    </div>
                    {template.section_templates && (
                      <div className="mt-3">
                        <div className="text-xs font-medium mb-2">Sections:</div>
                        <div className="flex flex-wrap gap-1">
                          {template.section_templates.slice(0, 4).map(section => (
                            <div key={section.id} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                              {getSectionIcon(section.section_type)}
                              {section.section_name}
                            </div>
                          ))}
                          {template.section_templates.length > 4 && (
                            <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                              +{template.section_templates.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Generate Content Tab */}
        <TabsContent value="generate" className="space-y-4">
          {!selectedTemplate ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Select a Template</h3>
                <p className="text-gray-500 mb-4">Choose a template from the Browse tab to start generating content</p>
                <Button onClick={() => setActiveTab('browse')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configuration Panel */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Template Info */}
                    <div>
                      <h4 className="font-medium mb-2">Selected Template</h4>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium">{selectedTemplate.name}</div>
                        <div className="text-sm text-gray-600">{selectedTemplate.description}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{selectedTemplate.category}</Badge>
                          <Badge variant="secondary">{selectedTemplate.grant_type}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Organization Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Organization (Optional)</label>
                      <select
                        value={selectedOrganization}
                        onChange={(e) => setSelectedOrganization(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select organization...</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Grant Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Grant (Optional)</label>
                      <select
                        value={selectedGrant}
                        onChange={(e) => setSelectedGrant(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select grant...</option>
                        {grants.map(grant => (
                          <option key={grant.id} value={grant.id}>{grant.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Variables */}
                    <div>
                      <h4 className="font-medium mb-2">Template Variables</h4>
                      <div className="space-y-3">
                        {templatesService.extractAllVariables(selectedTemplate).map(variable => (
                          <div key={variable.name}>
                            <label className="block text-sm font-medium mb-1">
                              {variable.description}
                              {variable.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {variable.type === 'text' || variable.type === 'date' ? (
                              <Input
                                type={variable.type === 'date' ? 'date' : 'text'}
                                value={variables[variable.name] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  [variable.name]: e.target.value
                                }))}
                                placeholder={variable.default_value || ''}
                              />
                            ) : variable.type === 'number' ? (
                              <Input
                                type="number"
                                value={variables[variable.name] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  [variable.name]: e.target.value
                                }))}
                                placeholder={variable.default_value || ''}
                              />
                            ) : variable.type === 'list' ? (
                              <Textarea
                                value={Array.isArray(variables[variable.name]) 
                                  ? variables[variable.name].join(', ') 
                                  : variables[variable.name] || ''
                                }
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  [variable.name]: e.target.value
                                }))}
                                placeholder="Enter items separated by commas"
                                rows={2}
                              />
                            ) : (
                              <Input
                                value={variables[variable.name] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  [variable.name]: e.target.value
                                }))}
                                placeholder={variable.default_value || ''}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button 
                      onClick={generateApplication}
                      disabled={generating}
                      className="w-full"
                    >
                      {generating ? (
                        <>
                          <Activity className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate Application
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Sections Panel */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Template Sections ({selectedTemplate.section_templates.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedTemplate.section_templates
                        .sort((a, b) => a.order_index - b.order_index)
                        .map(section => (
                        <div key={section.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(section.section_type)}
                              <span className="font-medium">{section.section_name}</span>
                              {section.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateSection(section.id)}
                                disabled={generating}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Generate
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {section.word_count_range.min}-{section.word_count_range.max} words
                          </div>
                          {section.variables.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Variables: {section.variables.map(v => v.name).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Preview & Export Tab */}
        <TabsContent value="preview" className="space-y-4">
          {generatedSections.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Generated Content</h3>
                <p className="text-gray-500 mb-4">Generate content from the Generate tab to preview and export</p>
                <Button onClick={() => setActiveTab('generate')}>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Export Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={exportApplication}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as Markdown
                    </Button>
                    <Button variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    Total word count: {generatedSections.reduce((sum, section) => sum + section.word_count, 0)} words
                  </div>
                </CardContent>
              </Card>

              {/* Generated Sections */}
              {generatedSections
                .sort((a, b) => {
                  const templateSection = selectedTemplate?.section_templates.find(s => s.section_name === a.section_name);
                  const templateSectionB = selectedTemplate?.section_templates.find(s => s.section_name === b.section_name);
                  return (templateSection?.order_index || 0) - (templateSectionB?.order_index || 0);
                })
                .map(section => (
                <Card key={section.section_name}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2">
                        {getSectionIcon(
                          selectedTemplate?.section_templates.find(s => s.section_name === section.section_name)?.section_type || 'custom'
                        )}
                        {section.section_name}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">{section.word_count} words</Badge>
                        <Badge variant={section.metadata.confidence_score >= 0.8 ? 'default' : 'secondary'}>
                          {Math.round(section.metadata.confidence_score * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm">
                        {section.content}
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Generated in {section.metadata.generation_time}ms using {section.metadata.template_used}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}