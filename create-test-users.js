require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma client with adapter
const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

async function createTestUsers() {
  console.log('🚀 Creating test users for AttendX system...\n');

  try {
    // Test connection first
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Test users data
    const testUsers = [
      {
        role: 'lecturer',
        identifier: 'TASUED-LEC-001',
        name: 'Dr. Adebayo Ogundimu',
        password: 'admin123',
        description: 'Admin/Lecturer account for web dashboard'
      },
      {
        role: 'kiosk',
        identifier: 'TASUED-KIOSK-001',
        name: 'Kiosk Operator',
        password: 'kiosk123',
        description: 'Kiosk operator account for manual check-ins'
      },
      {
        role: 'student',
        identifier: 'TASUED/CSE/19/0001',
        name: 'John Adebayo',
        password: 'student123',
        description: 'Student account for mobile app testing'
      }
    ];

    console.log('📝 Registering users:\n');

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: {
            role_identifier: {
              role: userData.role,
              identifier: userData.identifier
            }
          }
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.identifier} (${userData.role}) already exists - skipping`);
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 12);

        // Create user
        const user = await prisma.user.create({
          data: {
            id: uuidv4(),
            role: userData.role,
            identifier: userData.identifier,
            name: userData.name,
            passwordHash: passwordHash,
            createdAt: new Date()
          }
        });

        console.log(`✅ Created ${userData.role} user:`);
        console.log(`   Name: ${userData.name}`);
        console.log(`   ID: ${userData.identifier}`);
        console.log(`   Password: ${userData.password}`);
        console.log(`   Purpose: ${userData.description}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Failed to create user ${userData.identifier}:`, error.message);
      }
    }

    console.log('🎉 Test user creation completed!\n');
    
    console.log('📱 LOGIN CREDENTIALS FOR TESTING:\n');
    console.log('='.repeat(50));
    console.log('🌐 WEB DASHBOARD (Admin/Lecturer):');
    console.log('   URL: https://attendx-web.vercel.app/admin');
    console.log('   Staff ID: TASUED-LEC-001');
    console.log('   Password: admin123');
    console.log('   Role: lecturer');
    console.log('');
    
    console.log('📱 MOBILE APP (Kiosk Operator):');
    console.log('   Staff ID: TASUED-KIOSK-001');
    console.log('   Password: kiosk123');
    console.log('   Role: kiosk');
    console.log('');
    
    console.log('📱 MOBILE APP (Student):');
    console.log('   Student ID: TASUED/CSE/19/0001');
    console.log('   Password: student123');
    console.log('   Role: student');
    console.log('');
    console.log('='.repeat(50));
    
    console.log('\n🔧 TESTING INSTRUCTIONS:');
    console.log('1. Use the lecturer account to access the web dashboard');
    console.log('2. Create a new attendance session from the web dashboard');
    console.log('3. Use the student account in the mobile app to scan QR codes');
    console.log('4. Use the kiosk account for manual check-ins');
    console.log('5. Monitor attendance in real-time on the web dashboard');
    
    console.log('\n🚀 System is ready for comprehensive testing!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    console.error('Full error details:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestUsers().catch(console.error);