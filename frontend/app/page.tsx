'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10s
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'Warning': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'Anomalous': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const chartData = summary ? [
    { name: 'Healthy', count: summary.sensors.healthy, fill: '#10b981' },
    { name: 'Warning', count: summary.sensors.warning, fill: '#f59e0b' },
    { name: 'Anomalous', count: summary.sensors.anomalous, fill: '#ef4444' },
  ] : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-slate-700 animate-pulse-slow">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent mb-2">
            Sensor Dashboard
          </h1>
          <p className="text-slate-600 flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Real-time monitoring active</span>
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-hover bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200 animate-slideInRight" style={{ animationDelay: '0s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Sensors</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-800">{summary?.sensors.total || 0}</p>
            <p className="text-xs text-slate-500 mt-2">Active monitoring</p>
          </div>

          <div className="card-hover bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl shadow-lg border border-emerald-200 animate-slideInRight" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Healthy</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-emerald-700">{summary?.sensors.healthy || 0}</p>
            <p className="text-xs text-emerald-600 mt-2">Operating normally</p>
          </div>

          <div className="card-hover bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-2xl shadow-lg border border-amber-200 animate-slideInRight" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Warning</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-amber-700">{summary?.sensors.warning || 0}</p>
            <p className="text-xs text-amber-600 mt-2">Needs attention</p>
          </div>

          <div className="card-hover bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-2xl shadow-lg border border-red-200 animate-slideInRight" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Anomalous</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-red-700">{summary?.sensors.anomalous || 0}</p>
            <p className="text-xs text-red-600 mt-2">Critical issues</p>
          </div>
        </div>

        {/* Trust Score Distribution Chart */}
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Trust Score Distribution</h2>
              <p className="text-sm text-slate-600 mt-1">Overview of sensor health status</p>
            </div>
            <div className="px-4 py-2 bg-emerald-100 rounded-lg">
              <span className="text-xs font-semibold text-emerald-700">Live Data</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '14px', fontWeight: 500 }} />
              <YAxis stroke="#64748b" style={{ fontSize: '14px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px', fontWeight: 500 }} />
              <Bar dataKey="count" fill="#8884d8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sensors Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
          <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">All Sensors</h2>
                <p className="text-sm text-slate-600 mt-1">Detailed sensor readings and status</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Auto-refresh: 10s</span>
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
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Soil Moisture
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    EC
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Soil Temp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    pH
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Trust Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {sensors.map((sensor) => {
                  const latestTrust = sensor.trustScores[0];
                  const latestReading = sensor.readings[0];
                  return (
                    <tr key={sensor.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {sensor.sensorId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{sensor.zone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {sensor.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                        {latestReading?.moisture !== null && latestReading?.moisture !== undefined
                          ? `${latestReading.moisture.toFixed(2)}%`
                          : <span className="text-slate-400">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                        {latestReading?.ec !== null && latestReading?.ec !== undefined
                          ? latestReading.ec.toFixed(2)
                          : <span className="text-slate-400">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                        {latestReading?.temperature !== null && latestReading?.temperature !== undefined
                          ? `${latestReading.temperature.toFixed(2)}°C`
                          : <span className="text-slate-400">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                        {latestReading?.temperature !== null && latestReading?.temperature !== undefined
                          ? `${latestReading.temperature.toFixed(2)}°C`
                          : <span className="text-slate-400">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                        {latestReading?.ph !== null && latestReading?.ph !== undefined
                          ? latestReading.ph.toFixed(1)
                          : <span className="text-slate-400">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[80px]">
                            <div
                              className={`h-2 rounded-full ${latestTrust && latestTrust.score >= 70 ? 'bg-emerald-500' :
                                  latestTrust && latestTrust.score >= 40 ? 'bg-amber-500' :
                                    'bg-red-500'
                                }`}
                              style={{ width: `${latestTrust ? latestTrust.score : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 min-w-[40px]">
                            {latestTrust ? latestTrust.score.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {latestTrust && (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(latestTrust.status)}`}>
                            <span className={`w-2 h-2 mr-2 rounded-full ${latestTrust.status === 'Healthy' ? 'bg-emerald-500' :
                                latestTrust.status === 'Warning' ? 'bg-amber-500' :
                                  'bg-red-500'
                              }`}></span>
                            {latestTrust.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
