'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Zone {
    name: string;
    sensorCount: number;
    healthyCount: number;
    warningCount: number;
    anomalousCount: number;
    reliability: number;
}

export default function ZonesPage() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sensors`);
            const data = await response.json();

            if (data.success) {
                // Group sensors by zone
                const zoneMap: { [key: string]: Zone } = {};
                
                data.data.forEach((sensor: any) => {
                    if (!zoneMap[sensor.zone]) {
                        zoneMap[sensor.zone] = {
                            name: sensor.zone,
                            sensorCount: 0,
                            healthyCount: 0,
                            warningCount: 0,
                            anomalousCount: 0,
                            reliability: 0,
                        };
                    }
                    
                    zoneMap[sensor.zone].sensorCount++;
                    
                    if (sensor.trustScores && sensor.trustScores.length > 0) {
                        const latestTrust = sensor.trustScores[0];
                        if (latestTrust.status === 'Healthy') {
                            zoneMap[sensor.zone].healthyCount++;
                        } else if (latestTrust.status === 'Warning') {
                            zoneMap[sensor.zone].warningCount++;
                        } else if (latestTrust.status === 'Anomalous') {
                            zoneMap[sensor.zone].anomalousCount++;
                        }
                    }
                });

                // Calculate reliability
                const zonesArray = Object.values(zoneMap).map(zone => ({
                    ...zone,
                    reliability: zone.sensorCount > 0 ? zone.healthyCount / zone.sensorCount : 0,
                }));

                setZones(zonesArray.sort((a, b) => a.name.localeCompare(b.name)));
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch zones:', error);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1220] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-3">
                        Zone Overview
                    </h1>
                    <p className="text-slate-400 text-lg">Select a zone to view detailed sensor information</p>
                </motion.div>

                {/* Zones Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {zones.map((zone, idx) => (
                        <Link key={zone.name} href={`/zones/${zone.name.replace(' ', '-').toLowerCase()}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group cursor-pointer h-full"
                            >
                                <div className={`
                                    relative h-full p-6 rounded-2xl backdrop-blur-sm
                                    border transition-all duration-300
                                    ${zone.reliability > 0.85
                                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/60 hover:shadow-xl hover:shadow-emerald-500/20'
                                        : zone.reliability > 0.70
                                        ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/20'
                                        : 'border-red-500/30 bg-red-500/5 hover:border-red-400/60 hover:shadow-xl hover:shadow-red-500/20'
                                    }
                                `}>
                                    {/* Zone Name */}
                                    <h2 className="text-2xl font-bold text-white mb-4 capitalize">{zone.name}</h2>

                                    {/* Stats */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Reliability</span>
                                            <span className={`text-lg font-bold ${
                                                zone.reliability > 0.85 ? 'text-emerald-400' :
                                                zone.reliability > 0.70 ? 'text-amber-400' :
                                                'text-red-400'
                                            }`}>
                                                {(zone.reliability * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Sensors</span>
                                            <span className="text-white font-semibold">{zone.sensorCount}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Healthy</span>
                                            <span className="text-emerald-400 font-semibold">{zone.healthyCount}</span>
                                        </div>

                                        {zone.warningCount > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">Warning</span>
                                                <span className="text-amber-400 font-semibold">{zone.warningCount}</span>
                                            </div>
                                        )}

                                        {zone.anomalousCount > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">Anomalous</span>
                                                <span className="text-red-400 font-semibold">{zone.anomalousCount}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Indicator */}
                                    <div className="flex items-center space-x-2 pt-4 border-t border-white/10 group-hover:translate-x-1 transition-transform">
                                        <span className={`w-2 h-2 rounded-full ${
                                            zone.reliability > 0.85 ? 'bg-emerald-500 animate-pulse' :
                                            zone.reliability > 0.70 ? 'bg-amber-500 animate-pulse' :
                                            'bg-red-500 animate-pulse'
                                        }`}></span>
                                        <span className="text-sm text-slate-400">View Details →</span>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
