import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest, ApiResponse } from '../types';

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access denied. Invalid token format.'
      });
      return;
    }
    
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
      return;
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.'
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
  
  next();
};

