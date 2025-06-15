'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/lib/hooks/use-toast';

interface SearchResult {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    documentType: 'grant' | 'policy' | 'guideline' | 'application' | 'knowledge';
    source: string;
    title: string;
    category: string;
    tags: string[];
    createdAt: string;
  };
  score: number;
}

interface ContextResult {
  context: string;
  sources: string[];
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export default function SemanticSearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [contextResult, setContextResult] = useState<ContextResult | null>(null);
  const [embeddingResult, setEmbeddingResult] = useState<EmbeddingResult | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  const [filters, setFilters] = useState({
    documentType: '',
    topK: 10,
    minScore: 0.7
  });
  
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query,
          topK: filters.topK,
          minScore: filters.minScore,
          filter: filters.documentType ? { documentType: filters.documentType } : {}
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      
      toast({
        title: 'Search Complete',
        description: `Found ${data.results?.length || 0} results`
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: 'An error occurred while searching',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContextSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a query for context search',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/semantic-search/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query,
          documentType: filters.documentType || undefined,
          maxTokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error('Context search failed');
      }

      const data = await response.json();
      setContextResult({
        context: data.context,
        sources: data.sources
      });
      
      toast({
        title: 'Context Retrieved',
        description: `Found relevant context from ${data.sources?.length || 0} sources`
      });
    } catch (error) {
      console.error('Context search error:', error);
      toast({
        title: 'Context Search Failed',
        description: 'An error occurred while retrieving context',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEmbedding = async () => {
    if (!query.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter text to generate embedding',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/semantic-search/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text: query
        })
      });

      if (!response.ok) {
        throw new Error('Embedding generation failed');
      }

      const data = await response.json();
      setEmbeddingResult(data);
      
      toast({
        title: 'Embedding Generated',
        description: `Generated ${data.embedding?.length || 0}-dimensional embedding`
      });
    } catch (error) {
      console.error('Embedding generation error:', error);
      toast({
        title: 'Embedding Generation Failed',
        description: 'An error occurred while generating embedding',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getDocumentTypeColor = (type: string) => {
    const colors = {
      grant: 'bg-blue-100 text-blue-800',
      policy: 'bg-green-100 text-green-800',
      guideline: 'bg-yellow-100 text-yellow-800',
      application: 'bg-purple-100 text-purple-800',
      knowledge: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Semantic Search</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && activeTab === 'search' && handleSearch()}
              className="flex-1"
            />
            <select
              value={filters.documentType}
              onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Types</option>
              <option value="grant">Grants</option>
              <option value="policy">Policies</option>
              <option value="guideline">Guidelines</option>
              <option value="application">Applications</option>
              <option value="knowledge">Knowledge</option>
            </select>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Max Results:</label>
              <Input
                type="number"
                value={filters.topK}
                onChange={(e) => setFilters({ ...filters, topK: parseInt(e.target.value) || 10 })}
                className="w-20"
                min="1"
                max="50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Min Score:</label>
              <Input
                type="number"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseFloat(e.target.value) || 0.7 })}
                className="w-20"
                min="0"
                max="1"
                step="0.1"
              />
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Semantic Search</TabsTrigger>
          <TabsTrigger value="context">Context Retrieval</TabsTrigger>
          <TabsTrigger value="embeddings">Generate Embeddings</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card className="p-4">
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? 'Searching...' : 'Search Knowledge Base'}
            </Button>
          </Card>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <Card key={result.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{result.metadata.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getDocumentTypeColor(result.metadata.documentType)}>
                          {result.metadata.documentType}
                        </Badge>
                        <Badge variant="outline">
                          Score: {formatScore(result.score)}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-gray-600 line-clamp-3">{result.content}</p>

                    <div className="flex flex-wrap gap-2">
                      {result.metadata.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-sm text-gray-500">
                      <span>Source: {result.metadata.source}</span>
                      {result.metadata.category && (
                        <span className="ml-4">Category: {result.metadata.category}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {results.length === 0 && !loading && (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">No results found. Try adjusting your search query or filters.</p>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="context" className="space-y-4">
          <Card className="p-4">
            <Button onClick={handleContextSearch} disabled={loading} className="w-full">
              {loading ? 'Retrieving Context...' : 'Get Relevant Context'}
            </Button>
          </Card>

          {loading ? (
            <LoadingSkeleton className="h-64" />
          ) : contextResult ? (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Relevant Context:</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">{contextResult.context}</pre>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Sources ({contextResult.sources.length}):</h3>
                <div className="space-y-2">
                  {contextResult.sources.map((source, index) => (
                    <Badge key={index} variant="outline" className="mr-2">
                      {source}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Enter a query and click &quot;Get Relevant Context&quot; to retrieve contextual information.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-4">
          <Card className="p-4">
            <Button onClick={handleGenerateEmbedding} disabled={loading} className="w-full">
              {loading ? 'Generating Embedding...' : 'Generate Embedding'}
            </Button>
          </Card>

          {loading ? (
            <LoadingSkeleton className="h-32" />
          ) : embeddingResult ? (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Embedding Details:</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Model:</strong> {embeddingResult.model}</p>
                  <p><strong>Dimensions:</strong> {embeddingResult.embedding.length}</p>
                  <p><strong>Prompt Tokens:</strong> {embeddingResult.usage.prompt_tokens}</p>
                  <p><strong>Total Tokens:</strong> {embeddingResult.usage.total_tokens}</p>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Embedding Vector (first 10 dimensions):</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="text-xs">
                    {JSON.stringify(embeddingResult.embedding.slice(0, 10), null, 2)}
                    {embeddingResult.embedding.length > 10 && '\n... and ' + (embeddingResult.embedding.length - 10) + ' more dimensions'}
                  </pre>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Enter text and click &quot;Generate Embedding&quot; to create vector representation.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}