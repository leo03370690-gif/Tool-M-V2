import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Search, BarChart2, List, Check, X, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';

interface ChangeKit {
  id: string;
  facility: string;
  location: string;
  kind: string;
  toolsId: string;
  packageSize: string;
  changeKitGroup: string;
  status: string;
  idleTime: string;
}

const KitRow = React.memo(({ 
  kit, 
  idx, 
  columns, 
  isAdmin, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  setModal 
}: { 
  kit: ChangeKit, 
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
      key={kit.id} 
      className="group hover:bg-zinc-50/80 transition-colors"
    >
      {columns.map(col => (
        <td key={col.key} className="px-6 py-4 text-zinc-600 whitespace-nowrap">
          {editingId === kit.id ? (
            <input
              type="text"
              defaultValue={kit[col.key as keyof ChangeKit]}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              onBlur={(e) => handleUpdate(kit.id, { [col.key]: e.target.value })}
              autoFocus={col.key === 'facility'}
            />
          ) : (
            <span className={cn(
              "font-medium",
              col.key === 'toolsId' ? "text-brand-primary font-bold" : "text-zinc-500"
            )}>
              {kit[col.key as keyof ChangeKit]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setEditingId(kit.id)} 
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setModal({ isOpen: true, id: kit.id })} 
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

export default function ChangeKitInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const [kits, setKits] = useState<ChangeKit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  const [filterToolsIds, setFilterToolsIds] = useState<string[]>([]);
  const [filterChangeKitGroups, setFilterChangeKitGroups] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'changeKits'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeKit));
      if (selectedFacility !== 'ALL') {
        data = data.filter(k => (k.facility || '').trim().toUpperCase() === selectedFacility);
      }
      data.sort((a, b) => (a.toolsId || '').localeCompare(b.toolsId || ''));
      setKits(data);
    }, (error) => {
      console.error("Error fetching change kits:", error);
    });
    return () => unsubscribe();
  }, [selectedFacility]);

  const handleUpdate = async (id: string, data: Partial<ChangeKit>) => {
    await updateDoc(doc(db, 'changeKits', id), data);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      await deleteDoc(doc(db, 'changeKits', modal.id));
      setModal({ isOpen: false, id: null });
    }
  };

  const uniqueToolsIds = React.useMemo(() => Array.from(new Set(kits.map(k => String(k.toolsId || '')).filter(Boolean))).sort(), [kits]);
  const uniqueChangeKitGroups = React.useMemo(() => Array.from(new Set(kits.map(k => String(k.changeKitGroup || '')).filter(Boolean))).sort(), [kits]);
  const uniqueStatuses = React.useMemo(() => Array.from(new Set(kits.map(k => String(k.status || '')).filter(Boolean))).sort(), [kits]);

  const stats = React.useMemo(() => {
    return kits.reduce((acc, kit) => {
      // Only count if Facility equals Location
      const facility = (kit.facility || '').trim().toUpperCase();
      const location = (kit.location || '').trim().toUpperCase();
      
      if (facility !== location || !location) return acc;

      const displayLocation = kit.location || 'Unknown';
      const group = kit.changeKitGroup || 'Unknown';
      
      if (!acc[displayLocation]) acc[displayLocation] = {};
      if (!acc[displayLocation][group]) acc[displayLocation][group] = 0;
      acc[displayLocation][group]++;
      
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }, [kits]);

  const filteredKits = React.useMemo(() => {
    return kits.filter(k => {
      const matchSearch = (k.toolsId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (k.kind || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchToolsId = filterToolsIds.length === 0 || filterToolsIds.includes(String(k.toolsId || ''));
      const matchChangeKitGroup = filterChangeKitGroups.length === 0 || filterChangeKitGroups.includes(String(k.changeKitGroup || ''));
      const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(String(k.status || ''));

      return matchSearch && matchToolsId && matchChangeKitGroup && matchStatus;
    });
  }, [kits, searchTerm, filterToolsIds, filterChangeKitGroups, filterStatuses]);

  const columns = [
    { key: 'facility', label: 'Facility' },
    { key: 'location', label: 'Location' },
    { key: 'kind', label: 'Kind' },
    { key: 'toolsId', label: 'Tools ID' },
    { key: 'packageSize', label: 'PACKAGE SIZE' },
    { key: 'changeKitGroup', label: 'Change kit Group' },
    { key: 'status', label: 'Status' },
    { key: 'idleTime', label: 'Idle Time' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900">Change Kit Info</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Manage change kit inventory and status</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-2 py-1 shadow-sm">
            <Filter className="h-4 w-4 text-zinc-400 ml-2" />
            <MultiSelectDropdown
              values={filterToolsIds}
              onChange={setFilterToolsIds}
              options={uniqueToolsIds}
              placeholder="All Tools IDs"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterChangeKitGroups}
              onChange={setFilterChangeKitGroups}
              options={uniqueChangeKitGroups}
              placeholder="All Change Kit Groups"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterStatuses}
              onChange={setFilterStatuses}
              options={uniqueStatuses}
              placeholder="All Statuses"
            />
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search kits..."
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
              onClick={async () => {
                const docRef = await addDoc(collection(db, 'changeKits'), { toolsId: 'NEW_KIT' });
                setEditingId(docRef.id);
              }}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>ADD KIT</span>
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
                  {filteredKits.slice(0, 100).map((kit, idx) => (
                    <KitRow
                      key={kit.id}
                      kit={kit}
                      idx={idx}
                      columns={columns}
                      isAdmin={isAdmin}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      handleUpdate={handleUpdate}
                      setModal={setModal}
                    />
                  ))}
                  {filteredKits.length > 100 && (
                    <tr>
                      <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                        Showing first 100 of {filteredKits.length} kits. Use filters to narrow down results.
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
                Are you sure you want to delete this change kit? This action cannot be undone and will be permanently removed from the system.
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
