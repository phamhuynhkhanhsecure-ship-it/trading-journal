import { Router } from 'express';
import { analyticsController, exportController } from '../composition/container.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/overview',       asyncHandler(analyticsController.overview));
router.get('/by-day-of-week', asyncHandler(analyticsController.byDayOfWeek));
router.get('/by-instrument',  asyncHandler(analyticsController.byInstrument));
router.get('/by-side',        asyncHandler(analyticsController.bySide));
router.get('/by-tag',         asyncHandler(analyticsController.byTag));
router.get('/by-playbook',    asyncHandler(analyticsController.byPlaybook));
router.get('/streaks',        asyncHandler(analyticsController.streaks));
router.get('/risk',           asyncHandler(analyticsController.risk));
router.get('/by-mood',        asyncHandler(analyticsController.byMood));
router.get('/rolling',        asyncHandler(analyticsController.rolling));
router.get('/export',         asyncHandler(exportController.exportAnalytics));

export default router;
