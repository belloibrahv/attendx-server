#!/usr/bin/env node

/**
 * AttendX Neon Database Setup Script
 * This script helps you set up a new Neon database for AttendX
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AttendX Neon Database Setup\n');

console.log('📋 Step 1: Create a New Neon Project');
console.log('   1. Go to: https://console.neon.tech');
console.log('   2. Sign in with GitHub or email');
console.log('   3. Click "New Project"');
console.log('   4. Name: "attendx-production"');
console.log('   5. Region: Choose closest to your users');
console.log('   6. Click "Create Project"\n');

console.log('🔗 Step 2: Get Your Connection String');
console.log('   1. Click the "Connect" button');
console.log('   2. Select:');
console.log('      - Branch: main');
console.log('      - Database: neondb');
console.log('      - Role: neondb_owner');
console.log('   3. Copy the connection string (should start with postgresql://)\n');

console.log('⚙️  Step 3: Update Your .env File');
console.log('   Replace the DATABASE_URL in server/.env with your new connection string\n');

console.log('🧪 Step 4: Test the Setup');
console.log('   Run these commands:');
console.log('   cd server');
console.log('   npm install');
console.log('   npx prisma generate');
console.log('   npx prisma db push');
console.log('   npm run dev\n');

console.log('✅ Step 5: Verify Connection');
console.log('   Test: curl http://localhost:4000/health');
console.log('   Should return: {"status":"ok","database":"connected"}\n');

console.log('📱 Step 6: Update Mobile App');
console.log('   Update mobile/src/services/api.ts with your server URL\n');

// Check if .env exists and show current status
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasValidUrl = envContent.includes('postgresql://') && 
                     !envContent.includes('REPLACE_WITH_YOUR');
  
  if (hasValidUrl) {
    console.log('✅ .env file exists with database URL');
  } else {
    console.log('⚠️  .env file needs DATABASE_URL update');
  }
} else {
  console.log('❌ .env file not found - copy from .env.example');
}

console.log('\n🎯 Quick Start Commands:');
console.log('npm install');
console.log('npx prisma generate');
console.log('npx prisma db push');
console.log('npm run dev');

console.log('\n📚 For detailed instructions, see: server/NEON_SETUP.md');