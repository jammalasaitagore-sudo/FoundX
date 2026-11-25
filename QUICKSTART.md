# FoundX — quick start

Everything here is a command. You never edit a source file.

---

## 0. Unzip and open a terminal in the `FoundX` folder

```bash
cd path/to/FoundX
```

Check Node is installed (v20 or newer):

```bash
node -v
```

If it prints nothing or an older version, install the LTS build from <https://nodejs.org>.

---

## 1. Install the dependencies

```bash
npm install
```

---

## 2. Put your Supabase keys in `.env` — pick ONE way

**Way A (recommended, one command, nothing to edit):**

```bash
node scripts/configure.mjs https://YOUR-PROJECT.supabase.co sb_publishable_YOUR_KEY sb_secret_YOUR_KEY
```

The script validates the values, writes `.env`, and shows a masked summary. Run it with no
arguments and it will prompt you for the three values one at a time.

**Way B (paste into the file):**

Open `.env` in any editor and paste your values after the three empty keys
`SUPABASE_URL=`, `SUPABASE_ANON_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=`.

> `.env` is git-ignored. Your keys will not be committed or pushed.

---

## 3. Create the database tables (once)

In the browser: Supabase → **SQL Editor** → **New query** → copy the whole of
`supabase/setup_all.sql` → **Run**. You should see *Success. No rows returned*.

---

## 4. Load the demo data

```bash
npm run seed
```

Creates 4 accounts and 12 sample items. Expect `[seed] Inserted 12 items.`

Accounts (password `FoundX@2026` for all):

| Role | Email |
|------|-------|
| Admin | `admin@foundx.edu` |
| Student | `sai.tagore@foundx.edu` |
| Student | `ananya.rao@foundx.edu` |
| Student | `vikram.nair@foundx.edu` |

---

## 5. Start the server

```bash
npm start
```

Leave this terminal open. In a second terminal you can run the checks below.

---

## 6. Run the automated checks

```bash
npm run smoke
```

Expect `12 passed, 0 failed`.

---

## 7. Test with Postman

1. Postman → **Import** → **File** → `postman/FoundX.postman_collection.json`.
2. Collection → **Variables** → set `baseUrl` to `http://localhost:4000`.
3. Collection → **Run** → **Run FoundX**. Expect every request green (26 requests).

Details and how to save screenshots for the report: `postman/README.md`.

---

## 8. Push to GitHub

This folder is already a git repository pointing at your GitHub repo, and the project is
already committed. So:

```bash
git status
git push origin main
```

If `git status` shows changes you made yourself:

```bash
git add -A
git commit -m "Local changes"
git push origin main
```

If Git asks for credentials, use your GitHub username and a **personal access token** as the
password (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) →
Generate new token, scope `repo`).

---

## 9. Deploy (Render)

See `docs/DEPLOY.md`. Short version: Render → **New +** → **Blueprint** → pick the repository →
**Apply**, then paste the same three Supabase values when prompted.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing environment variables: SUPABASE_URL` | Step 2 was skipped, or `.env` is in the wrong folder (it must sit next to `package.json`). |
| `/api/health` says `"database": "error"` | The SQL from step 3 has not been run, or a key is wrong. |
| `npm run seed` says `No categories found` | Run `supabase/setup_all.sql` first. |
| `npm run seed` says `Invalid API key` | You pasted the publishable key where the secret key belongs. |
| Postman shows 401 on protected requests | Run the *Login* request first (it saves the token). |
| `EADDRINUSE` on start | Another process is using port 4000; set `PORT=4001` in `.env`. |
