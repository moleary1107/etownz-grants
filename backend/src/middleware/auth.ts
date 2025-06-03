import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../services/logger'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    organizationId?: string
    is_admin?: boolean
  }
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    logger.error('JWT_SECRET not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
      is_admin: decoded.is_admin || decoded.role === 'admin'
    }
    next()
  } catch (error) {
    logger.error('Token verification failed', { error })
    return res.status(403).json({ error: 'Invalid token' })
  }
}