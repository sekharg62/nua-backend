import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { getFileAuditLogs, getUserAuditLogs } from '../services';
import { File } from '../models';

/**
 * Get audit logs for a file
 * GET /api/audit/file/:fileId
 */
export const getFileAudit = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const user = req.user;
    const { fileId } = req.params;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    // Check if user owns the file
    const file = await File.findById(fileId);
    
    if (!file) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
      return;
    }
    
    if (file.owner.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        error: 'Only the owner can view file audit logs'
      });
      return;
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const auditData = await getFileAuditLogs(fileId, page, limit);
    
    res.json({
      success: true,
      data: auditData
    });
  } catch (error) {
    console.error('Get file audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit logs'
    });
  }
};

/**
 * Get audit logs for current user
 * GET /api/audit/me
 */
export const getMyAudit = async (
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
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const auditData = await getUserAuditLogs(user._id.toString(), page, limit);
    
    res.json({
      success: true,
      data: auditData
    });
  } catch (error) {
    console.error('Get user audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit logs'
    });
  }
};

