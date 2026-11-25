# FoundX — Phase notes

Working log for the phased build. Each phase ends with a working, committed state.

---

## Phase 1 — Foundation (complete)

**Goal:** a running Express API backed by a real Supabase Postgres database, with
authentication and read access to seeded listings.

Delivered:

* Repository scaffold: `src/` (config, controllers, middleware, routes, utils), `scripts/`,
  `public/`, `supabase/migrations/`.
* `0001_init.sql` — enums (`user_role`, `listing_type`, `item_status`, `claim_status`,
  `notification_type`), tables `profiles`, `categories`, `items`, `claims`, `notifications`,
  generated `search_vector` + GIN index, `handle_new_user` and `set_updated_at` triggers,
  `is_admin()` helper, RLS policies on all tables, `item-images` storage bucket with policies,
  and the `admin_stats` view.
* `0002_seed_categories.sql` — 9 categories.
* `scripts/seed.js` — 4 demo accounts (1 admin, 3 students) and 12 sample items spread across
  categories, buildings, types and statuses.
* Auth API: register (admin `createUser` + metadata → profile trigger), login, refresh, logout
  (server-side session revocation), `GET`/`PATCH /auth/me` with a field allow-list that blocks
  `role` escalation.
* Items API: paginated list with keyword search, category/type/status/location/building
  filters and 4 sort modes; item detail with view counter and claim count.
* Meta API: categories, buildings, public stats.
* Middleware chain: helmet, CORS allow-list, rate limiting, JSON body parsing, Zod validation,
  bearer-token auth, central error handler with a single error shape.
* `npm run smoke` — 12 automated checks.

Verified locally: server boots, all public routes answer, validation returns 400, protected
routes return 401 without a token, unknown routes return 404 JSON.

**Verification:** the two migrations were executed against a real PostgreSQL instance with
Supabase `auth`/`storage` schema stubs: both apply cleanly, both re-apply cleanly (idempotent),
and 12 behaviour checks pass — profile trigger, metadata mapping, 9 categories, generated
`search_vector` matching, `admin_stats` view, default status, title length constraint, storage
bucket, claims unique constraint, RLS enabled, 5 item policies, `updated_at` trigger.

**Deployment enablement:** `supabase/setup_all.sql` (single paste), `render.yaml` blueprint and
`SEED_ON_START` bootstrap added, so the whole stack can be stood up from a browser with no
local commands.

---

## Phase 2 — Listings write side (next)

* `POST /api/items` — create a lost/found report (multipart with optional image).
* `PATCH /api/items/:id`, `DELETE /api/items/:id` — owner or admin only.
* `PATCH /api/items/:id/status` — open → claimed → resolved → archived.
* `POST /api/items/:id/image` — Multer memory upload → Supabase Storage → `image_url`.
* **Custom feature: duplicate-item alerts** — on create, compare title/description/category/
  building against recent listings of the opposite type and return `possible_duplicates` in the
  response, plus a `duplicate_alert` notification to the matched owner.

---

## Phase 3 — Claims and notifications

* `POST /api/items/:id/claims` — submit a claim (blocked for your own listing, duplicates and
  non-open items).
* `GET /api/claims/mine`, `GET /api/claims/received`, `GET /api/claims/:id`.
* `PATCH /api/claims/:id/status` — approve / reject with a review note; approving auto-sets the
  item to `claimed` and notifies both parties.
* `GET /api/notifications`, `PATCH /api/notifications/:id/read`, mark-all-read.

---

## Phase 4 — Front-end and dashboards

* Pages: home (recent items + search), browse with filters, item detail + claim form,
  register, login, report-item form, user dashboard (my listings, my claims, received claims),
  admin dashboard (moderation tables + statistics).
* ES6 modules, Fetch API with async/await, shared `api.js`, client-side validation,
  responsive CSS (mobile-first, CSS grid/flexbox), accessible semantic HTML.
* Charts for admin statistics (Chart.js or inline SVG).

---

## Phase 5 — Deliverables

* Postman collection: 10+ requests with saved example responses (success, invalid input,
  retrieval, update, claim submission, unauthorised access).
* Project report in the Sai University format, with screenshots and AI-use disclosure.
* Deployment to Render + final README polish.
