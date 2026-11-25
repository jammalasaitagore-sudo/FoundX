# FoundX — Campus Lost and Found Portal

A full-stack campus lost-and-found web application for Sai University. Students report lost
items, post found items, search and filter listings, submit ownership claims, and track their
recovery requests. Administrators moderate listings, review claims and see live statistics.

**Stack:** HTML5 / CSS3 / JavaScript ES6+ front-end · Node.js + Express REST API ·
Supabase (PostgreSQL database, Auth, Storage) · Postman for API testing · deployed on a
cloud host.

> Project: *Web Technology and Internet Programming — Individual Project*, B.Tech CSE,
> School of Computing and Data Science, Sai University.

---

## 1. Status

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Repository scaffold, Express app, Supabase schema + RLS + storage, categories seed, authentication API, items read/search API, health check | ✅ Complete |
| Phase 2 | Items create / update / delete, image upload to Supabase Storage, duplicate-item alerts | ⏳ Next |
| Phase 3 | Claims workflow (submit → review → approve/reject), notifications, item status transitions | ⏳ |
| Phase 4 | Front-end: home, browse/search, item detail, auth pages, user dashboard, admin dashboard + charts | ⏳ |
| Phase 5 | Postman collection (10+ cases), README/report polish, deployment | ⏳ |

Detailed per-phase notes live in [`docs/PHASES.md`](docs/PHASES.md).

---

## 2. Architecture

```
Browser (HTML/CSS/ES6 modules)
        │  fetch() + Bearer access token
        ▼
Express REST API  ── service_role key ──▶  Supabase PostgreSQL
  middleware:                                  • profiles, categories, items,
  helmet, cors, rate-limit,                      claims, notifications
  json body, auth, zod validation,             • Row Level Security policies
  central error handler                        • admin_stats view
        │
        └── service_role key ──▶  Supabase Storage bucket `item-images`
                                   (public read, authenticated write)
```

* **Authentication** is handled by Supabase Auth (email + password). The API returns the
  Supabase JWT; the client sends it back as `Authorization: Bearer <token>`. Every protected
  route re-validates the token with Supabase and loads the caller's profile.
* **Authorisation** is enforced twice: in Express middleware (`requireAuth`, `requireAdmin`,
  ownership checks) and in the database by Row Level Security policies, which protect the data
  even if the anon key is used directly.
* The Express server uses the **service_role** key, which bypasses RLS — that is why no
  database call is reachable without passing through our middleware first.

---

## 3. Repository layout

```
FoundX/
├── public/                      # static front-end (built in Phase 4)
│   └── index.html
├── scripts/
│   ├── seed.js                  # demo users + 12 sample items
│   └── smoke-test.js            # end-to-end API checks
├── src/
│   ├── config/
│   │   ├── env.js               # environment validation
│   │   ├── supabase.js          # admin + public Supabase clients
│   │   └── constants.js         # campus buildings, enums, page sizes
│   ├── controllers/
│   │   ├── auth.controller.js   # register, login, logout, me, refresh
│   │   └── items.controller.js  # list/search/filter, detail, meta endpoints
│   ├── middleware/
│   │   ├── auth.js              # requireAuth, optionalAuth, requireAdmin
│   │   ├── validate.js          # Zod request validation
│   │   └── error.js             # 404 + central error handler
│   ├── routes/                  # auth, items, meta route modules
│   ├── utils/ApiError.js
│   ├── app.js                   # Express app assembly
│   └── server.js                # HTTP server + graceful shutdown
├── supabase/migrations/
│   ├── 0001_init.sql            # schema, triggers, indexes, RLS, storage, stats view
│   └── 0002_seed_categories.sql # 9 item categories
├── .env.example
└── package.json
```

---

## 4. Setup

### 4.1 Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**. Choose a region close to you
   (e.g. Mumbai / Singapore) and save the database password.
2. **SQL Editor → New query** → paste the whole of
   `supabase/migrations/0001_init.sql` → **Run**.
3. Repeat with `supabase/migrations/0002_seed_categories.sql`.
4. **Project Settings → API** and copy:
   * `Project URL` → `SUPABASE_URL`
   * `anon` / `public` key → `SUPABASE_ANON_KEY`
   * `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never in the browser)
5. **Authentication → Providers → Email**: turn *Confirm email* **off** for the demo so
   accounts work instantly (re-enable it for production).

### 4.2 Run locally

```bash
git clone https://github.com/jammalasaitagore-sudo/FoundX.git
cd FoundX
npm install
cp .env.example .env        # then paste your Supabase values
npm run seed                # creates demo accounts + 12 sample items
npm run dev                 # http://localhost:4000
```

Check it is alive: <http://localhost:4000/api/health> should report `"database": "connected"`.

### 4.3 Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@foundx.edu` | `FoundX@2026` |
| Student | `sai.tagore@foundx.edu` | `FoundX@2026` |
| Student | `ananya.rao@foundx.edu` | `FoundX@2026` |
| Student | `vikram.nair@foundx.edu` | `FoundX@2026` |

