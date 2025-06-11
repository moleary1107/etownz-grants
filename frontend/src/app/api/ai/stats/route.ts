import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

/**
 * AI Statistics API
 * Get detailed AI processing statistics and metrics
 */
export async function GET(request: NextRequest) {
  try {
    console.log('AI Stats Request')
    
    const response = await fetch(`${BACKEND_URL}/ai/stats`, {
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
      console.error('Backend AI stats error:', {
        status: response.status,
        error: errorData
      })
      throw new Error(`Backend AI stats failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('AI Stats Response:', {
      grantsProcessed: data.grantsProcessed,
      vectorsStored: data.vectorsStored,
      aiInteractions24h: data.aiInteractions24h,
      status: data.status
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching AI stats:', error)
    return NextResponse.json(
      { 
        error: 'AI stats unavailable', 
        message: error instanceof Error ? error.message : 'Unknown error',
        grantsProcessed: 0,
        vectorsStored: 0,
        aiInteractions24h: 0,
        status: 'unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}