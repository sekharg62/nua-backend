import { Request } from 'express';
import { Document, Types } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// File Types
export interface IFile extends Document {
  _id: Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  owner: Types.ObjectId;
  isCompressed: boolean;
  originalSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Share Types
export type ShareType = 'user' | 'link';
export type Permission = 'view' | 'download';

export interface IShare extends Document {
  _id: Types.ObjectId;
  file: Types.ObjectId;
  owner: Types.ObjectId;
  shareType: ShareType;
  sharedWith?: Types.ObjectId; // For user shares
  shareLink?: string; // For link shares
  permission: Permission;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Types
export type AuditAction = 
  | 'file_upload'
  | 'file_download'
  | 'file_delete'
  | 'file_share_user'
  | 'file_share_link'
  | 'share_revoke'
  | 'share_access'
  | 'file_view';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  action: AuditAction;
  file?: Types.ObjectId;
  share?: Types.ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Request Types
export interface AuthRequest extends Request {
  user?: IUser;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Pagination Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// File Upload Types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

// Share Request Types
export interface ShareWithUserRequest {
  fileId: string;
  userId: string;
  permission: Permission;
  expiresAt?: string;
}

export interface ShareViaLinkRequest {
  fileId: string;
  permission: Permission;
  expiresAt?: string;
}