Override the password with `SEED_PASSWORD=... npm run seed`.

---

## 5. API reference (Phase 1)

Base URL: `http://localhost:4000/api`

All responses share one shape:

```json
{ "success": true,  "message": "…", "data": { } }
{ "success": false, "error": { "code": "validation_error", "message": "…", "details": [ ] } }
```

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | – | Service + database status, latency |
| GET | `/` | – | Endpoint index |

### Authentication

| Method | Endpoint | Auth | Body / notes |
|--------|----------|------|--------------|
| POST | `/auth/register` | – | `full_name, email, password, roll_number?, department?, phone?` → user + tokens |
| POST | `/auth/login` | – | `email, password` → user + `access_token`, `refresh_token` |
| POST | `/auth/refresh` | – | `refresh_token` → new tokens |
| POST | `/auth/logout` | Bearer | Revokes the current session |
| GET | `/auth/me` | Bearer | Current profile |
| PATCH | `/auth/me` | Bearer | `full_name, roll_number, department, phone, avatar_url` (`role` is not writable) |

### Items (read / search)

| Method | Endpoint | Auth | Query parameters |
|--------|----------|------|------------------|
| GET | `/items` | – | `q, category, type(lost\|found), status, location, building, sort(newest\|oldest\|event_date_desc\|event_date_asc), page, limit` |
| GET | `/items/:id` | – | returns one item, increments `views`, adds `claim_count` |

### Meta

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/meta/categories` | – | 9 categories |
| GET | `/meta/buildings` | – | campus building list for filters |
| GET | `/meta/stats` | – | headline counts (total / lost / found / resolved) |

#### Example

```bash
curl "http://localhost:4000/api/items?q=wallet&type=found&building=Canteen%20%2F%20Food%20Court&sort=newest&page=1&limit=12"
```

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sai.tagore@foundx.edu","password":"FoundX@2026"}'
```

---

## 6. Database design

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `profiles` | 1:1 with `auth.users`, holds name, roll number, department, phone, `role` (`student`/`admin`) | `id` (FK → `auth.users`) |
| `categories` | reference data for filters | `slug`, `name` |
| `items` | lost/found reports | `listing_type`, `status`, `category_id`, `location`, `campus_building`, `event_date`, `image_url`, generated `search_vector` |
| `claims` | ownership claims on an item | `status` (`pending`/`approved`/`rejected`/`cancelled`), `reviewed_by`, unique `(item_id, claimant_id)` |
| `notifications` | in-app alerts | `type`, `is_read` |
| `admin_stats` (view) | dashboard counters | totals for items, claims, users |

* Triggers: `handle_new_user` (creates the profile on sign-up), `set_updated_at` on every table.
* Indexes on `created_at`, `listing_type`, `status`, `category_id`, `campus_building`, `user_id`
  and a **GIN index** on `search_vector` for full-text search.
* RLS is enabled on all five tables with per-role policies (public read of items, owner writes,
  admin override, per-user notifications).

---

## 7. Testing

```bash
npm run smoke        # 12 checks against a running server
```

Covers: health/database status, item listing, keyword search, invalid enum rejection,
categories, unauthenticated access (401), wrong password (401), invalid registration (400),
login, profile fetch, logout, and rejection of the revoked token.

A Postman collection with the required 8+ documented cases is added in Phase 5.

---

## 8. Security measures

* Passwords never touch our database — Supabase Auth stores bcrypt hashes.
* `service_role` key only on the server, read from environment variables; `.env` is git-ignored.
* JWT validated on every protected request; logout revokes the session server-side.
* Zod schema validation on every request body/query; unknown enum values rejected.
* `helmet` security headers, strict CORS allow-list, rate limiting (600 req/15 min globally,
  30 attempts/15 min on auth routes).
* Ownership checks before update/delete; `role` cannot be self-assigned.
* RLS policies as a second layer of defence, plus a 5 MB / MIME-restricted storage bucket.

---

## 9. Deployment

The API is a plain Node process, so it runs on any Node host. Recommended: **Render** (free
web service) with the same environment variables as `.env`.

```
Build command : npm install
Start command : npm start
Health check  : /api/health
```

Remember to add the deployed URL to `CORS_ORIGINS`.

---

## 10. Author

**Jammala Saitagore** — B.Tech CSE, Sai University.
Course: Web Technology and Internet Programming (Academic Year 2026–2027).

AI assistance is disclosed in the project report as required by the course guidelines.
