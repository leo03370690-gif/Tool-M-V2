import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Search, BarChart2, List, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';

interface LoadBoard {
  id: string;
  facility: string;
  projectName: string;
  lbName: string;
  lbGroup: string;
  location: string;
  insertion: string;
  availableQty: string;
  remark: string;
  sendBackDate: string;
  targetReturnDate: string;
}

const LoadBoardRow = React.memo(({ 
  lb, 
  idx, 
  columns, 
  isAdmin, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  setModal 
}: { 
  lb: LoadBoard, 
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
      key={lb.id} 
      className="group hover:bg-zinc-50/80 transition-colors"
    >
      {columns.map(col => (
        <td key={col.key} className="px-6 py-4 text-zinc-600 whitespace-nowrap">
          {editingId === lb.id ? (
            <input
              type="text"
              defaultValue={lb[col.key as keyof LoadBoard] as string}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              onBlur={(e) => handleUpdate(lb.id, { [col.key]: e.target.value })}
              autoFocus={col.key === 'facility'}
            />
          ) : (
            <span className={cn(
              "font-medium",
              col.key === 'lbName' ? "text-brand-primary font-bold" : "text-zinc-500"
            )}>
              {lb[col.key as keyof LoadBoard]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setEditingId(lb.id)} 
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setModal({ isOpen: true, id: lb.id })} 
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

export default function LoadBoardInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const [loadBoards, setLoadBoards] = useState<LoadBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [newLoadBoard, setNewLoadBoard] = useState<Partial<LoadBoard>>({});

  const [filterProjectNames, setFilterProjectNames] = useState<string[]>([]);
  const [filterLBNames, setFilterLBNames] = useState<string[]>([]);
  const [filterLBGroups, setFilterLBGroups] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  useEffect(() => {
    const q = query(collection(db, 'loadBoards'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoadBoard));
      if (selectedFacility !== 'ALL') {
        data = data.filter(lb => (lb.facility || '').trim().toUpperCase() === selectedFacility);
      }
      data.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
      setLoadBoards(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching load boards:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedFacility]);

  const handleAdd = async () => {
    if (!newLoadBoard.projectName) return;
    await addDoc(collection(db, 'loadBoards'), newLoadBoard);
    setNewLoadBoard({});
    setEditingId(null);
  };

  const handleUpdate = async (id: string, data: Partial<LoadBoard>) => {
    await updateDoc(doc(db, 'loadBoards', id), data);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      await deleteDoc(doc(db, 'loadBoards', modal.id));
      setModal({ isOpen: false, id: null });
    }
  };

  const uniqueProjectNames = React.useMemo(() => Array.from(new Set(loadBoards.map(lb => String(lb.projectName || '')).filter(Boolean))).sort(), [loadBoards]);
  const uniqueLBNames = React.useMemo(() => Array.from(new Set(loadBoards.map(lb => String(lb.lbName || '')).filter(Boolean))).sort(), [loadBoards]);
  const uniqueLBGroups = React.useMemo(() => Array.from(new Set(loadBoards.map(lb => String(lb.lbGroup || '')).filter(Boolean))).sort(), [loadBoards]);
  const uniqueLocations = React.useMemo(() => Array.from(new Set(loadBoards.map(lb => String(lb.location || '')).filter(Boolean))).sort(), [loadBoards]);

  const stats = React.useMemo(() => {
    return loadBoards.reduce((acc, lb) => {
      // Only count if Location equals Facility
      const location = (lb.location || '').trim().toUpperCase();
      const facility = (lb.facility || '').trim().toUpperCase();
      
      if (location !== facility || !facility) return acc;

      const displayFacility = lb.facility || 'Unknown';
      const group = lb.lbGroup || 'Unknown';
      
      if (!acc[displayFacility]) acc[displayFacility] = {};
      if (!acc[displayFacility][group]) acc[displayFacility][group] = 0;
      acc[displayFacility][group]++;
      
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }, [loadBoards]);

  const filteredLoadBoards = React.useMemo(() => {
    return loadBoards.filter(lb => {
      const matchSearch = (lb.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lb.lbName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lb.lbGroup || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchProjectName = filterProjectNames.length === 0 || filterProjectNames.includes(String(lb.projectName || ''));
      const matchLBName = filterLBNames.length === 0 || filterLBNames.includes(String(lb.lbName || ''));
      const matchLBGroup = filterLBGroups.length === 0 || filterLBGroups.includes(String(lb.lbGroup || ''));
      const matchLocation = filterLocations.length === 0 || filterLocations.includes(String(lb.location || ''));

      return matchSearch && matchProjectName && matchLBName && matchLBGroup && matchLocation;
    });
  }, [loadBoards, searchTerm, filterProjectNames, filterLBNames, filterLBGroups, filterLocations]);

  const columns = [
    { key: 'facility', label: 'Facility' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'lbName', label: 'LB Name' },
    { key: 'lbGroup', label: 'LB Group' },
    { key: 'location', label: 'Location' },
    { key: 'insertion', label: 'Insertion' },
    { key: 'availableQty', label: 'Available Qty' },
    { key: 'remark', label: 'Remark' },
    { key: 'sendBackDate', label: 'Send Back Date' },
    { key: 'targetReturnDate', label: 'Target Return Date' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900">Load Board Info</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Track and manage load board inventory</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-2 py-1 shadow-sm">
            <Filter className="h-4 w-4 text-zinc-400 ml-2" />
            <MultiSelectDropdown
              values={filterProjectNames}
              onChange={setFilterProjectNames}
              options={uniqueProjectNames}
              placeholder="All Project Names"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterLBNames}
              onChange={setFilterLBNames}
              options={uniqueLBNames}
              placeholder="All LB Names"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterLBGroups}
              onChange={setFilterLBGroups}
              options={uniqueLBGroups}
              placeholder="All LB Groups"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterLocations}
              onChange={setFilterLocations}
              options={uniqueLocations}
              placeholder="All Locations"
            />
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search load boards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>
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
              onClick={() => setEditingId('new')}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>ADD LB</span>
            </button>
          )}
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50">
                    {columns.map(col => (
                      <th key={col.key} className="px-6 py-4 border-b border-zinc-100">
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
                  {editingId === 'new' && (
                    <motion.tr 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-zinc-50/30"
                    >
                      {columns.map(col => (
                        <td key={col.key} className="px-6 py-3">
                          <input
                            type="text"
                            autoFocus={col.key === 'facility'}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                            onChange={(e) => setNewLoadBoard({ ...newLoadBoard, [col.key]: e.target.value })}
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
                  {filteredLoadBoards.slice(0, 100).map((lb, idx) => (
                    <LoadBoardRow
                      key={lb.id}
                      lb={lb}
                      idx={idx}
                      columns={columns}
                      isAdmin={isAdmin}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      handleUpdate={handleUpdate}
                      setModal={setModal}
                    />
                  ))}
                  {filteredLoadBoards.length > 100 && (
                    <tr>
                      <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                        Showing first 100 of {filteredLoadBoards.length} load boards. Use filters to narrow down results.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-8 md:grid-cols-2 xl:grid-cols-3"
          >
            {Object.entries(stats).map(([facility, groups], idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                key={facility} 
                className="rounded-3xl border border-zinc-100 bg-white card-shadow overflow-hidden"
              >
                <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
                  <h3 className="font-serif italic text-xl text-zinc-900">{facility}</h3>
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
                Are you sure you want to delete this load board record? This action cannot be undone and will be permanently removed from the system.
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
