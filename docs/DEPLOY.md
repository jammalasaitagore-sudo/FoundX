# Deploying FoundX on Render

Everything below happens in the browser — no local installation, no commands to run.

---

## Step 0 — Prepare the database (2 minutes, one paste)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. In this repository, open `supabase/setup_all.sql`, copy **the entire file**.
3. Paste it into the SQL editor and press **Run** (or Ctrl/Cmd + Enter).
4. You should see `Success. No rows returned`. Check **Table Editor** — you will see
   `profiles`, `categories`, `items`, `claims`, `notifications`.
5. Optional but recommended: **Authentication → Sign In / Providers → Email** → turn
   **Confirm email** off.

The file is idempotent, so if anything looks wrong you can simply run it again.

---

## Step 1 — Create the Render service

1. Sign in at <https://dashboard.render.com> with the GitHub account that owns the repository.
2. Click **New +** → **Blueprint**.
3. Choose the repository `jammalasaitagore-sudo/FoundX` and branch `main` → **Connect**.
4. Render reads `render.yaml` and shows one web service named **foundx**. Click **Apply**.

If you prefer not to use the blueprint: **New +** → **Web Service** → pick the repository →
Runtime **Node**, Build command `npm install`, Start command `npm start`,
Health check path `/api/health`, Plan **Free**.

---

## Step 2 — Add the environment variables

Render will ask for the three values marked `sync: false`:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | your **publishable** key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | your **secret** key (`sb_secret_…`) |

Leave `SEED_ON_START=true` for the first deploy. It creates the four demo accounts and the
twelve sample items automatically, because the free plan has no shell to run `npm run seed`.

> Keep the secret key out of screenshots, the report and the repository. If it ever leaks,
> rotate it in Supabase → Project Settings → API keys.

---

## Step 3 — Verify

After the build finishes, open:

```
https://<your-service>.onrender.com/api/health
```

Expected:

```json
{
  "success": true,
  "data": { "status": "ok", "database": "connected", "latency_ms": 120, ... }
}
```

Then check the data landed:

```
https://<your-service>.onrender.com/api/items?limit=3
https://<your-service>.onrender.com/api/meta/categories
```

Log in with `sai.tagore@foundx.edu` / `FoundX@2026` via
`POST /api/auth/login` to confirm authentication works end to end.

Once the items are in place, set `SEED_ON_START=false` in Render → Environment and save.

---

## Step 4 — Point CORS at the deployed URL

Set `CORS_ORIGINS` to your Render URL (comma-separated if you have more than one), for example:

```
https://foundx.onrender.com
```

`*` also works for the demo but is looser than necessary.

---

## Notes

* **Free plan sleeps** after 15 minutes of inactivity; the first request afterwards takes
  ~30 seconds to wake. Mention this in the viva if the demo seems slow.
* **Every push to `main` redeploys** automatically (`autoDeploy: true`).
* Render sets `PORT` itself; the app reads it from the environment.
* If the health check reports `"database": "error"`, the environment variables are wrong or the
  SQL has not been run yet — the server logs in Render → Logs will name the failing request.
