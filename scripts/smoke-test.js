/**
 * FoundX smoke test
 * -----------------
 * Starts nothing - it hits a running server and checks the Phase 1 routes.
 *
 *     npm start            # in one terminal
 *     npm run smoke        # in another
 *
 * Set BASE_URL to test a deployed instance.
 */
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
const EMAIL = process.env.SMOKE_EMAIL || 'sai.tagore@foundx.edu';
const PASSWORD = process.env.SMOKE_PASSWORD || 'FoundX@2026';

let passed = 0;
let failed = 0;

async function call(method, path, { body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}${extra ? ' - ' + extra : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${extra ? ' - ' + extra : ''}`);
  }
}

async function main() {
  console.log(`\nFoundX smoke test against ${BASE_URL}\n`);

  const health = await call('GET', '/api/health');
  check('GET /api/health returns 200 and db connected', health.status === 200 && health.json?.data?.database === 'connected', `status ${health.status}`);

  const items = await call('GET', '/api/items?limit=5');
  check('GET /api/items returns a list', items.status === 200 && Array.isArray(items.json?.data?.items), `count ${items.json?.data?.pagination?.total}`);

  const search = await call('GET', '/api/items?q=wallet');
  check('GET /api/items?q=wallet searches', search.status === 200);

  const badQuery = await call('GET', '/api/items?type=stolen');
  check('GET /api/items?type=stolen is rejected', badQuery.status === 400, `status ${badQuery.status}`);

  const cats = await call('GET', '/api/meta/categories');
  check('GET /api/meta/categories returns 9 categories', cats.status === 200 && cats.json?.data?.categories?.length >= 9);

  const noAuth = await call('GET', '/api/auth/me');
  check('GET /api/auth/me without token returns 401', noAuth.status === 401, `status ${noAuth.status}`);

  const badLogin = await call('POST', '/api/auth/login', { body: { email: EMAIL, password: 'wrong-password' } });
  check('POST /api/auth/login with wrong password returns 401', badLogin.status === 401, `status ${badLogin.status}`);

  const badRegister = await call('POST', '/api/auth/register', { body: { email: 'not-an-email', password: '123' } });
  check('POST /api/auth/register with invalid input returns 400', badRegister.status === 400, `status ${badRegister.status}`);

  const login = await call('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const token = login.json?.data?.access_token;
  check('POST /api/auth/login returns a token', login.status === 200 && Boolean(token), `status ${login.status}`);

  if (token) {
    const me = await call('GET', '/api/auth/me', { token });
    check('GET /api/auth/me returns the profile', me.status === 200 && me.json?.data?.user?.email === EMAIL);

    const logout = await call('POST', '/api/auth/logout', { token });
    check('POST /api/auth/logout returns 200', logout.status === 200, `status ${logout.status}`);

    const afterLogout = await call('GET', '/api/auth/me', { token });
    check('Token rejected after logout', afterLogout.status === 401, `status ${afterLogout.status}`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Smoke test could not run:', error.message);
  process.exit(1);
});
