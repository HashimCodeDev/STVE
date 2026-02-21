import { PrismaClient } from '@prisma/client';
import { getTrustScoreDistribution } from './trustEngine.js';
import { getTicketStats } from './maintenance.js';

const prisma = new PrismaClient();

/**
 * Dashboard Summary Module
 * Provides aggregated data for dashboard visualization
 */

// Get comprehensive dashboard summary
export async function getDashboardSummary() {
    try {
        const [
            totalSensors,
            trustDistribution,
            ticketStats,
        ] = await Promise.all([
            prisma.sensor.count(),
            getTrustScoreDistribution(),
            getTicketStats(),
        ]);

        return {
            sensors: {
                total: totalSensors,
                healthy: trustDistribution.healthy,
                warning: trustDistribution.warning,
                anomalous: trustDistribution.anomalous,
            },
            tickets: ticketStats,
        };
    } catch (error) {
        throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }
}

// Get zone-wise statistics
export async function getZoneStatistics() {
    try {
        const sensors = await prisma.sensor.findMany({
            include: {
                trustScores: {
                    orderBy: { lastEvaluated: 'desc' },
                    take: 1,
                },
            },
        });

        // Group by zone
        const zoneMap = new Map();

        sensors.forEach(sensor => {
            if (!zoneMap.has(sensor.zone)) {
                zoneMap.set(sensor.zone, {
                    zone: sensor.zone,
                    total: 0,
                    healthy: 0,
                    warning: 0,
                    anomalous: 0,
                });
            }

            const zoneData = zoneMap.get(sensor.zone);
            zoneData.total++;

            if (sensor.trustScores.length > 0) {
                const status = sensor.trustScores[0].status;
                if (status === 'Healthy') zoneData.healthy++;
                else if (status === 'Warning') zoneData.warning++;
                else if (status === 'Anomalous') zoneData.anomalous++;
            }
        });

        return Array.from(zoneMap.values());
    } catch (error) {
        throw new Error(`Failed to get zone statistics: ${error.message}`);
    }
}

// Get recent activity feed
export async function getRecentActivity(limit = 10) {
    try {
        const [recentReadings, recentTickets] = await Promise.all([
            prisma.reading.findMany({
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: {
                    sensor: {
                        select: {
                            sensorId: true,
                            zone: true,
                        },
                    },
                },
            }),
            prisma.ticket.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    sensor: {
                        select: {
                            sensorId: true,
                            zone: true,
                        },
                    },
                },
            }),
        ]);

        return {
            recentReadings,
            recentTickets,
        };
    } catch (error) {
        throw new Error(`Failed to get recent activity: ${error.message}`);
    }
}

// Get sensor health timeline
export async function getHealthTimeline(sensorId, days = 7) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const trustScores = await prisma.trustScore.findMany({
            where: {
                sensorId,
                lastEvaluated: {
                    gte: cutoffDate,
                },
            },
            orderBy: { lastEvaluated: 'asc' },
        });

        return trustScores;
    } catch (error) {
        throw new Error(`Failed to get health timeline: ${error.message}`);
    }
}
