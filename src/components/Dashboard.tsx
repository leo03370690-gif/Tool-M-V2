import React, { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import ErrorBoundary from './ErrorBoundary';
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
  History,
  Bell,
  Search as SearchIcon,
  Calculator,
  Menu,
  X,
  Loader2,
  ArrowLeft,
  BarChart2,
  GripVertical
} from 'lucide-react';

const ProductInfo = lazy(() => import('./ProductInfo'));
const SocketInfo = lazy(() => import('./SocketInfo'));
const ChangeKitInfo = lazy(() => import('./ChangeKitInfo'));
const PogoPinInfo = lazy(() => import('./PogoPinInfo'));
const LifeTimeInfo = lazy(() => import('./LifeTimeInfo'));
const LoadBoardInfo = lazy(() => import('./LoadBoardInfo'));
const UserManagement = lazy(() => import('./UserManagement'));
const SettingsTab = lazy(() => import('./Settings'));
const DataManagement = lazy(() => import('./DataManagement'));
const AuditLogs = lazy(() => import('./AuditLogs'));
const RequiredPogoPin = lazy(() => import('./RequiredPogoPin'));
const MaintenanceRecord = lazy(() => import('./MaintenanceRecord'));
const MaintenanceHistory = lazy(() => import('./MaintenanceHistory'));
const LoadBoardHistory = lazy(() => import('./LoadBoardHistory'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
const CommandPalette = lazy(() => import('./CommandPalette'));

interface DashboardProps {
  user: FirebaseUser;
  role: string | null;
  selectedFacility: string;
  onBackToFacility: () => void;
}

type Tab = 'product' | 'socket' | 'change-kit' | 'pogo-pin' | 'life-time' | 'load-board' | 'required-pogo-pin' | 'users' | 'settings' | 'data-management' | 'audit-logs' | 'maintenance-history' | 'maintenance-record' | 'lb-history' | 'analytics';

export default function Dashboard({ user, role, selectedFacility, onBackToFacility }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('product');
  const [tabHistory, setTabHistory] = useState<Tab[]>([]);
  const [maintenanceInitialData, setMaintenanceInitialData] = useState<any>(null);
  const [selectedLBNo, setSelectedLBNo] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const isAdmin = role === 'admin';

  const handleNavigate = (tab: Tab) => {
    setTabHistory(prev => [...prev, activeTab]);
    setActiveTab(tab);
  };

  const allMenuItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'product', label: 'Product Info', icon: Box },
    { id: 'socket', label: 'Socket Info', icon: Cpu },
    { id: 'change-kit', label: 'Change Kit', icon: Wrench },
    { id: 'pogo-pin', label: 'Pogo Pin', icon: Database },
    { id: 'life-time', label: 'Life Time', icon: Clock },
    { id: 'load-board', label: 'Load Board', icon: Layers },
    { id: 'maintenance-history', label: 'Maintenance History', icon: History },
    { id: 'required-pogo-pin', label: 'Required Pogo Pin', icon: Calculator },
    { id: 'settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [
      { id: 'data-management', label: 'Data Management', icon: DatabaseBackup },
      { id: 'users', label: 'User Management', icon: Users },
      { id: 'audit-logs', label: 'Audit Logs', icon: Clock },
    ] : []),
  ];

  const [menuOrder, setMenuOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dashboard_menu_order');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (menuOrder.length > 0) {
      localStorage.setItem('dashboard_menu_order', JSON.stringify(menuOrder));
    }
  }, [menuOrder]);

  const menuItems = menuOrder.length > 0
    ? [...allMenuItems].sort((a, b) => {
        const ai = menuOrder.indexOf(a.id);
        const bi = menuOrder.indexOf(b.id);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : allMenuItems;

  const dragIndex = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex.current === null || dragIndex.current === index) return;
    const newItems = [...menuItems];
    const [dragged] = newItems.splice(dragIndex.current, 1);
    newItems.splice(index, 0, dragged);
    dragIndex.current = index;
    setMenuOrder(newItems.map(i => i.id));
  };

  const handleDragEnd = () => { dragIndex.current = null; };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    dragIndex.current = index;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIndex.current === null) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const button = target?.closest('button[data-index]');
    
    if (button) {
      const index = parseInt(button.getAttribute('data-index') || '-1', 10);
      if (index >= 0 && dragIndex.current !== index) {
        const newItems = [...menuItems];
        const [dragged] = newItems.splice(dragIndex.current, 1);
        newItems.splice(index, 0, dragged);
        dragIndex.current = index;
        setMenuOrder(newItems.map(i => i.id));
      }
    }
  };

  const handleTouchEnd = () => { dragIndex.current = null; };

  const handleLogout = () => signOut(auth);

  const { products, sockets, changeKits, pogoPins, lifeTimes, loadBoards } = useData();

  const paletteCommands = useMemo(() => {
    const pageCommands = menuItems.map(item => ({
      id: item.id,
      label: item.label,
      group: 'page' as const,
      icon: <item.icon className="h-4 w-4" />,
      action: () => handleNavigate(item.id as Tab),
    }));

    const dataCommands = [
      ...products.map(p => ({
        id: `product-${p.id}`,
        label: String(p.device || p.id || ''),
        description: [p.projectName, p.facility].filter(Boolean).join(' · '),
        group: 'data' as const,
        action: () => handleNavigate('product'),
      })),
      ...sockets.map(s => ({
        id: `socket-${s.id}`,
        label: String(s.toolsId || s.id || ''),
        description: [s.package, s.facility].filter(Boolean).join(' · '),
        group: 'data' as const,
        action: () => handleNavigate('socket'),
      })),
      ...changeKits.map(c => ({
        id: `changekit-${c.id}`,
        label: String(c.toolsId || c.id || ''),
        description: [c.kind, c.facility].filter(Boolean).join(' · '),
        group: 'data' as const,
        action: () => handleNavigate('change-kit'),
      })),
      ...pogoPins.map(p => ({
        id: `pogopin-${p.id}`,
        label: String(p.pinPn || p.id || ''),
        description: p.facility,
        group: 'data' as const,
        action: () => handleNavigate('pogo-pin'),
      })),
      ...lifeTimes.map(l => ({
        id: `lifetime-${l.id}`,
        label: String(l.socketGroup || l.id || ''),
        description: [l.loadBoardGroup, l.facility].filter(Boolean).join(' · '),
        group: 'data' as const,
        action: () => handleNavigate('life-time'),
      })),
      ...loadBoards.map(lb => ({
        id: `loadboard-${lb.id}`,
        label: String(lb.lbName || lb.id || ''),
        description: [lb.projectName, lb.facility].filter(Boolean).join(' · '),
        group: 'data' as const,
        action: () => handleNavigate('load-board'),
      })),
    ];

    return [...pageCommands, ...dataCommands];
  }, [menuItems, products, sockets, changeKits, pogoPins, lifeTimes, loadBoards]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex h-screen bg-bg-canvas font-sans text-brand-primary overflow-hidden">
      <Suspense fallback={null}>
        <CommandPalette
          commands={paletteCommands}
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
        />
      </Suspense>
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
        style={{ backgroundColor: 'var(--sb-bg)', borderColor: 'var(--sb-border)' }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-300 md:relative md:translate-x-0",
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
              <div className="h-8 w-8 rounded bg-brand-primary flex items-center justify-center shrink-0">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-serif text-xl font-bold italic tracking-tight" style={{ color: 'var(--sb-title)' }}>Tooling Matrix</h2>
            </motion.div>
          ) : (
            <div className="mx-auto h-8 w-8 rounded bg-brand-primary flex items-center justify-center">
              <Cpu className="h-5 w-5 text-white" />
            </div>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 -mr-2 rounded-lg transition-colors"
            style={{ color: 'var(--sb-text)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {menuItems.map((item, idx) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                data-index={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  setActiveTab(item.id as Tab);
                  setTabHistory([]);
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  backgroundColor: isActive ? 'var(--sb-active)' : undefined,
                  color: isActive ? 'var(--sb-text-active)' : 'var(--sb-text)',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--sb-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sb-text-active)'; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sb-text)'; } }}
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors select-none"
              >
                {isSidebarOpen && (
                  <div
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      handleTouchStart(e, idx);
                    }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="touch-none flex items-center justify-center shrink-0 cursor-grab"
                  >
                    <GripVertical className="h-3.5 w-3.5 opacity-40 md:opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--sb-grip)' }} />
                  </div>
                )}
                <item.icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" style={{ color: isActive ? 'var(--sb-icon-active)' : 'var(--sb-icon)' }} />
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isSidebarOpen && isActive && (
                  <motion.div layoutId="active-pill" className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t p-4" style={{ borderColor: 'var(--sb-section-border)', backgroundColor: 'var(--sb-section-bg)' }}>
          <div className="mb-4 flex items-center gap-3 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/10" style={{ backgroundColor: 'var(--sb-hover)' }}>
              <Users className="h-5 w-5" style={{ color: 'var(--sb-icon)' }} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xs font-bold" style={{ color: 'var(--sb-title)' }}>{user.email?.split('@')[0]}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--sb-text)' }}>{role || 'User'}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{ color: 'var(--sb-logout)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--sb-logout-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
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
              <h1 className="flex items-center gap-2 font-serif text-xl md:text-2xl italic tracking-tight text-zinc-900 truncate max-w-[120px] md:max-w-none">
                {tabHistory.length > 0 && (
                  <button 
                    onClick={() => {
                      const newHistory = [...tabHistory];
                      const prevTab = newHistory.pop();
                      if (prevTab) {
                        setActiveTab(prevTab);
                        setTabHistory(newHistory);
                      }
                    }}
                    className="flex items-center justify-center p-1 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 hover:text-zinc-900"
                    title="Go Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
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
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors text-xs"
              title="快速搜尋 (Ctrl+K)"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">搜尋功能</span>
              <kbd className="hidden lg:inline text-[10px] border border-zinc-300 rounded px-1">Ctrl+K</kbd>
            </button>
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
              <ErrorBoundary>
              <Suspense fallback={
                <div className="flex h-full items-center justify-center min-h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                </div>
              }>
                {activeTab === 'analytics' && <AnalyticsDashboard />}
                {activeTab === 'product' && <ProductInfo isAdmin={isAdmin} selectedFacility={selectedFacility} onNavigate={(tab) => handleNavigate(tab as Tab)} />}
                {activeTab === 'socket' && <SocketInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
                {activeTab === 'change-kit' && <ChangeKitInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
                {activeTab === 'pogo-pin' && <PogoPinInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
                {activeTab === 'life-time' && <LifeTimeInfo isAdmin={isAdmin} selectedFacility={selectedFacility} />}
                {activeTab === 'load-board' && (
                  <LoadBoardInfo 
                    isAdmin={isAdmin} 
                    selectedFacility={selectedFacility} 
                    onAddMaintenanceRecord={(data) => {
                      setMaintenanceInitialData(data);
                      handleNavigate('maintenance-record');
                    }}
                    onViewHistory={(lbNo) => {
                      setSelectedLBNo(lbNo);
                      handleNavigate('lb-history');
                    }}
                  />
                )}
                {activeTab === 'required-pogo-pin' && <RequiredPogoPin selectedFacility={selectedFacility} isAdmin={isAdmin} />}
                {activeTab === 'maintenance-history' && (
                  <MaintenanceHistory 
                    isAdmin={isAdmin} 
                    selectedFacility={selectedFacility}
                    onAddMaintenanceRecord={() => {
                      setMaintenanceInitialData(null);
                      handleNavigate('maintenance-record');
                    }}
                    onLBClick={(lbNo) => {
                      setSelectedLBNo(lbNo);
                      handleNavigate('lb-history');
                    }}
                  />
                )}
                {activeTab === 'lb-history' && selectedLBNo && (
                   <LoadBoardHistory 
                     lbNo={selectedLBNo}
                     onBack={() => {
                       const newHistory = [...tabHistory];
                       const prevTab = newHistory.pop();
                       if (prevTab) {
                         setActiveTab(prevTab);
                         setTabHistory(newHistory);
                       } else {
                         setActiveTab('maintenance-history');
                       }
                     }}
                   />
                )}
                {activeTab === 'maintenance-record' && (
                  <MaintenanceRecord 
                    initialData={maintenanceInitialData} 
                    userEmail={user.email || ''} 
                    onCancel={() => {
                      const newHistory = [...tabHistory];
                      const prevTab = newHistory.pop();
                      if (prevTab) {
                        setActiveTab(prevTab);
                        setTabHistory(newHistory);
                      } else {
                        setActiveTab('load-board');
                      }
                    }}
                    onSuccess={() => {
                      const newHistory = [...tabHistory];
                      const prevTab = newHistory.pop();
                      if (prevTab) {
                        setActiveTab(prevTab);
                        setTabHistory(newHistory);
                      } else {
                        setActiveTab('load-board');
                      }
                    }}
                  />
                )}
                {activeTab === 'data-management' && <DataManagement />}
                {activeTab === 'settings' && <SettingsTab />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'audit-logs' && <AuditLogs />}
              </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
