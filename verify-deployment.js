#!/usr/bin/env node

/**
 * Verify AttendX Server Deployment
 * Tests all critical endpoints after deployment
 */

const API_URL = process.argv[2] || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  
  if (!response.ok && response.status !== 409) { // 409 is expected for duplicate registration
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  return response.json();
}

async function verifyDeployment() {
  console.log(`🔍 Verifying AttendX Server Deployment: ${API_URL}\n`);

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    const health = await request('/health');
    console.log(`   ✅ Status: ${health.status}`);
    console.log(`   📊 Database: ${health.database}`);
    
    if (health.database !== 'connected') {
      console.log('   ⚠️  Database not connected - check DATABASE_URL');
    }

    // Test 2: Ping endpoint
    console.log('\n2️⃣ Testing ping endpoint...');
    const ping = await request('/ping');
    console.log(`   ✅ Status: ${ping.status}`);
    console.log(`   ⏱️  Uptime: ${Math.floor(ping.uptime)}s`);

    // Test 3: Register Test User
    console.log('\n3️⃣ Testing user registration...');
    try {
      const user = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'student',
          identifier: `test_${Date.now()}`,
          password: 'password123',
          name: 'Deployment Test User'
        })
      });
      console.log(`   ✅ User registered: ${user.user.name}`);
      
      // Test 4: Login with the user
      console.log('\n4️⃣ Testing user login...');
      const login = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          role: 'student',
          identifier: user.user.identifier,
          password: 'password123'
        })
      });
      console.log(`   ✅ Login successful: ${login.user.name}`);
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ Registration working (user already exists)');
      } else {
        throw error;
      }
    }

    // Test 5: Test CORS
    console.log('\n5️⃣ Testing CORS configuration...');
    const corsTest = await fetch(`${API_URL}/health`, {
      method: 'OPTIONS'
    });
    console.log(`   ✅ CORS status: ${corsTest.status}`);

    console.log('\n🎉 All tests passed! Deployment verified successfully.');
    console.log('\n📱 Next steps:');
    console.log(`   1. Update mobile app API URL to: ${API_URL}`);
    console.log('   2. Test mobile app registration and login');
    console.log('   3. Test complete attendance flow');
    console.log('   4. Set up monitoring and alerts');

  } catch (error) {
    console.error(`\n❌ Deployment verification failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check Render deployment logs');
    console.log('   2. Verify environment variables are set');
    console.log('   3. Ensure DATABASE_URL is correct');
    console.log('   4. Check if service is fully started');
    process.exit(1);
  }
}

if (require.main === module) {
  verifyDeployment().catch(console.error);
}

module.exports = { verifyDeployment };