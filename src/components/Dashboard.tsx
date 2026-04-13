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
  Calculator,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = role === 'admin';

  const menuItems = [
    { id: 'product', label: 'Product Info', icon: Box },
    { id: 'socket', label: 'Socket Info', icon: Cpu },
    { id: 'change-kit', label: 'Change Kit', icon: Wrench },
    { id: 'pogo-pin', label: 'Pogo Pin', icon: Database },
    { id: 'life-time', label: 'Life Time', icon: Clock },
    { id: 'load-board', label: 'Load Board', icon: Layers },
    { id: 'required-pogo-pin', label: 'Required Pogo Pin', icon: Calculator },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'data-management', label: 'Data Management', icon: DatabaseBackup });
    menuItems.push({ id: 'users', label: 'User Management', icon: Users });
    menuItems.push({ id: 'audit-logs', label: 'Audit Logs', icon: Clock });
  }

  const handleLogout = () => signOut(auth);

  return (
    <div className="flex h-screen bg-bg-canvas font-sans text-brand-primary overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-200/80 bg-white transition-transform duration-300 md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
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
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 -mr-2 text-zinc-500 hover:bg-zinc-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as Tab);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "sidebar-item-active" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-brand-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", activeTab === item.id ? "text-brand-primary" : "text-zinc-400")} />
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
                <motion.div layoutId="active-pill" className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
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
      <main className="flex-1 overflow-auto relative w-full">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-200 h-20 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors hidden md:block"
            >
              <Layers className="h-5 w-5 text-zinc-500" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors md:hidden"
            >
              <Menu className="h-5 w-5 text-zinc-500" />
            </button>
            <div className="h-6 w-px bg-zinc-200 hidden md:block" />
            <div className="flex flex-col">
              <h1 className="font-serif text-xl md:text-2xl italic tracking-tight text-zinc-900 truncate max-w-[120px] md:max-w-none">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h1>
            </div>
            <div className="h-6 w-px bg-zinc-200 mx-1 md:mx-2" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100 border border-zinc-200/80 px-2 md:px-3 py-1 md:py-1.5 rounded-full truncate max-w-[80px] md:max-w-none">
                <span className="hidden md:inline">Facility: </span>{selectedFacility}
              </span>
              <button 
                onClick={onBackToFacility}
                className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors px-2 md:px-3 py-1 md:py-1.5 bg-white border border-zinc-200 rounded-full shadow-sm hover:bg-zinc-50"
              >
                Change
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-zinc-200 ring-2 ring-white shadow-sm overflow-hidden shrink-0">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl md:rounded-3xl bg-white p-4 md:p-10 card-shadow ring-1 ring-black/5 min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-10rem)]"
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
