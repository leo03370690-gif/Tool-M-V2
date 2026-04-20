import React, { useState, useEffect, useMemo } from 'react';
import { useCollectionCRUD } from '../lib/useCollectionCRUD';
import { Plus, Trash2, Edit2, Check, X, Search, MoreHorizontal, BarChart2, List, Filter, ArrowUpDown, Download, Copy } from 'lucide-react';
import { useExportExcel } from '../lib/useExportExcel';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';
import { useData } from '../contexts/DataContext';
import { useDebounce } from '../lib/useDebounce';
import { useBulkSelect } from '../lib/useBulkSelect';
import BulkActionBar from './ui/BulkActionBar';
import { validateForm } from '../lib/validate';
import { useToast } from '../contexts/ToastContext';
import { useSavedViews } from '../lib/useSavedViews';
import SavedViewsPanel from './ui/SavedViewsPanel';

interface Socket {
  id: string;
  facility: string;
  location: string;
  toolsId: string;
  package: string;
  pinBall: string;
  packageSize: string;
  project: string;
  status: string;
  contactCountPin1: number;
  lifeCountPin1: number;
  contactLimitPin1: number;
  socketGroupPin1: string;
  contactCountOver70Pin1: boolean | string | number;
  pogoPinPnPin1: string;
  socketPnPin1: string;
  usedFlag: string;
  contactCountPin2: number;
  lifeCountPin2: number;
  contactLimitPin2: number;
  contactCountOver70Pin2: boolean | string | number;
  pogoPinPnPin2: string;
  contactCountPcb: number;
  lifeCountPcb: number;
  contactLimitPcb: number;
  contactCountOver70Pcb: boolean | string | number;
  pnPcb: string;
}

const SocketRow = React.memo(({
  socket,
  idx,
  columns,
  isAdmin,
  editingId,
  setEditingId,
  handleUpdate,
  setModal,
  setSaveModal,
  handleDuplicate,
  isSelected,
  onToggle
}: {
  socket: Socket,
  idx: number,
  columns: any[],
  isAdmin: boolean,
  editingId: string | null,
  setEditingId: (id: string | null) => void,
  handleUpdate: (id: string, data: any) => void,
  setModal: (modal: any) => void,
  setSaveModal: (modal: any) => void,
  handleDuplicate: (item: Socket) => void,
  isSelected: boolean,
  onToggle: () => void
}) => {
  const [localData, setLocalData] = useState<Partial<Socket>>(socket);
  
  useEffect(() => {
    if (editingId !== socket.id) {
      setLocalData(socket);
    }
  }, [socket, editingId]);

  const isEditing = editingId === socket.id;

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      key={socket.id}
      className={cn("group hover:bg-zinc-50/80 transition-colors", isSelected && "bg-blue-50/60")}
    >
      {isAdmin && (
        <td className="px-4 py-4 w-10" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
            checked={isSelected}
            onChange={onToggle}
          />
        </td>
      )}
      {columns.map((col, i) => (
        <td key={col.key} className={cn("px-6 py-4 text-zinc-600 whitespace-nowrap", i === 0 && "sticky left-0 bg-white group-hover:bg-zinc-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors")}>
          {isEditing ? (
            <input
              type={typeof socket[col.key as keyof Socket] === 'number' ? 'number' : 'text'}
              value={localData[col.key as keyof Socket] as any || ''}
              onChange={(e) => setLocalData({ ...localData, [col.key]: typeof socket[col.key as keyof Socket] === 'number' ? Number(e.target.value) : e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              autoFocus={col.key === 'toolsId'}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const tr = (e.currentTarget as HTMLElement).closest('tr');
                  if (!tr) return;
                  const inputs = Array.from(tr.querySelectorAll<HTMLInputElement>('input'));
                  const idx = inputs.indexOf(e.currentTarget as HTMLInputElement);
                  const next = inputs[e.shiftKey ? idx - 1 : idx + 1];
                  next?.focus();
                } else if (e.key === 'Escape') {
                  setLocalData(socket);
                  setEditingId(null);
                }
              }}
            />
          ) : (
            <div className="flex items-center gap-3">
              <span className={cn(
                "font-medium",
                col.key === 'toolsId' ? "text-brand-primary font-bold" : "text-zinc-500"
              )}>
                {socket[col.key as keyof Socket]}
              </span>
              {col.key.includes('Count') && columns.find(c => c.key === col.key.replace('Count', 'Limit')) && (
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  (socket[col.key as keyof Socket] as number) / (socket[col.key.replace('Count', 'Limit') as keyof Socket] as number) > 0.7 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-emerald-500"
                )} />
              )}
            </div>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveModal({ isOpen: true, id: socket.id, data: localData })} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /></button>
              <button onClick={() => { setLocalData(socket); setEditingId(null); }} className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingId(socket.id)}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDuplicate(socket)}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-emerald-500 transition-all"
                title="複製"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => setModal({ isOpen: true, id: socket.id })}
                className="p-2 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </td>
      )}
    </motion.tr>
  );
});

