'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface HealthRingProps {
    percentage: number;
    total: number;
    healthy: number;
}

export default function HealthRing({ percentage, total, healthy }: HealthRingProps) {
    const [animatedPercentage, setAnimatedPercentage] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedPercentage(percentage);
        }, 200);
        return () => clearTimeout(timer);
    }, [percentage]);

    const circumference = 2 * Math.PI * 80;
    const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="glass-strong p-8 rounded-2xl border border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover-lift group"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white tracking-tight">System Health</h3>
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center">
                <div className="relative">
                    {/* Background circle */}
                    <svg className="transform -rotate-90 w-48 h-48">
                        <circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="rgba(16, 185, 129, 0.1)"
                            strokeWidth="14"
                            fill="none"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="url(#gradient)"
                            strokeWidth="14"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="50%" stopColor="#059669" />
                                <stop offset="100%" stopColor="#047857" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="text-center"
                        >
                            <div className="text-6xl font-bold bg-gradient-to-br from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent mb-1 tracking-tight">
                                {Math.round(animatedPercentage)}%
                            </div>
                            <div className="text-sm text-slate-400 font-bold uppercase tracking-wider">Healthy</div>
                        </motion.div>
                    </div>

                    {/* Outer glow ring */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="w-56 h-56 rounded-full bg-emerald-500/5 blur-xl"></div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Total Sensors</p>
                    <p className="text-2xl font-bold text-white">{total}</p>
                </div>
                <div className="w-px h-12 bg-white/10"></div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Healthy</p>
                    <p className="text-2xl font-bold text-emerald-400">{healthy}</p>
                </div>
            </div>
        </motion.div>
    );
}
