import { Router } from 'express';
import { tradeController } from '../composition/container.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// ===== Trade CRUD =====
router.get('/',                asyncHandler(tradeController.getAll));
router.get('/gallery/all',     asyncHandler(tradeController.getGallery));
router.get('/:id',             asyncHandler(tradeController.getById));
router.post('/',               asyncHandler(tradeController.create));
router.post('/bulk',           asyncHandler(tradeController.bulkCreate));
router.put('/:id',             asyncHandler(tradeController.update));
router.delete('/:id',          asyncHandler(tradeController.delete));

// ===== Trade Images =====
router.post('/:id/images',     tradeController.uploadMiddleware, asyncHandler(tradeController.uploadImages));
router.delete('/:id/images/:imageId', asyncHandler(tradeController.deleteImage));

export default router;
