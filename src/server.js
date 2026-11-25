import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  console.log('');
  console.log('  FoundX - Campus Lost and Found Portal');
  console.log('  ---------------------------------------------');
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
