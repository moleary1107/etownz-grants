'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Activity
} from 'lucide-react';

interface CrawlJob {
  id: string;
  source_url: string;
  job_type: 'full_crawl' | 'targeted_scrape' | 'document_harvest' | 'link_discovery';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  stats: {
    pages_scraped: number;
    documents_processed: number;
    links_discovered: number;
    grants_found: number;
    errors_encountered: number;
    processing_time_ms: number;
  };
  started_at: string;
  completed_at?: string;
  created_at: string;
}

interface ScrapedPage {
  id: string;
  url: string;
  title: string;
  content: string;
  metadata: {
    statusCode: number;
    timestamp: string;
    links: string[];
    images: string[];
  };
  processing_status: 'pending' | 'processed' | 'failed';
  created_at: string;
}

interface ScrapedDocument {
  id: string;
  url: string;
  title: string;
  file_type: 'pdf' | 'docx' | 'doc' | 'txt';
  extracted_data: {
    grants?: any[];
    contacts?: any[];
  };
  confidence_score: number;
  created_at: string;
}

export default function ScrapingDashboard() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [pages, setPages] = useState<ScrapedPage[]>([]);
  const [documents, setDocuments] = useState<ScrapedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    jobs: { total: 0 },
    pages: { total: 0 },
    documents: { total: 0 }
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'jobs':
          await loadJobs();
          break;
        case 'pages':
          await loadPages();
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
    const response = await fetch('/api/scraping/jobs');
    const data = await response.json();
    setJobs(data.jobs || []);
  };

  const loadPages = async () => {
    const response = await fetch('/api/scraping/pages');
    const data = await response.json();
    setPages(data.pages || []);
  };

  const loadDocuments = async () => {
    const response = await fetch('/api/scraping/documents');
    const data = await response.json();
    setDocuments(data.documents || []);
  };

  const loadStats = async () => {
    const response = await fetch('/api/scraping/stats');
    const data = await response.json();
    setStats(data);
  };

  const startNewJob = async (sourceUrl: string, jobType: string, config: any) => {
    try {
      const response = await fetch('/api/scraping/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: sourceUrl,
          job_type: jobType,
          configuration: config
        })
      });

      if (response.ok) {
        setShowNewJobModal(false);
        loadJobs();
      }
    } catch (error) {
      console.error('Failed to start job:', error);
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
    return matchesSearch && matchesStatus;
  });

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || page.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || doc.file_type === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Web Scraping Dashboard</h1>
          <p className="text-gray-600">Monitor and manage web scraping operations</p>
        </div>
        <Button onClick={() => setShowNewJobModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Crawl Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobs.total}</div>
            <p className="text-xs text-muted-foreground">Crawl jobs executed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages Scraped</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pages.total}</div>
            <p className="text-xs text-muted-foreground">Web pages processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.total}</div>
            <p className="text-xs text-muted-foreground">PDFs and documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">Crawl Jobs</TabsTrigger>
          <TabsTrigger value="pages">Scraped Pages</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.source_url}</CardTitle>
                        <CardDescription>
                          {job.job_type.replace('_', ' ')} • Started {new Date(job.started_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">{job.stats.pages_scraped}</div>
                          <div className="text-gray-500">Pages</div>
                        </div>
                        <div>
                          <div className="font-medium">{job.stats.documents_processed}</div>
                          <div className="text-gray-500">Documents</div>
                        </div>
                        <div>
                          <div className="font-medium">{job.stats.grants_found}</div>
                          <div className="text-gray-500">Grants Found</div>
                        </div>
                        <div>
                          <div className="font-medium">{job.stats.errors_encountered}</div>
                          <div className="text-gray-500">Errors</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
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
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
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

        <TabsContent value="pages" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPages.map(page => (
                <Card key={page.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate">{page.title}</CardTitle>
                      {getStatusBadge(page.processing_status)}
                    </div>
                    <CardDescription className="truncate">{page.url}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">
                        {page.metadata.links.length} links • {page.metadata.images.length} images
                      </div>
                      <div className="text-sm text-gray-500">
                        Scraped {new Date(page.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
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
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map(doc => (
                <Card key={doc.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate">{doc.title}</CardTitle>
                      <Badge variant="outline">{doc.file_type.toUpperCase()}</Badge>
                    </div>
                    <CardDescription className="truncate">{doc.url}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">
                        Confidence: {Math.round(doc.confidence_score * 100)}%
                      </div>
                      {doc.extracted_data.grants && (
                        <div className="text-sm text-green-600">
                          {doc.extracted_data.grants.length} grants found
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Processed {new Date(doc.created_at).toLocaleDateString()}
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Job Modal would go here */}
      {showNewJobModal && (
        <NewJobModal
          onClose={() => setShowNewJobModal(false)}
          onSubmit={startNewJob}
        />
      )}
    </div>
  );
}

// New Job Modal Component (simplified)
function NewJobModal({ onClose, onSubmit }: { 
  onClose: () => void; 
  onSubmit: (url: string, type: string, config: any) => void; 
}) {
  const [url, setUrl] = useState('');
  const [jobType, setJobType] = useState('full_crawl');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url, jobType, {
      max_depth: 3,
      include_patterns: ['*'],
      exclude_patterns: [],
      process_documents: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Start New Crawl Job</CardTitle>
          <CardDescription>Configure and start a new web scraping job</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source URL</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="full_crawl">Full Crawl</option>
                <option value="targeted_scrape">Targeted Scrape</option>
                <option value="document_harvest">Document Harvest</option>
                <option value="link_discovery">Link Discovery</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Start Job</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}