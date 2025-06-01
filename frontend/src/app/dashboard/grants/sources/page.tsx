"use client"

import { useState, useEffect } from 'react'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Plus, Globe, Search, Play, Settings, Trash2, ExternalLink } from 'lucide-react'

interface GrantSource {
  id: string
  name: string
  url: string
  description?: string
  category: 'government' | 'council' | 'eu' | 'foundation' | 'private'
  location: string
  isActive: boolean
  lastCrawled?: string
  crawlSettings: {
    depth: number
    followPdfs: boolean
    followDocx: boolean
    scheduleType: string
  }
}

export default function GrantSourcesPage() {
  const [sources, setSources] = useState<GrantSource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [crawlingStatus, setCrawlingStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchGrantSources()
  }, [])

  const fetchGrantSources = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/grant-sources')
      const data = await response.json()
      if (data.success) {
        setSources(data.data)
      }
    } catch (error) {
      console.error('Error fetching grant sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const startCrawl = async (sourceId: string) => {
    setCrawlingStatus(prev => ({ ...prev, [sourceId]: true }))
    try {
      const response = await fetch(`http://localhost:8002/api/grant-sources/${sourceId}/crawl`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        alert(`Crawl started successfully! Job ID: ${data.data.jobId}`)
      } else {
        alert(`Error starting crawl: ${data.error}`)
      }
    } catch (error) {
      console.error('Error starting crawl:', error)
      alert('Error starting crawl')
    } finally {
      setCrawlingStatus(prev => ({ ...prev, [sourceId]: false }))
    }
  }

  const deleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this grant source?')) return
    
    try {
      const response = await fetch(`http://localhost:8002/api/grant-sources/${sourceId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSources(sources.filter(s => s.id !== sourceId))
      }
    } catch (error) {
      console.error('Error deleting source:', error)
    }
  }

  const filteredSources = sources.filter(source =>
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCategoryColor = (category: string) => {
    const colors = {
      government: 'bg-blue-100 text-blue-800',
      council: 'bg-green-100 text-green-800',
      eu: 'bg-purple-100 text-purple-800',
      foundation: 'bg-orange-100 text-orange-800',
      private: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.private
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grant Sources</h1>
          <p className="text-gray-600 mt-1">Manage websites and sources for grant discovery</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search grant sources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{sources.length}</div>
            <div className="text-sm text-gray-600">Total Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {sources.filter(s => s.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Active Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {sources.filter(s => s.lastCrawled).length}
            </div>
            <div className="text-sm text-gray-600">Recently Crawled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {Object.values(crawlingStatus).filter(Boolean).length}
            </div>
            <div className="text-sm text-gray-600">Currently Crawling</div>
          </CardContent>
        </Card>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSources.map((source) => (
          <Card key={source.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <Badge className={getCategoryColor(source.category)}>
                    {source.category}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(source.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSource(source.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg">{source.name}</CardTitle>
              <CardDescription className="text-sm">
                {source.description || source.url}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-medium">{source.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>Depth:</span>
                  <span className="font-medium">{source.crawlSettings.depth} levels</span>
                </div>
                <div className="flex justify-between">
                  <span>PDFs:</span>
                  <span className="font-medium">
                    {source.crawlSettings.followPdfs ? 'Yes' : 'No'}
                  </span>
                </div>
                {source.lastCrawled && (
                  <div className="flex justify-between">
                    <span>Last Crawled:</span>
                    <span className="font-medium">
                      {new Date(source.lastCrawled).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => startCrawl(source.id)}
                  disabled={crawlingStatus[source.id] || !source.isActive}
                  className="flex-1"
                >
                  {crawlingStatus[source.id] ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Crawling...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Crawl
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className={`text-sm font-medium ${source.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {source.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500">
                  {source.crawlSettings.scheduleType}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No grant sources found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? 'Try adjusting your search terms' : 'Add your first grant source to get started'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Source
            </Button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common grant sources you might want to add
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Irish Government Sources</h4>
              <p className="text-sm text-gray-600 mb-3">Enterprise Ireland, SFI, Government.ie</p>
              <Button variant="outline" size="sm">Add Government Sources</Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">EU Funding</h4>
              <p className="text-sm text-gray-600 mb-3">Horizon Europe, INTERREG, EIC</p>
              <Button variant="outline" size="sm">Add EU Sources</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}