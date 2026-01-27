import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Test a simple query
        const result = await prisma.$queryRaw`SELECT current_database(), version()`;
        console.log('📊 Database info:', result);

        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

testConnection();
