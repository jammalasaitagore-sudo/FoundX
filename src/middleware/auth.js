import { supabaseAdmin } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function loadUser(token) {
  // getUser() validates the JWT signature and expiry against Supabase Auth.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, roll_number, department, phone, role, avatar_url, created_at')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role ?? 'student',
    profile: profile ?? { id: data.user.id, email: data.user.email, role: 'student' },
  };
}

/**
 * Requires a valid Supabase access token in `Authorization: Bearer <token>`.
 * Attaches req.user (auth user + profile) and req.token.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    throw ApiError.unauthorized('Missing access token. Send "Authorization: Bearer <token>".');
  }

  const user = await loadUser(token);
  if (!user) {
    throw ApiError.unauthorized('Session expired or token is invalid. Please log in again.');
  }

  req.user = user;
  req.token = token;
  next();
});

/**
 * Populates req.user when a token is present but never blocks the request.
 * Used by public routes that behave slightly differently for the owner.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req);
  if (token) {
    const user = await loadUser(token);
    if (user) {
      req.user = user;
      req.token = token;
    }
  }
  next();
});

/** Must run after requireAuth. */
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Administrator access required.'));
  }
  next();
}
