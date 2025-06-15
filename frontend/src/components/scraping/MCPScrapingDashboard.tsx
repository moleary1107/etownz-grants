'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { mcpScrapingService, GrantSource, MCPFetchResult } from '../../lib/api/mcpScrapingService';
import { AlertCircle, CheckCircle, Clock, Globe, Zap, Search, Download, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  services: {
    mcpServer: boolean;
    firecrawl: boolean;
  };
  overall: 'healthy' | 'degraded';
  timestamp: string;
}

export default function MCPScrapingDashboard() {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [grantSources, setGrantSources] = useState<GrantSource[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customUrls, setCustomUrls] = useState<string>('');
  const [extractionPrompt, setExtractionPrompt] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Record<string, unknown> | null>(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [recentResults, setRecentResults] = useState<MCPFetchResult[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load service health
      const health = await mcpScrapingService.healthCheck();
      setServiceStatus(health);

      // Load grant sources
      const sources = await mcpScrapingService.getGrantSources();
      setGrantSources(sources.sources);

      // Set default extraction prompt
      setExtractionPrompt('Extract grant information, funding details, eligibility criteria, and application deadlines');
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const handleQuickScan = async () => {
    setIsScanning(true);
    try {
      const result = await mcpScrapingService.quickScan(selectedCategories, true);
      setScanResults(result);
    } catch (error) {
      console.error('Quick scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCustomScraping = async () => {
    const urls = customUrls.split('\n').filter(url => url.trim());
    if (urls.length === 0) return;

    setIsScanning(true);
    setBatchProgress(0);

    try {
      const result = await mcpScrapingService.batchScrapeGrants({
        urls,
        extractionPrompt: extractionPrompt || undefined,
        useAI: true,
        batchSize: 3,
        rateLimitMs: 2000
      });

      setRecentResults(result.results);
      setBatchProgress(100);
    } catch (error) {
      console.error('Custom scraping failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGovernmentScan = async () => {
    setIsScanning(true);
    try {
      const results = await mcpScrapingService.scrapeGovernmentGrants();
      setRecentResults(results);
    } catch (error) {
      console.error('Government scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const refreshServiceStatus = async () => {
    try {
      const health = await mcpScrapingService.healthCheck();
      setServiceStatus(health);
    } catch (error) {
      console.error('Failed to refresh service status:', error);
    }
  };

  const categories = [...new Set(grantSources.map(s => s.category))];

  return (
    <div className="space-y-6">
      {/* Service Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              MCP Scraping Services
            </CardTitle>
            <CardDescription>
              Enhanced web scraping with MCP server and Firecrawl integration
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshServiceStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {serviceStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {serviceStatus.services.mcpServer ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span>MCP Server</span>
                <Badge variant={serviceStatus.services.mcpServer ? "default" : "destructive"}>
                  {serviceStatus.services.mcpServer ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {serviceStatus.services.firecrawl ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span>Firecrawl</span>
                <Badge variant={serviceStatus.services.firecrawl ? "default" : "destructive"}>
                  {serviceStatus.services.firecrawl ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={serviceStatus.overall === 'healthy' ? "default" : "secondary"}>
                  {serviceStatus.overall === 'healthy' ? "All Systems Operational" : "Partial Service"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Scraping Interface */}
      <Tabs defaultValue="quick-scan" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-scan">Quick Scan</TabsTrigger>
          <TabsTrigger value="custom">Custom URLs</TabsTrigger>
          <TabsTrigger value="government">Government</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Quick Scan Tab */}
        <TabsContent value="quick-scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Grant Scan
              </CardTitle>
              <CardDescription>
                Scan predefined Irish grant sources for new opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCategories(prev => 
                          prev.includes(category)
                            ? prev.filter(c => c !== category)
                            : [...prev, category]
                        );
                      }}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleQuickScan} 
                disabled={isScanning}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Start Quick Scan
                  </>
                )}
              </Button>

              {scanResults && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{scanResults.scan.totalSources}</div>
                      <div className="text-sm text-gray-500">Sources Scanned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{scanResults.scan.successfulScans}</div>
                      <div className="text-sm text-gray-500">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{scanResults.scan.newOpportunities}</div>
                      <div className="text-sm text-gray-500">New Opportunities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {scanResults.scan.opportunities?.length || 0}
                      </div>
                      <div className="text-sm text-gray-500">Extracted</div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{scanResults.recommendations}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom URLs Tab */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom URL Scraping</CardTitle>
              <CardDescription>
                Scrape custom URLs with AI-powered data extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">URLs (one per line)</label>
                <Textarea
                  placeholder="https://example.com/grants&#10;https://another-site.com/funding"
                  value={customUrls}
                  onChange={(e) => setCustomUrls(e.target.value)}
                  rows={6}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Extraction Prompt</label>
                <Textarea
                  placeholder="What specific information would you like to extract?"
                  value={extractionPrompt}
                  onChange={(e) => setExtractionPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              {batchProgress > 0 && (
                <div>
                  <Progress value={batchProgress} className="w-full" />
                  <p className="text-sm text-gray-500 mt-1">Processing... {batchProgress}%</p>
                </div>
              )}

              <Button 
                onClick={handleCustomScraping} 
                disabled={isScanning || !customUrls.trim()}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Government Sources Tab */}
        <TabsContent value="government" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Irish Government Grant Sources</CardTitle>
              <CardDescription>
                Predefined sources for Irish government funding opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grantSources.filter(s => ['business', 'research'].includes(s.category)).map(source => (
                  <div key={source.url} className="p-3 border rounded-lg">
                    <div className="font-medium">{source.name}</div>
                    <div className="text-sm text-gray-500">{source.description}</div>
                    <Badge variant="outline" className="mt-1">{source.category}</Badge>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleGovernmentScan} 
                disabled={isScanning}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Scanning Government Sources...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Scan Government Sources
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Scraping Results</CardTitle>
              <CardDescription>
                Latest scraped data and extracted information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentResults.length > 0 ? (
                <div className="space-y-4">
                  {recentResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">{result.metadata.title || 'Untitled'}</div>
                          <div className="text-sm text-gray-500">{result.url}</div>
                        </div>
                        <Badge variant="outline">
                          {result.metadata.statusCode}
                        </Badge>
                      </div>
                      
                      {result.structuredData && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <div className="text-sm font-medium mb-2">Extracted Data:</div>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(result.structuredData, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400 mt-2">
                        Scraped: {new Date(result.metadata.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent results. Start a scan to see data here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}