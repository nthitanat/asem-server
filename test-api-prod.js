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
  countryId: null,
  institutionId: null,
  researchNetworkId: null,
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

  // ── Country Routes ────────────────────────────────────────────────────
  console.log('\n📌 COUNTRY ROUTES');

  // 26. GET /countries - no auth (401 expected)
  log('GET /api/v1/countries (no auth)',
    await makeRequest(`/api/${API_VERSION}/countries`));

  // 27. GET /countries - authenticated
  if (testData.accessToken) {
    log('GET /api/v1/countries (authenticated)',
      await makeRequest(`/api/${API_VERSION}/countries`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
  }

  // 28. POST /countries - no auth (401 expected)
  log('POST /api/v1/countries (no auth)',
    await makeRequest(`/api/${API_VERSION}/countries`, 'POST', { name: 'NoAuthCountry' }));

  // 29. POST /countries - authenticated (403 if non-admin, 201 if admin)
  if (testData.accessToken) {
    const createCountryRes = log(
      'POST /api/v1/countries (authenticated)',
      await makeRequest(`/api/${API_VERSION}/countries`, 'POST',
        { name: `TestCountry_${Date.now()}` },
        { Authorization: `Bearer ${testData.accessToken}` }
      )
    );
    if (createCountryRes.statusCode === 201) {
      testData.countryId = createCountryRes.body?.data?.country?.id;
    }
  }

  // 30. GET /countries/:id - no auth (401 expected)
  log('GET /api/v1/countries/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/countries/1`));

  // 31. GET /countries/:id - authenticated
  if (testData.accessToken) {
    const cId = testData.countryId || 1;
    log(`GET /api/v1/countries/${cId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/countries/${cId}`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
  }

  // 32. PUT /countries/:id - no auth (401 expected)
  log('PUT /api/v1/countries/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/countries/1`, 'PUT', { name: 'NoAuthUpdate' }));

  // 33. PUT /countries/:id - authenticated
  if (testData.accessToken && testData.countryId) {
    log(`PUT /api/v1/countries/${testData.countryId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/countries/${testData.countryId}`, 'PUT',
        { name: `UpdatedCountry_${Date.now()}` },
        { Authorization: `Bearer ${testData.accessToken}` }
      ));
  }

  // 34. DELETE /countries/:id - no auth (401 expected)
  log('DELETE /api/v1/countries/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/countries/1`, 'DELETE'));

  // 35. DELETE /countries/:id - authenticated
  if (testData.accessToken && testData.countryId) {
    log(`DELETE /api/v1/countries/${testData.countryId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/countries/${testData.countryId}`, 'DELETE', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
    // Clear id if deleted
    testData.countryId = null;
  }

  // ── Institution Routes ───────────────────────────────────────────────
  console.log('\n📌 INSTITUTION ROUTES');

  // 36. GET /institutions - no auth (401 expected)
  log('GET /api/v1/institutions (no auth)',
    await makeRequest(`/api/${API_VERSION}/institutions`));

  // 37. GET /institutions - authenticated
  if (testData.accessToken) {
    log('GET /api/v1/institutions (authenticated)',
      await makeRequest(`/api/${API_VERSION}/institutions?page=1&limit=10`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
  }

  // 38. POST /institutions - no auth (401 expected)
  log('POST /api/v1/institutions (no auth)',
    await makeRequest(`/api/${API_VERSION}/institutions`, 'POST', {
      name: 'NoAuthUniversity', countryId: 1
    }));

  // 39. POST /institutions - authenticated (403 if non-admin, 201 if admin)
  if (testData.accessToken) {
    // Fetch a valid countryId if we don’t have one
    let countryIdForInst = testData.countryId;
    if (!countryIdForInst) {
      const cListRes = await makeRequest(`/api/${API_VERSION}/countries`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      });
      const countries = cListRes.body?.data?.countries;
      if (countries && countries.length > 0) countryIdForInst = countries[0].id;
    }
    if (countryIdForInst) {
      const createInstRes = log(
        'POST /api/v1/institutions (authenticated)',
        await makeRequest(`/api/${API_VERSION}/institutions`, 'POST',
          { name: `TestInstitution_${Date.now()}`, countryId: countryIdForInst },
          { Authorization: `Bearer ${testData.accessToken}` }
        )
      );
      if (createInstRes.statusCode === 201) {
        testData.institutionId = createInstRes.body?.data?.institution?.id;
      }
    }
  }

  // 40. GET /institutions/:id - no auth (401 expected)
  log('GET /api/v1/institutions/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/institutions/1`));

  // 41. GET /institutions/:id - authenticated
  if (testData.accessToken) {
    const iId = testData.institutionId || 1;
    log(`GET /api/v1/institutions/${iId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/institutions/${iId}`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
  }

  // 42. PUT /institutions/:id - no auth (401 expected)
  log('PUT /api/v1/institutions/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/institutions/1`, 'PUT', { name: 'NoAuthUpdate' }));

  // 43. PUT /institutions/:id - authenticated
  if (testData.accessToken && testData.institutionId) {
    log(`PUT /api/v1/institutions/${testData.institutionId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/institutions/${testData.institutionId}`, 'PUT',
        { name: `UpdatedInstitution_${Date.now()}` },
        { Authorization: `Bearer ${testData.accessToken}` }
      ));
  }

  // 44. DELETE /institutions/:id - no auth (401 expected)
  log('DELETE /api/v1/institutions/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/institutions/1`, 'DELETE'));

  // 45. DELETE /institutions/:id - authenticated
  if (testData.accessToken && testData.institutionId) {
    log(`DELETE /api/v1/institutions/${testData.institutionId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/institutions/${testData.institutionId}`, 'DELETE', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
    testData.institutionId = null;
  }

  // ── Research Network Routes ───────────────────────────────────────────
  console.log('\n📌 RESEARCH NETWORK ROUTES');

  // 46. GET /research-networks - no auth (401 expected)
  log('GET /api/v1/research-networks (no auth)',
    await makeRequest(`/api/${API_VERSION}/research-networks`));

  // 47. GET /research-networks - authenticated
  if (testData.accessToken) {
    log('GET /api/v1/research-networks (authenticated)',
      await makeRequest(`/api/${API_VERSION}/research-networks`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
  }

  // 48. POST /research-networks - no auth (401 expected)
  log('POST /api/v1/research-networks (no auth)',
    await makeRequest(`/api/${API_VERSION}/research-networks`, 'POST', { name: 'NoAuthNetwork' }));

  // 49. POST /research-networks - authenticated (403 if non-admin, 201 if admin)
  if (testData.accessToken) {
    const createNetRes = log(
      'POST /api/v1/research-networks (authenticated)',
      await makeRequest(`/api/${API_VERSION}/research-networks`, 'POST',
        { name: `TestNetwork_${Date.now()}` },
        { Authorization: `Bearer ${testData.accessToken}` }
      )
    );
    if (createNetRes.statusCode === 201) {
      testData.researchNetworkId = createNetRes.body?.data?.researchNetwork?.id;
    }
  }

  // 50. GET /research-networks/:id - no auth (401 expected)
  log('GET /api/v1/research-networks/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/research-networks/1`));

  // 51. GET /research-networks/:id - authenticated
  if (testData.accessToken) {
    const rnId = testData.researchNetworkId || 1;
    log(`GET /api/v1/research-networks/${rnId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/research-networks/${rnId}`, 'GET', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
  }

  // 52. PUT /research-networks/:id - no auth (401 expected)
  log('PUT /api/v1/research-networks/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/research-networks/1`, 'PUT', { name: 'NoAuthUpdate' }));

  // 53. PUT /research-networks/:id - authenticated
  if (testData.accessToken && testData.researchNetworkId) {
    log(`PUT /api/v1/research-networks/${testData.researchNetworkId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/research-networks/${testData.researchNetworkId}`, 'PUT',
        { name: `UpdatedNetwork_${Date.now()}` },
        { Authorization: `Bearer ${testData.accessToken}` }
      ));
  }

  // 54. DELETE /research-networks/:id - no auth (401 expected)
  log('DELETE /api/v1/research-networks/1 (no auth)',
    await makeRequest(`/api/${API_VERSION}/research-networks/1`, 'DELETE'));

  // 55. DELETE /research-networks/:id - authenticated
  if (testData.accessToken && testData.researchNetworkId) {
    log(`DELETE /api/v1/research-networks/${testData.researchNetworkId} (authenticated)`,
      await makeRequest(`/api/${API_VERSION}/research-networks/${testData.researchNetworkId}`, 'DELETE', null, {
        Authorization: `Bearer ${testData.accessToken}`
      }));
    testData.researchNetworkId = null;
  }

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
