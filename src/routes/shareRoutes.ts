import { Router } from 'express';
import { body } from 'express-validator';
import {
  shareWithUser,
  shareViaLink,
  accessViaLink,
  downloadViaLink,
  getFileShares,
  revokeShare,
  updateShareExpiration
} from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validation rules
const shareWithUserValidation = [
  body('fileId')
    .notEmpty()
    .withMessage('File ID is required')
    .isMongoId()
    .withMessage('Invalid file ID'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('permission')
    .optional()
    .isIn(['view', 'download'])
    .withMessage('Permission must be view or download')
];

const shareViaLinkValidation = [
  body('fileId')
    .notEmpty()
    .withMessage('File ID is required')
    .isMongoId()
    .withMessage('Invalid file ID'),
  body('permission')
    .optional()
    .isIn(['view', 'download'])
    .withMessage('Permission must be view or download')
];

// All routes require authentication
router.use(authenticate);

// Share routes
router.post('/user', shareWithUserValidation, shareWithUser);
router.post('/link', shareViaLinkValidation, shareViaLink);
router.get('/link/:shareLink', accessViaLink);
router.get('/link/:shareLink/download', downloadViaLink);
router.get('/file/:fileId', getFileShares);
router.delete('/:shareId', revokeShare);
router.patch('/:shareId/expiration', updateShareExpiration);

export default router;

