'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/lib/hooks/use-toast';
import { knowledgeBaseService } from '@/lib/api';
import { 
  Search, 
  Bot, 
  BookOpen, 
  Plus,
  ExternalLink,
  MessageCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  Lightbulb,
  Star,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import type { 
  KnowledgeBaseEntry, 
  SearchResult, 
  AnswerResponse 
} from '@/lib/api/knowledgeBaseService';

interface RAGSession {
  question: string;
  answer?: AnswerResponse;
  isLoading: boolean;
  timestamp: Date;
}

interface QuickStats {
  totalDocuments: number;
  totalQuestions: number;
  avgConfidence: number;
  topCategories: Array<{ category: string; count: number }>;
}

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  
  // Search & RAG state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [ragSessions, setRagSessions] = useState<RAGSession[]>([]);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  
  // Browse state
  const [documents, setDocuments] = useState<KnowledgeBaseEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  
  // Upload state
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[],
    source: '',
    tagInput: ''
  });
  
  // Stats
  const [stats, setStats] = useState<QuickStats | null>(null);
  
  // UI state
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [copiedSources, setCopiedSources] = useState<Set<number>>(new Set());
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);

  // Initialize data on mount
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // Debounced search
  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults(null);
    }
  }, [searchQuery, selectedCategory]);
  
  const loadInitialData = useCallback(async () => {
    await Promise.all([
      loadStats(),
      loadCategories(),
      loadTags(),
      loadDocuments()
    ]);
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const searchResult = await knowledgeBaseService.search({
        query: '',
        category: selectedCategory || undefined,
        limit: 50
      });
      setDocuments(searchResult.entries);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive'
      });
    }
  }, [selectedCategory, toast]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await knowledgeBaseService.getStatistics();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await knowledgeBaseService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const tagsData = await knowledgeBaseService.getPopularTags(20);
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const result = await knowledgeBaseService.search({
        query: searchQuery,
        category: selectedCategory || undefined,
        useSemanticSearch: true,
        limit: 10
      });
      setSearchResults(result);
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: 'Search failed',
        description: 'Failed to search knowledge base',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, toast]);
  
  const askQuestion = useCallback(async () => {
    if (!currentQuestion.trim()) return;
    
    const newSession: RAGSession = {
      question: currentQuestion,
      isLoading: true,
      timestamp: new Date()
    };
    
    setRagSessions(prev => [newSession, ...prev]);
    setIsAsking(true);
    
    try {
      const answer = await knowledgeBaseService.askQuestion({
        question: currentQuestion,
        includeRelatedDocs: true
      });
      
      setRagSessions(prev => 
        prev.map((session, index) => 
          index === 0 ? { ...session, answer, isLoading: false } : session
        )
      );
      
      // Load related questions
      if (answer.relatedQuestions.length > 0) {
        setRelatedQuestions(answer.relatedQuestions);
      }
      
      setCurrentQuestion('');
    } catch (error) {
      console.error('Error asking question:', error);
      setRagSessions(prev => prev.slice(1)); // Remove failed session
      toast({
        title: 'Question failed',
        description: 'Failed to get answer from knowledge base',
        variant: 'destructive'
      });
    } finally {
      setIsAsking(false);
    }
  }, [currentQuestion, toast]);
  
  const handleAddDocument = useCallback(async () => {
    if (!newDocument.title || !newDocument.content || !newDocument.source) {
      toast({
        title: 'Error',
        description: 'Title, content, and source are required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await knowledgeBaseService.uploadDocument({
        title: newDocument.title,
        content: newDocument.content,
        category: newDocument.category || 'general',
        tags: newDocument.tags,
        source: newDocument.source
      });

      toast({
        title: 'Success',
        description: 'Document added successfully'
      });

      // Reset form
      setNewDocument({
        title: '',
        content: '',
        category: '',
        tags: [],
        source: '',
        tagInput: ''
      });
      
      // Reload data
      await loadInitialData();
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: 'Error',
        description: 'Failed to add document',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [newDocument, toast, loadInitialData]);

  const askRelatedQuestion = useCallback(async (question: string) => {
    setCurrentQuestion(question);
    if (questionInputRef.current) {
      questionInputRef.current.focus();
    }
    setTimeout(() => askQuestion(), 100);
  }, [askQuestion]);
  
  const copySource = useCallback(async (sourceIndex: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSources(prev => new Set([...prev, sourceIndex]));
      setTimeout(() => {
        setCopiedSources(prev => {
          const newSet = new Set(prev);
          newSet.delete(sourceIndex);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);
  
  const toggleSourceExpansion = useCallback((sourceIndex: number) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceIndex)) {
        newSet.delete(sourceIndex);
      } else {
        newSet.add(sourceIndex);
      }
      return newSet;
    });
  }, []);

  const indexExternalContent = useCallback(async (url: string) => {
    setLoading(true);
    try {
      const result = await knowledgeBaseService.indexExternalContent(url);
      toast({
        title: 'Success',
        description: `Indexed ${result.documentsIndexed} documents from external source`
      });
      await loadInitialData();
    } catch (error) {
      console.error('Error indexing content:', error);
      toast({
        title: 'Error',
        description: 'Failed to index external content',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast, loadInitialData]);

  const addTagToDocument = useCallback((tag: string) => {
    if (tag && !newDocument.tags.includes(tag)) {
      setNewDocument(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
        tagInput: ''
      }));
    }
  }, [newDocument.tags]);

  const removeTagFromDocument = useCallback((tagToRemove: string) => {
    setNewDocument(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);
  
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered intelligent search and Q&A system
          </p>
        </div>
        <Button onClick={() => indexExternalContent('https://grants.gov')} variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Index External Content
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Documents</h3>
                <p className="text-2xl font-bold">{stats.totalDocuments}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Questions Asked</h3>
                <p className="text-2xl font-bold">{stats.totalQuestions}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Avg Confidence</h3>
                <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Top Category</h3>
                <p className="text-lg font-bold">{stats.topCategories[0]?.category || 'N/A'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">AI Search</TabsTrigger>
          <TabsTrigger value="ask">Ask Questions</TabsTrigger>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Intelligent Search Interface */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Semantic Search</h3>
              </div>
              
              <div className="flex gap-4">
                <Input
                  ref={searchInputRef}
                  placeholder="Search knowledge base with natural language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  className="flex-1"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
                <Button onClick={performSearch} disabled={loading || !searchQuery.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Search Results */}
          {searchResults && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Search Results</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{searchResults.totalCount} results</span>
                    <span>in {formatTime(searchResults.searchTime)}</span>
                    <span className={getConfidenceColor(searchResults.confidence)}>
                      {(searchResults.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {searchResults.entries.map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h5 className="font-medium">{entry.title}</h5>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{entry.category}</Badge>
                            {entry.relevanceScore && (
                              <Badge variant="outline">
                                {(entry.relevanceScore * 100).toFixed(0)}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.content.substring(0, 200)}...
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Source: {entry.source} • {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          )}
          
          {!searchResults && !loading && searchQuery && (
            <Card className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No results found. Try different keywords or check spelling.</p>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="ask" className="space-y-4">
          {/* AI Q&A Interface */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Ask AI Assistant</h3>
              </div>
              
              <div className="flex gap-4">
                <Input
                  ref={questionInputRef}
                  placeholder="Ask any question about grants, policies, or procedures..."
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                  className="flex-1"
                />
                <Button onClick={askQuestion} disabled={isAsking || !currentQuestion.trim()}>
                  {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  Ask
                </Button>
              </div>
              
              {/* Related Questions */}
              {relatedQuestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Related Questions:</h4>
                  <div className="flex flex-wrap gap-2">
                    {relatedQuestions.slice(0, 3).map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => askRelatedQuestion(question)}
                        className="text-xs"
                      >
                        <Lightbulb className="h-3 w-3 mr-1" />
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* Q&A Sessions */}
          <div className="space-y-4">
            {ragSessions.map((session, sessionIndex) => (
              <Card key={sessionIndex} className="p-6">
                <div className="space-y-4">
                  {/* Question */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{session.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Answer */}
                  {session.isLoading ? (
                    <div className="flex items-center gap-3 ml-12">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  ) : session.answer ? (
                    <div className="ml-12 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-green-100">
                          <Bot className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="mb-2">{session.answer.answer}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className={getConfidenceColor(session.answer.confidence)}>
                              {(session.answer.confidence * 100).toFixed(0)}% confidence
                            </span>
                            <span>in {formatTime(session.answer.processingTime)}</span>
                            <span>{session.answer.sources.length} sources</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sources */}
                      {session.answer.sources.length > 0 && (
                        <div className="ml-12 space-y-2">
                          <h5 className="text-sm font-medium text-muted-foreground">Sources:</h5>
                          <div className="space-y-2">
                            {session.answer.sources.map((source, sourceIndex) => (
                              <Card key={sourceIndex} className="p-3 bg-muted/50">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h6 className="text-sm font-medium">{source.title}</h6>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {(source.relevance * 100).toFixed(0)}% relevant
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copySource(sourceIndex, source.excerpt)}
                                      >
                                        {copiedSources.has(sourceIndex) ? (
                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleSourceExpansion(sourceIndex)}
                                      >
                                        {expandedSources.has(sourceIndex) ? 'Less' : 'More'}
                                      </Button>
                                    </div>
                                  </div>
                                  <p className={`text-sm text-muted-foreground ${
                                    expandedSources.has(sourceIndex) ? '' : 'line-clamp-2'
                                  }`}>
                                    {source.excerpt}
                                  </p>
                                  {source.url && (
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      View source
                                    </a>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
          
          {ragSessions.length === 0 && (
            <Card className="p-8 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Ask any question to get AI-powered answers from our knowledge base.
              </p>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="browse" className="space-y-4">
          {/* Browse Filters */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Document Library</h3>
              </div>
              <div className="flex gap-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
                <Button onClick={loadDocuments} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </Card>

          {/* Documents List */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{doc.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{doc.category}</Badge>
                        {doc.relevanceScore && (
                          <Badge variant="outline">
                            {(doc.relevanceScore * 100).toFixed(0)}% relevance
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-muted-foreground line-clamp-2">{doc.content}</p>

                    <div className="flex flex-wrap gap-2">
                      {doc.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <span>Source: {doc.source}</span>
                      <span className="ml-4">
                        Added: {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}

              {documents.length === 0 && (
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No documents found in the selected category.</p>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Upload Document</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  placeholder="Document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <Textarea
                  value={newDocument.content}
                  onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                  placeholder="Document content"
                  rows={10}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Input
                    value={newDocument.category}
                    onChange={(e) => setNewDocument({ ...newDocument, category: e.target.value })}
                    placeholder="Document category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Source</label>
                  <Input
                    value={newDocument.source}
                    onChange={(e) => setNewDocument({ ...newDocument, source: e.target.value })}
                    placeholder="Document source"
                  />
                </div>

              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newDocument.tagInput}
                    onChange={(e) => setNewDocument({ ...newDocument, tagInput: e.target.value })}
                    placeholder="Add tag and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTagToDocument(newDocument.tagInput.trim());
                      }
                    }}
                  />
                  <Button
                    onClick={() => addTagToDocument(newDocument.tagInput.trim())}
                    variant="outline"
                    type="button"
                  >
                    Add Tag
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newDocument.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTagFromDocument(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleAddDocument} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload to Knowledge Base
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default KnowledgeBasePage;