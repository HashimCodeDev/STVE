'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import HealthRing from './components/HealthRing';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Sensor {
  id: string;
  sensorId: string;
  zone: string;
  type: string;
  trustScores: Array<{
    score: number;
    status: string;
  }>;
  readings: Array<{
    moisture: number | null;
    temperature: number | null;
    ec: number | null;
    ph: number | null;
  }>;
}

interface DashboardSummary {
  sensors: {
    total: number;
    healthy: number;
    warning: number;
    anomalous: number;
  };
  tickets: {
    open: number;
    inProgress: number;
    resolved: number;
    total: number;
  };
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, sensorsRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/summary`),
        fetch(`${API_URL}/api/sensors`),
      ]);

      const summaryData = await summaryRes.json();
      const sensorsData = await sensorsRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (sensorsData.success) setSensors(sensorsData.data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const chartData = summary ? [
    { name: 'Healthy', count: summary.sensors.healthy, fill: '#10b981' },
    { name: 'Warning', count: summary.sensors.warning, fill: '#f59e0b' },
    { name: 'Anomalous', count: summary.sensors.anomalous, fill: '#ef4444' },
  ] : [];

  const healthPercentage = summary
    ? Math.round((summary.sensors.healthy / summary.sensors.total) * 100)
    : 0;

  // Group sensors by zone for heatmap
  const zoneData = sensors.reduce((acc, sensor) => {
    const zone = sensor.zone;
    if (!acc[zone]) {
      acc[zone] = { healthy: 0, warning: 0, anomalous: 0, total: 0 };
    }
    acc[zone].total++;
    const status = sensor.trustScores[0]?.status || 'Unknown';
    if (status === 'Healthy') acc[zone].healthy++;
    if (status === 'Warning') acc[zone].warning++;
    if (status === 'Anomalous') acc[zone].anomalous++;
    return acc;
  }, {} as Record<string, { healthy: number; warning: number; anomalous: number; total: number }>);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-linear-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
          Loading dashboard...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-linear-to-br from-[#0a0e1a] via-[#0f1420] to-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-5xl font-bold bg-linear-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent mb-3 tracking-tight">
            Sensor Dashboard
          </h1>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
              </div>
              <span className="text-sm font-medium text-slate-400">Real-time monitoring active</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Total Sensors"
            value={summary?.sensors.total || 0}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            }
            color="blue"
            delay={0}
          />
          <StatCard
            title="Healthy"
            value={summary?.sensors.healthy || 0}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
            trend="up"
            trendValue="+2.5%"
            delay={0.1}
          />
          <StatCard
            title="Warning"
            value={summary?.sensors.warning || 0}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color="amber"
            delay={0.2}
          />
          <StatCard
            title="Anomalous"
            value={summary?.sensors.anomalous || 0}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
            trend="down"
            trendValue="-1.2%"
            delay={0.3}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Health Ring */}
          <HealthRing
            percentage={healthPercentage}
            total={summary?.sensors.total || 0}
            healthy={summary?.sensors.healthy || 0}
          />

          {/* Trust Score Distribution */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2 glass-strong p-8 rounded-2xl border border-white/10 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover-lift"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Trust Score Distribution</h3>
                <p className="text-sm text-slate-400 mt-1.5 font-medium">Real-time sensor health breakdown</p>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  style={{ fontSize: '14px', fontWeight: 600 }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '14px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(20, 24, 35, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(10px)'
                  }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Zone Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="glass-strong p-8 rounded-2xl border border-white/10 mb-10 hover-lift"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Zone Health Map</h3>
              <p className="text-sm text-slate-400 mt-1.5 font-medium">Sensor distribution across zones</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-400">Healthy</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-slate-400">Warning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-slate-400">Anomalous</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(zoneData).map(([zone, data], index) => {
              const healthPercent = (data.healthy / data.total) * 100;
              const getColor = () => {
                if (healthPercent >= 80) return 'from-emerald-500/20 to-green-600/20 border-emerald-500/40 hover:border-emerald-500/60 shadow-emerald-500/20';
                if (healthPercent >= 50) return 'from-amber-500/20 to-yellow-600/20 border-amber-500/40 hover:border-amber-500/60 shadow-amber-500/20';
                return 'from-red-500/20 to-rose-600/20 border-red-500/40 hover:border-red-500/60 shadow-red-500/20';
              };

              return (
                <Link key={zone} href={`/zones/${zone}`}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className={`p-5 rounded-2xl bg-linear-to-br ${getColor()} border backdrop-blur-sm hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg`}
                  >
                    <div className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">{zone}</div>
                    <div className="text-3xl font-bold text-white mb-2">{data.total}</div>
                    <div className="flex items-center space-x-1.5 text-xs font-semibold">
                      <span className="text-emerald-400">{data.healthy}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400">{data.warning}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-red-400">{data.anomalous}</span>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Sensors Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="glass-strong rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        >
          <div className="px-8 py-6 border-b border-white/10 bg-linear-to-r from-white/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">All Sensors</h3>
                <p className="text-sm text-slate-400 mt-1.5 font-medium">Real-time sensor data and status</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-semibold">Auto-refresh: 10s</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sensor ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Zone</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Moisture</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">EC</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Temp</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">pH</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Trust</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sensors.map((sensor, index) => {
                  const latestTrust = sensor.trustScores[0];
                  const latestReading = sensor.readings[0];

                  return (
                    <motion.tr
                      key={sensor.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 + index * 0.02 }}
                      className="hover:bg-white/5 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{sensor.sensorId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-slate-300 font-medium">{sensor.zone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">{sensor.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {latestReading?.moisture !== null && latestReading?.moisture !== undefined
                          ? `${latestReading.moisture.toFixed(2)}%`
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {latestReading?.ec !== null && latestReading?.ec !== undefined
                          ? latestReading.ec.toFixed(2)
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {latestReading?.temperature !== null && latestReading?.temperature !== undefined
                          ? `${latestReading.temperature.toFixed(1)}°C`
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {latestReading?.ph !== null && latestReading?.ph !== undefined
                          ? latestReading.ph.toFixed(1)
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-slate-700/50 rounded-full h-2.5 w-24">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${latestTrust && latestTrust.score >= 0.7 ? 'bg-linear-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/50' :
                                latestTrust && latestTrust.score >= 0.4 ? 'bg-linear-to-r from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/50' :
                                  'bg-linear-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/50'
                                }`}
                              style={{ width: `${latestTrust ? latestTrust.score * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-white w-10 text-right">
                            {latestTrust ? latestTrust.score.toFixed(2) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {latestTrust && (
                          <StatusBadge status={latestTrust.status as any} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/sensors/${sensor.id}`}>
                          <button className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30">
                            View
                          </button>
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
