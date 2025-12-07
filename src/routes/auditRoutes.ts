import { Router } from 'express';
import { getFileAudit, getMyAudit } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Audit routes
router.get('/me', getMyAudit);
router.get('/file/:fileId', getFileAudit);

export default router;

