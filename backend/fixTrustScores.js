import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix trust scores in database
 * Converts scores from 100-scale to 0-1 scale
 */
async function fixTrustScores() {
    try {
        console.log('🔍 Checking trust scores...');

        // Get all trust scores
        const trustScores = await prisma.trustScore.findMany();

        console.log(`📊 Found ${trustScores.length} trust scores`);

        let fixed = 0;
        let alreadyCorrect = 0;

        for (const ts of trustScores) {
            // If score is > 1, it's on the wrong scale
            if (ts.score > 1) {
                await prisma.trustScore.update({
                    where: { id: ts.id },
                    data: {
                        score: ts.score / 100,
                        // Also fix parameter scores if they exist
                        paramMoisture: ts.paramMoisture > 1 ? ts.paramMoisture / 100 : ts.paramMoisture,
                        paramTemperature: ts.paramTemperature > 1 ? ts.paramTemperature / 100 : ts.paramTemperature,
                        paramEc: ts.paramEc > 1 ? ts.paramEc / 100 : ts.paramEc,
                        paramPh: ts.paramPh > 1 ? ts.paramPh / 100 : ts.paramPh,
                        anomalyRate: ts.anomalyRate > 1 ? ts.anomalyRate / 100 : ts.anomalyRate,
                        zoneReliability: ts.zoneReliability > 1 ? ts.zoneReliability / 100 : ts.zoneReliability,
                        confidenceLevel: ts.confidenceLevel > 1 ? ts.confidenceLevel / 100 : ts.confidenceLevel,
                    }
                });
                console.log(`✅ Fixed score for sensor ${ts.sensorId}: ${ts.score} → ${ts.score / 100}`);
                fixed++;
            } else {
                alreadyCorrect++;
            }
        }

        console.log(`\n✨ Done!`);
        console.log(`   Fixed: ${fixed}`);
        console.log(`   Already correct: ${alreadyCorrect}`);

    } catch (error) {
        console.error('❌ Error fixing trust scores:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

fixTrustScores();
