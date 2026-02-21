'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: number;
    icon: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color: 'blue' | 'green' | 'amber' | 'red';
    delay?: number;
}

const colorClasses = {
    blue: {
        gradient: 'from-blue-500/20 to-blue-600/20',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/30',
        icon: 'from-blue-500 to-blue-600',
        text: 'text-blue-400',
        shadow: 'shadow-premium-blue'
    },
    green: {
        gradient: 'from-emerald-500/20 to-green-600/20',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/30',
        icon: 'from-emerald-500 to-green-600',
        text: 'text-emerald-400',
        shadow: 'shadow-premium-green'
    },
    amber: {
        gradient: 'from-amber-500/20 to-yellow-600/20',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/30',
        icon: 'from-amber-500 to-yellow-600',
        text: 'text-amber-400',
        shadow: 'shadow-premium-amber'
    },
    red: {
        gradient: 'from-red-500/20 to-rose-600/20',
        border: 'border-red-500/30',
        glow: 'shadow-red-500/30',
        icon: 'from-red-500 to-rose-600',
        text: 'text-red-400',
        shadow: 'shadow-premium-red'
    }
};

export default function StatCard({
    title,
    value,
    icon,
    trend,
    trendValue,
    color,
    delay = 0
}: StatCardProps) {
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`glass-strong p-6 rounded-2xl border ${colors.border} hover:${colors.glow} hover:shadow-2xl transition-all duration-300 relative overflow-hidden group`}
        >
            {/* Background gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

            {/* Animated border glow */}
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colors.shadow}`}></div>

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.icon} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <div className="text-white w-6 h-6">
                            {icon}
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <motion.p
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: delay + 0.2 }}
                            className="text-5xl font-bold text-white mb-2 tracking-tight counter"
                        >
                            {value}
                        </motion.p>
                        {trend && trendValue && (
                            <div className="flex items-center space-x-1.5">
                                {trend === 'up' && (
                                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                )}
                                {trend === 'down' && (
                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                )}
                                <span className={`text-xs font-bold uppercase tracking-wide ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                                    {trendValue}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Subtle animated background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </motion.div>
    );
}
