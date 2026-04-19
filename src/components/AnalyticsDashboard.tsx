import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, TrendingUp, Search, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

// Helper to get ISO Week string like '2026-W15'
function getYearAndWeek(dateStr: string) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  // Format MM to 2 digits just for display consistency 
  return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Helper to get Month string like '2026-04'
function getYearAndMonth(dateStr: string) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
}

export default function AnalyticsDashboard() {
  const { maintenanceRecords, loading } = useData();
  const [timeUnit, setTimeUnit] = useState<'monthly' | 'weekly'>('monthly');
  const [selectedLB, setSelectedLB] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique LB numbers for filter
  const uniqueLBs = useMemo(() => {
    const set = new Set<string>();
    maintenanceRecords.forEach(r => {
      if (r.lbNo) set.add(r.lbNo);
    });
    return Array.from(set).sort();
  }, [maintenanceRecords]);

  // Filter and Aggregate Data
  const chartData = useMemo(() => {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return [];

    const filtered = maintenanceRecords.filter(r => {
      // Apply LB Filter
      if (selectedLB !== 'all' && r.lbNo !== selectedLB) return false;
      return true;
    });

    const grouped: Record<string, number> = {};

    filtered.forEach(r => {
      if (!r.issueDate) return;
      const key = timeUnit === 'monthly' ? getYearAndMonth(r.issueDate) : getYearAndWeek(r.issueDate);
      if (key !== 'Unknown') {
        grouped[key] = (grouped[key] || 0) + 1;
      }
    });

    // Convert to array and sort by time
    const result = Object.entries(grouped)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return result;
  }, [maintenanceRecords, timeUnit, selectedLB]);

  // Filter dropdown logic with search
  const displayedLBs = uniqueLBs.filter(lb => lb.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">Analytics Dashboard</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Failure Trends and Performance</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="surface-card p-4 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center bg-zinc-100/50 p-1 rounded-xl">
          <button
            onClick={() => setTimeUnit('monthly')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", timeUnit === 'monthly' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeUnit('weekly')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", timeUnit === 'weekly' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            Weekly
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="space-y-1.5 w-full sm:w-64">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filter by Load Board</label>
            <select
              value={selectedLB}
              onChange={(e) => setSelectedLB(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
            >
              <option value="all">Global (All Load Boards)</option>
              {uniqueLBs.map(lb => (
                <option key={lb} value={lb}>{lb}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="h-5 w-5 text-brand-primary" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">
              {timeUnit === 'monthly' ? 'Monthly' : 'Weekly'} Failure Trend {selectedLB !== 'all' ? `- ${selectedLB}` : '(All Load Boards)'}
            </h3>
          </div>
          
          {chartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center flex-col gap-3 text-zinc-400">
              <Calendar className="h-8 w-8 opacity-20" />
              <p className="text-sm">No maintenance records found for the selected criteria.</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#71717a' }}
                    dy={10}
                  />
                  <YAxis 
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#71717a' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#18181b', marginBottom: '8px' }}
                    itemStyle={{ color: '#09090b', fontWeight: 500 }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Repair Cases" 
                    fill="#18181b" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
