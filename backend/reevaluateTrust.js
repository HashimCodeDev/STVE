/**
 * Re-evaluate all trust scores with updated thresholds
 */
import { PrismaClient } from '@prisma/client';
import { evaluateTrustScore } from './src/modules/trustEngine.js';

const prisma = new PrismaClient();

async function reevaluateAll() {
    console.log('\n🔄 Re-evaluating all sensor trust scores...\n');

    const sensors = await prisma.sensor.findMany();

    let success = 0;
    let failed = 0;

    for (const sensor of sensors) {
        try {
            const result = await evaluateTrustScore(sensor.id);
            if (result) {
                const icon = result.status === 'Healthy' ? '🟢' : result.status === 'Warning' ? '🟡' : '🔴';
                console.log(`${icon} ${sensor.sensorId}: ${result.score.toFixed(3)} (${result.status})`);
                success++;
            } else {
                console.log(`⚪ ${sensor.sensorId}: insufficient data`);
            }
        } catch (error) {
            console.log(`❌ ${sensor.sensorId}: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n✅ Re-evaluation complete: ${success} success, ${failed} failed\n`);

    // Show new distribution
    const scores = await prisma.trustScore.findMany({ select: { status: true } });
    const dist = {
        Healthy: scores.filter(s => s.status === 'Healthy').length,
        Warning: scores.filter(s => s.status === 'Warning').length,
        Anomalous: scores.filter(s => s.status === 'Anomalous').length,
    };

    console.log('📊 New Distribution:');
    console.log(`  🟢 Healthy:   ${dist.Healthy} (${(dist.Healthy / scores.length * 100).toFixed(0)}%)`);
    console.log(`  🟡 Warning:   ${dist.Warning} (${(dist.Warning / scores.length * 100).toFixed(0)}%)`);
    console.log(`  🔴 Anomalous: ${dist.Anomalous} (${(dist.Anomalous / scores.length * 100).toFixed(0)}%)\n`);

    await prisma.$disconnect();
}

reevaluateAll();
