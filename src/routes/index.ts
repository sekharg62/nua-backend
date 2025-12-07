import { Router } from 'express';
import authRoutes from './authRoutes';
import fileRoutes from './fileRoutes';
import shareRoutes from './shareRoutes';
import auditRoutes from './auditRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/shares', shareRoutes);
router.use('/audit', auditRoutes);

export default router;

