'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

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

    useEffect(() => {
        fetchTickets();
        const interval = setInterval(fetchTickets, 15000); // Refresh every 15s
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
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            setLoading(false);
        }
    };

    const getSeverityBadge = (severity: string) => {
        const config = {
            High: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', glow: 'shadow-red-500/50' },
            Medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/50' },
            Low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/50' }
        }[severity] || { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', glow: '' };

        return (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${config.bg} ${config.border} ${config.text} shadow-lg ${config.glow}`}>
                {severity}
            </span>
        );
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'High':
                return (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'Medium':
                return (
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'Low':
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                >
                    <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="mt-6 text-lg font-medium text-slate-300"
                >
                    Loading tickets...
                </motion.p>
            </div>
        );
    }

    const openCount = tickets.filter(t => t.status === 'Open').length;
    const inProgressCount = tickets.filter(t => t.status === 'InProgress').length;
    const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
            <div className="max-w-7xl mx-auto p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8 animate-fadeIn">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-700 to-amber-600 bg-clip-text text-transparent mb-2">
                        Maintenance Tickets
                    </h1>
                    <p className="text-slate-600 flex items-center space-x-2">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Track and manage sensor maintenance requests</span>
                    </p>
                </div>

                {/* Filter Buttons */}
                <div className="mb-8 flex flex-wrap gap-3 animate-slideInRight">
                    <button
                        onClick={() => setFilter(null)}
                        className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${filter === null
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-300'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>All Tickets</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filter === null ? 'bg-white/25' : 'bg-slate-200 text-slate-700'
                            }`}>
                            {tickets.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setFilter('Open')}
                        className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${filter === 'Open'
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30 scale-105'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-red-300'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Open</span>
                    </button>
                    <button
                        onClick={() => setFilter('InProgress')}
                        className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${filter === 'InProgress'
                            ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/30 scale-105'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-amber-300'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>In Progress</span>
                    </button>
                    <button
                        onClick={() => setFilter('Resolved')}
                        className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${filter === 'Resolved'
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-300'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Resolved</span>
                    </button>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card-hover bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200 animate-slideInRight" style={{ animationDelay: '0s' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Tickets</h3>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-slate-800">{tickets.length}</p>
                        <p className="text-xs text-slate-500 mt-2">All maintenance requests</p>
                    </div>
                    <div className="card-hover bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-2xl shadow-lg border border-red-200 animate-slideInRight" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Open Tickets</h3>
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-red-700">
                            {tickets.filter(t => t.status === 'Open').length}
                        </p>
                        <p className="text-xs text-red-600 mt-2">Requires immediate attention</p>
                    </div>
                    <div className="card-hover bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl shadow-lg border border-emerald-200 animate-slideInRight" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Resolved</h3>
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-emerald-700">
                            {tickets.filter(t => t.status === 'Resolved').length}
                        </p>
                        <p className="text-xs text-emerald-600 mt-2">Successfully completed</p>
                    </div>
                </div>

                {/* Tickets Table */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
                    <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-orange-50 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Ticket Details</h2>
                                <p className="text-sm text-slate-600 mt-1">Complete list of maintenance requests</p>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Auto-refresh: 15s</span>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Sensor ID
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Zone
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Issue
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Severity
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Created At
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-slate-500 text-lg font-medium">No tickets found</p>
                                                <p className="text-slate-400 text-sm mt-1">All systems are operating normally</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    tickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-slate-50 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                                                {ticket.sensor.sensorId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                <div className="flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span>{ticket.sensor.zone}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700 max-w-md">
                                                <div className="line-clamp-2">{ticket.issue}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    {getSeverityIcon(ticket.severity)}
                                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getSeverityColor(ticket.severity)}`}>
                                                        {ticket.severity}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                                                    <span className={`w-2 h-2 mr-2 rounded-full ${ticket.status === 'Resolved' ? 'bg-emerald-500' :
                                                        ticket.status === 'InProgress' ? 'bg-amber-500 animate-pulse' :
                                                            'bg-red-500 animate-pulse'
                                                        }`}></span>
                                                    {ticket.status === 'InProgress' ? 'In Progress' : ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                                                    <span className={`w-2 h-2 mr-2 rounded-full ${ticket.status === 'Resolved' ? 'bg-emerald-500' :
                                                        ticket.status === 'InProgress' ? 'bg-amber-500 animate-pulse' :
                                                            'bg-red-500 animate-pulse'
                                                        }`}></span>
                                                    {ticket.status === 'InProgress' ? 'In Progress' : ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                <div className="flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>{formatDate(ticket.createdAt)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
