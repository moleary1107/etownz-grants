import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * Scraping Statistics API
 * Get comprehensive scraping statistics and metrics
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Scraping Stats Request')
    
    const response = await fetch(`${BACKEND_URL}/scraping/stats`, {
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
      console.error('Backend scraping stats error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend scraping stats failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Scraping Stats Response:', {
      totalJobs: data.jobs?.total || 0,
      totalPages: data.pages?.total || 0,
      totalDocuments: data.documents?.total || 0
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching scraping stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch scraping stats', 
        message: error instanceof Error ? error.message : 'Unknown error',
        jobs: { total: 0 },
        pages: { total: 0 },
        documents: { total: 0 }
      },
      { status: 500 }
    )
  }
}