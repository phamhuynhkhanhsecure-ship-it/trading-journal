import { Router } from 'express';
import { aiController } from '../composition/container.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/coach',  asyncHandler(aiController.coach));
router.post('/vision', asyncHandler(aiController.vision));
router.post('/chat',   asyncHandler(aiController.chat));

export default router;
