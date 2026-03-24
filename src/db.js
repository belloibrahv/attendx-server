const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

function createPrismaClient() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

prisma.$on('error', (err) => {
  console.error('Prisma error:', err);
});

function generateId(prefix) {
  return `${prefix}_${require('crypto').randomUUID()}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function initDb() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    throw err;
  }
}

module.exports = {
  prisma,
  generateId,
  nowIso,
  initDb,
};
