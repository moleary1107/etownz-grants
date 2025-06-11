import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

/**
 * AI Grant Matching API
 * Advanced AI-powered grant matching with semantic analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.organizationProfile || !body.organizationProfile.id || !body.organizationProfile.name) {
      return NextResponse.json(
        { 
          error: 'Invalid organization profile', 
          message: 'organizationProfile with id and name is required' 
        },
        { status: 400 }
      )
    }

    console.log('AI Grant Matching Request:', {
      orgId: body.organizationProfile.id,
      orgName: body.organizationProfile.name,
      sector: body.organizationProfile.sector,
      limit: body.limit || 10,
      hasFilters: !!body.filters
    })
    
    const response = await fetch(`${BACKEND_URL}/ai/grants/match`, {
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
      console.error('Backend AI matching error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend AI matching failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('AI Grant Matching Response:', {
      orgId: body.organizationProfile.id,
      matchesFound: data.matches?.length || 0,
      processingTime: data.processingTime,
      averageScore: data.metadata?.averageScore || 0
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in AI grant matching:', error)
    return NextResponse.json(
      { 
        error: 'AI matching failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        matches: [],
        processingTime: 0
      },
      { status: 500 }
    )
  }
}