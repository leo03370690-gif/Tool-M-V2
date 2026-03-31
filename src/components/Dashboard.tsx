import React, { useState } from 'react';
import { User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Box, 
  Settings, 
  Users, 
  LogOut, 
  ChevronRight,
  Cpu,
  Wrench,
  Clock,
  Database,
  ShieldCheck,
  DatabaseBackup,
  Layers,
  Bell,
  Search as SearchIcon,
  Calculator
} from 'lucide-react';
import ProductInfo from './ProductInfo';
import SocketInfo from './SocketInfo';
import ChangeKitInfo from './ChangeKitInfo';
import PogoPinInfo from './PogoPinInfo';
import LifeTimeInfo from './LifeTimeInfo';
import LoadBoardInfo from './LoadBoardInfo';
import UserManagement from './UserManagement';
import SettingsTab from './Settings';
import DataManagement from './DataManagement';
import AuditLogs from './AuditLogs';
import RequiredPogoPin from './RequiredPogoPin';

interface DashboardProps {
  user: FirebaseUser;
  role: string | null;
  selectedFacility: string;
  onBackToFacility: () => void;
}

type Tab = 'product' | 'socket' | 'change-kit' | 'pogo-pin' | 'life-time' | 'load-board' | 'required-pogo-pin' | 'users' | 'settings' | 'data-management' | 'audit-logs';

export default function Dashboard({ user, role, selectedFacility, onBackToFacility }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('product');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isAdmin = role === 'admin';

  const menuItems = [
    { id: 'product', label: 'Product Info', icon: Box, color: 'text-blue-500' },
    { id: 'socket', label: 'Socket Info', icon: Cpu, color: 'text-purple-500' },
    { id: 'change-kit', label: 'Change Kit', icon: Wrench, color: 'text-orange-500' },
    { id: 'pogo-pin', label: 'Pogo Pin', icon: Database, color: 'text-emerald-500' },
    { id: 'life-time', label: 'Life Time', icon: Clock, color: 'text-rose-500' },
    { id: 'load-board', label: 'Load Board', icon: Layers, color: 'text-indigo-500' },
    { id: 'required-pogo-pin', label: 'Required Pogo Pin', icon: Calculator, color: 'text-teal-500' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-zinc-500' },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'data-management', label: 'Data Management', icon: DatabaseBackup, color: 'text-zinc-500' });
    menuItems.push({ id: 'users', label: 'User Management', icon: Users, color: 'text-zinc-500' });
    menuItems.push({ id: 'audit-logs', label: 'Audit Logs', icon: Clock, color: 'text-zinc-500' });
  }

  const handleLogout = () => signOut(auth);

  return (
    <div className="flex h-screen bg-bg-canvas font-sans text-brand-primary overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="flex flex-col border-r border-zinc-200 bg-white shadow-xl shadow-black/5 z-20"
      >
        <div className="flex h-20 items-center justify-between px-6">
          {isSidebarOpen ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="h-8 w-8 rounded bg-brand-primary flex items-center justify-center">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-serif text-xl font-bold italic tracking-tight">Tooling Matrix</h2>
            </motion.div>
          ) : (
            <div className="mx-auto h-8 w-8 rounded bg-brand-primary flex items-center justify-center">
              <Cpu className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "sidebar-item-active" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-brand-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", activeTab === item.id ? "text-white" : item.color)} />
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-1 text-left"
                >
                  {item.label}
                </motion.span>
              )}
              {isSidebarOpen && activeTab === item.id && (
                <motion.div layoutId="active-pill" className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-4 bg-zinc-50/50">
          <div className="mb-4 flex items-center gap-3 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <Users className="h-5 w-5 text-zinc-500" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-900">{user.email?.split('@')[0]}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">{role || 'User'}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 transition-all hover:bg-red-50",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Top Header */}
        <header className="sticky top-0 z-10 glass h-20 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Layers className="h-5 w-5 text-zinc-500" />
            </button>
            <div className="h-6 w-px bg-zinc-200" />
            <div className="flex flex-col">
              <h1 className="font-serif text-2xl italic tracking-tight text-zinc-900">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h1>
            </div>
            <div className="h-6 w-px bg-zinc-200 mx-2" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
                Facility: {selectedFacility}
              </span>
              <button 
                onClick={onBackToFacility}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors px-3 py-1 bg-white border border-zinc-200 rounded-full shadow-sm"
              >
                Change
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full ring-1 ring-black/5">
              <SearchIcon className="h-4 w-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                className="bg-transparent border-none text-xs focus:ring-0 w-32"
              />
            </div>
            <button className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <Bell className="h-5 w-5 text-zinc-500" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-brand-accent rounded-full ring-2 ring-white" />
            </button>
            <div className="h-10 w-10 rounded-full bg-zinc-200 ring-2 ring-white shadow-sm overflow-hidden">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt="Avatar"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl bg-white p-10 card-shadow ring-1 ring-black/5 min-h-[calc(100vh-10rem)]"
            >
              {activeTab === 'product' && <ProductInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
              {activeTab === 'socket' && <SocketInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
              {activeTab === 'change-kit' && <ChangeKitInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
              {activeTab === 'pogo-pin' && <PogoPinInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
              {activeTab === 'life-time' && <LifeTimeInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
              {activeTab === 'load-board' && <LoadBoardInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
              {activeTab === 'required-pogo-pin' && <RequiredPogoPin selectedFacility={selectedFacility} />}
              {activeTab === 'data-management' && <DataManagement />}
              {activeTab === 'settings' && <SettingsTab />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'audit-logs' && <AuditLogs />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
