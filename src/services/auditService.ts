import { AuditLog } from '../models';
import { AuditAction } from '../types';

interface AuditOptions {
  fileId?: string;
  shareId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit action
 */
export const logAudit = async (
  userId: string,
  action: AuditAction,
  options: AuditOptions = {}
): Promise<void> => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      file: options.fileId,
      share: options.shareId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

/**
 * Get audit logs for a file
 */
export const getFileAuditLogs = async (
  fileId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    AuditLog.find({ file: fileId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments({ file: fileId })
  ]);
  
  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get audit logs for a user
 */
export const getUserAuditLogs = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    AuditLog.find({ user: userId })
      .populate('file', 'originalName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments({ user: userId })
  ]);
  
  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get action display name
 */
export const getActionDisplayName = (action: AuditAction): string => {
  const actionNames: Record<AuditAction, string> = {
    file_upload: 'Uploaded file',
    file_download: 'Downloaded file',
    file_delete: 'Deleted file',
    file_share_user: 'Shared with user',
    file_share_link: 'Created share link',
    share_revoke: 'Revoked share',
    share_access: 'Accessed shared file',
    file_view: 'Viewed file'
  };
  
  return actionNames[action] || action;
};

