'use client';

interface StatusBadgeProps {
    status: string | 'Healthy' | 'Warning' | 'Anomalous' | 'Open' | 'InProgress' | 'Resolved' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    withGlow?: boolean;
}

// Normalize status to title case
function normalizeStatus(status: string): 'Healthy' | 'Warning' | 'Anomalous' | 'Open' | 'InProgress' | 'Resolved' {
    const statusMap: Record<string, any> = {
        'OPEN': 'Open',
        'IN_PROGRESS': 'InProgress',
        'RESOLVED': 'Resolved',
        'Open': 'Open',
        'InProgress': 'InProgress',
        'Resolved': 'Resolved',
        'Healthy': 'Healthy',
        'Warning': 'Warning',
        'Anomalous': 'Anomalous',
    };
    return statusMap[status] || 'Warning';
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
    const normalizedStatus = normalizeStatus(status);
    const config = statusConfig[normalizedStatus];

    if (!config) {
        return <span className="text-xs font-semibold text-slate-400">{status}</span>;
    }

    return (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${config.bg} ${config.border} ${config.text} ${withGlow ? `shadow-lg ${config.glow}` : ''} transition-all duration-200 hover:scale-105`}>
            <span className={`w-2 h-2 ${config.dot} rounded-full mr-2 ${normalizedStatus === 'InProgress' || normalizedStatus === 'Warning' ? 'animate-pulse' : ''}`}></span>
            {normalizedStatus === 'InProgress' ? 'In Progress' : normalizedStatus}
        </span>
    );
}
