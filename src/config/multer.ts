import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file extensions
const getAllowedTypes = (): string[] => {
  const envTypes = process.env.ALLOWED_FILE_TYPES;
  if (envTypes) {
    return envTypes.split(',').map(t => t.trim().toLowerCase());
  }
  return ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.csv', '.xlsx', '.xls', '.doc', '.docx', '.txt', '.zip', '.mp4', '.mp3'];
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uniqueId}${ext}`;
    cb(null, safeName);
  }
});

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = getAllowedTypes();
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Max file size (default 50MB)
const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);

// Export configured multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
    files: 10 // Max 10 files per upload
  }
});

export const getMaxFileSize = (): number => maxSize;
export const getAllowedFileTypes = getAllowedTypes;

