import { Router } from 'express';
import { 
  uploadFiles, 
  getMyFiles, 
  getSharedWithMe,
  getFileById, 
  downloadFile, 
  deleteFile,
  getFileStats
} from '../controllers';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

// All routes require authentication
router.use(authenticate);

// File routes
router.post('/upload', upload.array('files', 10), uploadFiles);
router.get('/', getMyFiles);
router.get('/shared', getSharedWithMe);
router.get('/stats', getFileStats);
router.get('/:id', getFileById);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

export default router;

