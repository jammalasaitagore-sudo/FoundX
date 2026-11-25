import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import {
  CAMPUS_BUILDINGS,
  DEFAULT_PAGE_SIZE,
  ITEM_STATUSES,
  LISTING_TYPES,
  MAX_PAGE_SIZE,
  SORT_OPTIONS,
} from '../config/constants.js';

const ITEM_SELECT = `
  id, title, description, listing_type, status, location, campus_building,
  event_date, image_url, contact_info, views, created_at, updated_at,
  category:categories (id, name, slug),
  owner:profiles!items_user_id_fkey (id, full_name, department, roll_number)
`;

export const listItemsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  type: z.enum(LISTING_TYPES).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  location: z.string().trim().max(80).optional(),
  building: z.string().trim().max(80).optional(),
  sort: z.enum(SORT_OPTIONS).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/** Strips characters that would break a PostgREST `or` filter. */
function sanitiseSearch(term) {
  return term.replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** GET /api/items */
export const listItems = asyncHandler(async (req, res) => {
  const { q, category, type, status, location, building, sort, page, limit } = req.query;

  let categoryId = null;
  if (category) {
    const { data: cat, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', category)
      .maybeSingle();
    if (catError) throw ApiError.internal('Could not read categories.');
    if (!cat) throw ApiError.badRequest(`Unknown category "${category}".`);
    categoryId = cat.id;
  }

  let query = supabaseAdmin.from('items').select(ITEM_SELECT, { count: 'exact' });

  if (q) {
    const term = sanitiseSearch(q);
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`,
      );
    }
  }
  if (categoryId) query = query.eq('category_id', categoryId);
  if (type) query = query.eq('listing_type', type);
  if (status) query = query.eq('status', status);
  if (location) query = query.ilike('location', `%${sanitiseSearch(location)}%`);
  if (building) query = query.eq('campus_building', building);

  switch (sort) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'event_date_desc':
      query = query.order('event_date', { ascending: false }).order('created_at', { ascending: false });
      break;
    case 'event_date_asc':
      query = query.order('event_date', { ascending: true }).order('created_at', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, error.message, 'items_query_failed');

  const total = count ?? 0;
  res.json({
    success: true,
    data: {
      items: data ?? [],
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
        has_next: from + limit < total,
        has_prev: page > 1,
      },
      filters_applied: {
        q: q ?? null,
        category: category ?? null,
        type: type ?? null,
        status: status ?? null,
        location: location ?? null,
        building: building ?? null,
        sort,
      },
    },
  });
});

/** GET /api/items/:id */
export const getItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin.from('items').select(ITEM_SELECT).eq('id', id).maybeSingle();
  if (error) throw new ApiError(500, error.message, 'item_query_failed');
  if (!data) throw ApiError.notFound('Item not found.');

  // View counter, best effort - never fails the request.
  supabaseAdmin
    .from('items')
    .update({ views: (data.views ?? 0) + 1 })
    .eq('id', id)
    .then(() => {});

  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', id);

  res.json({ success: true, data: { item: { ...data, claim_count: claimCount ?? 0 } } });
});

/** GET /api/meta/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('categories').select('id, name, slug, icon').order('name');
  if (error) throw new ApiError(500, error.message, 'categories_query_failed');
  res.json({ success: true, data: { categories: data ?? [] } });
});

/** GET /api/meta/buildings */
export const listBuildings = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { buildings: CAMPUS_BUILDINGS } });
});

/** GET /api/meta/stats - public headline numbers for the home page. */
export const publicStats = asyncHandler(async (_req, res) => {
  const count = async (applyFilter) => {
    const query = applyFilter(supabaseAdmin.from('items').select('id', { count: 'exact', head: true }));
    const { count: value, error } = await query;
    if (error) throw new ApiError(500, error.message, 'stats_query_failed');
    return value ?? 0;
  };

  const [total, lost, found, resolved] = await Promise.all([
    count((q) => q),
    count((q) => q.eq('listing_type', 'lost')),
    count((q) => q.eq('listing_type', 'found')),
    count((q) => q.eq('status', 'resolved')),
  ]);

  res.json({ success: true, data: { stats: { total, lost, found, resolved } } });
});
