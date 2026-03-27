import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Box, 
  Cpu, 
  Wrench, 
  ShieldCheck, 
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change: string;
  icon: any;
  color: string;
  delay: number;
}

function StatCard({ label, value, change, icon: Icon, color, delay }: any) {
  const isPositive = change.startsWith('+');
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="p-6 rounded-2xl bg-zinc-50/50 border border-zinc-100 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      </div>
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-serif italic font-bold mt-1 text-zinc-900">{value}</p>
    </motion.div>
  );
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  userEmail: string;
  timestamp: any;
}

export default function Overview() {
  const [stats, setStats] = useState({
    products: 0,
    sockets: 0,
    changeKits: 0,
    health: 98.2
  });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    // Real-time counts
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setStats(prev => ({ ...prev, products: snapshot.size }));
    });

    const unsubSockets = onSnapshot(collection(db, 'sockets'), (snapshot) => {
      setStats(prev => ({ ...prev, sockets: snapshot.size }));
    });

    const unsubKits = onSnapshot(collection(db, 'changeKits'), (snapshot) => {
      setStats(prev => ({ ...prev, changeKits: snapshot.size }));
    });

    // Recent Activity
    const qLogs = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(5));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      setRecentLogs(logs);
    });

    return () => {
      unsubProducts();
      unsubSockets();
      unsubKits();
      unsubLogs();
    };
  }, []);

  const statItems = [
    { label: 'Total Products', value: stats.products.toLocaleString(), change: '+12%', icon: Box, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Sockets', value: stats.sockets.toLocaleString(), change: '+5%', icon: Cpu, color: 'bg-purple-50 text-purple-600' },
    { label: 'Change Kits', value: stats.changeKits.toLocaleString(), change: '-2%', icon: Wrench, color: 'bg-orange-50 text-orange-600' },
    { label: 'System Health', value: `${stats.health}%`, change: '+0.4%', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-12">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statItems.map((stat, i) => (
          <StatCard 
            key={stat.label} 
            label={stat.label}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
            delay={i * 0.1} 
          />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl italic text-zinc-900">Recent Activity</h3>
            <div className="h-px flex-1 bg-zinc-100 mx-6" />
          </div>
          <div className="space-y-4">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={log.id} 
                  className="flex items-center gap-4 p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all group"
                >
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-colors">
                    <Clock className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-900">{log.action}</p>
                    <p className="text-xs text-zinc-500">{log.details}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </p>
                    <p className="text-[9px] text-zinc-400 font-medium">{log.userEmail.split('@')[0]}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                <p className="text-sm text-zinc-400 font-medium">No recent activity found</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl italic text-zinc-900">System Status</h3>
            <div className="h-px flex-1 bg-zinc-100 mx-6" />
          </div>
          <div className="p-8 rounded-3xl bg-zinc-900 text-white relative overflow-hidden shadow-2xl shadow-black/20">
            <div className="relative z-10">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Real-time Performance</p>
              <h4 className="text-4xl font-serif italic mb-8">Optimized</h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>Database Load</span>
                    <span className="text-white">85%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Uptime</p>
                    <p className="text-xl font-serif italic">99.9%</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Latency</p>
                    <p className="text-xl font-serif italic">24ms</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <ShieldCheck className="h-48 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
