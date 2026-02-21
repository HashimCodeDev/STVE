/**
 * Reset Database - Clear all data for fresh demo
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
    console.log('\n🗑️  Resetting Probos Database...\n');

    try {
        // Delete in correct order (respecting foreign keys)

        console.log('  Deleting maintenance tickets...');
        const tickets = await prisma.ticket.deleteMany({});
        console.log(`  ✓ Deleted ${tickets.count} tickets`);

        console.log('  Deleting trust scores...');
        const trustScores = await prisma.trustScore.deleteMany({});
        console.log(`  ✓ Deleted ${trustScores.count} trust scores`);

        console.log('  Deleting readings...');
        const readings = await prisma.reading.deleteMany({});
        console.log(`  ✓ Deleted ${readings.count} readings`);

        console.log('  Deleting sensors...');
        const sensors = await prisma.sensor.deleteMany({});
        console.log(`  ✓ Deleted ${sensors.count} sensors`);

        console.log('\n✅ Database reset complete!\n');
        console.log('📝 Next steps:');
        console.log('  1. Reset cron state: pnpm run realtime:reset');
        console.log('  2. Start cron job: pnpm run realtime:continuous');
        console.log('  3. Watch the trust scores get calculated!\n');

    } catch (error) {
        console.error('\n❌ Error resetting database:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
