import { Router } from 'express';
import { ruleController } from '../composition/container.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/',               asyncHandler(ruleController.getAll));
router.post('/',              asyncHandler(ruleController.create));
router.put('/reorder/batch',  asyncHandler(ruleController.reorder));
router.put('/:id',            asyncHandler(ruleController.update));
router.delete('/:id',         asyncHandler(ruleController.delete));

export default router;
