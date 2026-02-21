/**
 * Quick script to verify database upload
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
    try {
        const sensorCount = await prisma.sensor.count();
        const readingCount = await prisma.reading.count();
        const trustScoreCount = await prisma.trustScore.count();
        const ticketCount = await prisma.ticket.count();

        console.log('\n📊 Database Summary:');
        console.log('─'.repeat(40));
        console.log(`Sensors:      ${sensorCount}`);
        console.log(`Readings:     ${readingCount}`);
        console.log(`Trust Scores: ${trustScoreCount}`);
        console.log(`Tickets:      ${ticketCount}`);
        console.log('─'.repeat(40));

        // Get sample data
        console.log('\n📍 Sample Sensors:');
        const sensors = await prisma.sensor.findMany({
            take: 5,
            orderBy: { sensorId: 'asc' },
            include: {
                _count: {
                    select: { readings: true }
                }
            }
        });

        sensors.forEach(s => {
            console.log(`  • ${s.sensorId} (${s.zone}) - ${s._count.readings} readings`);
        });

        // Get zones
        const zones = await prisma.sensor.groupBy({
            by: ['zone'],
            _count: true,
        });

        console.log('\n🗺️  Zones:');
        zones.forEach(z => {
            console.log(`  • ${z.zone}: ${z._count} sensors`);
        });

        // Get date range
        const firstReading = await prisma.reading.findFirst({
            orderBy: { timestamp: 'asc' },
        });

        const lastReading = await prisma.reading.findFirst({
            orderBy: { timestamp: 'desc' },
        });

        if (firstReading && lastReading) {
            console.log('\n📅 Data Range:');
            console.log(`  From: ${firstReading.timestamp.toISOString()}`);
            console.log(`  To:   ${lastReading.timestamp.toISOString()}`);
        }

        console.log('\n✅ Database verification complete!\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyData();
