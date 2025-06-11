import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

/**
 * Semantic Search API
 * Natural language search for grants using AI embeddings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid search query', 
          message: 'query string is required and cannot be empty' 
        },
        { status: 400 }
      )
    }

    console.log('Semantic Search Request:', {
      query: body.query.substring(0, 100) + (body.query.length > 100 ? '...' : ''),
      organizationId: body.organizationId,
      limit: body.limit || 10,
      hasFilters: !!body.filters
    })
    
    const response = await fetch(`${BACKEND_URL}/ai/grants/search/semantic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Backend semantic search error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend semantic search failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Semantic Search Response:', {
      query: body.query.substring(0, 100),
      resultsFound: data.results?.length || 0,
      processingTime: data.processingTime,
      enhanced: data.metadata?.enhanced || false
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in semantic search:', error)
    return NextResponse.json(
      { 
        error: 'Semantic search failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        results: [],
        processingTime: 0
      },
      { status: 500 }
    )
  }
}