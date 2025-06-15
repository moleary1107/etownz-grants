import { NextRequest, NextResponse } from 'next/server'
import { DEMO_USERS } from '../../../../data/demoUsers'

interface LoginRequest {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user in demo data
    const user = DEMO_USERS.find(u => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create a simple JWT-like token (for demo purposes)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    })).toString('base64')

    // Return user data without password
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed. Use POST to login.' },
    { status: 405 }
  )
}