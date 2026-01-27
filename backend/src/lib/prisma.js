// Load environment variables BEFORE initializing Prisma
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { PrismaClient } from '@prisma/client';

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in environment variables!');
  console.error('Please check your .env file.');
  process.exit(1);
}

console.log('✅ Prisma connecting to database...');
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

/**
 * Get Prisma client instance
 */
function getPrismaClient() {
  return prisma;
}

export {
  prisma,
  getPrismaClient,
};
