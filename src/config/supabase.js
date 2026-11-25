import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from './env.js';

/**
 * Two clients:
 *
 *  supabaseAdmin  - service_role key, used for every database query from
 *                   the Express API. It bypasses Row Level Security, which
 *                   is why every route is guarded by our own auth
 *                   middleware first.
 *  supabasePublic - anon key, used only for auth operations that must be
 *                   performed as an anonymous client (sign in / sign up).
 */
const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  // Node 20 has no global WebSocket; realtime-js needs one even though this
  // API never subscribes to realtime channels. Node 22+ ignores this.
  realtime: { transport: ws },
};

export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  clientOptions,
);

export const supabasePublic = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  clientOptions,
);

/** Public URL of an object inside the item-images bucket. */
export function storagePublicUrl(objectPath) {
  if (!objectPath) return null;
  const { data } = supabaseAdmin.storage.from(env.storageBucket).getPublicUrl(objectPath);
  return data?.publicUrl ?? null;
}
