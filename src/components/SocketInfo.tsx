import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Search, MoreHorizontal, BarChart2, List, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';

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
  setModal 
}: { 
  socket: Socket, 
  idx: number, 
  columns: any[], 
  isAdmin: boolean, 
  editingId: string | null, 
  setEditingId: (id: string | null) => void, 
  handleUpdate: (id: string, data: any) => void, 
  setModal: (modal: any) => void 
}) => {
  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      key={socket.id} 
      className="group hover:bg-zinc-50/80 transition-colors"
    >
      {columns.map((col, i) => (
        <td key={col.key} className={cn("px-6 py-4 text-zinc-600 whitespace-nowrap", i === 0 && "sticky left-0 bg-white group-hover:bg-zinc-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors")}>
          {editingId === socket.id ? (
            <input
              type={typeof socket[col.key as keyof Socket] === 'number' ? 'number' : 'text'}
              defaultValue={socket[col.key as keyof Socket] as any}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              onBlur={(e) => handleUpdate(socket.id, { [col.key]: typeof socket[col.key as keyof Socket] === 'number' ? Number(e.target.value) : e.target.value })}
              autoFocus={col.key === 'toolsId'}
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
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setEditingId(socket.id)} 
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setModal({ isOpen: true, id: socket.id })} 
              className="p-2 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      )}
    </motion.tr>
  );
});

export default function SocketInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const [sockets, setSockets] = useState<Socket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');

  const [filterSocketGroups, setFilterSocketGroups] = usePersistentState<string[]>('socketInfo_filterSocketGroups', []);
  const [filterToolsIds, setFilterToolsIds] = usePersistentState<string[]>('socketInfo_filterToolsIds', []);
  const [filterProjects, setFilterProjects] = usePersistentState<string[]>('socketInfo_filterProjects', []);
  const [filterStatuses, setFilterStatuses] = usePersistentState<string[]>('socketInfo_filterStatuses', []);
  const [filterPogoPinPns, setFilterPogoPinPns] = usePersistentState<string[]>('socketInfo_filterPogoPinPns', []);
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('socketInfo_visibleColumns', [
    'facility', 'location', 'toolsId', 'package', 'pinBall', 'packageSize', 'project', 'status', 'contactCountPin1', 'lifeCountPin1', 'contactLimitPin1', 'socketGroupPin1', 'pogoPinPnPin1', 'socketPnPin1', 'contactCountOver70Pin1', 'contactCountPin2', 'lifeCountPin2', 'contactLimitPin2', 'pogoPinPnPin2', 'contactCountOver70Pin2', 'contactCountPcb', 'lifeCountPcb', 'contactLimitPcb', 'pnPcb', 'contactCountOver70Pcb', 'usedFlag'
  ]);
  const [displayCount, setDisplayCount] = useState(100);

  useEffect(() => {
    const q = query(collection(db, 'sockets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socket));
      if (selectedFacility !== 'ALL') {
        data = data.filter(s => (s.facility || '').trim().toUpperCase() === selectedFacility);
      }
      data.sort((a, b) => (a.toolsId || '').localeCompare(b.toolsId || ''));
      setSockets(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sockets:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedFacility]);

  const handleUpdate = async (id: string, data: Partial<Socket>) => {
    await updateDoc(doc(db, 'sockets', id), data);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      await deleteDoc(doc(db, 'sockets', modal.id));
      setModal({ isOpen: false, id: null });
    }
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
    return sockets.filter(s => {
      const matchSearch = (s.toolsId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.project || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchSocketGroup = filterSocketGroups.length === 0 || filterSocketGroups.includes(String(s.socketGroupPin1 || ''));
      const matchToolsId = filterToolsIds.length === 0 || filterToolsIds.includes(String(s.toolsId || ''));
      const matchProject = filterProjects.length === 0 || filterProjects.includes(String(s.project || ''));
      const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(String(s.status || ''));
      const matchPogoPinPn = filterPogoPinPns.length === 0 || filterPogoPinPns.includes(String(s.pogoPinPnPin1 || ''));

      return matchSearch && matchSocketGroup && matchToolsId && matchProject && matchStatus && matchPogoPinPn;
    });
  }, [sockets, searchTerm, filterSocketGroups, filterToolsIds, filterProjects, filterStatuses, filterPogoPinPns]);

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
          {isAdmin && (
            <button 
              onClick={async () => {
                const docRef = await addDoc(collection(db, 'sockets'), { toolsId: 'NEW_SOCKET' });
                setEditingId(docRef.id);
              }}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>ADD SOCKET</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
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
          </div>
          <div className="w-px h-4 bg-zinc-200 shrink-0"></div>
          <div className="flex items-center gap-2 px-1">
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
            className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white"
          >
            <DoubleScrollbar>
              <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                {columns.map((col, i) => (
                  <th key={col.key} className={cn("px-6 py-4 border-b border-zinc-100", i === 0 && "sticky left-0 bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]")}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 font-sans">
                      {col.label}
                    </span>
                  </th>
                ))}
                {isAdmin && <th className="px-6 py-4 border-b border-zinc-100 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 font-sans">Actions</span>
                </th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence mode="popLayout">
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
            className="grid gap-8 md:grid-cols-2 xl:grid-cols-3"
          >
            {Object.entries(stats).map(([location, groups], idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                key={location} 
                className="rounded-3xl border border-zinc-100 bg-white card-shadow overflow-hidden"
              >
                <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
                  <h3 className="font-serif italic text-xl text-zinc-900">{location}</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {Object.entries(groups).map(([group, count]) => (
                      <div key={group} className="flex items-center justify-between group">
                        <span className="text-sm text-zinc-500 group-hover:text-brand-primary transition-colors">{group}</span>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-900">
                          {count}
                        </span>
                      </div>
                    ))}
                    <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Total Count</span>
                      <span className="rounded-full bg-brand-primary px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-black/10">
                        {Object.values(groups).reduce((a, b) => a + b, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {Object.keys(stats).length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-500">
                No statistics available (Facility must equal Location).
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
