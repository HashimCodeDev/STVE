'use client';

import { motion } from 'framer-motion';

interface SeverityBadgeProps {
    severity: string | 'High' | 'Medium' | 'Low';
}

// Normalize severity to expected format
function normalizeSeverity(severity: string): 'High' | 'Medium' | 'Low' {
    const severityMap: Record<string, any> = {
        'High': 'High',
        'Medium': 'Medium',
        'Low': 'Low',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
        'HIGH': 'High',
        'MEDIUM': 'Medium',
        'LOW': 'Low',
    };
    return severityMap[severity] || 'Medium';
}

const severityConfig = {
    High: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        dot: 'bg-red-500',
        glow: 'shadow-red-500/50',
        pulse: true
    },
    Medium: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-500',
        glow: 'shadow-amber-500/50',
        pulse: false
    },
    Low: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        dot: 'bg-green-500',
        glow: 'shadow-green-500/50',
        pulse: false
    }
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
    const normalizedSeverity = normalizeSeverity(severity);
    const config = severityConfig[normalizedSeverity];

    if (!config) {
        return <span className="text-xs font-semibold text-slate-400">{severity}</span>;
    }

    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm ${config.bg} ${config.border} ${config.text} shadow-lg ${config.glow} transition-all duration-200 hover:scale-105`}
        >
            <span className={`w-2 h-2 ${config.dot} rounded-full mr-2 ${config.pulse ? 'animate-pulse' : ''}`}></span>
            {normalizedSeverity}
        </motion.span>
    );
}
