import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * Scraped Documents API
 * Manage scraped documents (PDFs, DOCs, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Forward query parameters to backend
    const url = new URL(request.url)
    const queryParams = url.searchParams.toString()
    
    console.log('Scraped Documents Request:', { queryParams })
    
    const response = await fetch(`${BACKEND_URL}/scraping/documents?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Backend scraped documents error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend scraped documents failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Scraped Documents Response:', {
      documentsCount: data.documents?.length || 0,
      totalDocuments: data.pagination?.total || 0
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching scraped documents:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch scraped documents', 
        message: error instanceof Error ? error.message : 'Unknown error',
        documents: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      },
      { status: 500 }
    )
  }
}