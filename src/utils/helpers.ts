import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { IUser } from '../types';

/**
 * Generate JWT token for user
 */
export const generateToken = (user: IUser): string => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  const options: SignOptions = { 
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'] 
  };
  
  return jwt.sign(
    { userId: user._id.toString() },
    jwtSecret,
    options
  );
};

/**
 * Generate unique share link token
 */
export const generateShareLink = (): string => {
  return uuidv4().replace(/-/g, '');
};

/**
 * Format file size to human readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

/**
 * Get MIME type category (image, document, video, etc.)
 */
export const getMimeTypeCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  return 'other';
};

/**
 * Parse expiration string to Date
 */
export const parseExpiration = (expiration: string): Date | null => {
  if (!expiration) return null;
  
  const date = new Date(expiration);
  if (isNaN(date.getTime())) return null;
  
  // Ensure expiration is in the future
  if (date <= new Date()) return null;
  
  return date;
};

/**
 * Check if a date is expired
 */
export const isExpired = (date: Date | null | undefined): boolean => {
  if (!date) return false;
  return new Date() > date;
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Get base URL from environment or request
 */
export const getBaseUrl = (): string => {
  return process.env.BASE_URL || 'http://localhost:5000';
};

/**
 * Generate file URL
 */
export const generateFileUrl = (filename: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/uploads/${filename}`;
};

