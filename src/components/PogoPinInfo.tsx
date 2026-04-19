import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Search, Check, X, List, LayoutGrid, Filter, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistentState } from '../lib/usePersistentState';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { useData } from '../contexts/DataContext';
import { useDebounce } from '../lib/useDebounce';

interface PogoPin {
  id: string;
  facility: string;
  pinPn: string;
  qty: number;
}

const PinCard = React.memo(({ 
  pin, 
  isAdmin, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  setModal,
  setSaveModal
}: { 
  pin: PogoPin, 
  isAdmin: boolean, 
  editingId: string | null, 
  setEditingId: (id: string | null) => void, 
  handleUpdate: (id: string, data: any) => void, 
  setModal: (modal: any) => void,
  setSaveModal: (modal: any) => void
}) => {
  const [localData, setLocalData] = useState<Partial<PogoPin>>(pin);
  
  useEffect(() => {
    if (editingId !== pin.id) {
      setLocalData(pin);
    }
  }, [pin, editingId]);

  const isEditing = editingId === pin.id;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative rounded-3xl bg-white p-6 shadow-sm border border-zinc-100 hover:shadow-xl hover:border-brand-primary/20 transition-all"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/5 text-brand-primary">
          <Filter className="h-6 w-6" />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1">Quantity</p>
          {isEditing ? (
            <input
              type="number"
              value={localData.qty || 0}
              onChange={(e) => setLocalData({ ...localData, qty: Number(e.target.value) })}
              className="w-20 border-b border-brand-primary bg-transparent text-3xl font-bold focus:outline-none py-1 text-right"
            />
          ) : (
            <p className={cn(
              "text-3xl font-bold transition-colors",
              pin.qty < 50 ? "text-rose-500" : "text-zinc-900"
            )}>{pin.qty}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Part Number</p>
        {isEditing ? (
          <input
            type="text"
            value={localData.pinPn || ''}
            onChange={(e) => setLocalData({ ...localData, pinPn: e.target.value })}
            className="w-full border-b border-brand-primary bg-transparent text-xl font-bold focus:outline-none py-1"
          />
        ) : (
          <h3 className="text-xl font-bold text-brand-primary tracking-tight">{pin.pinPn}</h3>
        )}
      </div>
      
      {isAdmin && (
        <div className="mt-8 flex gap-2 opacity-0 transition-all group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          {isEditing ? (
            <>
              <button 
                onClick={() => setSaveModal({ isOpen: true, id: pin.id, data: localData })} 
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-all"
              >
                <Check className="h-3.5 w-3.5" />
                SAVE
              </button>
              <button 
                onClick={() => { setLocalData(pin); setEditingId(null); }} 
                className="p-2.5 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-zinc-100 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setEditingId(pin.id)} 
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-50 py-2.5 text-xs font-bold text-zinc-500 hover:bg-brand-primary hover:text-white transition-all"
              >
                <Edit2 className="h-3.5 w-3.5" />
                EDIT
              </button>
              <button 
                onClick={() => setModal({ isOpen: true, id: pin.id })} 
                className="p-2.5 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
});

const PinRow = React.memo(({ 
  pin, 
  idx, 
  columns, 
  visibleColumns,
  isAdmin, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  setModal,
  setSaveModal
}: { 
  pin: PogoPin, 
  idx: number, 
  columns: any[], 
  visibleColumns: string[],
  isAdmin: boolean, 
  editingId: string | null, 
  setEditingId: (id: string | null) => void, 
  handleUpdate: (id: string, data: any) => void, 
  setModal: (modal: any) => void,
  setSaveModal: (modal: any) => void
}) => {
  const [localData, setLocalData] = useState<Partial<PogoPin>>(pin);
  
  useEffect(() => {
    if (editingId !== pin.id) {
      setLocalData(pin);
    }
  }, [pin, editingId]);

  const isEditing = editingId === pin.id;

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      className="group hover:bg-zinc-50/80 transition-colors"
    >
      {columns.filter(col => visibleColumns.includes(col.key)).map((col, i) => (
        <td key={col.key} className={cn("px-6 py-4 text-zinc-600 whitespace-nowrap", i === 0 && visibleColumns[0] === col.key && "sticky left-0 bg-white group-hover:bg-zinc-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors")}>
          {isEditing ? (
            <input
              type={col.key === 'qty' ? 'number' : 'text'}
              value={localData[col.key as keyof PogoPin] as any || ''}
              onChange={(e) => setLocalData({ ...localData, [col.key]: col.key === 'qty' ? Number(e.target.value) : e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              autoFocus={col.key === 'facility'}
            />
          ) : (
            <span className={cn(
              "font-medium",
              col.key === 'pinPn' ? "text-brand-primary font-bold" : "text-zinc-500"
            )}>
              {pin[col.key as keyof PogoPin]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveModal({ isOpen: true, id: pin.id, data: localData })} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /></button>
              <button onClick={() => { setLocalData(pin); setEditingId(null); }} className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setEditingId(pin.id)} 
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setModal({ isOpen: true, id: pin.id })} 
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

export default function PogoPinInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const { pogoPins: allPins } = useData();
  
  const pins = useMemo(() => {
    let data = [...allPins];
    if (selectedFacility !== 'ALL') {
      data = data.filter(p => (p.facility || '').trim().toUpperCase() === selectedFacility);
    }
    data.sort((a, b) => (a.pinPn || '').localeCompare(b.pinPn || ''));
    return data;
  }, [allPins, selectedFacility]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState<Partial<PogoPin>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = usePersistentState<'card' | 'table'>('pogoPinInfo_viewMode', 'card');
  const [filterPinPns, setFilterPinPns] = usePersistentState<string[]>('pogoPinInfo_filterPinPns', []);
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('pogoPinInfo_visibleColumns', ['facility', 'pinPn', 'qty']);
  const [displayCount, setDisplayCount] = useState(100);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [saveModal, setSaveModal] = useState<{isOpen: boolean, id: string | null, data: any | null}>({ isOpen: false, id: null, data: null });

  const handleAdd = async () => {
    if (!newPin.pinPn) return;
    try {
      await addDoc(collection(db, 'pogoPins'), {
        ...newPin,
        facility: selectedFacility === 'ALL' ? (newPin.facility || '') : selectedFacility
      });
      setNewPin({});
      setEditingId(null);
    } catch (err) {
      console.error('Error adding pogo pin record:', err);
      alert('Failed to add record. Please try again.');
    }
  };

  const handleUpdate = async (id: string, data: Partial<PogoPin>) => {
    try {
      await updateDoc(doc(db, 'pogoPins', id), data);
      setEditingId(null);
    } catch (err) {
      console.error('Error updating pogo pin record:', err);
      alert('Failed to update record. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (modal.id) {
      try {
        await deleteDoc(doc(db, 'pogoPins', modal.id));
        setModal({ isOpen: false, id: null });
      } catch (err) {
        console.error('Error deleting pogo pin record:', err);
        alert('Failed to delete record. Please try again.');
      }
    }
  };

  const filteredForPinPns = React.useMemo(() => {
    return pins;
  }, [pins]);

  const uniquePinPns = React.useMemo(() => Array.from(new Set(filteredForPinPns.map(p => String(p.pinPn || '')).filter(Boolean))).sort(), [filteredForPinPns]);

  const filteredPins = React.useMemo(() => {
    let result = pins.filter(p => {
      const matchSearch = (p.pinPn || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchPinPn = filterPinPns.length === 0 || filterPinPns.includes(String(p.pinPn || ''));
      return matchSearch && matchPinPn;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key as keyof PogoPin] || '');
        const bValue = String(b[sortConfig.key as keyof PogoPin] || '');
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [pins, debouncedSearchTerm, filterPinPns, sortConfig]);

  const columns = [
    { key: 'facility', label: 'Facility' },
    { key: 'pinPn', label: 'Part Number' },
    { key: 'qty', label: 'Quantity' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900">Pogo Pin Info</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Monitor pogo pin inventory levels</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-start md:justify-end w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-1 bg-white border border-zinc-200 rounded-xl px-2 py-1 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => {
                setFilterPinPns([]);
              }}
              className="px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap"
            >
              Clear Filters
            </button>
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <Filter className="h-4 w-4 text-zinc-400 ml-2" />
            <MultiSelectDropdown
              values={filterPinPns}
              onChange={setFilterPinPns}
              options={uniquePinPns}
              placeholder="All Part Numbers"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={columns.filter(c => visibleColumns.includes(c.key)).map(c => c.label)}
              onChange={(labels) => {
                const keys = columns.filter(c => labels.includes(c.label)).map(c => c.key);
                setVisibleColumns(keys);
              }}
              options={columns.map(c => c.label)}
              placeholder="Columns"
            />
          </div>
          <div className="relative group w-full sm:w-auto mt-2 sm:mt-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search pins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-50/50 p-1 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === 'card' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              CARD
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === 'table' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <List className="h-3.5 w-3.5" />
              TABLE
            </button>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setEditingId('new')}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>ADD PIN</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'card' ? (
          <motion.div 
            key="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {editingId === 'new' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-6 card-shadow border-2 border-brand-primary/20"
                >
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Facility"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                      onChange={(e) => setNewPin({ ...newPin, facility: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Pin P/N"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                      onChange={(e) => setNewPin({ ...newPin, pinPn: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                      onChange={(e) => setNewPin({ ...newPin, qty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button onClick={handleAdd} className="flex-1 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-all">SAVE</button>
                    <button onClick={() => setEditingId(null)} className="p-2.5 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-zinc-100 transition-all"><X className="h-4 w-4" /></button>
                  </div>
                </motion.div>
              )}
              {filteredPins.slice(0, displayCount).map((pin) => (
                <PinCard
                  key={pin.id}
                  pin={pin}
                  isAdmin={isAdmin}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  handleUpdate={handleUpdate}
                  setModal={setModal}
                  setSaveModal={setSaveModal}
                />
              ))}
            </AnimatePresence>
            {filteredPins.length > displayCount && (
              <div className="col-span-full py-8 text-center text-zinc-400 italic">
                Showing {displayCount} of {filteredPins.length} pins. <button onClick={() => setDisplayCount(prev => prev + 100)} className="text-brand-primary hover:underline font-medium not-italic">Load more</button>.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="table"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative overflow-hidden surface-card"
          >
            <DoubleScrollbar>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50">
                    {columns.filter(col => visibleColumns.includes(col.key)).map((col, i) => (
                      <th 
                        key={col.key} 
                        className={cn("px-0 py-0 border-b border-zinc-100", i === 0 && visibleColumns[0] === col.key && "sticky left-0 bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]")}
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
                        {columns.filter(col => visibleColumns.includes(col.key)).map(col => (
                          <td key={col.key} className="px-6 py-3">
                            <input
                              type="text"
                              autoFocus={col.key === 'facility'}
                              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                              onChange={(e) => setNewPin({ ...newPin, [col.key]: col.key === 'qty' ? (parseInt(e.target.value) || 0) : e.target.value })}
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
                    {filteredPins.slice(0, displayCount).map((pin, idx) => (
                    <PinRow
                      key={pin.id}
                      pin={pin}
                      idx={idx}
                      columns={columns}
                      visibleColumns={visibleColumns}
                      isAdmin={isAdmin}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      handleUpdate={handleUpdate}
                      setModal={setModal}
                      setSaveModal={setSaveModal}
                    />
                  ))}
                  </AnimatePresence>
                  {filteredPins.length > displayCount && (
                    <tr>
                      <td colSpan={visibleColumns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                        Showing {displayCount} of {filteredPins.length} pins. <button onClick={() => setDisplayCount(prev => prev + 100)} className="text-brand-primary hover:underline font-medium not-italic">Load more</button>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DoubleScrollbar>
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
                Are you sure you want to delete this pogo pin record? This action cannot be undone and will be permanently removed from the system.
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
