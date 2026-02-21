'use client';

interface StatusBadgeProps {
    status: 'Healthy' | 'Warning' | 'Anomalous' | 'Open' | 'InProgress' | 'Resolved';
    withGlow?: boolean;
}

const statusConfig = {
    Healthy: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        dot: 'bg-emerald-500',
        glow: 'shadow-emerald-500/50'
    },
    Warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-500',
        glow: 'shadow-amber-500/50'
    },
    Anomalous: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        dot: 'bg-red-500',
        glow: 'shadow-red-500/50'
    },
    Open: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        dot: 'bg-red-500',
        glow: 'shadow-red-500/50'
    },
    InProgress: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-500',
        glow: 'shadow-amber-500/50'
    },
    Resolved: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        dot: 'bg-emerald-500',
        glow: 'shadow-emerald-500/50'
    }
};

export default function StatusBadge({ status, withGlow = true }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${config.bg} ${config.border} ${config.text} ${withGlow ? `shadow-lg ${config.glow}` : ''} transition-all duration-200 hover:scale-105`}>
            <span className={`w-2 h-2 ${config.dot} rounded-full mr-2 ${status === 'InProgress' || status === 'Warning' ? 'animate-pulse' : ''}`}></span>
            {status === 'InProgress' ? 'In Progress' : status}
        </span>
    );
}
