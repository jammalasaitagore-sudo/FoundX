import { app } from './app.js';
import { env } from './config/env.js';
import { supabaseAdmin } from './config/supabase.js';

/**
 * One-time bootstrap for hosts without a shell (free Render instances).
 * When SEED_ON_START=true and the items table is empty, the demo accounts and
 * sample listings are created before the server starts accepting traffic.
 * Safe to leave enabled: it never touches a database that already has items.
 */
async function bootstrapIfEmpty() {
  if (process.env.SEED_ON_START !== 'true') return;

  try {
    const { count, error } = await supabaseAdmin
      .from('items')
      .select('id', { count: 'exact', head: true })
      .abortSignal(AbortSignal.timeout(10000));

    if (error) {
      console.warn('[FoundX] Seed skipped - could not read items:', error.message);
      return;
    }
    if (count && count > 0) {
      console.log(`[FoundX] Seed skipped - ${count} items already present.`);
      return;
    }

    const { runSeed } = await import('../scripts/seed.js');
    await runSeed();
    console.log('[FoundX] Database seeded with demo data.');
  } catch (error) {
    console.error('[FoundX] Auto-seed failed:', error.message || error);
  }
}

await bootstrapIfEmpty();

const server = app.listen(env.port, () => {
  console.log('');
  console.log('  FoundX - Campus Lost and Found Portal');
  console.log('  ---------------------------------------------');
  console.log(`  Listening: port ${env.port}`);
  console.log(`  API      : http://localhost:${env.port}/api`);
  console.log(`  Health   : http://localhost:${env.port}/api/health`);
  console.log(`  Frontend : http://localhost:${env.port}/`);
  console.log(`  Mode     : ${env.nodeEnv}`);
  console.log('');
});

function shutdown(signal) {
  console.log(`\n[FoundX] ${signal} received, closing server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[FoundX] Unhandled promise rejection:', reason);
});
