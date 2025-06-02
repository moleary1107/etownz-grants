import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * AI Health Check API
 * Get status of AI services and processing statistics
 */
export async function GET(request: NextRequest) {
  try {
    console.log('AI Health Check Request')
    
    const response = await fetch(`${BACKEND_URL}/ai/health`, {
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
      console.error('Backend AI health check error:', {
        status: response.status,
        error: errorData
      })
      
      // Return unhealthy status if backend is down
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Backend AI services unavailable',
        grantsProcessed: 0,
        vectorsStored: 0,
        aiInteractions: 0,
        errors: [`Backend responded with ${response.status}`],
        timestamp: new Date().toISOString()
      })
    }

    const data = await response.json()
    
    console.log('AI Health Check Response:', {
      status: data.status,
      grantsProcessed: data.grantsProcessed,
      vectorsStored: data.vectorsStored,
      aiInteractions: data.aiInteractions
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in AI health check:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'AI health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        grantsProcessed: 0,
        vectorsStored: 0,
        aiInteractions: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}