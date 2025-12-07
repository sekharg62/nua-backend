import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  newPath?: string;
}

/**
 * Compress image files using sharp
 */
export const compressImage = async (
  filePath: string,
  mimeType: string
): Promise<CompressionResult> => {
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;
  
  // Skip if file is already small (< 100KB)
  if (originalSize < 100 * 1024) {
    return {
      success: false,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1
    };
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, ext);
  const compressedPath = path.join(dir, `${basename}_compressed${ext}`);
  
  try {
    let sharpInstance = sharp(filePath);
    
    // Apply compression based on image type
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      sharpInstance = sharpInstance.jpeg({ quality: 80, mozjpeg: true });
    } else if (mimeType === 'image/png') {
      sharpInstance = sharpInstance.png({ compressionLevel: 8, palette: true });
    } else if (mimeType === 'image/webp') {
      sharpInstance = sharpInstance.webp({ quality: 80 });
    } else {
      // Unsupported format for compression
      return {
        success: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1
      };
    }
    
    await sharpInstance.toFile(compressedPath);
    
    const compressedStats = fs.statSync(compressedPath);
    const compressedSize = compressedStats.size;
    
    // Only keep compressed version if it's smaller
    if (compressedSize < originalSize) {
      fs.unlinkSync(filePath);
      fs.renameSync(compressedPath, filePath);
      
      return {
        success: true,
        originalSize,
        compressedSize,
        compressionRatio: compressedSize / originalSize,
        newPath: filePath
      };
    } else {
      fs.unlinkSync(compressedPath);
      return {
        success: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1
      };
    }
  } catch (error) {
    console.error('Image compression error:', error);
    // Clean up temp file if exists
    if (fs.existsSync(compressedPath)) {
      fs.unlinkSync(compressedPath);
    }
    return {
      success: false,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1
    };
  }
};

/**
 * Create a zip archive from a file
 */
export const createZipArchive = async (
  filePath: string,
  originalName: string
): Promise<CompressionResult> => {
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;
  
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, path.extname(filePath));
  const zipPath = path.join(dir, `${basename}.zip`);
  
  return new Promise((resolve) => {
    try {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        const compressedSize = archive.pointer();
        
        // Only keep if compression was effective
        if (compressedSize < originalSize * 0.9) {
          fs.unlinkSync(filePath);
          resolve({
            success: true,
            originalSize,
            compressedSize,
            compressionRatio: compressedSize / originalSize,
            newPath: zipPath
          });
        } else {
          fs.unlinkSync(zipPath);
          resolve({
            success: false,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1
          });
        }
      });
      
      archive.on('error', () => {
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
        resolve({
          success: false,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1
        });
      });
      
      archive.pipe(output);
      archive.file(filePath, { name: originalName });
      archive.finalize();
    } catch {
      resolve({
        success: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1
      });
    }
  });
};

/**
 * Compress file based on type
 */
export const compressFile = async (
  filePath: string,
  mimeType: string,
  _originalName: string
): Promise<CompressionResult> => {
  // Compress images
  if (mimeType.startsWith('image/')) {
    return compressImage(filePath, mimeType);
  }
  
  // For other file types, we don't compress by default
  // as most formats like PDF, ZIP, etc. are already compressed
  const stats = fs.statSync(filePath);
  return {
    success: false,
    originalSize: stats.size,
    compressedSize: stats.size,
    compressionRatio: 1
  };
};

