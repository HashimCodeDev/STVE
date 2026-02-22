'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface SensorDetail {
    id: string;
    sensorId: string;
    zone: string;
    type: string;
    trustScores?: Array<{
        score: number;
        status: string;
        label: string;
        severity: string;
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
        healthTrend?: string;
        anomalyRate?: number;
    }>;
}

export default function SensorDetailPage() {
    const params = useParams();
    const sensorId = params.id as string;
    const [sensor, setSensor] = useState<SensorDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSensor();
    }, [sensorId]);

    const fetchSensor = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sensors/${sensorId}`);
            const data = await response.json();

            if (data.success) {
                setSensor(data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch sensor:', error);
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

    if (!sensor) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1220] flex items-center justify-center">
                <p className="text-slate-400">Sensor not found</p>
            </div>
        );
    }

    const trust = sensor.trustScores?.[0];
    const statusColor = trust?.status === 'Healthy' ? 'emerald' :
                      trust?.status === 'Warning' ? 'amber' :
                      'red';

    const getStatusBgColor = (color: string) => {
        switch(color) {
            case 'emerald': return 'bg-emerald-500/10';
            case 'amber': return 'bg-amber-500/10';
            case 'red': return 'bg-red-500/10';
            default: return 'bg-slate-500/10';
        }
    };

    const getStatusBorderColor = (color: string) => {
        switch(color) {
            case 'emerald': return 'border-emerald-500/30';
            case 'amber': return 'border-amber-500/30';
            case 'red': return 'border-red-500/30';
            default: return 'border-slate-500/30';
        }
    };

    const getStatusTextColor = (color: string) => {
        switch(color) {
            case 'emerald': return 'text-emerald-400';
            case 'amber': return 'text-amber-400';
            case 'red': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    const getTrendArrow = (trend: string) => {
        if (trend === 'improving') return '↑';
        if (trend === 'degrading') return '↓';
        return '→';
    };

    const getTrendColor = (trend: string) => {
        if (trend === 'improving') return 'text-emerald-400';
        if (trend === 'degrading') return 'text-red-400';
        return 'text-cyan-400';
    };

    const getRootCauseDisplay = (causes: string[] = []) => {
        const mapping: { [key: string]: string } = {
            'SPIKE': '⚠ Sudden spike detected',
            'STATIC': '⚠ Frozen sensor probe',
            'DRIFT': '⚠ Drift detected',
            'ZONE_MISMATCH': '⚠ Zone mismatch',
            'WEATHER_MISMATCH': '⚠ Weather mismatch',
            'IMPOSSIBLE_VALUE': '⚠ Impossible value',
            'FIELD_EVENT': '🌧 Field event detected',
        };
        return causes.map(c => mapping[c] || c);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1220] py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <Link href="/zones">
                    <motion.button
                        whileHover={{ x: -4 }}
                        className="mb-6 flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </motion.button>
                </Link>

                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-2xl backdrop-blur-sm border mb-6 ${getStatusBgColor(statusColor)} ${getStatusBorderColor(statusColor)}`}
                >
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{sensor.sensorId}</h1>
                            <p className="text-slate-400">{sensor.zone} • {sensor.type}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg font-bold flex items-center space-x-2 ${
                            trust?.status === 'Healthy' ? 'bg-emerald-500/20 text-emerald-400' :
                            trust?.status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                trust?.status === 'Healthy' ? 'bg-emerald-400' :
                                trust?.status === 'Warning' ? 'bg-amber-400' :
                                'bg-red-400'
                            }`}></span>
                            <span>{trust?.status || 'Unknown'}</span>
                        </div>
                    </div>

                    {trust && (
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Trust Score</p>
                                <p className={`text-3xl font-bold ${getStatusTextColor(statusColor)}`}>
                                    {(trust.score * 100).toFixed(0)}%
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Severity</p>
                                <p className={`text-3xl font-bold ${
                                    trust.severity === 'Critical' ? 'text-red-400' :
                                    trust.severity === 'High' ? 'text-amber-400' :
                                    trust.severity === 'Medium' ? 'text-yellow-400' :
                                    'text-cyan-400'
                                }`}>
                                    {trust.severity || 'None'}
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>

                <div className="space-y-6">
                    {/* Probe Reliability */}
                    {trust && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-6 rounded-2xl backdrop-blur-sm border border-slate-500/20 bg-slate-500/5"
                        >
                            <h2 className="text-xl font-bold text-white mb-6">Probe Reliability</h2>
                            <div className="space-y-4">
                                {[
                                    { name: 'Moisture', value: trust.paramMoisture },
                                    { name: 'Temperature', value: trust.paramTemperature },
                                    { name: 'EC', value: trust.paramEc },
                                    { name: 'pH', value: trust.paramPh },
                                ].filter(p => p.value !== undefined).map(param => (
                                    <div key={param.name}>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-slate-400 text-sm">{param.name}</span>
                                            <span className="text-white font-semibold">{(param.value! * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${param.value! * 100}%` }}
                                                transition={{ duration: 1 }}
                                                className={`h-full ${
                                                    param.value! > 0.8 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                                    param.value! > 0.6 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                                    'bg-gradient-to-r from-red-500 to-red-400'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Root Cause Analysis */}
                    {trust?.rootCauses && trust.rootCauses.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-6 rounded-2xl backdrop-blur-sm border border-amber-500/20 bg-amber-500/5"
                        >
                            <h2 className="text-xl font-bold text-white mb-4">Root Cause Analysis</h2>
                            <div className="space-y-2">
                                {getRootCauseDisplay(trust.rootCauses).map((cause, idx) => (
                                    <p key={idx} className="text-amber-300 text-sm flex items-center space-x-2">
                                        <span>•</span>
                                        <span>{cause}</span>
                                    </p>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Sensor Trend */}
                    {trust && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-6 rounded-2xl backdrop-blur-sm border border-slate-500/20 bg-slate-500/5"
                        >
                            <h2 className="text-xl font-bold text-white mb-4">Sensor Trend</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-slate-400 text-sm mb-2">Trend</p>
                                    <p className={`text-2xl font-bold flex items-center space-x-2 ${getTrendColor(trust.healthTrend || '')}`}>
                                        <span>{getTrendArrow(trust.healthTrend || '')}</span>
                                        <span className="capitalize">{trust.healthTrend || 'Unknown'}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm mb-2">Anomaly Rate</p>
                                    <p className="text-2xl font-bold text-white">{((trust.anomalyRate || 0) * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Failure Prediction */}
                    {trust?.failurePrediction && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="p-6 rounded-2xl backdrop-blur-sm border border-red-500/30 bg-red-500/5"
                        >
                            <div className="flex items-start space-x-3">
                                <span className="text-3xl">🚨</span>
                                <div>
                                    <h3 className="text-lg font-bold text-red-400 mb-2">Failure Prediction</h3>
                                    <p className="text-red-300">{trust.failurePrediction}</p>
                                    <p className="text-red-200 text-sm mt-2">Maintenance recommended</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Irrigation Decision */}
                    {trust && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className={`p-6 rounded-2xl backdrop-blur-sm border ${
                                trust.irrigationSafe
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : 'border-red-500/30 bg-red-500/5'
                            }`}
                        >
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                                <span>💧</span>
                                <span>Irrigation Decision</span>
                            </h2>
                            <div className="flex items-center space-x-3">
                                <span className={trust.irrigationSafe ? 'text-3xl' : 'text-2xl'}>
                                    {trust.irrigationSafe ? '✅' : '❌'}
                                </span>
                                <div>
                                    <p className={trust.irrigationSafe ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>
                                        {trust.irrigationSafe ? 'Safe for irrigation' : 'Not safe for irrigation'}
                                    </p>
                                    <p className={trust.irrigationSafe ? 'text-emerald-200 text-sm' : 'text-red-200 text-sm'}>
                                        {trust.irrigationSafe ? 'Sensor reliability verified' : 'Unreliable sensor data'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Sustainability Insight */}
                    {trust?.sustainabilityInsight && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="p-6 rounded-2xl backdrop-blur-sm border border-emerald-500/30 bg-emerald-500/5"
                        >
                            <div className="flex items-start space-x-3">
                                <span className="text-3xl">💧</span>
                                <div>
                                    <h3 className="text-lg font-bold text-emerald-400 mb-2">Sustainability Insight</h3>
                                    <p className="text-emerald-300">{trust.sustainabilityInsight}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Diagnostic Message */}
                    {trust?.diagnostic && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="p-6 rounded-2xl backdrop-blur-sm border border-cyan-500/30 bg-cyan-500/5"
                        >
                            <h2 className="text-xl font-bold text-white mb-3">Diagnostic Report</h2>
                            <p className="text-cyan-300 text-sm leading-relaxed">{trust.diagnostic}</p>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
