import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  loginSchema,
  logout,
  me,
  refresh,
  register,
  registerSchema,
  updateMe,
  updateProfileSchema,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Slows down brute-force attempts against login / register.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'rate_limited', message: 'Too many attempts. Please try again in 15 minutes.' },
  },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, validate(updateProfileSchema), updateMe);

export default router;
