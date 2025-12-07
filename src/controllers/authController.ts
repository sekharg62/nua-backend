import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models';
import { generateToken } from '../utils/helpers';
import { ApiResponse, AuthRequest } from '../types';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
      return;
    }
    
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
      return;
    }
    
    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name
    });
    
    // Generate token
    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
      return;
    }
    
    const { email, password } = req.body;
    
    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
};

/**
 * Search users by email or name
 * GET /api/auth/users/search?q=query
 */
export const searchUsers = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { q } = req.query;
    const currentUserId = req.user?._id;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
      return;
    }
    
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    })
      .select('_id email name')
      .limit(10)
      .lean();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
};

