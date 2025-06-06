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
  Globe, 
  FileText, 
  Play, 
  Pause, 
  Eye, 
  Download, 
  Trash2, 
  RefreshCw,
  Search,
  Filter,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Upload,
  Link,
  Archive,
  Star,
  Calendar,
  MapPin,
  Tag,
  ExternalLink,
  Database,
  Zap
} from 'lucide-react';

interface CrawlJob {
  id: string;
  source_url: string;
  job_type: 'full_crawl' | 'targeted_scrape' | 'document_harvest' | 'link_discovery' | 'manual_url' | 'manual_document';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  stats: {
    pages_scraped: number;
    documents_processed: number;
    links_discovered: number;
    grants_found: number;
    errors_encountered: number;
    processing_time_ms: number;
    grants_by_type: {
      national: number;
      regional: number;
      local: number;
      energy: number;
      research: number;
      business: number;
      arts: number;
      other: number;
    };
  };
  grant_categories: string[];
  started_at: string;
  completed_at?: string;
  created_at: string;
  added_to_vector_db: boolean;
  manual_input?: {
    type: 'url' | 'document';
    file_name?: string;
    original_url?: string;
  };
}

interface ScrapedGrant {
  id: string;
  title: string;
  description: string;
  source_url: string;
  amount_min?: number;
  amount_max?: number;
  currency: string;
  deadline?: string;
  eligibility: string[];
  categories: string[];
  grant_type: 'national' | 'regional' | 'local' | 'energy' | 'research' | 'business' | 'arts' | 'other';
  contact_email?: string;
  contact_phone?: string;
  organization: string;
  location: string;
  created_at: string;
  confidence_score: number;
  added_to_vector_db: boolean;
  job_id: string;
}

interface UploadedDocument {
  id: string;
  name: string;
  file_type: 'pdf' | 'docx' | 'doc' | 'txt' | 'url';
  size?: number;
  grants_extracted: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  job_id?: string;
}

