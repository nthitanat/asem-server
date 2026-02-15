const http = require('http');

// Configuration
const BASE_URL = 'localhost';
const PORT = process.env.PORT || 5001;
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
  },
  adminUser: {
    email: `admin_${Date.now()}@example.com`,
    username: `adminuser${Date.now()}`,
    password: 'Admin@123456',
    firstName: 'Admin',
    lastName: 'User'
  }
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Logging function
function logTest(testName, status, response) {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(80));
  console.log(`Status: ${status}`);
  console.log(`HTTP Status Code: ${response.statusCode}`);
  console.log('Response Body:', JSON.stringify(response.body, null, 2));
  console.log('='.repeat(80));
}

// Test functions
async function testHealthCheck() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: '/health',
    method: 'GET'
  };
  
  const response = await makeRequest(options);
  logTest('Health Check', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testAPIHealthCheck() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/health`,
    method: 'GET'
  };
  
  const response = await makeRequest(options);
  logTest('API Health Check', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testRegister() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/register`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const response = await makeRequest(options, testData.testUser);
  logTest('Register User', 
    response.statusCode === 201 ? '✅ PASS' : '❌ FAIL', 
    response);
  
  if (response.statusCode === 201 && response.body.data) {
    testData.userId = response.body.data.user.id;
  }
  
  return response;
}

async function testLogin() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/login`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const loginData = {
    email: testData.testUser.email,
    password: testData.testUser.password
  };
  
  const response = await makeRequest(options, loginData);
  logTest('Login User', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  
  if (response.statusCode === 200 && response.body.data) {
    testData.accessToken = response.body.data.accessToken;
    testData.refreshToken = response.body.data.refreshToken;
  }
  
  return response;
}

async function testGetCurrentUser() {
  if (!testData.accessToken) {
    console.log('⚠️  Skipping test - no access token available');
    return;
  }
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/me`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.accessToken}`
    }
  };
  
  const response = await makeRequest(options);
  logTest('Get Current User', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testRefreshToken() {
  if (!testData.refreshToken) {
    console.log('⚠️  Skipping test - no refresh token available');
    return;
  }
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/refresh-token`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const response = await makeRequest(options, { 
    refreshToken: testData.refreshToken 
  });
  logTest('Refresh Token', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  
  if (response.statusCode === 200 && response.body.data) {
    testData.accessToken = response.body.data.accessToken;
  }
  
  return response;
}

async function testResendVerification() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/resend-verification`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const response = await makeRequest(options, { 
    email: testData.testUser.email 
  });
  logTest('Resend Verification Email', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testForgotPassword() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/forgot-password`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const response = await makeRequest(options, { 
    email: testData.testUser.email 
  });
  logTest('Forgot Password', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testChangePassword() {
  if (!testData.accessToken) {
    console.log('⚠️  Skipping test - no access token available');
    return;
  }
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/change-password`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testData.accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  const response = await makeRequest(options, {
    currentPassword: testData.testUser.password,
    newPassword: 'NewTest@123456',
    confirmPassword: 'NewTest@123456'
  });
  logTest('Change Password', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  
  // Update password if successful
  if (response.statusCode === 200) {
    testData.testUser.password = 'NewTest@123456';
  }
  
  return response;
}

async function testGetAllUsers() {
  if (!testData.accessToken) {
    console.log('⚠️  Skipping test - no access token available');
    return;
  }
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/users?page=1&limit=10`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.accessToken}`
    }
  };
  
  const response = await makeRequest(options);
  logTest('Get All Users', 
    [200, 403].includes(response.statusCode) ? '✅ PASS (Expected behavior)' : '❌ FAIL', 
    response);
  return response;
}

async function testGetUserById() {
  if (!testData.accessToken || !testData.userId) {
    console.log('⚠️  Skipping test - no access token or user ID available');
    return;
  }
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/users/${testData.userId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.accessToken}`
    }
  };
  
  const response = await makeRequest(options);
  logTest('Get User By ID', 
    [200, 403].includes(response.statusCode) ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testUpdateUser() {
  if (!testData.accessToken || !testData.userId) {
    console.log('⚠️  Skipping test - no access token or user ID available');
    return;
  }
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/users/${testData.userId}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${testData.accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  const updateData = {
    firstName: 'Updated',
    lastName: 'Name'
  };
  
  const response = await makeRequest(options, updateData);
  logTest('Update User', 
    [200, 403].includes(response.statusCode) ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testLogout() {
  if (!testData.accessToken || !testData.refreshToken) {
    console.log('⚠️  Skipping test - no tokens available');
    return;
  }
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/logout`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testData.accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  const response = await makeRequest(options, { 
    refreshToken: testData.refreshToken 
  });
  logTest('Logout', 
    response.statusCode === 200 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testInvalidEndpoint() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/invalid-endpoint`,
    method: 'GET'
  };
  
  const response = await makeRequest(options);
  logTest('Invalid Endpoint (404 Test)', 
    response.statusCode === 404 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testValidationError() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/register`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Send invalid data (missing required fields)
  const response = await makeRequest(options, { email: 'invalid-email' });
  logTest('Validation Error Test', 
    response.statusCode === 400 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

async function testUnauthorizedAccess() {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: `/api/${API_VERSION}/auth/me`,
    method: 'GET'
    // No Authorization header
  };
  
  const response = await makeRequest(options);
  logTest('Unauthorized Access Test', 
    response.statusCode === 401 ? '✅ PASS' : '❌ FAIL', 
    response);
  return response;
}

// Main test runner
async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'API ENDPOINT TESTING SUITE' + ' '.repeat(32) + '║');
  console.log('║' + ' '.repeat(30) + 'ASEM Server' + ' '.repeat(37) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');
  console.log(`🔗 Testing API at: http://${BASE_URL}:${PORT}`);
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log('\n');
  
  try {
    // 1. Health Checks
    console.log('\n📋 SECTION 1: HEALTH CHECKS');
    await testHealthCheck();
    await testAPIHealthCheck();
    
    // 2. Public Auth Endpoints
    console.log('\n📋 SECTION 2: PUBLIC AUTH ENDPOINTS');
    await testRegister();
    await testLogin();
    await testResendVerification();
    await testForgotPassword();
    
    // 3. Protected Auth Endpoints
    console.log('\n📋 SECTION 3: PROTECTED AUTH ENDPOINTS');
    await testGetCurrentUser();
    await testRefreshToken();
    await testChangePassword();
    
    // 4. User Endpoints (Protected)
    console.log('\n📋 SECTION 4: USER MANAGEMENT ENDPOINTS');
    await testGetAllUsers();
    await testGetUserById();
    await testUpdateUser();
    
    // 5. Error Handling Tests
    console.log('\n📋 SECTION 5: ERROR HANDLING TESTS');
    await testInvalidEndpoint();
    await testValidationError();
    await testUnauthorizedAccess();
    
    // 6. Cleanup - Logout
    console.log('\n📋 SECTION 6: CLEANUP');
    await testLogout();
    
    // Summary
    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(28) + 'TEST SUMMARY' + ' '.repeat(38) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('\n✨ All API endpoint tests completed!');
    console.log('📝 Check the logs above for detailed responses\n');
    
  } catch (error) {
    console.error('\n❌ ERROR during testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests
runAllTests().catch(console.error);
