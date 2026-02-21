'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 glass-light border-b border-white/10 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-18 py-3">
                    {/* Logo and Navigation */}
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-3 group cursor-pointer">
                            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:shadow-emerald-500/60 transition-all duration-300 group-hover:scale-110">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent tracking-tight">Probos</h1>
                        </div>

                        {/* Navigation Pills */}
                        <div className="hidden md:flex space-x-2">
                            <Link
                                href="/"
                                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${pathname === '/'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/30'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/maintenance"
                                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${pathname === '/maintenance'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/30'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                Maintenance
                            </Link>
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="flex items-center space-x-3">
                        <div className="hidden lg:flex items-center space-x-2.5 bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                            </div>
                            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">System Healthy</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
