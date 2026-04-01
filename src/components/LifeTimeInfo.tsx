import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Search, Check, X, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';

interface LifeTime {
  id: string;
  facility: string;
  socketGroup: string;
  pogoPin1Pn: string;
  pogoPinQty: number;
  lifeTime: number | string;
  loadBoardGroup: string;
  remark: string;
}

const LifeTimeRow = React.memo(({ 
  record, 
  idx, 
  columns, 
  isAdmin, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  setModal 
}: { 
  record: LifeTime, 
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
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      key={record.id} 
      className="group hover:bg-zinc-50/80 transition-colors"
    >
      {columns.map(col => (
        <td key={col.key} className="px-6 py-4 text-zinc-600 whitespace-nowrap">
          {editingId === record.id ? (
            <input
              type={col.key === 'pogoPinQty' || col.key === 'lifeTime' ? 'number' : 'text'}
              defaultValue={record[col.key as keyof LifeTime] as any}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              onBlur={(e) => handleUpdate(record.id, { [col.key]: col.key === 'pogoPinQty' || col.key === 'lifeTime' ? Number(e.target.value) : e.target.value })}
              autoFocus={col.key === 'facility'}
            />
          ) : (
            <span className={cn(
              "font-medium",
              col.key === 'socketGroup' ? "text-brand-primary font-bold" : "text-zinc-500"
            )}>
              {record[col.key as keyof LifeTime]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setEditingId(record.id)} 
              className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setModal({ isOpen: true, id: record.id })} 
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

export default function LifeTimeInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const [records, setRecords] = useState<LifeTime[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  const [filterSocketGroups, setFilterSocketGroups] = useState<string[]>([]);
  const [filterPogoPin1Pns, setFilterPogoPin1Pns] = useState<string[]>([]);
  const [filterLoadBoardGroups, setFilterLoadBoardGroups] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'lifeTimes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LifeTime));
      if (selectedFacility !== 'ALL') {
        data = data.filter(r => (r.facility || '').trim().toUpperCase() === selectedFacility);
      }
      data.sort((a, b) => (a.socketGroup || '').localeCompare(b.socketGroup || ''));
      setRecords(data);
    }, (error) => {
      console.error("Error fetching life times:", error);
    });
    return () => unsubscribe();
  }, [selectedFacility]);

  const handleUpdate = async (id: string, data: Partial<LifeTime>) => {
    await updateDoc(doc(db, 'lifeTimes', id), data);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      await deleteDoc(doc(db, 'lifeTimes', modal.id));
      setModal({ isOpen: false, id: null });
    }
  };

  const uniqueSocketGroups = React.useMemo(() => Array.from(new Set(records.map(r => String(r.socketGroup || '')).filter(Boolean))).sort(), [records]);
  const uniquePogoPin1Pns = React.useMemo(() => Array.from(new Set(records.map(r => String(r.pogoPin1Pn || '')).filter(Boolean))).sort(), [records]);
  const uniqueLoadBoardGroups = React.useMemo(() => Array.from(new Set(records.map(r => String(r.loadBoardGroup || '')).filter(Boolean))).sort(), [records]);

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      const matchSearch = (r.socketGroup || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.pogoPin1Pn || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchSocketGroup = filterSocketGroups.length === 0 || filterSocketGroups.includes(String(r.socketGroup || ''));
      const matchPogoPin1Pn = filterPogoPin1Pns.length === 0 || filterPogoPin1Pns.includes(String(r.pogoPin1Pn || ''));
      const matchLoadBoardGroup = filterLoadBoardGroups.length === 0 || filterLoadBoardGroups.includes(String(r.loadBoardGroup || ''));

      return matchSearch && matchSocketGroup && matchPogoPin1Pn && matchLoadBoardGroup;
    });
  }, [records, searchTerm, filterSocketGroups, filterPogoPin1Pns, filterLoadBoardGroups]);

  const columns = [
    { key: 'facility', label: 'Facility' },
    { key: 'socketGroup', label: 'Socket group' },
    { key: 'pogoPin1Pn', label: 'Pogo pin 1 P/N' },
    { key: 'pogoPinQty', label: 'Pogo pin Q\'ty' },
    { key: 'lifeTime', label: 'Life time' },
    { key: 'loadBoardGroup', label: 'Load board group' },
    { key: 'remark', label: 'Remark' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900">Life Time Info</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Manage socket and pogo pin life cycle data</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-2 py-1 shadow-sm">
            <Filter className="h-4 w-4 text-zinc-400 ml-2" />
            <MultiSelectDropdown
              values={filterSocketGroups}
              onChange={setFilterSocketGroups}
              options={uniqueSocketGroups}
              placeholder="All Socket Groups"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterPogoPin1Pns}
              onChange={setFilterPogoPin1Pns}
              options={uniquePogoPin1Pns}
              placeholder="All Pogo Pin 1 P/Ns"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterLoadBoardGroups}
              onChange={setFilterLoadBoardGroups}
              options={uniqueLoadBoardGroups}
              placeholder="All Load Board Groups"
            />
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={async () => {
                const docRef = await addDoc(collection(db, 'lifeTimes'), { socketGroup: 'NEW_GROUP' });
                setEditingId(docRef.id);
              }}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>ADD RECORD</span>
            </button>
          )}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
              <AnimatePresence mode="popLayout">
                {filteredRecords.slice(0, 100).map((record, idx) => (
                  <LifeTimeRow
                    key={record.id}
                    record={record}
                    idx={idx}
                    columns={columns}
                    isAdmin={isAdmin}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    handleUpdate={handleUpdate}
                    setModal={setModal}
                  />
                ))}
                {filteredRecords.length > 100 && (
                  <tr>
                    <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                      Showing first 100 of {filteredRecords.length} records. Use filters to narrow down results.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

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
                Are you sure you want to delete this life time record? This action cannot be undone and will be permanently removed from the system.
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
