'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface ResolveButtonProps {
    ticketId: string;
    status: string;
    onResolve: (ticketId: string) => Promise<void>;
}

export default function ResolveButton({ ticketId, status, onResolve }: ResolveButtonProps) {
    const [isResolving, setIsResolving] = useState(false);

    const handleResolve = async () => {
        setIsResolving(true);
        try {
            await onResolve(ticketId);
        } catch (error) {
            console.error('Failed to resolve ticket:', error);
        } finally {
            setIsResolving(false);
        }
    };

    // If already resolved, show a muted badge
    if (status === 'Resolved') {
        return (
            <span className="inline-flex items-center px-3 py-1.5 bg-slate-500/10 border border-slate-500/20 text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Resolved
            </span>
        );
    }

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleResolve}
            disabled={isResolving}
            className={`inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isResolving ? 'animate-pulse' : ''
            }`}
        >
            {isResolving ? (
                <>
                    <svg className="w-4 h-4 mr-1.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Resolving...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Resolve
                </>
            )}
        </motion.button>
    );
}
