/**
 * Check Trust Score Distribution
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScores() {
    const scores = await prisma.trustScore.findMany({
        include: {
            sensor: { select: { sensorId: true } }
        },
        orderBy: { score: 'asc' }
    });

    console.log('\n📊 Trust Score Analysis\n');
    console.log('Status Distribution:');
    console.log('  🔴 Anomalous:', scores.filter(s => s.status === 'Anomalous').length);
    console.log('  🟡 Warning:  ', scores.filter(s => s.status === 'Warning').length);
    console.log('  🟢 Healthy:  ', scores.filter(s => s.status === 'Healthy').length);
    console.log('  Total:      ', scores.length);

    console.log('\n📉 Lowest Trust Scores:');
    scores.slice(0, 15).forEach(s => {
        const icon = s.status === 'Healthy' ? '🟢' : s.status === 'Warning' ? '🟡' : '🔴';
        const flags = s.flags?.length > 0 ? ` [${s.flags.join(', ')}]` : '';
        console.log(`  ${icon} ${s.sensor.sensorId}: ${s.score.toFixed(3)} (${s.status})${flags}`);
    });

    console.log('\n📈 Highest Trust Scores:');
    scores.slice(-5).forEach(s => {
        console.log(`  🟢 ${s.sensor.sensorId}: ${s.score.toFixed(3)} (${s.status})`);
    });

    // Check specific sensor types
    const staticSensors = ['s_10', 's_40'];
    const spikeSensors = ['s_09', 's_19', 's_29'];
    const driftSensors = ['s_07', 's_08', 's_17', 's_18'];

    console.log('\n🔍 Specific Sensor Analysis:');

    console.log('\n  Static Sensors (should be Anomalous <0.25):');
    staticSensors.forEach(sId => {
        const s = scores.find(sc => sc.sensor.sensorId === sId);
        if (s) {
            const icon = s.status === 'Anomalous' ? '✓' : '✗';
            console.log(`    ${icon} ${sId}: ${s.score.toFixed(3)} (${s.status}) lowVar:${s.lowVariance}`);
        }
    });

    console.log('\n  Spike Sensors (should be Anomalous <0.30):');
    spikeSensors.forEach(sId => {
        const s = scores.find(sc => sc.sensor.sensorId === sId);
        if (s) {
            const icon = s.status === 'Anomalous' ? '✓' : '✗';
            console.log(`    ${icon} ${sId}: ${s.score.toFixed(3)} (${s.status}) spike:${s.spikeDetected} zone:${s.zoneAnomaly}`);
        }
    });

    console.log('\n  Drift Sensors (should be Warning 0.50-0.80):');
    driftSensors.forEach(sId => {
        const s = scores.find(sc => sc.sensor.sensorId === sId);
        if (s) {
            const icon = s.status === 'Warning' ? '✓' : '✗';
            console.log(`    ${icon} ${sId}: ${s.score.toFixed(3)} (${s.status}) zone:${s.zoneAnomaly}`);
        }
    });

    await prisma.$disconnect();
}

checkScores();
