import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import multer from 'multer';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  console.error('Error:', err);
  
  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'File size exceeds the maximum allowed limit.'
      });
      return;
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 files allowed per upload.'
      });
      return;
    }
    
    res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
    return;
  }
  
  // Custom file type error from multer filter
  if (err.message && err.message.includes('File type')) {
    res.status(400).json({
      success: false,
      error: err.message
    });
    return;
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: err.message
    });
    return;
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
    return;
  }
  
  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as Error & { code: number }).code === 11000) {
    res.status(400).json({
      success: false,
      error: 'Duplicate entry. This record already exists.'
    });
    return;
  }
  
  // Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
    return;
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred'
      : err.message
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
};

