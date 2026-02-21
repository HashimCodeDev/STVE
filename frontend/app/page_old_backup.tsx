'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
          <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
          Loading dashboard...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent mb-3">
            Sensor Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="text-sm text-slate-400">Real-time monitoring active</span>
            </div>
            <div className="text-xs text-slate-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
            className="lg:col-span-2 glass p-6 rounded-2xl border border-white/10 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Trust Score Distribution</h3>
                <p className="text-sm text-slate-400 mt-1">Sensor health breakdown</p>
              </div>
              <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <span className="text-xs font-semibold text-emerald-400">Live</span>
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
                    color: '#fff'
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
          className="glass p-6 rounded-2xl border border-white/10 mb-8"
        >
          <h3 className="text-xl font-bold text-white mb-4">Zone Health Map</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(zoneData).map(([zone, data], index) => {
              const healthPercent = (data.healthy / data.total) * 100;
              const getColor = () => {
                if (healthPercent >= 80) return 'from-emerald-500/20 to-green-600/20 border-emerald-500/30';
                if (healthPercent >= 50) return 'from-amber-500/20 to-yellow-600/20 border-amber-500/30';
                return 'from-red-500/20 to-rose-600/20 border-red-500/30';
              };

              return (
                <motion.div
                  key={zone}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className={`p-4 rounded-xl bg-linear-to-br ${getColor()} border backdrop-blur-sm hover:scale-105 transition-transform duration-200 cursor-pointer`}
                >
                  <div className="text-sm font-semibold text-slate-300 mb-2">{zone}</div>
                  <div className="text-2xl font-bold text-white mb-1">{data.total}</div>
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-emerald-400">{data.healthy}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-amber-400">{data.warning}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-red-400">{data.anomalous}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Sensors Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="glass rounded-2xl border border-white/10 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">All Sensors</h3>
                <p className="text-sm text-slate-400 mt-1">Real-time sensor data and status</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Auto-refresh: 10s</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5 sticky top-0">
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
                      className="hover:bg-white/5 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-semibold text-white">{sensor.sensorId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-slate-300">{sensor.zone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{sensor.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {latestReading?.moisture !== null && latestReading?.moisture !== undefined
                          ? `${latestReading.moisture.toFixed(2)}%`
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {latestReading?.ec !== null && latestReading?.ec !== undefined
                          ? latestReading.ec.toFixed(2)
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {latestReading?.temperature !== null && latestReading?.temperature !== undefined
                          ? `${latestReading.temperature.toFixed(1)}°C`
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {latestReading?.ph !== null && latestReading?.ph !== undefined
                          ? latestReading.ph.toFixed(1)
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-700/50 rounded-full h-2 w-20">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${latestTrust && latestTrust.score >= 70 ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                                latestTrust && latestTrust.score >= 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
                                  'bg-gradient-to-r from-red-500 to-rose-600'
                                }`}
                              style={{ width: `${latestTrust ? latestTrust.score : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-white w-10">
                            {latestTrust ? latestTrust.score.toFixed(0) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {latestTrust && (
                          <StatusBadge status={latestTrust.status as any} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105">
                          View
                        </button>
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