export default function ScrapingDashboard() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [grants, setGrants] = useState<ScrapedGrant[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [showManualUploadModal, setShowManualUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'url' | 'document'>('url');

  // Enhanced Stats
  const [stats, setStats] = useState({
    jobs: { 
      total: 0, 
      completed: 0, 
      running: 0, 
      failed: 0 
    },
    grants: { 
      total: 0,
      added_to_vector_db: 0,
      by_type: {
        national: 0,
        regional: 0,
        local: 0,
        energy: 0,
        research: 0,
        business: 0,
        arts: 0,
        other: 0
      }
    },
    documents: { 
      total: 0,
      processed: 0
    }
  });

  useEffect(() => {
    loadData();
    loadStats();
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      if (activeTab === 'jobs') {
        loadJobs();
      }
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'jobs':
          await loadJobs();
          break;
        case 'grants':
          await loadGrants();
          break;
        case 'documents':
          await loadDocuments();
          break;
      }
      await loadStats();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('job_type', typeFilter);
      
      const response = await fetch(`/api/scraping/jobs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const loadGrants = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('grant_type', typeFilter);
      
      const response = await fetch(`/api/scraping/grants?${params}`);
      if (response.ok) {
        const data = await response.json();
        setGrants(data.grants || []);
      }
    } catch (error) {
      console.error('Failed to load grants:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/scraping/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/scraping/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const startNewJob = async (sourceUrl: string, jobType: string, config: any) => {
    try {
      const response = await fetch('/api/scraping/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: sourceUrl,
          job_type: jobType,
          configuration: {
            ...config,
            add_to_vector_db: true,
            extract_grant_categories: true
          }
        })
      });

      if (response.ok) {
        setShowNewJobModal(false);
        loadJobs();
        loadStats();
      } else {
        console.error('Failed to start job:', await response.text());
      }
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  };

  const uploadManualContent = async (data: any) => {
    try {
      const endpoint = uploadType === 'url' ? '/api/scraping/manual/url' : '/api/scraping/manual/document';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: uploadType === 'url' ? { 'Content-Type': 'application/json' } : undefined,
        body: uploadType === 'url' ? JSON.stringify(data) : data
      });

      if (response.ok) {
        setShowManualUploadModal(false);
        loadJobs();
        loadStats();
      } else {
        console.error('Failed to upload:', await response.text());
      }
    } catch (error) {
      console.error('Failed to upload:', error);
    }
  };

  const addToVectorDatabase = async (grantIds: string[]) => {
    try {
      const response = await fetch('/api/scraping/add-to-vector-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_ids: grantIds })
      });

      if (response.ok) {
        loadGrants();
        loadStats();
      }
    } catch (error) {
      console.error('Failed to add to vector database:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      running: 'default',
      completed: 'secondary',
      failed: 'destructive',
      pending: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.source_url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || job.status === statusFilter;
    const matchesType = !typeFilter || job.job_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredGrants = grants.filter(grant => {
    const matchesSearch = grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grant.organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || grant.grant_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || doc.file_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (min?: number, max?: number, currency: string = 'EUR') => {
    if (!min && !max) return 'Not specified';
    if (min && max && min !== max) {
      return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    }
    const amount = min || max;
    return `${currency} ${amount?.toLocaleString()}`;
  };

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    return date.toLocaleDateString();
  };

  const getGrantTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      national: 'bg-blue-100 text-blue-800',
      regional: 'bg-green-100 text-green-800',
      local: 'bg-yellow-100 text-yellow-800',
      energy: 'bg-orange-100 text-orange-800',
      research: 'bg-purple-100 text-purple-800',
      business: 'bg-indigo-100 text-indigo-800',
      arts: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Grant Scraping & Management</h1>
          <p className="text-gray-600">Discover, scrape, and manage grant opportunities with AI-powered extraction</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setUploadType('url'); setShowManualUploadModal(true); }}>
            <Link className="h-4 w-4 mr-2" />
            Add URL
          </Button>
          <Button variant="outline" onClick={() => { setUploadType('document'); setShowManualUploadModal(true); }}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
          <Button onClick={() => setShowNewJobModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Crawl Job
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scraping Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobs.total}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-green-600">{stats.jobs.completed} completed</span>
              <span className="mx-1">•</span>
              <span className="text-blue-600">{stats.jobs.running} running</span>
              <span className="mx-1">•</span>
              <span className="text-red-600">{stats.jobs.failed} failed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grants Found</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.grants.total}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Database className="h-3 w-3 mr-1" />
              <span>{stats.grants.added_to_vector_db} in knowledge base</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grant Types</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>National:</span>
                <span className="font-medium">{stats.grants.by_type.national}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Regional:</span>
                <span className="font-medium">{stats.grants.by_type.regional}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Energy:</span>
                <span className="font-medium">{stats.grants.by_type.energy}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.total}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span>{stats.documents.processed} processed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filter */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jobs, grants, organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {activeTab === 'jobs' && (
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Job Types</option>
              <option value="full_crawl">Full Crawl</option>
              <option value="targeted_scrape">Targeted Scrape</option>
              <option value="document_harvest">Document Harvest</option>
              <option value="link_discovery">Link Discovery</option>
              <option value="manual_url">Manual URL</option>
              <option value="manual_document">Manual Document</option>
            </select>
          </>
        )}
        
        {activeTab === 'grants' && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Grant Types</option>
            <option value="national">National</option>
            <option value="regional">Regional</option>
            <option value="local">Local</option>
            <option value="energy">Energy</option>
            <option value="research">Research</option>
            <option value="business">Business</option>
            <option value="arts">Arts</option>
            <option value="other">Other</option>
          </select>
        )}
        
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">
            <Activity className="h-4 w-4 mr-2" />
            Scraping Jobs
          </TabsTrigger>
          <TabsTrigger value="grants">
            <Star className="h-4 w-4 mr-2" />
            Discovered Grants
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading scraping jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No scraping jobs found</h3>
              <p className="text-gray-500 mb-4">Start your first scraping job to discover grant opportunities</p>
              <Button onClick={() => setShowNewJobModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start First Job
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <Card key={job.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{job.source_url}</CardTitle>
                          {job.manual_input && (
                            <Badge variant="outline" className="text-xs">
                              {job.manual_input.type === 'url' ? 'Manual URL' : 'Manual Doc'}
                            </Badge>
                          )}
                          {job.added_to_vector_db && (
                            <Badge variant="secondary" className="text-xs">
                              <Database className="h-3 w-3 mr-1" />
                              In Knowledge Base
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {job.job_type.replace('_', ' ')} • Created {new Date(job.created_at).toLocaleDateString()}
                          {job.started_at && ` • Started ${new Date(job.started_at).toLocaleDateString()}`}
                          {job.completed_at && ` • Completed ${new Date(job.completed_at).toLocaleDateString()}`}
                        </CardDescription>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Enhanced Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>

                      {/* Enhanced Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                        <div>
                          <div className="font-medium">{job.stats.pages_scraped}</div>
                          <div className="text-gray-500">Pages</div>
                        </div>
                        <div>
                          <div className="font-medium">{job.stats.documents_processed}</div>
                          <div className="text-gray-500">Documents</div>
                        </div>
                        <div>
                          <div className="font-medium text-green-600">{job.stats.grants_found}</div>
                          <div className="text-gray-500">Grants Found</div>
                        </div>
                        <div>
                          <div className="font-medium">{job.stats.links_discovered}</div>
                          <div className="text-gray-500">Links</div>
                        </div>
                        <div>
                          <div className="font-medium text-red-600">{job.stats.errors_encountered}</div>
                          <div className="text-gray-500">Errors</div>
                        </div>
                        <div>
                          <div className="font-medium">
                            {job.stats.processing_time_ms > 0 
                              ? `${Math.round(job.stats.processing_time_ms / 1000)}s`
                              : '-'
                            }
                          </div>
                          <div className="text-gray-500">Duration</div>
                        </div>
                      </div>

                      {/* Grant Categories */}
                      {job.grant_categories && job.grant_categories.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Grant Categories Found:</div>
                          <div className="flex flex-wrap gap-1">
                            {job.grant_categories.map((category, idx) => (
                              <Badge key={idx} variant="outline" className={`text-xs ${getGrantTypeColor(category)}`}>
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grant Type Breakdown */}
                      {job.stats.grants_by_type && Object.values(job.stats.grants_by_type).some(v => v > 0) && (
                        <div>
                          <div className="text-sm font-medium mb-2">Grant Types Breakdown:</div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            {Object.entries(job.stats.grants_by_type).map(([type, count]) => (
                              count > 0 && (
                                <div key={type} className="text-center">
                                  <div className="font-medium">{count}</div>
                                  <div className="text-gray-500 capitalize">{type}</div>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enhanced Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {job.status === 'running' && (
                          <Button variant="outline" size="sm">
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                        )}
                        {job.status === 'completed' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                            {job.stats.grants_found > 0 && (
                              <Button variant="outline" size="sm">
                                <Star className="h-4 w-4 mr-2" />
                                View Grants ({job.stats.grants_found})
                              </Button>
                            )}
                            {!job.added_to_vector_db && job.stats.grants_found > 0 && (
                              <Button variant="outline" size="sm" className="text-blue-600">
                                <Database className="h-4 w-4 mr-2" />
                                Add to Knowledge Base
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grants" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <Star className="h-8 w-8 animate-pulse mx-auto mb-2" />
              <p>Loading grants...</p>
            </div>
          ) : filteredGrants.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No grants found</h3>
              <p className="text-gray-500 mb-4">Run some scraping jobs to discover grant opportunities</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGrants.map(grant => (
                <Card key={grant.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg leading-tight line-clamp-2">{grant.title}</CardTitle>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={grant.confidence_score >= 0.8 ? 'default' : 'outline'}>
                          {Math.round(grant.confidence_score * 100)}%
                        </Badge>
                        {grant.added_to_vector_db && (
                          <Badge variant="secondary" className="text-xs">
                            <Database className="h-3 w-3 mr-1" />
                            KB
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-3">{grant.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-medium text-green-600">Amount</div>
                          <div className="text-gray-600">{formatCurrency(grant.amount_min, grant.amount_max, grant.currency)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-red-600">Deadline</div>
                          <div className="text-gray-600">{formatDeadline(grant.deadline)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-sm mb-1">Grant Type</div>
                        <Badge className={`text-xs ${getGrantTypeColor(grant.grant_type)}`}>
                          {grant.grant_type.charAt(0).toUpperCase() + grant.grant_type.slice(1)}
                        </Badge>
                      </div>

                      <div>
                        <div className="font-medium text-sm mb-1">Organization</div>
                        <div className="text-sm text-gray-600 truncate">{grant.organization}</div>
                      </div>

                      {grant.location && (
                        <div>
                          <div className="font-medium text-sm mb-1 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            Location
                          </div>
                          <div className="text-sm text-gray-600">{grant.location}</div>
                        </div>
                      )}

                      {grant.categories && grant.categories.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1">Categories</div>
                          <div className="flex flex-wrap gap-1">
                            {grant.categories.slice(0, 3).map((category, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                            {grant.categories.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{grant.categories.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {!grant.added_to_vector_db && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => addToVectorDatabase([grant.id])}
                            className="text-blue-600"
                          >
                            <Database className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 border-t pt-2">
                        <div>Found: {new Date(grant.created_at).toLocaleDateString()}</div>
                        <div className="truncate">Source: {grant.source_url}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 animate-pulse mx-auto mb-2" />
              <p>Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-gray-500 mb-4">Upload documents or run document harvest jobs</p>
              <Button onClick={() => { setUploadType('document'); setShowManualUploadModal(true); }}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map(doc => (
                <Card key={doc.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate">{doc.name}</CardTitle>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">{doc.file_type.toUpperCase()}</Badge>
                        {doc.processing_status === 'completed' && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Processed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {doc.size && (
                        <div className="text-sm text-gray-500">
                          Size: {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="font-medium text-green-600">Grants Extracted: </span>
                        <span>{doc.grants_extracted}</span>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Status: <span className="capitalize">{doc.processing_status}</span>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        {doc.grants_extracted > 0 && (
                          <Button variant="outline" size="sm">
                            <Star className="h-4 w-4 mr-2" />
                            Grants
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showNewJobModal && (
        <NewJobModal
          onClose={() => setShowNewJobModal(false)}
          onSubmit={startNewJob}
        />
      )}
      
      {showManualUploadModal && (
        <ManualUploadModal
          uploadType={uploadType}
          onClose={() => setShowManualUploadModal(false)}
          onSubmit={uploadManualContent}
        />
      )}
    </div>
  );
}

// Enhanced New Job Modal Component
function NewJobModal({ onClose, onSubmit }: { 
  onClose: () => void; 
  onSubmit: (url: string, type: string, config: any) => void; 
}) {
  const [url, setUrl] = useState('');
  const [jobType, setJobType] = useState('full_crawl');
  const [maxDepth, setMaxDepth] = useState(3);
  const [includePatterns, setIncludePatterns] = useState('*');
  const [excludePatterns, setExcludePatterns] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url, jobType, {
      max_depth: maxDepth,
      include_patterns: includePatterns.split(',').map(p => p.trim()).filter(p => p),
      exclude_patterns: excludePatterns.split(',').map(p => p.trim()).filter(p => p),
      process_documents: true,
      extract_grant_categories: true,
      add_to_vector_db: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Start New Scraping Job</CardTitle>
          <CardDescription>Configure and start a new grant discovery job</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source URL *</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/grants"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full_crawl">Full Website Crawl</option>
                <option value="targeted_scrape">Single Page Scrape</option>
                <option value="document_harvest">Document Harvest</option>
                <option value="link_discovery">Link Discovery</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Maximum Depth</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">How deep to crawl (1 = current page only)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Include Patterns</label>
              <Input
                value={includePatterns}
                onChange={(e) => setIncludePatterns(e.target.value)}
                placeholder="*grants*, *funding*, *opportunities*"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated URL patterns to include</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Exclude Patterns</label>
              <Input
                value={excludePatterns}
                onChange={(e) => setExcludePatterns(e.target.value)}
                placeholder="*login*, *admin*, *private*"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated URL patterns to exclude</p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">AI Features Enabled</span>
              </div>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Automatic grant extraction and categorization</li>
                <li>• Addition to knowledge base and vector search</li>
                <li>• Grant type classification (national, regional, etc.)</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Scraping
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Manual Upload Modal Component
function ManualUploadModal({ uploadType, onClose, onSubmit }: {
  uploadType: 'url' | 'document';
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadType === 'url') {
      onSubmit({
        url,
        description,
        extract_grants: true,
        add_to_vector_db: true
      });
    } else {
      if (!file) return;
      
      const formData = new FormData();
      formData.append('document', file);
      formData.append('description', description);
      formData.append('extract_grants', 'true');
      formData.append('add_to_vector_db', 'true');
      
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {uploadType === 'url' ? 'Add Single URL' : 'Upload Document'}
          </CardTitle>
          <CardDescription>
            {uploadType === 'url' 
              ? 'Add a single URL for grant extraction'
              : 'Upload a PDF or Word document for processing'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {uploadType === 'url' ? (
              <div>
                <label className="block text-sm font-medium mb-1">URL *</label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/grant-opportunity"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Document *</label>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.txt"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Supported: PDF, DOC, DOCX, TXT</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the grant source or document..."
                rows={3}
              />
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Auto-Processing</span>
              </div>
              <p className="text-xs text-green-700">
                Grants will be automatically extracted and added to the knowledge base
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={uploadType === 'document' && !file}>
                {uploadType === 'url' ? (
                  <><Link className="h-4 w-4 mr-2" />Add URL</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Upload</>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}