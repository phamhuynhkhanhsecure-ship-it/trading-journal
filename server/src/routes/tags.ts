import { Router } from 'express';
import { tagController } from '../composition/container.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/',              asyncHandler(tagController.getAll));
router.get('/suggestions',   asyncHandler(tagController.getSuggestions));
router.post('/',             asyncHandler(tagController.create));
router.put('/:id',           asyncHandler(tagController.update));
router.delete('/:id',        asyncHandler(tagController.delete));

export default router;
