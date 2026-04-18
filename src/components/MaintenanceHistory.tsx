import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase';
import { deleteDoc, doc, updateDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Trash2, Edit2, Check, X, Search, List, Filter, ArrowUpDown, History, Loader2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';
import { useData } from '../contexts/DataContext';
import { useDebounce } from '../lib/useDebounce';

interface MaintenanceRecord {
  id: string;
  facility: string;
  lbNo: string;
  sniNo: string;
  lbType: string;
  insertion: string;
  vendor: string;
  status: string;
  site: string;
  issue: string;
  issueDate: string;
  repairDate: string;
  action: string;
  createdBy: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['Done', 'On-going', 'Pending'];

const MaintenanceRow = React.memo(({ 
  record, 
  idx, 
  columns, 
  isAdmin, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  setDeleteModal
}: { 
  record: MaintenanceRecord, 
  idx: number, 
  columns: any[], 
  isAdmin: boolean, 
  editingId: string | null, 
  setEditingId: (id: string | null) => void, 
  handleUpdate: (id: string, data: any) => void, 
  setDeleteModal: (modal: any) => void
}) => {
  const [localData, setLocalData] = useState<Partial<MaintenanceRecord>>(record);
  
  React.useEffect(() => {
    if (editingId !== record.id) {
      setLocalData(record);
    }
  }, [record, editingId]);

  const isEditing = editingId === record.id;

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      key={record.id} 
      className="group hover:bg-zinc-50/80 transition-colors"
    >
      {columns.map((col, i) => (
        <td key={col.key} className={cn("px-6 py-4 text-zinc-600 whitespace-nowrap", i === 0 && "sticky left-0 bg-white group-hover:bg-zinc-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors")}>
          {isEditing ? (
            col.key === 'status' ? (
              <select
                value={localData[col.key as keyof MaintenanceRecord] as string || ''}
                onChange={(e) => setLocalData({ ...localData, [col.key]: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all appearance-none"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : col.key.toLowerCase().includes('date') ? (
              <input
                type="date"
                value={localData[col.key as keyof MaintenanceRecord] as string || ''}
                onChange={(e) => setLocalData({ ...localData, [col.key]: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              />
            ) : (
              <input
                type="text"
                value={localData[col.key as keyof MaintenanceRecord] as string || ''}
                onChange={(e) => setLocalData({ ...localData, [col.key]: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              />
            )
          ) : (
            <span className={cn(
              "text-zinc-600",
              col.key === 'status' && {
                'text-emerald-600 font-bold': record.status === 'Done',
                'text-amber-600 font-bold': record.status === 'On-going',
                'text-zinc-400 font-bold': record.status === 'Pending'
              }
            )}>
              {record[col.key as keyof MaintenanceRecord]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => handleUpdate(record.id, localData)} 
                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
              <button 
                onClick={() => { setLocalData(record); setEditingId(null); }} 
                className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setEditingId(record.id)} 
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setDeleteModal({ isOpen: true, id: record.id })} 
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

export default function MaintenanceHistory({ 
  isAdmin,
  onAddMaintenanceRecord
}: { 
  isAdmin: boolean,
  onAddMaintenanceRecord: () => void
}) {
  const [allRecords, setAllRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Implementing on-demand fetching for performance optimization
    // Only syncing the last 500 records by default to keep initial load fast
    const q = query(
      collection(db, 'maintenanceRecords'), 
      orderBy('issueDate', 'desc'),
      limit(500) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MaintenanceRecord[];
      setAllRecords(recordsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching maintenance records:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const records = useMemo(() => {
    return allRecords;
  }, [allRecords]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [filterLBNo, setFilterLBNo] = usePersistentState<string[]>('maint_filterLBNo', []);
  const [filterStatus, setFilterStatus] = usePersistentState<string[]>('maint_filterStatus', []);
  const [filterSites, setFilterSites] = usePersistentState<string[]>('maint_filterSites', []);
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('maint_visibleColumns', [
    'facility', 'lbNo', 'sniNo', 'lbType', 'status', 'site', 'issue', 'issueDate', 'repairDate', 'action'
  ]);
  const [displayCount, setDisplayCount] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'issueDate', direction: 'desc' });

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  const handleUpdate = async (id: string, data: Partial<MaintenanceRecord>) => {
    try {
      await updateDoc(doc(db, 'maintenanceRecords', id), data);
      setEditingId(null);
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Failed to update record.');
    }
  };

  const handleDelete = async () => {
    if (deleteModal.id) {
      try {
        await deleteDoc(doc(db, 'maintenanceRecords', deleteModal.id));
        setDeleteModal({ isOpen: false, id: null });
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record.');
      }
    }
  };

  const filteredRecords = useMemo(() => {
    let result = records.filter(record => {
      const searchStr = `${record.lbNo} ${record.issue} ${record.action} ${record.facility}`.toLowerCase();
      const matchSearch = searchStr.includes(debouncedSearchTerm.toLowerCase());
      
      const matchLBNo = filterLBNo.length === 0 || filterLBNo.includes(String(record.lbNo || ''));
      const matchStatus = filterStatus.length === 0 || filterStatus.includes(String(record.status || ''));
      const matchSite = filterSites.length === 0 || filterSites.includes(String(record.site || ''));

      return matchSearch && matchLBNo && matchStatus && matchSite;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key as keyof MaintenanceRecord] || '');
        const bValue = String(b[sortConfig.key as keyof MaintenanceRecord] || '');
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, debouncedSearchTerm, filterLBNo, filterStatus, filterSites, sortConfig]);

  const allColumns = [
    { key: 'facility', label: 'Facility' },
    { key: 'lbNo', label: 'LB No.' },
    { key: 'sniNo', label: 'SNI No.' },
    { key: 'lbType', label: 'LB Type' },
    { key: 'insertion', label: 'Insertion' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'status', label: 'Status' },
    { key: 'site', label: 'Site' },
    { key: 'issue', label: 'Issue' },
    { key: 'issueDate', label: 'Issue Date' },
    { key: 'repairDate', label: 'Repair Date' },
    { key: 'action', label: 'Action' },
    { key: 'createdBy', label: 'Created By' },
  ];

  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  const uniqueLBNo = useMemo(() => Array.from(new Set(records.map(r => r.lbNo))).sort(), [records]);
  const uniqueSites = useMemo(() => Array.from(new Set(records.map(r => r.site))).sort(), [records]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">Maintenance History</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Comprehensive logs of Load Board repairs</p>
        </div>
        <button
          onClick={onAddMaintenanceRecord}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:translate-y-[-2px] hover:shadow-xl active:translate-y-[0px]"
        >
          <Plus className="h-4 w-4" />
          ADD RECORD
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between surface-card p-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 px-2 text-zinc-400">
            <Filter className="h-3.5 w-3.5" />
            <button
              onClick={() => {
                setFilterLBNo([]);
                setFilterStatus([]);
                setFilterSites([]);
              }}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="w-px h-4 bg-zinc-200 shrink-0"></div>
          <div className="flex flex-wrap items-center gap-2 px-1">
            <MultiSelectDropdown
              values={filterLBNo}
              onChange={setFilterLBNo}
              options={uniqueLBNo}
              placeholder="LB No."
            />
            <MultiSelectDropdown
              values={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_OPTIONS}
              placeholder="Status"
            />
            <MultiSelectDropdown
              values={filterSites}
              onChange={setFilterSites}
              options={uniqueSites}
              placeholder="Sites"
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
            placeholder="Search maintenance logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden surface-card"
      >
        <DoubleScrollbar>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                {columns.map((col, i) => (
                  <th 
                    key={col.key} 
                    className={cn("px-0 py-0 border-b border-zinc-100", i === 0 && "sticky left-0 bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]")}
                  >
                    <div 
                      className="px-6 py-4 flex items-center cursor-pointer hover:bg-zinc-100/50 transition-colors" 
                      onClick={() => {
                        const direction = sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                        setSortConfig({ key: col.key, direction });
                      }}
                    >
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
              {filteredRecords.slice(0, displayCount).map((record, idx) => (
                <MaintenanceRow
                  key={record.id}
                  record={record}
                  idx={idx}
                  columns={columns}
                  isAdmin={isAdmin}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  handleUpdate={handleUpdate}
                  setDeleteModal={setDeleteModal}
                />
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-12 text-center text-zinc-400 italic">
                    No maintenance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DoubleScrollbar>
      </motion.div>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
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
                <h3 className="text-xl font-bold text-zinc-900">Delete Record</h3>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-zinc-600">
                Are you sure you want to delete this maintenance record? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: null })}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-lg shadow-red-600/20"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
