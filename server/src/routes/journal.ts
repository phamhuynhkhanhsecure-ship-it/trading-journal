import { Router } from 'express';
import { journalController } from '../composition/container.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/',         asyncHandler(journalController.getAll));
router.get('/:date',    asyncHandler(journalController.getByDate));
router.post('/',        asyncHandler(journalController.upsert));
router.put('/:date',    asyncHandler(journalController.update));
router.delete('/:date', asyncHandler(journalController.delete));

export default router;
