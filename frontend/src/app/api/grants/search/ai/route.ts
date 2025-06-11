import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

/**
 * AI-powered grant search endpoint
 * Connects frontend to backend AI grant matching service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.org_profile || !body.org_profile.id || !body.org_profile.name) {
      return NextResponse.json(
        { 
          error: 'Invalid request', 
          message: 'org_profile with id and name is required' 
        },
        { status: 400 }
      )
    }

    console.log('AI Grant Search Request:', {
      orgId: body.org_profile.id,
      orgName: body.org_profile.name,
      limit: body.limit || 10
    })
    
    const response = await fetch(`${BACKEND_URL}/grants/search/ai`, {
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
      console.error('Backend AI search error:', errorData)
      throw new Error(`Backend AI search failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('AI Grant Search Response:', {
      orgId: body.org_profile.id,
      matchesFound: data.matches?.length || 0,
      aiPowered: data.metadata?.ai_powered || false
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in AI grant search:', error)
    return NextResponse.json(
      { 
        error: 'AI search failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        ai_powered: false
      },
      { status: 500 }
    )
  }
}