export default function SocketInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const { add, update, remove } = useCollectionCRUD<Socket>('sockets');
  const { addToast } = useToast();
  const { exportToExcel } = useExportExcel();
  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected } = useBulkSelect();
  const { views: savedViews, saveView, deleteView } = useSavedViews('socketInfo_savedViews');
  const { sockets: allSockets, loading } = useData();
  
  const sockets = useMemo(() => {
    let data = [...allSockets];
    if (selectedFacility !== 'ALL') {
      data = data.filter(s => (s.facility || '').trim().toUpperCase() === selectedFacility);
    }
    data.sort((a, b) => (a.toolsId || '').localeCompare(b.toolsId || ''));
    return data;
  }, [allSockets, selectedFacility]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSocket, setNewSocket] = useState<Partial<Socket>>({});
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [saveModal, setSaveModal] = useState<{isOpen: boolean, id: string | null, data: any | null}>({ isOpen: false, id: null, data: null });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [filterSocketGroups, setFilterSocketGroups] = usePersistentState<string[]>('socketInfo_filterSocketGroups', []);
  const [filterToolsIds, setFilterToolsIds] = usePersistentState<string[]>('socketInfo_filterToolsIds', []);
  const [filterProjects, setFilterProjects] = usePersistentState<string[]>('socketInfo_filterProjects', []);
  const [filterStatuses, setFilterStatuses] = usePersistentState<string[]>('socketInfo_filterStatuses', []);
  const [filterPogoPinPns, setFilterPogoPinPns] = usePersistentState<string[]>('socketInfo_filterPogoPinPns', []);

  useEffect(() => { clearSelection(); }, [debouncedSearchTerm, filterSocketGroups, filterToolsIds, filterProjects, filterStatuses, filterPogoPinPns, selectedFacility]);
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('socketInfo_visibleColumns', [
    'facility', 'location', 'toolsId', 'package', 'pinBall', 'packageSize', 'project', 'status', 'contactCountPin1', 'lifeCountPin1', 'contactLimitPin1', 'socketGroupPin1', 'pogoPinPnPin1', 'socketPnPin1', 'contactCountOver70Pin1', 'contactCountPin2', 'lifeCountPin2', 'contactLimitPin2', 'pogoPinPnPin2', 'contactCountOver70Pin2', 'contactCountPcb', 'lifeCountPcb', 'contactLimitPcb', 'pnPcb', 'contactCountOver70Pcb', 'usedFlag'
  ]);
  const [displayCount, setDisplayCount] = useState(100);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAdd = async () => {
    const ok = validateForm<Socket>(newSocket, [
      { field: 'facility', label: 'Facility', required: true },
      { field: 'toolsId', label: 'Tools ID', required: true },
    ], addToast);
    if (!ok) return;
    const success = await add({ ...newSocket, facility: selectedFacility === 'ALL' ? (newSocket.facility || '') : selectedFacility });
    if (success) { setNewSocket({}); setEditingId(null); }
  };

  const handleUpdate = async (id: string, data: Partial<Socket>) => {
    const ok = await update(id, data);
    if (ok) setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      const item = sockets.find(s => s.id === modal.id);
      const { id: _id, ...undoData } = (item ?? {}) as any;
      const ok = await remove(modal.id, Object.keys(undoData).length ? undoData : undefined);
      if (ok) setModal({ isOpen: false, id: null });
    }
  };

  const handleDuplicate = async (item: Socket) => {
    const { id: _id, ...data } = item as any;
    const ok = await add(data as Partial<Socket>);
    if (ok) addToast('記錄已複製', 'success');
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => remove(id)));
    clearSelection();
  };

  const getUniqueValues = (key: keyof Socket, currentFilters: any) => {
    const filtered = sockets.filter(s => {
      for (const [filterKey, filterValues] of Object.entries(currentFilters)) {
        if (filterKey === key) continue;
        const values = filterValues as string[];
        if (values.length > 0 && !values.includes(String(s[filterKey as keyof Socket] || ''))) {
          return false;
        }
      }
      return true;
    });
    return Array.from(new Set(filtered.map(s => String(s[key] || '')).filter(Boolean))).sort();
  };

  const currentFilters = {
    socketGroupPin1: filterSocketGroups,
    toolsId: filterToolsIds,
    project: filterProjects,
    status: filterStatuses,
    pogoPinPnPin1: filterPogoPinPns
  };

  const uniqueSocketGroups = React.useMemo(() => getUniqueValues('socketGroupPin1', currentFilters), [sockets, filterToolsIds, filterProjects, filterStatuses, filterPogoPinPns]);
  const uniqueToolsIds = React.useMemo(() => getUniqueValues('toolsId', currentFilters), [sockets, filterSocketGroups, filterProjects, filterStatuses, filterPogoPinPns]);
  const uniqueProjects = React.useMemo(() => getUniqueValues('project', currentFilters), [sockets, filterSocketGroups, filterToolsIds, filterStatuses, filterPogoPinPns]);
  const uniqueStatuses = React.useMemo(() => getUniqueValues('status', currentFilters), [sockets, filterSocketGroups, filterToolsIds, filterProjects, filterPogoPinPns]);
  const uniquePogoPinPns = React.useMemo(() => getUniqueValues('pogoPinPnPin1', currentFilters), [sockets, filterSocketGroups, filterToolsIds, filterProjects, filterStatuses]);

  const stats = React.useMemo(() => {
    return sockets.reduce((acc, socket) => {
      // Only count if Facility equals Location
      const facility = (socket.facility || '').trim().toUpperCase();
      const location = (socket.location || '').trim().toUpperCase();
      
      if (facility !== location || !location) return acc;

      const displayLocation = socket.location || 'Unknown';
      const group = socket.socketGroupPin1 || 'Unknown';
      
      if (!acc[displayLocation]) acc[displayLocation] = {};
      if (!acc[displayLocation][group]) acc[displayLocation][group] = 0;
      acc[displayLocation][group]++;
      
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }, [sockets]);

  const filteredSockets = React.useMemo(() => {
    let result = sockets.filter(s => {
      const matchSearch = (s.toolsId || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (s.project || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchSocketGroup = filterSocketGroups.length === 0 || filterSocketGroups.includes(String(s.socketGroupPin1 || ''));
      const matchToolsId = filterToolsIds.length === 0 || filterToolsIds.includes(String(s.toolsId || ''));
      const matchProject = filterProjects.length === 0 || filterProjects.includes(String(s.project || ''));
      const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(String(s.status || ''));
      const matchPogoPinPn = filterPogoPinPns.length === 0 || filterPogoPinPns.includes(String(s.pogoPinPnPin1 || ''));

      return matchSearch && matchSocketGroup && matchToolsId && matchProject && matchStatus && matchPogoPinPn;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key as keyof Socket] || '');
        const bValue = String(b[sortConfig.key as keyof Socket] || '');
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sockets, debouncedSearchTerm, filterSocketGroups, filterToolsIds, filterProjects, filterStatuses, filterPogoPinPns, sortConfig]);

  const allColumns = [
    { key: 'facility', label: 'Facility' },
    { key: 'location', label: 'Location' },
    { key: 'toolsId', label: 'Tools ID' },
    { key: 'package', label: 'PACKAGE' },
    { key: 'pinBall', label: 'PIN BALL' },
    { key: 'packageSize', label: 'PACKAGE SIZE' },
    { key: 'project', label: 'PROJECT' },
    { key: 'status', label: 'Status' },
    { key: 'contactCountPin1', label: 'Contact Count - Pin1' },
    { key: 'lifeCountPin1', label: 'Life Count - Pin1' },
    { key: 'contactLimitPin1', label: 'Contact Limit - Pin1' },
    { key: 'socketGroupPin1', label: 'Socket group - Pin1' },
    { key: 'pogoPinPnPin1', label: 'Pogo pin P/N - Pin1' },
    { key: 'socketPnPin1', label: 'Socket P/N - Pin1' },
    { key: 'contactCountOver70Pin1', label: 'Contact count over 70% - Pin1' },
    { key: 'contactCountPin2', label: 'Contact Count - Pin2' },
    { key: 'lifeCountPin2', label: 'Life Count - Pin2' },
    { key: 'contactLimitPin2', label: 'Contact Limit - Pin2' },
    { key: 'pogoPinPnPin2', label: 'Pogo pin P/N - Pin2' },
    { key: 'contactCountOver70Pin2', label: 'Contact count over 70% - Pin2' },
    { key: 'contactCountPcb', label: 'Contact Count - PCB' },
    { key: 'lifeCountPcb', label: 'Life Count - PCB' },
    { key: 'contactLimitPcb', label: 'Contact Limit - PCB' },
    { key: 'pnPcb', label: 'P/N - PCB' },
    { key: 'contactCountOver70Pcb', label: 'Contact count over 70% - PCB' },
    { key: 'usedFlag', label: 'Used Flag' },
  ];

  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">Socket Inventory</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Monitor socket health and usage</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-50/50 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <List className="h-3.5 w-3.5" />
              LIST
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === 'stats' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              STATS
            </button>
          </div>
          <button
            onClick={() => exportToExcel(filteredSockets, columns, 'sockets')}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>匯出 Excel</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setEditingId('new')}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>ADD SOCKET</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between surface-card p-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full lg:w-auto pb-2 lg:pb-0">
          <div className="flex items-center gap-1.5 px-2">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <button
              onClick={() => {
                setFilterSocketGroups([]);
                setFilterToolsIds([]);
                setFilterProjects([]);
                setFilterStatuses([]);
                setFilterPogoPinPns([]);
              }}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap"
            >
              Clear
            </button>
            <SavedViewsPanel
              views={savedViews}
              onSave={(name) => saveView(name, { filterSocketGroups, filterToolsIds, filterProjects, filterStatuses, filterPogoPinPns })}
              onApply={(filters) => {
                const f = filters as any;
                setFilterSocketGroups(f.filterSocketGroups ?? []);
                setFilterToolsIds(f.filterToolsIds ?? []);
                setFilterProjects(f.filterProjects ?? []);
                setFilterStatuses(f.filterStatuses ?? []);
                setFilterPogoPinPns(f.filterPogoPinPns ?? []);
              }}
              onDelete={deleteView}
            />
          </div>
          <div className="w-px h-4 bg-zinc-200 shrink-0"></div>
          <div className="flex flex-wrap items-center gap-2 px-1">
            <MultiSelectDropdown
              values={filterSocketGroups}
              onChange={setFilterSocketGroups}
              options={uniqueSocketGroups}
              placeholder="Socket Groups"
            />
            <MultiSelectDropdown
              values={filterToolsIds}
              onChange={setFilterToolsIds}
              options={uniqueToolsIds}
              placeholder="Tools IDs"
            />
            <MultiSelectDropdown
              values={filterProjects}
              onChange={setFilterProjects}
              options={uniqueProjects}
              placeholder="Projects"
            />
            <MultiSelectDropdown
              values={filterStatuses}
              onChange={setFilterStatuses}
              options={uniqueStatuses}
              placeholder="Statuses"
            />
            <MultiSelectDropdown
              values={filterPogoPinPns}
              onChange={setFilterPogoPinPns}
              options={uniquePogoPinPns}
              placeholder="Pogo Pin P/Ns"
            />
            <div className="w-px h-4 bg-zinc-200 shrink-0 mx-1"></div>
            <MultiSelectDropdown
              values={allColumns.filter(c => visibleColumns.includes(c.key)).map(c => c.label)}
              onChange={(labels) => {
                const newVisible = allColumns.filter(c => labels.includes(c.label)).map(c => c.key);
                setVisibleColumns(newVisible);
              }}
              options={allColumns.map(c => c.label)}
              placeholder="Columns"
            />
          </div>
        </div>
        
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search sockets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="relative overflow-hidden surface-card"
          >
            <DoubleScrollbar>
              <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                {isAdmin && (
                  <th className="px-4 py-4 border-b border-zinc-100 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                      checked={isAllSelected(filteredSockets.slice(0, displayCount).map(x => x.id))}
                      onChange={() => toggleAll(filteredSockets.slice(0, displayCount).map(x => x.id))}
                    />
                  </th>
                )}
                {columns.map((col, i) => (
                  <th
                    key={col.key}
                    className={cn("px-0 py-0 border-b border-zinc-100", i === 0 && "sticky left-0 bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]")}
                  >
                    <div className="px-6 py-4 flex items-center cursor-pointer hover:bg-zinc-100/50 transition-colors" onClick={() => handleSort(col.key)}>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 font-sans whitespace-nowrap">
                        {col.label}
                      </span>
                      <ArrowUpDown className={cn("ml-2 h-3 w-3 shrink-0", sortConfig?.key === col.key ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                ))}
                {isAdmin && <th className="px-6 py-4 border-b border-zinc-100 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 font-sans">Actions</span>
                </th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence mode="popLayout">
                {editingId === 'new' && (
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-zinc-50/30"
                  >
                    {isAdmin && <td className="px-4 py-3 w-10" />}
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-3">
                        <input
                          type="text"
                          autoFocus={col.key === 'facility'}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                          onChange={(e) => setNewSocket({ ...newSocket, [col.key]: e.target.value })}
                        />
                      </td>
                    ))}
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={handleAdd} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                )}
                {filteredSockets.slice(0, displayCount).map((socket, idx) => (
                  <SocketRow
                    key={socket.id}
                    socket={socket}
                    idx={idx}
                    columns={columns}
                    isAdmin={isAdmin}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    handleUpdate={handleUpdate}
                    setModal={setModal}
                    setSaveModal={setSaveModal}
                    handleDuplicate={handleDuplicate}
                    isSelected={selectedIds.has(socket.id)}
                    onToggle={() => toggleOne(socket.id)}
                  />
                ))}
              </AnimatePresence>
              {filteredSockets.length > displayCount && (
                <tr>
                  <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                    Showing {displayCount} of {filteredSockets.length} sockets. Use filters to narrow down results, or <button onClick={() => setDisplayCount(prev => prev + 200)} className="text-brand-primary hover:underline font-medium not-italic">load 200 more</button>.
                  </td>
                </tr>
              )}
              {displayCount > 100 && filteredSockets.length <= displayCount && (
                <tr>
                  <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                    Showing all {filteredSockets.length} sockets. <button onClick={() => setDisplayCount(100)} className="text-brand-primary hover:underline font-medium not-italic">Show less</button>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DoubleScrollbar>
      </motion.div>
        ) : (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-8">
              {Object.entries(stats).map(([location, groups], idx) => {
                const total = Object.values(groups).reduce((a, b) => a + b, 0);
                const max = Math.max(...Object.values(groups));
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    key={location} 
                    className="rounded-3xl border border-zinc-100 bg-white card-shadow overflow-hidden flex flex-col"
                  >
                    <div className="bg-zinc-50/50 px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                      <h3 className="font-serif italic text-2xl text-zinc-900">{location}</h3>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Sockets</span>
                        <span className="text-xl font-bold text-brand-primary">{total}</span>
                      </div>
                    </div>
                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6 flex-1">
                        {Object.entries(groups)
                          .sort((a, b) => b[1] - a[1])
                          .map(([group, count]) => (
                          <div key={group} className="space-y-2 group">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors break-words">{group}</span>
                              <span className="text-sm font-bold text-zinc-900 shrink-0 mt-0.5">{count}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / max) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 + 0.2 }}
                                className="h-full bg-brand-primary rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {Object.keys(stats).length === 0 && (
              <div className="py-12 text-center text-zinc-500 bg-white rounded-3xl border border-zinc-100 border-dashed">
                No statistics available (Facility must equal Location).
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BulkActionBar count={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Confirm Deletion</h3>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-zinc-600">
                Are you sure you want to delete this socket record? This action cannot be undone and will be permanently removed from the system.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModal({ isOpen: false, id: null })}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-lg shadow-red-600/20"
                >
                  Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Confirmation Modal */}
      <AnimatePresence>
        {saveModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Save Changes</h3>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-zinc-600">
                Are you sure you want to save these changes to the database?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSaveModal({ isOpen: false, id: null, data: null })}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (saveModal.id && saveModal.data) {
                      handleUpdate(saveModal.id, saveModal.data);
                      setSaveModal({ isOpen: false, id: null, data: null });
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
