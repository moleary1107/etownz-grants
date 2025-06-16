import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to check if the authenticated user has the required role(s)
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Access denied: No user found in request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if user has one of the allowed roles
      const userRole = req.user.role;
      
      if (!userRole) {
        logger.warn('Access denied: User has no role', { userId: req.user.id });
        return res.status(403).json({
          success: false,
          error: 'Access denied: No role assigned'
        });
      }

      if (!allowedRoles.includes(userRole)) {
        logger.warn('Access denied: Insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredRoles: allowedRoles
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: Insufficient permissions'
        });
      }

      // User has required role, proceed
      next();
    } catch (error) {
      logger.error('Error in role authorization middleware', { error });
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
};

/**
 * Middleware to check if user is an admin (super_admin or organization_admin)
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return requireRole(['super_admin', 'organization_admin'])(req, res, next);
};

/**
 * Middleware to check if user is a super admin
 */
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return requireRole(['super_admin'])(req, res, next);
};