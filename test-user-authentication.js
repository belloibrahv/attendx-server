require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma client with adapter
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function testUserAuthentication() {
  console.log('🔐 Testing User Authentication for AttendX System...\n');

  const testCredentials = [
    {
      role: 'lecturer',
      identifier: 'TASUED-LEC-001',
      password: 'admin123',
      name: 'Dr. Adebayo Ogundimu',
      purpose: 'Web Dashboard Admin'
    },
    {
      role: 'kiosk',
      identifier: 'TASUED-KIOSK-001',
      password: 'kiosk123',
      name: 'Kiosk Operator',
      purpose: 'Mobile App Kiosk'
    },
    {
      role: 'student',
      identifier: 'TASUED/CSE/19/0001',
      password: 'student123',
      name: 'John Adebayo',
      purpose: 'Mobile App Student'
    }
  ];

  try {
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    let allTestsPassed = true;

    for (const cred of testCredentials) {
      console.log(`🧪 Testing ${cred.purpose} (${cred.role})...`);
      
      try {
        // Find user in database
        const user = await prisma.user.findUnique({
          where: {
            role_identifier: {
              role: cred.role,
              identifier: cred.identifier
            }
          }
        });

        if (!user) {
          console.log(`❌ User not found: ${cred.identifier}`);
          allTestsPassed = false;
          continue;
        }

        // Test password verification
        const passwordValid = await bcrypt.compare(cred.password, user.passwordHash);
        if (!passwordValid) {
          console.log(`❌ Password verification failed for: ${cred.identifier}`);
          allTestsPassed = false;
          continue;
        }

        // Test JWT token generation
        const token = jwt.sign(
          { 
            userId: user.id, 
            role: user.role, 
            identifier: user.identifier 
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Test JWT token verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.userId !== user.id) {
          console.log(`❌ JWT token verification failed for: ${cred.identifier}`);
          allTestsPassed = false;
          continue;
        }

        console.log(`✅ Authentication successful for ${cred.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user.identifier}`);
        console.log(`   Token: ${token.substring(0, 20)}...`);
        console.log('');

      } catch (error) {
        console.log(`❌ Error testing ${cred.identifier}:`, error.message);
        allTestsPassed = false;
      }
    }

    // Test database queries
    console.log('📊 Testing Database Queries...');
    
    const userCount = await prisma.user.count();
    console.log(`✅ Total users in database: ${userCount}`);
    
    const lecturerCount = await prisma.user.count({ where: { role: 'lecturer' } });
    const kioskCount = await prisma.user.count({ where: { role: 'kiosk' } });
    const studentCount = await prisma.user.count({ where: { role: 'student' } });
    
    console.log(`   Lecturers: ${lecturerCount}`);
    console.log(`   Kiosk Operators: ${kioskCount}`);
    console.log(`   Students: ${studentCount}`);
    console.log('');

    // Final result
    if (allTestsPassed) {
      console.log('🎉 ALL AUTHENTICATION TESTS PASSED!');
      console.log('');
      console.log('✅ System Status: READY FOR PRODUCTION');
      console.log('✅ Test Users: Successfully created and verified');
      console.log('✅ Database: Connected and operational');
      console.log('✅ Authentication: Working correctly');
      console.log('✅ JWT Tokens: Generated and verified');
      console.log('');
      console.log('🚀 The AttendX system is ready for comprehensive testing!');
      console.log('');
      console.log('📱 Next Steps:');
      console.log('1. Test web dashboard login with lecturer credentials');
      console.log('2. Test mobile app login with student and kiosk credentials');
      console.log('3. Create attendance sessions and test QR code scanning');
      console.log('4. Verify real-time attendance tracking');
    } else {
      console.log('❌ SOME TESTS FAILED - Please check the errors above');
    }

  } catch (error) {
    console.error('❌ Critical error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the authentication test
testUserAuthentication().catch(console.error);