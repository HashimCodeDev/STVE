'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import ResolveButton from '../components/ResolveButton';
import Toast from '../components/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Ticket {
    id: string;
    issue: string;
    severity: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
    sensor: {
        sensorId: string;
        zone: string;
        type: string;
    };
}

export default function Maintenance() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as 'success' | 'error' });
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        fetchTickets();
        const interval = setInterval(fetchTickets, 15000);
        return () => clearInterval(interval);
    }, [filter]);

    const fetchTickets = async () => {
        try {
            const url = filter
                ? `${API_URL}/api/tickets?status=${filter}`
                : `${API_URL}/api/tickets`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setTickets(data.data);
            }
            setLastUpdated(new Date());
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            setLoading(false);
        }
    };

    const handleResolveTicket = async (ticketId: string) => {
        try {
            // Optimistic UI update
            setTickets(prevTickets =>
                prevTickets.map(ticket =>
                    ticket.id === ticketId
                        ? { ...ticket, status: 'Resolved', resolvedAt: new Date().toISOString() }
                        : ticket
                )
            );

            const response = await fetch(`${API_URL}/api/tickets/${ticketId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setToast({ isVisible: true, message: 'Ticket resolved successfully!', type: 'success' });
                // Refresh tickets to get updated data
                await fetchTickets();
            } else {
                throw new Error('Failed to resolve ticket');
            }
        } catch (error) {
            // Revert optimistic update on error
            setToast({ isVisible: true, message: 'Failed to resolve ticket', type: 'error' });
            await fetchTickets();
        }
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                >
                    <div className="w-24 h-24 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/40">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8 text-xl font-semibold text-slate-300"
                >
                    Loading maintenance tickets...
                </motion.p>
            </div>
        );
    }

    const openCount = tickets.filter(t => t.status === 'Open').length;
    const inProgressCount = tickets.filter(t => t.status === 'InProgress').length;
    const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
    const totalCount = tickets.length;

    return (
        <div className="min-h-screen py-8 bg-gradient-to-br from-[#0a0e1a] via-[#0f1420] to-[#0a0e1a]">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent mb-3 tracking-tight">
                                Maintenance Tickets
                            </h1>
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <span className="text-sm font-medium text-slate-400">Track and manage sensor maintenance requests</span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                    Last updated: {lastUpdated.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2.5 bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/20">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                            </div>
                            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">System Healthy</span>
                        </div>
                    </div>
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-10 flex flex-wrap gap-3"
                >
                    <button
                        onClick={() => setFilter(null)}
                        className={`group px-6 py-3 rounded-full font-bold transition-all duration-300 flex items-center space-x-2.5 ${
                            filter === null
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/40 scale-105'
                                : 'glass-light text-slate-300 hover:text-white border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/10'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span className="text-sm uppercase tracking-wide">All Tickets</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            filter === null ? 'bg-white/25' : 'bg-slate-700 text-slate-300'
                        }`}>
                            {totalCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setFilter('Open')}
                        className={`group px-6 py-3 rounded-full font-bold transition-all duration-300 flex items-center space-x-2.5 ${
                            filter === 'Open'
                                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/40 scale-105'
                                : 'glass-light text-slate-300 hover:text-white border border-white/10 hover:border-red-500/30 hover:bg-red-500/10'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm uppercase tracking-wide">Open</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            filter === 'Open' ? 'bg-white/25' : 'bg-slate-700 text-slate-300'
                        }`}>
                            {openCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setFilter('InProgress')}
                        className={`group px-6 py-3 rounded-full font-bold transition-all duration-300 flex items-center space-x-2.5 ${
                            filter === 'InProgress'
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-xl shadow-amber-500/40 scale-105'
                                : 'glass-light text-slate-300 hover:text-white border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/10'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm uppercase tracking-wide">In Progress</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            filter === 'InProgress' ? 'bg-white/25' : 'bg-slate-700 text-slate-300'
                        }`}>
                            {inProgressCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setFilter('Resolved')}
                        className={`group px-6 py-3 rounded-full font-bold transition-all duration-300 flex items-center space-x-2.5 ${
                            filter === 'Resolved'
                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-500/40 scale-105'
                                : 'glass-light text-slate-300 hover:text-white border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/10'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm uppercase tracking-wide">Resolved</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            filter === 'Resolved' ? 'bg-white/25' : 'bg-slate-700 text-slate-300'
                        }`}>
                            {resolvedCount}
                        </span>
                    </button>
                </motion.div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-strong p-6 rounded-2xl border border-blue-500/30 hover-lift hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600"></div>
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tickets</p>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-5xl font-bold text-white mb-2 tracking-tight">{totalCount}</p>
                        <p className="text-xs text-slate-400 font-medium">All maintenance requests</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`glass-strong p-6 rounded-2xl border border-red-500/30 hover-lift hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${
                            openCount > 0 ? 'shadow-xl shadow-red-500/20 animate-pulse-slow' : ''
                        }`}
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-rose-600"></div>
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Open Tickets</p>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-5xl font-bold text-white mb-2 tracking-tight">{openCount}</p>
                        <p className="text-xs text-red-400 font-medium">Requires immediate attention</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass-strong p-6 rounded-2xl border border-emerald-500/30 hover-lift hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-green-600"></div>
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resolved</p>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-5xl font-bold text-white mb-2 tracking-tight">{resolvedCount}</p>
                        <p className="text-xs text-emerald-400 font-medium">Successfully completed</p>
                    </motion.div>
                </div>

                {/* Tickets Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-strong rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
                >
                    <div className="px-8 py-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">Ticket Details</h3>
                                <p className="text-sm text-slate-400 mt-1.5 font-medium">Complete list of maintenance requests</p>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-slate-400">
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="font-semibold">Auto-refresh: 15s</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-white/5 backdrop-blur-sm sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sensor ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Zone</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Issue</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Severity</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20">
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex flex-col items-center justify-center"
                                            >
                                                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-full flex items-center justify-center mb-6">
                                                    <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-slate-300 text-xl font-bold mb-2">No maintenance tickets detected</p>
                                                <p className="text-slate-500 text-sm">All systems are operating normally</p>
                                            </motion.div>
                                        </td>
                                    </tr>
                                ) : (
                                    tickets.map((ticket, index) => (
                                        <motion.tr
                                            key={ticket.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.6 + index * 0.05 }}
                                            className="hover:bg-white/5 transition-all duration-200 group"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                                                    {ticket.sensor.sensorId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="text-sm text-slate-300 font-medium">{ticket.sensor.zone}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300 max-w-md">
                                                <div className="line-clamp-2">{ticket.issue}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <SeverityBadge severity={ticket.severity as 'High' | 'Medium' | 'Low'} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={ticket.status as any} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2 text-sm text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="font-medium">{formatRelativeTime(ticket.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <ResolveButton
                                                    ticketId={ticket.id}
                                                    status={ticket.status}
                                                    onResolve={handleResolveTicket}
                                                />
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
