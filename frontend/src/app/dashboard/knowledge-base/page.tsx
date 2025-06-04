'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/lib/hooks/use-toast';

interface KnowledgeBaseDocument {
  id: string;
  title: string;
  content: string;
  type: 'grant' | 'policy' | 'guideline' | 'application' | 'knowledge';
  source: string;
  category?: string;
  tags: string[];
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface KnowledgeBaseStats {
  totalDocuments: number;
  totalEmbeddings: number;
  documentsByType: Record<string, number>;
  embeddingStatus: Record<string, number>;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  // Form state for adding documents
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    type: 'knowledge' as const,
    source: '',
    category: '',
    tags: [] as string[],
    tagInput: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
    loadStats();
    loadCategories();
    loadTags();
  }, [currentPage, searchQuery, selectedType, selectedCategory]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (searchQuery) params.append('q', searchQuery);
      if (selectedType) params.append('type', selectedType);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/knowledge-base/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load knowledge base documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/knowledge-base/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/knowledge-base/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load categories');
      }

      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await fetch('/api/knowledge-base/tags', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load tags');
      }

      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleAddDocument = async () => {
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
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: newDocument.title,
          content: newDocument.content,
          type: newDocument.type,
          source: newDocument.source,
          category: newDocument.category || undefined,
          tags: newDocument.tags
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add document');
      }

      toast({
        title: 'Success',
        description: 'Document added to knowledge base successfully'
      });

      // Reset form
      setNewDocument({
        title: '',
        content: '',
        type: 'knowledge',
        source: '',
        category: '',
        tags: [],
        tagInput: ''
      });
      setShowAddForm(false);
      
      // Reload data
      loadDocuments();
      loadStats();
      loadCategories();
      loadTags();
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: 'Error',
        description: 'Failed to add document to knowledge base',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge-base/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast({
        title: 'Success',
        description: 'Document deleted successfully'
      });

      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const initializePinecone = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/knowledge-base/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initialize Pinecone');
      }

      toast({
        title: 'Success',
        description: 'Pinecone index initialized successfully'
      });
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize Pinecone index',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addTagToDocument = (tag: string) => {
    if (tag && !newDocument.tags.includes(tag)) {
      setNewDocument({
        ...newDocument,
        tags: [...newDocument.tags, tag],
        tagInput: ''
      });
    }
  };

  const removeTagFromDocument = (tagToRemove: string) => {
    setNewDocument({
      ...newDocument,
      tags: newDocument.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
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
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <Button onClick={initializePinecone} variant="outline">
          Initialize Pinecone
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-gray-600">Total Documents</h3>
            <p className="text-2xl font-bold">{stats.totalDocuments}</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-gray-600">Total Embeddings</h3>
            <p className="text-2xl font-bold">{stats.totalEmbeddings}</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-gray-600">Completed</h3>
            <p className="text-2xl font-bold text-green-600">{stats.embeddingStatus.completed || 0}</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-gray-600">Processing</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.embeddingStatus.processing || 0}</p>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse Documents</TabsTrigger>
          <TabsTrigger value="add">Add Document</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search and Filters */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Types</option>
                  <option value="grant">Grants</option>
                  <option value="policy">Policies</option>
                  <option value="guideline">Guidelines</option>
                  <option value="application">Applications</option>
                  <option value="knowledge">Knowledge</option>
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
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
                        <Badge className={getTypeColor(doc.type)}>
                          {doc.type}
                        </Badge>
                        <Badge className={getStatusColor(doc.embedding_status)}>
                          {doc.embedding_status}
                        </Badge>
                        <Button
                          onClick={() => handleDeleteDocument(doc.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <p className="text-gray-600 line-clamp-2">{doc.content}</p>

                    <div className="flex flex-wrap gap-2">
                      {doc.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-sm text-gray-500">
                      <span>Source: {doc.source}</span>
                      {doc.category && (
                        <span className="ml-4">Category: {doc.category}</span>
                      )}
                      <span className="ml-4">
                        Created: {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}

              {documents.length === 0 && !loading && (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">No documents found. Try adjusting your search or filters.</p>
                </Card>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Document</h2>
            
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
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={newDocument.type}
                    onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="knowledge">Knowledge</option>
                    <option value="grant">Grant</option>
                    <option value="policy">Policy</option>
                    <option value="guideline">Guideline</option>
                    <option value="application">Application</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Source</label>
                  <Input
                    value={newDocument.source}
                    onChange={(e) => setNewDocument({ ...newDocument, source: e.target.value })}
                    placeholder="Document source"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Input
                    value={newDocument.category}
                    onChange={(e) => setNewDocument({ ...newDocument, category: e.target.value })}
                    placeholder="Category (optional)"
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
                {loading ? 'Adding Document...' : 'Add to Knowledge Base'}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}