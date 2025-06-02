import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * Scraped Pages API
 * Manage scraped web pages and their content
 */
export async function GET(request: NextRequest) {
  try {
    // Forward query parameters to backend
    const url = new URL(request.url)
    const queryParams = url.searchParams.toString()
    
    console.log('Scraped Pages Request:', { queryParams })
    
    const response = await fetch(`${BACKEND_URL}/scraping/pages?${queryParams}`, {
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
      console.error('Backend scraped pages error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend scraped pages failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Scraped Pages Response:', {
      pagesCount: data.pages?.length || 0,
      totalPages: data.pagination?.total || 0
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching scraped pages:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch scraped pages', 
        message: error instanceof Error ? error.message : 'Unknown error',
        pages: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      },
      { status: 500 }
    )
  }
}