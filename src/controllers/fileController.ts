import { Response } from 'express';
import fs from 'fs';
import { File, Share } from '../models';
import { AuthRequest, ApiResponse } from '../types';
import { generateFileUrl } from '../utils/helpers';
import { compressFile, logAudit } from '../services';

/**
 * Upload files (single or bulk)
 * POST /api/files/upload
 */
export const uploadFiles = async (
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
    
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
      return;
    }
    
    const uploadedFiles = [];
    
    for (const file of files) {
      // Compress file if applicable
      const compressionResult = await compressFile(
        file.path,
        file.mimetype,
        file.originalname
      );
      
      const fileDoc = await File.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: compressionResult.success ? compressionResult.compressedSize : file.size,
        path: file.path,
        url: generateFileUrl(file.filename),
        owner: user._id,
        isCompressed: compressionResult.success,
        originalSize: compressionResult.success ? compressionResult.originalSize : undefined
      });
      
      uploadedFiles.push(fileDoc);
      
      // Log audit
      await logAudit(user._id.toString(), 'file_upload', {
        fileId: fileDoc._id.toString(),
        details: {
          filename: file.originalname,
          size: file.size,
          compressed: compressionResult.success,
          compressionRatio: compressionResult.compressionRatio
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload files'
    });
  }
};

/**
 * Get user's files
 * GET /api/files
 */
export const getMyFiles = async (
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
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;
    
    const [files, total] = await Promise.all([
      File.find({ owner: user._id })
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      File.countDocuments({ owner: user._id })
    ]);
    
    res.json({
      success: true,
      data: {
        files,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get files'
    });
  }
};

/**
 * Get shared files (files shared with the user)
 * GET /api/files/shared
 */
export const getSharedWithMe = async (
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
    const skip = (page - 1) * limit;
    
    // Find all active shares for this user
    const [shares, total] = await Promise.all([
      Share.find({
        sharedWith: user._id,
        shareType: 'user',
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      })
        .populate('file')
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Share.countDocuments({
        sharedWith: user._id,
        shareType: 'user',
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      })
    ]);
    
    res.json({
      success: true,
      data: {
        shares,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get shared files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shared files'
    });
  }
};

/**
 * Get single file by ID
 * GET /api/files/:id
 */
export const getFileById = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    const file = await File.findById(id).populate('owner', 'name email');
    
    if (!file) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
      return;
    }
    
    // Check if user is owner or has access
    const isOwner = file.owner._id.toString() === user._id.toString();
    
    if (!isOwner) {
      // Check for share access
      const share = await Share.findOne({
        file: id,
        sharedWith: user._id,
        shareType: 'user',
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });
      
      if (!share) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }
    }
    
    // Log view
    await logAudit(user._id.toString(), 'file_view', {
      fileId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file'
    });
  }
};

/**
 * Download file
 * GET /api/files/:id/download
 */
export const downloadFile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
      return;
    }
    
    // Check if user is owner or has download access
    const isOwner = file.owner.toString() === user._id.toString();
    
    if (!isOwner) {
      const share = await Share.findOne({
        file: id,
        sharedWith: user._id,
        shareType: 'user',
        permission: 'download',
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });
      
      if (!share) {
        res.status(403).json({
          success: false,
          error: 'Access denied. You do not have download permission.'
        });
        return;
      }
    }
    
    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
      return;
    }
    
    // Log download
    await logAudit(user._id.toString(), 'file_download', {
      fileId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
};

/**
 * Delete file
 * DELETE /api/files/:id
 */
export const deleteFile = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
      return;
    }
    
    // Only owner can delete
    if (file.owner.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        error: 'Only the owner can delete this file'
      });
      return;
    }
    
    // Delete file from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // Delete all shares for this file
    await Share.deleteMany({ file: id });
    
    // Delete file document
    await file.deleteOne();
    
    // Log deletion
    await logAudit(user._id.toString(), 'file_delete', {
      fileId: id,
      details: { filename: file.originalName },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
};

/**
 * Get file statistics
 * GET /api/files/stats
 */
export const getFileStats = async (
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
    
    const [
      totalFiles,
      totalSize,
      filesByType,
      recentFiles
    ] = await Promise.all([
      File.countDocuments({ owner: user._id }),
      File.aggregate([
        { $match: { owner: user._id } },
        { $group: { _id: null, total: { $sum: '$size' } } }
      ]),
      File.aggregate([
        { $match: { owner: user._id } },
        { $group: { _id: '$mimeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      File.find({ owner: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);
    
    res.json({
      success: true,
      data: {
        totalFiles,
        totalSize: totalSize[0]?.total || 0,
        filesByType,
        recentFiles
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
};

