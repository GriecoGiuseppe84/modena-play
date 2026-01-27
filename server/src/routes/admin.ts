import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { checkSetupNotCompleted } from '../middleware/checkSetup';
import {
  setupStatus,
  testDb,
  runDbMigrations,
  savePlatformConfig,
  completeSetup,
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  analytics,
} from '../controllers/adminController';

const router = Router();

router.get('/setup/status', requireAuth, requireRole('admin'), setupStatus);
router.post('/setup/test-db', requireAuth, requireRole('admin'), checkSetupNotCompleted, testDb);
router.post('/setup/run-migrations', requireAuth, requireRole('admin'), checkSetupNotCompleted, runDbMigrations);
router.post('/setup/save-config', requireAuth, requireRole('admin'), checkSetupNotCompleted, savePlatformConfig);
router.post('/setup/complete', requireAuth, requireRole('admin'), checkSetupNotCompleted, completeSetup);

router.get('/links', requireAuth, requireRole('admin'), listLinks);
router.post('/links', requireAuth, requireRole('admin'), createLink);
router.patch('/links/:id', requireAuth, requireRole('admin'), updateLink);
router.delete('/links/:id', requireAuth, requireRole('admin'), deleteLink);

router.get('/analytics/summary', requireAuth, requireRole('admin'), analytics);

export default router;
