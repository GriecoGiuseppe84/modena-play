import { Router } from 'express';

// ⚠️ importa il setup router che hai creato
import setupRouter from './setup';

const router = Router();

// ✅ /api/admin/setup/*
router.use('/setup', setupRouter);

export default router;
