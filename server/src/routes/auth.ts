import { Router } from 'express';
import { adminLogin, refresh, logout } from '../controllers/authController';

const router = Router();

router.post('/login', adminLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
