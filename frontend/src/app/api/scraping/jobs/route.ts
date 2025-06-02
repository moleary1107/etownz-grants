import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * Scraping Jobs API
 * Manage web scraping and crawling jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Forward query parameters to backend
    const url = new URL(request.url)
    const queryParams = url.searchParams.toString()
    
    console.log('Scraping Jobs Request:', { queryParams })
    
    const response = await fetch(`${BACKEND_URL}/scraping/jobs?${queryParams}`, {
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
      console.error('Backend scraping jobs error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend scraping jobs failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Scraping Jobs Response:', {
      jobsCount: data.jobs?.length || 0,
      totalJobs: data.pagination?.total || 0
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching scraping jobs:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch scraping jobs', 
        message: error instanceof Error ? error.message : 'Unknown error',
        jobs: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.source_url) {
      return NextResponse.json(
        { 
          error: 'Missing required field', 
          message: 'source_url is required' 
        },
        { status: 400 }
      )
    }

    console.log('Create Scraping Job Request:', {
      sourceUrl: body.source_url,
      jobType: body.job_type || 'full_crawl'
    })
    
    const response = await fetch(`${BACKEND_URL}/scraping/jobs`, {
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
      console.error('Backend create scraping job error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend create scraping job failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Create Scraping Job Response:', {
      jobId: data.id,
      status: data.status,
      sourceUrl: data.source_url
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating scraping job:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create scraping job', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}