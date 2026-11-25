import { Router } from 'express';
import authRoutes from './auth.routes.js';
import itemRoutes from './items.routes.js';
import metaRoutes from './meta.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/meta', metaRoutes);

/** Route index - handy during the viva demo. */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'FoundX API',
    version: '1.0.0 (Phase 1)',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        updateMe: 'PATCH /api/auth/me',
      },
      items: {
        list: 'GET /api/items?q=&category=&type=&status=&building=&sort=&page=&limit=',
        detail: 'GET /api/items/:id',
      },
      meta: {
        categories: 'GET /api/meta/categories',
        buildings: 'GET /api/meta/buildings',
        stats: 'GET /api/meta/stats',
      },
    },
  });
});

export default router;
