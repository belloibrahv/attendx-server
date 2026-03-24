#!/usr/bin/env node

/**
 * Test AttendX Server Setup
 * This script tests the server without requiring database connection
 */

const express = require('express');
const cors = require('cors');

console.log('🧪 Testing AttendX Server Setup...\n');

// Test basic server functionality
const app = express();
app.use(cors());
app.use(express.json());

// Test health endpoint without database
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    database: 'not_connected_yet',
    message: 'Server is working! Connect database to enable full functionality.'
  });
});

// Test basic endpoints
app.get('/test', (req, res) => {
  res.json({ 
    message: 'AttendX API is ready!',
    endpoints: [
      'POST /auth/register - Register users',
      'POST /auth/login - Login users', 
      'POST /sessions/start - Start attendance session',
      'POST /attendance/checkin - Check in to session',
      'GET /health - Health check'
    ]
  });
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`✅ AttendX API server started on http://localhost:${PORT}`);
  console.log(`🔗 Test endpoints:`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Test: http://localhost:${PORT}/test`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Set up Neon database (run: node setup-neon.js)`);
  console.log(`   2. Update DATABASE_URL in .env`);
  console.log(`   3. Run: npx prisma db push`);
  console.log(`   4. Start full server: npm run dev`);
  console.log(`\n⏹️  Press Ctrl+C to stop`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});