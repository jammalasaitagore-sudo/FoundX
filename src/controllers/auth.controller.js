import { z } from 'zod';
import { supabaseAdmin, supabasePublic } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.');

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: passwordRule,
  roll_number: z.string().trim().max(20).optional().or(z.literal('').transform(() => undefined)),
  department: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid phone number.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().min(2).max(80).optional(),
    roll_number: z.string().trim().max(20).nullable().optional(),
    department: z.string().trim().max(80).nullable().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid phone number.')
      .nullable()
      .optional(),
    avatar_url: z.string().trim().url('Avatar must be a valid URL.').nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

async function fetchProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, roll_number, department, phone, role, avatar_url, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw ApiError.internal('Could not load your profile.');
  return data;
}

async function issueSession(email, password) {
  const { data, error } = await supabasePublic.auth.signInWithPassword({ email, password });
  if (error) {
    throw new ApiError(401, 'Account created but automatic sign-in failed. Please log in.', 'login_failed');
  }
  return data.session;
}

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const { full_name, email, password, roll_number, department, phone } = req.body;

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, roll_number, department, phone },
  });

  if (error) {
    const alreadyExists =
      error.code === 'email_exists' ||
      error.code === 'user_already_exists' ||
      /already (been )?registered|already exists/i.test(error.message || '');
    if (alreadyExists) {
      throw ApiError.conflict('An account with this email already exists.');
    }
    throw new ApiError(400, error.message || 'Could not create the account.', 'signup_failed');
  }

  // The database trigger creates the profile row; read it back.
  const profile = await fetchProfile(created.user.id);
  const session = await issueSession(email, password);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: {
      user: profile,
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_at: session?.expires_at ?? null,
    },
  });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabasePublic.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const profile = await fetchProfile(data.user.id);

  res.json({
    success: true,
    message: 'Logged in successfully.',
    data: {
      user: profile,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (req, res) => {
  // Revokes the current session so the token cannot be reused.
  const { error } = await supabaseAdmin.auth.admin.signOut(req.token, 'local');
  if (error) {
    // A token that is already invalid is not an error for the client.
    console.warn('[FoundX] logout:', error.message);
  }

  res.json({ success: true, message: 'Logged out successfully.' });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const profile = await fetchProfile(req.user.id);
  if (!profile) throw ApiError.notFound('Profile not found.');
  res.json({ success: true, data: { user: profile } });
});

/** PATCH /api/auth/me */
export const updateMe = asyncHandler(async (req, res) => {
  // Only these columns may be changed by the user; `role` is deliberately
  // excluded so a student cannot promote themselves to admin.
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(req.body)
    .eq('id', req.user.id)
    .select('id, full_name, email, roll_number, department, phone, role, avatar_url, created_at, updated_at')
    .single();

  if (error) throw new ApiError(400, error.message, 'profile_update_failed');

  res.json({ success: true, message: 'Profile updated.', data: { user: data } });
});

/** POST /api/auth/refresh */
export const refresh = asyncHandler(async (req, res) => {
  const { refresh_token: refreshToken } = req.body ?? {};
  if (!refreshToken) throw ApiError.badRequest('refresh_token is required.');

  const { data, error } = await supabasePublic.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data?.session) {
    throw ApiError.unauthorized('Refresh token is invalid or expired. Please log in again.');
  }

  res.json({
    success: true,
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
});
