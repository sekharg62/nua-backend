import { Response } from 'express';
import { validationResult } from 'express-validator';
import { File, Share } from '../models';
import { AuthRequest, ApiResponse } from '../types';
import { generateShareLink, isExpired, parseExpiration } from '../utils/helpers';
import { logAudit } from '../services';

/**
 * Share file with specific user
 * POST /api/shares/user
 */
export const shareWithUser = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
      return;
    }
    
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    const { fileId, userId, permission, expiresAt } = req.body;
    
    // Check if file exists and user is owner
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
        error: 'Only the owner can share this file'
      });
      return;
    }
    
    // Cannot share with yourself
    if (userId === user._id.toString()) {
      res.status(400).json({
        success: false,
        error: 'Cannot share with yourself'
      });
      return;
    }
    
    // Check if share already exists
    const existingShare = await Share.findOne({
      file: fileId,
      sharedWith: userId,
      shareType: 'user'
    });
    
    if (existingShare) {
      // Update existing share
      existingShare.permission = permission || existingShare.permission;
      existingShare.expiresAt = parseExpiration(expiresAt) || existingShare.expiresAt;
      existingShare.isActive = true;
      await existingShare.save();
      
      res.json({
        success: true,
        message: 'Share updated successfully',
        data: existingShare
      });
      return;
    }
    
    // Create new share
    const share = await Share.create({
      file: fileId,
      owner: user._id,
      shareType: 'user',
      sharedWith: userId,
      permission: permission || 'view',
      expiresAt: parseExpiration(expiresAt)
    });
    
    // Log audit
    await logAudit(user._id.toString(), 'file_share_user', {
      fileId,
      shareId: share._id.toString(),
      details: {
        sharedWith: userId,
        permission,
        expiresAt
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'File shared successfully',
      data: share
    });
  } catch (error) {
    console.error('Share with user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share file'
    });
  }
};

/**
 * Share file via link
 * POST /api/shares/link
 */
export const shareViaLink = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
      return;
    }
    
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    const { fileId, permission, expiresAt } = req.body;
    
    // Check if file exists and user is owner
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
        error: 'Only the owner can share this file'
      });
      return;
    }
    
    // Generate unique share link
    const shareLink = generateShareLink();
    
    // Create share
    const share = await Share.create({
      file: fileId,
      owner: user._id,
      shareType: 'link',
      shareLink,
      permission: permission || 'view',
      expiresAt: parseExpiration(expiresAt)
    });
    
    // Log audit
    await logAudit(user._id.toString(), 'file_share_link', {
      fileId,
      shareId: share._id.toString(),
      details: {
        permission,
        expiresAt
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Share link created successfully',
      data: {
        ...share.toJSON(),
        fullShareLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${shareLink}`
      }
    });
  } catch (error) {
    console.error('Share via link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create share link'
    });
  }
};

/**
 * Access file via share link
 * GET /api/shares/link/:shareLink
 */
export const accessViaLink = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const user = req.user;
    const { shareLink } = req.params;
    
    // Must be authenticated to access shared files
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'You must be logged in to access shared files'
      });
      return;
    }
    
    // Find share
    const share = await Share.findOne({
      shareLink,
      shareType: 'link',
      isActive: true
    }).populate('file').populate('owner', 'name email');
    
    if (!share) {
      res.status(404).json({
        success: false,
        error: 'Share link not found or has been revoked'
      });
      return;
    }
    
    // Check expiration
    if (isExpired(share.expiresAt)) {
      res.status(403).json({
        success: false,
        error: 'This share link has expired'
      });
      return;
    }
    
    // Log access
    await logAudit(user._id.toString(), 'share_access', {
      fileId: (share.file as unknown as { _id: string })._id.toString(),
      shareId: share._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      data: {
        share,
        file: share.file,
        owner: share.owner,
        permission: share.permission
      }
    });
  } catch (error) {
    console.error('Access via link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to access shared file'
    });
  }
};

/**
 * Download file via share link
 * GET /api/shares/link/:shareLink/download
 */
export const downloadViaLink = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { shareLink } = req.params;
    
    // Must be authenticated
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'You must be logged in to download shared files'
      });
      return;
    }
    
    // Find share with download permission
    const share = await Share.findOne({
      shareLink,
      shareType: 'link',
      isActive: true,
      permission: 'download'
    }).populate('file');
    
    if (!share) {
      res.status(403).json({
        success: false,
        error: 'Share link not found or does not have download permission'
      });
      return;
    }
    
    // Check expiration
    if (isExpired(share.expiresAt)) {
      res.status(403).json({
        success: false,
        error: 'This share link has expired'
      });
      return;
    }
    
    const file = share.file as unknown as { _id: string; path: string; originalName: string };
    
    // Log download
    await logAudit(user._id.toString(), 'file_download', {
      fileId: file._id.toString(),
      shareId: share._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Download via link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
};

/**
 * Get all shares for a file
 * GET /api/shares/file/:fileId
 */
export const getFileShares = async (
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
        error: 'Access denied'
      });
      return;
    }
    
    const shares = await Share.find({ file: fileId, isActive: true })
      .populate('sharedWith', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    console.error('Get file shares error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shares'
    });
  }
};

/**
 * Revoke a share
 * DELETE /api/shares/:shareId
 */
export const revokeShare = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const user = req.user;
    const { shareId } = req.params;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    const share = await Share.findById(shareId);
    
    if (!share) {
      res.status(404).json({
        success: false,
        error: 'Share not found'
      });
      return;
    }
    
    if (share.owner.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        error: 'Only the owner can revoke this share'
      });
      return;
    }
    
    share.isActive = false;
    await share.save();
    
    // Log audit
    await logAudit(user._id.toString(), 'share_revoke', {
      fileId: share.file.toString(),
      shareId: share._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      message: 'Share revoked successfully'
    });
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke share'
    });
  }
};

/**
 * Update share expiration
 * PATCH /api/shares/:shareId/expiration
 */
export const updateShareExpiration = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const user = req.user;
    const { shareId } = req.params;
    const { expiresAt } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    const share = await Share.findById(shareId);
    
    if (!share) {
      res.status(404).json({
        success: false,
        error: 'Share not found'
      });
      return;
    }
    
    if (share.owner.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        error: 'Only the owner can update this share'
      });
      return;
    }
    
    share.expiresAt = parseExpiration(expiresAt) || undefined;
    await share.save();
    
    res.json({
      success: true,
      message: 'Share expiration updated',
      data: share
    });
  } catch (error) {
    console.error('Update share expiration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update share'
    });
  }
};

