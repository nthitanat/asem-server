const https = require('https');

// Configuration
const BASE_HOST = 'engagement.chula.ac.th';
const BASE_PATH = '/asem-api';
const API_VERSION = 'v1';

// Test data storage
let testData = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  testUser: {
    email: `test_${Date.now()}@example.com`,
    username: `testuser${Date.now()}`,
    password: 'Test@123456',
    firstName: 'Test',
    lastName: 'User'
  }
};

const results = [];

// Helper function to make HTTPS requests
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;

    const options = {
      hostname: BASE_HOST,
      port: 443,
      path: BASE_PATH + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(body);
    req.end();
  });
}

function pass(code) {
  if (code >= 200 && code < 300) return '✅ PASS';
  if (code === 400) return '⚠️  400 Bad Request';
  if (code === 401) return '🔒 401 Unauthorized';
  if (code === 403) return '🚫 403 Forbidden';
  if (code === 404) return '❌ 404 Not Found';
  if (code === 409) return '⚠️  409 Conflict';
  if (code === 422) return '⚠️  422 Validation Error';
  if (code === 429) return '⏳ 429 Rate Limited';
  return `❓ ${code}`;
}

function log(name, res) {
  const status = pass(res.statusCode);
  const short = JSON.stringify(res.body)?.slice(0, 200);
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${status}  [${res.statusCode}]  ${name}`);
  console.log(`Response: ${short}`);
  results.push({ name, statusCode: res.statusCode, status });
  return res;
}

async function run() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`ASEM API Production Test`);
  console.log(`Target: https://${BASE_HOST}${BASE_PATH}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}`);

  // ── Health Checks ──────────────────────────────────────────────────────
  console.log('\n📌 HEALTH CHECKS');

  log('GET /health', await makeRequest('/health'));
  log(`GET /api/${API_VERSION}/health`, await makeRequest(`/api/${API_VERSION}/health`));

  // ── Auth Routes ────────────────────────────────────────────────────────
  console.log('\n📌 AUTH ROUTES');

  // 1. Register
  const regRes = log(
    'POST /api/v1/auth/register',
    await makeRequest(`/api/${API_VERSION}/auth/register`, 'POST', testData.testUser)
  );

  // 2. Register duplicate (409 expected)
  log(
    'POST /api/v1/auth/register (duplicate)',
    await makeRequest(`/api/${API_VERSION}/auth/register`, 'POST', testData.testUser)
  );

  // 3. Register missing fields (422 expected)
  log(
    'POST /api/v1/auth/register (missing fields)',
    await makeRequest(`/api/${API_VERSION}/auth/register`, 'POST', { email: 'bad' })
  );

  // 4. Login (email not verified yet - may be 401/403)
  const loginRes = log(
    'POST /api/v1/auth/login',
    await makeRequest(`/api/${API_VERSION}/auth/login`, 'POST', {
      email: testData.testUser.email,
      password: testData.testUser.password
    })
  );
  if (loginRes.body?.data?.accessToken) {
    testData.accessToken = loginRes.body.data.accessToken;
    testData.refreshToken = loginRes.body.data.refreshToken;
    testData.userId = loginRes.body.data.user?.id;
  }

  // 5. Login wrong password (401 expected)
  log(
    'POST /api/v1/auth/login (wrong password)',
    await makeRequest(`/api/${API_VERSION}/auth/login`, 'POST', {
      email: testData.testUser.email,
      password: 'Wrong@99999'
    })
  );

  // 6. Login missing fields (422 expected)
  log(
    'POST /api/v1/auth/login (missing fields)',
    await makeRequest(`/api/${API_VERSION}/auth/login`, 'POST', { email: testData.testUser.email })
  );

  // 7. Resend verification email
  log(
    'POST /api/v1/auth/resend-verification',
    await makeRequest(`/api/${API_VERSION}/auth/resend-verification`, 'POST', {
      email: testData.testUser.email
    })
  );

  // 8. Resend verification - invalid email (422 expected)
  log(
    'POST /api/v1/auth/resend-verification (invalid email)',
    await makeRequest(`/api/${API_VERSION}/auth/resend-verification`, 'POST', { email: 'notanemail' })
  );

  // 9. Verify email - invalid token (400/422 expected)
  log(
    'GET /api/v1/auth/verify-email?token=invalid',
    await makeRequest(`/api/${API_VERSION}/auth/verify-email?token=invalidtoken123`)
  );

  // 10. Forgot password
  log(
    'POST /api/v1/auth/forgot-password',
    await makeRequest(`/api/${API_VERSION}/auth/forgot-password`, 'POST', {
      email: testData.testUser.email
    })
  );

  // 11. Forgot password - invalid email format (422 expected)
  log(
    'POST /api/v1/auth/forgot-password (invalid email)',
    await makeRequest(`/api/${API_VERSION}/auth/forgot-password`, 'POST', { email: 'nope' })
  );

  // 12. Verify reset token - invalid (400/422 expected)
  log(
    'GET /api/v1/auth/verify-reset-token?token=invalid',
    await makeRequest(`/api/${API_VERSION}/auth/verify-reset-token?token=invalidtoken123`)
  );

  // 13. Reset password - invalid token (400/422 expected)
  log(
    'POST /api/v1/auth/reset-password (invalid token)',
    await makeRequest(`/api/${API_VERSION}/auth/reset-password`, 'POST', {
      token: 'invalidtoken',
      password: 'NewPass@123!'
    })
  );

  // 14. Refresh token
  if (testData.refreshToken) {
    log(
      'POST /api/v1/auth/refresh-token',
      await makeRequest(`/api/${API_VERSION}/auth/refresh-token`, 'POST', {
        refreshToken: testData.refreshToken
      })
    );
  } else {
    log(
      'POST /api/v1/auth/refresh-token (no token)',
      await makeRequest(`/api/${API_VERSION}/auth/refresh-token`, 'POST', {
        refreshToken: 'faketoken'
      })
    );
  }

  // 15. Refresh token missing (422 expected)
  log(
    'POST /api/v1/auth/refresh-token (missing body)',
    await makeRequest(`/api/${API_VERSION}/auth/refresh-token`, 'POST', {})
  );

  // 16. Logout - no auth (401 expected)
  log(
    'POST /api/v1/auth/logout (no auth)',
    await makeRequest(`/api/${API_VERSION}/auth/logout`, 'POST', { refreshToken: 'x' })
  );

  // 17. Logout - with token (if we have one)
  if (testData.accessToken) {
    log(
      'POST /api/v1/auth/logout (authenticated)',
      await makeRequest(`/api/${API_VERSION}/auth/logout`, 'POST',
        { refreshToken: testData.refreshToken },
        { Authorization: `Bearer ${testData.accessToken}` }
      )
    );
  }

  // ── User Routes (all require auth) ────────────────────────────────────
  console.log('\n📌 USER ROUTES (all require authentication)');

  // 18. GET /users - no auth (401 expected)
  log(
    'GET /api/v1/users (no auth)',
    await makeRequest(`/api/${API_VERSION}/users`)
  );

  // 19. GET /users - with token (403 if not admin, or 200)
  if (testData.accessToken) {
    log(
      'GET /api/v1/users (authenticated, non-admin)',
      await makeRequest(`/api/${API_VERSION}/users`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      })
    );
  }

  // 20. POST /users (admin only) - no auth (401 expected)
  log(
    'POST /api/v1/users (no auth)',
    await makeRequest(`/api/${API_VERSION}/users`, 'POST', {
      email: 'newu@example.com', password: 'Test@123456',
      firstName: 'New', lastName: 'User'
    })
  );

  // 21. GET /users/:id - no auth (401 expected)
  log(
    'GET /api/v1/users/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/users/1`)
  );

  // 22. GET /users/:id - with token (if available)
  if (testData.accessToken && testData.userId) {
    log(
      `GET /api/v1/users/${testData.userId} (authenticated, self)`,
      await makeRequest(`/api/${API_VERSION}/users/${testData.userId}`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      })
    );
  }

  // 23. PUT /users/:id - no auth (401 expected)
  log(
    'PUT /api/v1/users/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/users/1`, 'PUT', { firstName: 'Updated' })
  );

  // 24. DELETE /users/:id - no auth (401 expected)
  log(
    'DELETE /api/v1/users/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/users/1`, 'DELETE')
  );

  // 25. POST /users/:id/restore - no auth (401 expected)
  log(
    'POST /api/v1/users/1/restore (no auth)',
    await makeRequest(`/api/${API_VERSION}/users/1/restore`, 'POST')
  );

  // ── Summary ────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(70)}`);
  const passed = results.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
  const total = results.length;
  console.log(`Total tests: ${total}`);
  console.log(`2xx responses: ${passed}`);
  console.log('');
  console.log(results.map(r => `  ${pass(r.statusCode).padEnd(30)} [${r.statusCode}]  ${r.name}`).join('\n'));
  console.log(`${'='.repeat(70)}\n`);
}

run().catch(console.error);
