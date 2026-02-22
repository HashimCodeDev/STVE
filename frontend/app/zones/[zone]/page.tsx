'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Sensor {
    id: string;
    sensorId: string;
    zone: string;
    type: string;
    trustScores?: Array<{
        score: number;
        status: string;
        label: string;
        confidenceLevel: number;
        failurePrediction?: string;
        irrigationSafe?: boolean;
        zoneReliability?: number;
        sustainabilityInsight?: string;
        alertTag?: string;
        paramMoisture?: number;
        paramTemperature?: number;
        paramEc?: number;
        paramPh?: number;
        rootCauses?: string[];
        diagnostic?: string;
    }>;
}

export default function ZoneDetailsPage() {
    const params = useParams();
    const zoneName = params.zone as string;
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [loading, setLoading] = useState(true);
    const [zone, setZone] = useState({ reliability: 0, anomalies: 0 });

    useEffect(() => {
        fetchSensors();
    }, [zoneName]);

    const fetchSensors = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sensors`);
            const data = await response.json();

            if (data.success) {
                const decodedZone = zoneName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                const zoneSensors = data.data.filter((s: Sensor) => s.zone.toLowerCase() === decodedZone.toLowerCase());
                
                setSensors(zoneSensors.sort((a: Sensor, b: Sensor) => a.sensorId.localeCompare(b.sensorId)));

                // Calculate zone stats
                const healthyCount = zoneSensors.filter((s: Sensor) => 
                    s.trustScores?.[0]?.status === 'Healthy'
                ).length;
                const anomalousCount = zoneSensors.filter((s: Sensor) =>
                    s.trustScores?.[0]?.status === 'Anomalous'
                ).length;

                setZone({
                    reliability: zoneSensors.length > 0 ? healthyCount / zoneSensors.length : 0,
                    anomalies: anomalousCount,
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch sensors:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1220]">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full"
                />
            </div>
        );
    }

    const decodedZone = zoneName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1220] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <Link href="/zones">
                    <motion.button
                        whileHover={{ x: -4 }}
                        className="mb-6 flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back to Zones</span>
                    </motion.button>
                </Link>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 flex items-end justify-between"
                >
                    <div>
                        <h1 className="text-5xl font-bold text-white mb-2">{decodedZone}</h1>
                        <p className="text-slate-400">Sensor monitoring and health analysis</p>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-right">
                            <p className="text-slate-400 text-sm">Reliability</p>
                            <p className={`text-2xl font-bold ${
                                zone.reliability > 0.85 ? 'text-emerald-400' :
                                zone.reliability > 0.70 ? 'text-amber-400' :
                                'text-red-400'
                            }`}>
                                {(zone.reliability * 100).toFixed(0)}%
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-sm">Sensors</p>
                            <p className="text-2xl font-bold text-white">{sensors.length}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-sm">Anomalies</p>
                            <p className="text-2xl font-bold text-red-400">{zone.anomalies}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Sensors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sensors.map((sensor, idx) => {
                        const trust = sensor.trustScores?.[0];
                        const confidenceMap: { [key: string]: string } = {
                            'High': 'text-emerald-400',
                            'Moderate': 'text-amber-400',
                            'Low': 'text-red-400',
                        };

                        const getConfidenceText = (level: number) => {
                            if (level >= 0.85) return 'High';
                            if (level >= 0.70) return 'Moderate';
                            return 'Low';
                        };

                        const statusColor = trust?.status === 'Healthy' ? 'emerald' :
                                          trust?.status === 'Warning' ? 'amber' :
                                          'red';

                        return (
                            <motion.div
                                key={sensor.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group"
                            >
                                <Link href={`/sensors/${sensor.id}`}>
                                    <div className={`
                                        relative h-full p-6 rounded-2xl backdrop-blur-sm
                                        border transition-all duration-300 cursor-pointer
                                        border-${statusColor}-500/30 bg-${statusColor}-500/5
                                        hover:border-${statusColor}-400/60 hover:shadow-xl
                                        hover:shadow-${statusColor}-500/20 hover:scale-105
                                    `} style={{
                                        borderColor: statusColor === 'emerald' ? 'rgba(34, 197, 94, 0.3)' :
                                                   statusColor === 'amber' ? 'rgba(245, 158, 11, 0.3)' :
                                                   'rgba(239, 68, 68, 0.3)',
                                        backgroundColor: statusColor === 'emerald' ? 'rgba(34, 197, 94, 0.05)' :
                                                       statusColor === 'amber' ? 'rgba(245, 158, 11, 0.05)' :
                                                       'rgba(239, 68, 68, 0.05)',
                                    }}>
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{sensor.sensorId}</h3>
                                                <p className="text-xs text-slate-500">{sensor.type}</p>
                                            </div>
                                            <div className={`
                                                px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1
                                                ${trust?.status === 'Healthy' ? 'bg-emerald-500/20 text-emerald-400' :
                                                  trust?.status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
                                                  'bg-red-500/20 text-red-400'}
                                            `}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    trust?.status === 'Healthy' ? 'bg-emerald-400' :
                                                    trust?.status === 'Warning' ? 'bg-amber-400' :
                                                    'bg-red-400'
                                                }`}></span>
                                                <span>{trust?.status || 'Unknown'}</span>
                                            </div>
                                        </div>

                                        {/* Trust Info */}
                                        {trust && (
                                            <div className="space-y-2 mb-4 pb-4 border-b border-white/10">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 text-sm">Trust Score</span>
                                                    <span className="text-white font-semibold">{(trust.score * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Parameters */}
                                        {trust && (
                                            <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/10">
                                                {trust.paramMoisture !== undefined && (
                                                    <div>
                                                        <p className="text-xs text-slate-500">Moisture</p>
                                                        <p className="text-white font-semibold">{(trust.paramMoisture * 100).toFixed(0)}%</p>
                                                    </div>
                                                )}
                                                {trust.paramTemperature !== undefined && (
                                                    <div>
                                                        <p className="text-xs text-slate-500">Temp</p>
                                                        <p className="text-white font-semibold">{trust.paramTemperature.toFixed(1)}°C</p>
                                                    </div>
                                                )}
                                                {trust.paramEc !== undefined && (
                                                    <div>
                                                        <p className="text-xs text-slate-500">EC</p>
                                                        <p className="text-white font-semibold">{trust.paramEc.toFixed(2)}</p>
                                                    </div>
                                                )}
                                                {trust.paramPh !== undefined && (
                                                    <div>
                                                        <p className="text-xs text-slate-500">pH</p>
                                                        <p className="text-white font-semibold">{trust.paramPh.toFixed(1)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Intelligence Flags */}
                                        {trust && (trust.failurePrediction || trust.rootCauses?.length) && (
                                            <div className="space-y-2 mb-4 pb-4 border-b border-white/10">
                                                {trust.failurePrediction && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="text-red-400">🚨</span>
                                                        <span className="text-xs text-red-300">{trust.failurePrediction}</span>
                                                    </div>
                                                )}
                                                {trust.irrigationSafe === false && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="text-amber-400">⚠</span>
                                                        <span className="text-xs text-amber-300">Not safe for irrigation</span>
                                                    </div>
                                                )}
                                                {trust.sustainabilityInsight && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="text-emerald-400">💧</span>
                                                        <span className="text-xs text-emerald-300">{trust.sustainabilityInsight}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* View Details Button */}
                                        <motion.button
                                            whileHover={{ x: 4 }}
                                            className="w-full py-2 text-sm font-semibold text-cyan-400 border border-cyan-500/30 rounded-lg hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all flex items-center justify-center space-x-2 group-hover:shadow-lg group-hover:shadow-cyan-500/20"
                                        >
                                            <span>View Details</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </motion.button>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>

                {sensors.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <p className="text-slate-400 text-lg">No sensors found in this zone</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
