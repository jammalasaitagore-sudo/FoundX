import 'dotenv/config';

/**
 * Reads and validates environment variables once, at start-up.
 * The server refuses to boot with a clear message instead of failing
 * later with a confusing Supabase error.
 */
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());

if (missing.length > 0) {
  console.error('\n[FoundX] Missing environment variables: ' + missing.join(', '));
  console.error('[FoundX] Copy .env.example to .env and paste the values from your Supabase dashboard.\n');
  process.exit(1);
}

if (!/^https:\/\/.+\.supabase\.(co|in)$/.test(process.env.SUPABASE_URL.trim())) {
  console.warn('[FoundX] Warning: SUPABASE_URL does not look like a Supabase project URL.');
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  supabaseUrl: process.env.SUPABASE_URL.trim(),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY.trim(),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'item-images',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 5),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:4000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
