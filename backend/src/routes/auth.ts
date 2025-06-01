import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler';
import { UsersRepository } from '../repositories/usersRepository';
import { logger } from '../services/logger';

const router = express.Router();
const usersRepo = new UsersRepository();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - first_name
 *         - last_name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         first_name:
 *           type: string
 *           description: User's first name
 *         last_name:
 *           type: string
 *           description: User's last name
 *         role:
 *           type: string
 *           enum: [admin, member, viewer]
 *           description: User role in organization
 *         org_id:
 *           type: string
 *           format: uuid
 *           description: Organization ID
 *         is_active:
 *           type: boolean
 *           description: Whether user account is active
 *         last_login:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update date
 */

function generateToken(user: any): string {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      orgId: user.org_id 
    },
    process.env.JWT_SECRET || 'dev_secret_key',
    { expiresIn: '24h' }
  );
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user and organization
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *               - org_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               org_name:
 *                 type: string
 *               org_description:
 *                 type: string
 *               org_website:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User and organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { 
    email, 
    password, 
    first_name, 
    last_name, 
    org_name, 
    org_description, 
    org_website,
    contact_phone 
  } = req.body;

  // Validation
  if (!email || !password || !first_name || !last_name || !org_name) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'email, password, first_name, last_name, and org_name are required'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password too short',
      message: 'Password must be at least 8 characters long'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      message: 'Please provide a valid email address'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await usersRepo.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A user with this email address already exists'
      });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user and organization
    const user = await usersRepo.registerUser(
      {
        email,
        first_name,
        last_name,
        role: 'admin', // First user in org is admin
        auth_provider: 'email',
        is_active: true,
        org_id: '' // Will be set by registerUser
      },
      {
        name: org_name,
        description: org_description,
        website: org_website,
        contact_email: email,
        contact_phone,
        profile_data: {
          password_hash: hashedPassword
        }
      }
    );

    // Generate token
    const token = generateToken(user);

    // Return user data (without password)
    const userResponse = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      org_id: user.org_id,
      is_active: user.is_active,
      created_at: user.created_at
    };

    logger.info('User registered successfully', { 
      userId: user.id, 
      email: user.email,
      orgId: user.org_id 
    });

    res.status(201).json({
      message: 'User and organization created successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    logger.error('Registration failed', { error, email });
    throw error;
  }
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 organization:
 *                   type: object
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Missing credentials',
      message: 'Email and password are required' 
    });
  }

  try {
    // Find user with organization data
    const userWithOrg = await usersRepo.findUserWithOrganization(
      (await usersRepo.findUserByEmail(email))?.id || ''
    );

    if (!userWithOrg) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      });
    }

    // Get password hash from organization profile data
    const passwordHash = userWithOrg.organization?.profile_data?.password_hash;
    
    if (!passwordHash || !verifyPassword(password, passwordHash)) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      });
    }

    if (!userWithOrg.is_active) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.' 
      });
    }

    // Update last login
    await usersRepo.updateLastLogin(userWithOrg.id);

    // Generate token
    const token = generateToken(userWithOrg);

    // Return user and organization data
    const userResponse = {
      id: userWithOrg.id,
      email: userWithOrg.email,
      first_name: userWithOrg.first_name,
      last_name: userWithOrg.last_name,
      role: userWithOrg.role,
      org_id: userWithOrg.org_id,
      is_active: userWithOrg.is_active,
      last_login: new Date(),
      created_at: userWithOrg.created_at
    };

    const organizationResponse = userWithOrg.organization ? {
      id: userWithOrg.organization.id,
      name: userWithOrg.organization.name,
      description: userWithOrg.organization.description,
      website: userWithOrg.organization.website,
      contact_email: userWithOrg.organization.contact_email,
      contact_phone: userWithOrg.organization.contact_phone,
      address: userWithOrg.organization.address
    } : null;

    logger.info('User logged in successfully', { 
      userId: userWithOrg.id, 
      email: userWithOrg.email 
    });

    res.json({
      message: 'Login successful',
      user: userResponse,
      organization: organizationResponse,
      token
    });
  } catch (error) {
    logger.error('Login failed', { error, email });
    throw error;
  }
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // TODO: Implement token blacklisting if needed
  // For now, logout is handled client-side by removing the token
  res.json({ message: 'Logout successful' });
}));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 organization:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing token',
      message: 'Authorization header with Bearer token is required'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key') as any;
    
    const userWithOrg = await usersRepo.findUserWithOrganization(decoded.userId);
    
    if (!userWithOrg) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Invalid token or user no longer exists'
      });
    }

    if (!userWithOrg.is_active) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    const userResponse = {
      id: userWithOrg.id,
      email: userWithOrg.email,
      first_name: userWithOrg.first_name,
      last_name: userWithOrg.last_name,
      role: userWithOrg.role,
      org_id: userWithOrg.org_id,
      is_active: userWithOrg.is_active,
      last_login: userWithOrg.last_login,
      created_at: userWithOrg.created_at
    };

    const organizationResponse = userWithOrg.organization ? {
      id: userWithOrg.organization.id,
      name: userWithOrg.organization.name,
      description: userWithOrg.organization.description,
      website: userWithOrg.organization.website,
      contact_email: userWithOrg.organization.contact_email,
      contact_phone: userWithOrg.organization.contact_phone,
      address: userWithOrg.organization.address
    } : null;

    res.json({
      user: userResponse,
      organization: organizationResponse
    });
  } catch (error) {
    logger.error('Token verification failed', { error });
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Token is invalid or expired'
    });
  }
}));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: Email not found
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Missing email',
      message: 'Email is required'
    });
  }

  try {
    const user = await usersRepo.findUserByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // TODO: Implement password reset token generation and email sending
    logger.info('Password reset requested', { email });

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    logger.error('Password reset request failed', { error, email });
    throw error;
  }
}));

export default router;