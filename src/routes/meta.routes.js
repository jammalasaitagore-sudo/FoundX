import { Router } from 'express';
import {
  listBuildings,
  listCategories,
  publicStats,
} from '../controllers/items.controller.js';

const router = Router();

router.get('/categories', listCategories);
router.get('/buildings', listBuildings);
router.get('/stats', publicStats);

export default router;
