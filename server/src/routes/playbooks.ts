import { Router } from 'express';
import { playbookController } from '../composition/container.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/',         asyncHandler(playbookController.getAll));
router.get('/:id',      asyncHandler(playbookController.getById));
router.post('/',        asyncHandler(playbookController.create));
router.put('/:id',      asyncHandler(playbookController.update));
router.delete('/:id',   asyncHandler(playbookController.delete));

export default router;
