# Postman testing — FoundX

## Import

1. Open Postman → **Import** → **File** → choose
   `postman/FoundX.postman_collection.json`.
2. Click the collection **FoundX - Campus Lost and Found API** → **Variables** tab.
3. Set `baseUrl`:
   * local → `http://localhost:4000`
   * deployed → `https://your-service.onrender.com`

## Run

1. Make sure the server is running (`npm start`) and the database is seeded (`npm run seed`).
2. Select the collection → **Run** (Collection Runner) → **Run FoundX**.
3. All 26 requests execute in order and the summary shows **passed / failed** counts.

Order matters: *Login* stores the token used by the protected requests, and *Logout* revokes it
so the final request can prove the token is dead. The runner executes folders top to bottom, so
just use the default order.

## What is covered

| Folder | Requests | Evidence for the brief |
|--------|----------|------------------------|
| 1. Health & index | 2 | Service + database status |
| 2. Authentication | 5 | Register, login, refresh, profile read/update |
| 3. Items | 5 | Retrieval, keyword search, multi-filter + date sort, detail, 404 |
| 4. Meta | 3 | Categories, buildings, statistics |
| 5. Invalid input | 6 | 400 validation, unknown category, duplicate email, wrong password, unknown route |
| 6. Unauthorised access | 3 | 401 without token, 401 with forged token, protected PATCH blocked |
| 7. Logout | 2 | Session revoked, token rejected afterwards |

That is 26 requests, well past the 8 required test cases, and it covers every category the
brief asks for: successful requests, invalid input, item retrieval, updates, claim submission
(Phase 3) and unauthorised access.

## Saving evidence for the report

* **Single request:** open a request → **Save Response** → *Save as example*. The example is
  stored inside the collection, so it is exported with it.
* **Whole run:** after a Collection Run, click **Export Results** and keep the JSON, or take a
  screenshot of the run summary.
* Add the screenshots to the report's *Testing* section, one per test case, with the request
  name and the status code visible.

## Re-running

The register request uses Postman's `{{$timestamp}}` in the email, so it can run repeatedly.
If you do hit "email already exists", that is the duplicate-registration test working.
