import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { supabaseAdmin } from './config/supabase.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

export const app = express();

// Behind Render / Railway / Vercel proxies, so rate limiting sees the real IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false, // the static front-end loads Google Fonts
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/server-to-server (no Origin header) and listed origins.
      if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (!env.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Global API rate limit.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'rate_limited', message: 'Too many requests. Please try again shortly.' },
    },
  }),
);

/** Liveness + database connectivity probe. */
app.get('/api/health', async (_req, res) => {
  const startedAt = Date.now();
  let database = 'unreachable';

  try {
    const probe = supabaseAdmin
      .from('categories')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
      .abortSignal(AbortSignal.timeout(5000));
    const { error } = await probe;
    database = error ? 'error' : 'connected';
  } catch {
    database = 'error';
  }

  res.status(database === 'connected' ? 200 : 503).json({
    success: database === 'connected',
    data: {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'FoundX API',
      version: '1.0.0',
      environment: env.nodeEnv,
      database,
      latency_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api', apiRoutes);

// Static front-end (Phase 4 pages live here).
app.use(express.static(publicDir, { extensions: ['html'] }));

app.use(notFoundHandler);
app.use(errorHandler);
