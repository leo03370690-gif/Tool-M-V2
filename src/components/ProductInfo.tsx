import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Search, MoreHorizontal, Filter, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';
import { useData } from '../contexts/DataContext';
import { useDebounce } from '../lib/useDebounce';

interface Product {
  id: string;
  facility: string;
  device: string;
  projectName: string;
  nickname: string;
  tester: string;
  handler: string;
  temperature: string;
  insertion: string;
  siteNumber: string;
  ballCountDevice: string;
  changeKitGroup: string;
  kitName1: string;
  kitName2: string;
  kitName3: string;
  kitName4: string;
  kitName5: string;
  kitName6: string;
  lbGroup: string;
  socketName1: string;
  socketName2: string;
}

const ProductRow = React.memo(({ 
  product, 
  idx, 
  columns, 
  isAdmin, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  setModal,
  setSelectedDevice,
  setSaveModal
}: { 
  product: Product, 
  idx: number, 
  columns: any[], 
  isAdmin: boolean, 
  editingId: string | null, 
  setEditingId: (id: string | null) => void, 
  handleUpdate: (id: string, data: any) => void, 
  setModal: (modal: any) => void,
  setSelectedDevice: (device: string) => void,
  setSaveModal: (modal: any) => void
}) => {
  const [localData, setLocalData] = useState<Partial<Product>>(product);
  
  useEffect(() => {
    if (editingId !== product.id) {
      setLocalData(product);
    }
  }, [product, editingId]);

  const isEditing = editingId === product.id;

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
      key={product.id} 
      className="group hover:bg-zinc-50/80 transition-colors"
    >
      {columns.map((col, i) => (
        <td key={col.key} className={cn("px-6 py-4 text-zinc-600 whitespace-nowrap", i === 0 && "sticky left-0 bg-white group-hover:bg-zinc-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors")}>
          {isEditing ? (
            <input
              type="text"
              value={localData[col.key as keyof Product] as string || ''}
              onChange={(e) => setLocalData({ ...localData, [col.key]: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              autoFocus={col.key === 'facility'}
            />
          ) : col.key === 'device' ? (
            <button
              onClick={() => setSelectedDevice(product.device as string)}
              className="font-bold text-brand-primary hover:underline"
            >
              {product.device}
            </button>
          ) : (
            <span className="font-medium text-zinc-500">
              {product[col.key as keyof Product]}
            </span>
          )}
        </td>
      ))}
      {isAdmin && (
        <td className="px-6 py-4 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveModal({ isOpen: true, id: product.id, data: localData })} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-4 w-4" /></button>
              <button onClick={() => { setLocalData(product); setEditingId(null); }} className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setEditingId(product.id)} 
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-zinc-400 hover:text-brand-primary transition-all"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setModal({ isOpen: true, id: product.id })} 
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

export default function ProductInfo({ isAdmin, selectedFacility, onNavigate }: { isAdmin: boolean, selectedFacility: string, onNavigate?: (tab: string) => void }) {
  const { products: allProducts, lifeTimes: lifeTimesData, loading } = useData();
  
  const [viewMode, setViewMode] = useState<'inventory' | 'missingLifeTime'>('inventory');

  const products = useMemo(() => {
    let data = [...allProducts];
    if (selectedFacility !== 'ALL') {
      data = data.filter(p => (p.facility || '').trim().toUpperCase() === selectedFacility);
    }
    data.sort((a, b) => (a.device || '').localeCompare(b.device || ''));
    return data;
  }, [allProducts, selectedFacility]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const [filterDevices, setFilterDevices] = usePersistentState<string[]>('productInfo_filterDevices', []);
  const [filterProjectNames, setFilterProjectNames] = usePersistentState<string[]>('productInfo_filterProjectNames', []);
  const [filterNicknames, setFilterNicknames] = usePersistentState<string[]>('productInfo_filterNicknames', []);
  const [filterChangeKitGroups, setFilterChangeKitGroups] = usePersistentState<string[]>('productInfo_filterChangeKitGroups', []);
  const [filterLBGroups, setFilterLBGroups] = usePersistentState<string[]>('productInfo_filterLBGroups', []);
  const [displayCount, setDisplayCount] = useState(100);
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('productInfo_visibleColumns_v2', [
    'facility', 'device', 'projectName', 'nickname', 'tester', 'handler', 'temperature', 'insertion', 'siteNumber', 'ballCountDevice', 'changeKitGroup', 'kitName1', 'kitName2', 'kitName3', 'kitName4', 'kitName5', 'kitName6', 'lbGroup', 'socketName1', 'socketName2'
  ]);

  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [saveModal, setSaveModal] = useState<{isOpen: boolean, id: string | null, data: any | null}>({ isOpen: false, id: null, data: null });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAdd = async () => {
    if (!newProduct.device) return;
    try {
      await addDoc(collection(db, 'products'), newProduct);
      setNewProduct({});
      setEditingId(null);
    } catch (err) {
      console.error('Error adding product record:', err);
      alert('Failed to add record. Please try again.');
    }
  };

  const handleUpdate = async (id: string, data: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), data);
      setEditingId(null);
    } catch (err) {
      console.error('Error updating product record:', err);
      alert('Failed to update record. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (modal.id) {
      try {
        await deleteDoc(doc(db, 'products', modal.id));
        setModal({ isOpen: false, id: null });
      } catch (err) {
        console.error('Error deleting product record:', err);
        alert('Failed to delete record. Please try again.');
      }
    }
  };

  const getUniqueValues = (field: keyof Product, otherFilters: Record<string, string[]>) => {
    const filtered = products.filter(p => {
      return Object.entries(otherFilters).every(([f, vals]) => {
        if (vals.length === 0) return true;
        return vals.includes(String(p[f as keyof Product] || ''));
      });
    });
    return Array.from(new Set(filtered.map(p => String(p[field] || '')).filter(Boolean))).sort();
  };

  const uniqueDevices = React.useMemo(() => getUniqueValues('device', {
    projectName: filterProjectNames,
    nickname: filterNicknames,
    changeKitGroup: filterChangeKitGroups,
    lbGroup: filterLBGroups
  }), [products, filterProjectNames, filterNicknames, filterChangeKitGroups, filterLBGroups]);

  const uniqueProjectNames = React.useMemo(() => getUniqueValues('projectName', {
    device: filterDevices,
    nickname: filterNicknames,
    changeKitGroup: filterChangeKitGroups,
    lbGroup: filterLBGroups
  }), [products, filterDevices, filterNicknames, filterChangeKitGroups, filterLBGroups]);

  const uniqueNicknames = React.useMemo(() => getUniqueValues('nickname', {
    device: filterDevices,
    projectName: filterProjectNames,
    changeKitGroup: filterChangeKitGroups,
    lbGroup: filterLBGroups
  }), [products, filterDevices, filterProjectNames, filterChangeKitGroups, filterLBGroups]);

  const uniqueChangeKitGroups = React.useMemo(() => getUniqueValues('changeKitGroup', {
    device: filterDevices,
    projectName: filterProjectNames,
    nickname: filterNicknames,
    lbGroup: filterLBGroups
  }), [products, filterDevices, filterProjectNames, filterNicknames, filterLBGroups]);

  const uniqueLBGroups = React.useMemo(() => getUniqueValues('lbGroup', {
    device: filterDevices,
    projectName: filterProjectNames,
    nickname: filterNicknames,
    changeKitGroup: filterChangeKitGroups
  }), [products, filterDevices, filterProjectNames, filterNicknames, filterChangeKitGroups]);

  const filteredProducts = React.useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = (p.device || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (p.projectName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (p.nickname || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchDevice = filterDevices.length === 0 || filterDevices.includes(String(p.device || ''));
      const matchProjectName = filterProjectNames.length === 0 || filterProjectNames.includes(String(p.projectName || ''));
      const matchNickname = filterNicknames.length === 0 || filterNicknames.includes(String(p.nickname || ''));
      const matchChangeKitGroup = filterChangeKitGroups.length === 0 || filterChangeKitGroups.includes(String(p.changeKitGroup || ''));
      const matchLBGroup = filterLBGroups.length === 0 || filterLBGroups.includes(String(p.lbGroup || ''));

      return matchSearch && matchDevice && matchProjectName && matchNickname && matchChangeKitGroup && matchLBGroup;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key as keyof Product] || '');
        const bValue = String(b[sortConfig.key as keyof Product] || '');
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, debouncedSearchTerm, filterDevices, filterProjectNames, filterNicknames, filterChangeKitGroups, filterLBGroups, sortConfig]);

  const allColumns = [
    { key: 'facility', label: 'Facility' },
    { key: 'device', label: 'Device' },
    { key: 'projectName', label: 'Project name' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'tester', label: 'Tester' },
    { key: 'handler', label: 'Handler' },
    { key: 'temperature', label: 'Temperature' },
    { key: 'insertion', label: 'Insertion' },
    { key: 'siteNumber', label: 'Site number' },
    { key: 'ballCountDevice', label: 'Ball count(device)' },
    { key: 'changeKitGroup', label: 'Change kit Group' },
    { key: 'kitName1', label: 'Kit Name1' },
    { key: 'kitName2', label: 'Kit Name2' },
    { key: 'kitName3', label: 'Kit Name3' },
    { key: 'kitName4', label: 'Kit Name4' },
    { key: 'kitName5', label: 'Kit Name5' },
    { key: 'kitName6', label: 'Kit Name6' },
    { key: 'lbGroup', label: 'LB Group' },
    { key: 'socketName1', label: 'Socket Name1' },
    { key: 'socketName2', label: 'Socket Name2' },
  ];

  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  const missingLifeTimeData = React.useMemo(() => {
    if (viewMode !== 'missingLifeTime') return [];
    
    const missing: {
      id: string;
      facility: string;
      device: string;
      insertion: string;
      socketName: string;
      socketType: 'Socket 1' | 'Socket 2';
    }[] = [];

    products.forEach(p => {
      // Check socketName1
      if (p.socketName1) {
        const names1 = p.socketName1.split(',').map(s => s.trim()).filter(Boolean);
        names1.forEach(name => {
          const related = lifeTimesData.filter(lt => {
            const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
            return ltGroups.includes(name);
          });
          if (related.length === 0) {
            missing.push({
              id: `${p.id}-1-${name}`,
              facility: p.facility || '-',
              device: p.device || '-',
              insertion: p.insertion || '-',
              socketName: name,
              socketType: 'Socket 1'
            });
          }
        });
      }
      
      // Check socketName2
      if (p.socketName2) {
        const names2 = p.socketName2.split(',').map(s => s.trim()).filter(Boolean);
        names2.forEach(name => {
          const related = lifeTimesData.filter(lt => {
            const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
            return ltGroups.includes(name);
          });
          if (related.length === 0) {
            missing.push({
              id: `${p.id}-2-${name}`,
              facility: p.facility || '-',
              device: p.device || '-',
              insertion: p.insertion || '-',
              socketName: name,
              socketType: 'Socket 2'
            });
          }
        });
      }
    });

    return missing;
  }, [products, lifeTimesData, viewMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-4xl italic text-zinc-900 tracking-tight">Product Inventory</h2>
            <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Manage your tooling assets</p>
          </div>
          <div className="flex gap-2 bg-zinc-100/80 p-1.5 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('inventory')}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                viewMode === 'inventory' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
              )}
            >
              Inventory
            </button>
            <button
              onClick={() => setViewMode('missingLifeTime')}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                viewMode === 'missingLifeTime' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
              )}
            >
              Missing Life Time Check
            </button>
          </div>
        </div>
        {isAdmin && viewMode === 'inventory' && (
          <button 
            onClick={() => setEditingId('new')}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95 whitespace-nowrap mb-2 sm:mb-0"
          >
            <Plus className="h-4 w-4" />
            <span>ADD PRODUCT</span>
          </button>
        )}
      </div>

      {viewMode === 'inventory' ? (
        <>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between surface-card p-2">
            <div className="flex flex-wrap items-center gap-2 flex-1 w-full lg:w-auto pb-2 lg:pb-0">
              <div className="flex items-center gap-1.5 px-2">
                <Filter className="h-3.5 w-3.5 text-zinc-400" />
                <button
                  onClick={() => {
                    setFilterDevices([]);
                    setFilterProjectNames([]);
                    setFilterNicknames([]);
                    setFilterChangeKitGroups([]);
                    setFilterLBGroups([]);
                  }}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
              <div className="w-px h-4 bg-zinc-200 shrink-0"></div>
              <div className="flex flex-wrap items-center gap-2 px-1">
                <MultiSelectDropdown
                  values={filterDevices}
                  onChange={setFilterDevices}
                  options={uniqueDevices}
                  placeholder="Devices"
                />
                <MultiSelectDropdown
                  values={filterProjectNames}
                  onChange={setFilterProjectNames}
                  options={uniqueProjectNames}
                  placeholder="Projects"
                />
                <MultiSelectDropdown
                  values={filterNicknames}
                  onChange={setFilterNicknames}
                  options={uniqueNicknames}
                  placeholder="Nicknames"
                />
                <MultiSelectDropdown
                  values={filterChangeKitGroups}
                  onChange={setFilterChangeKitGroups}
                  options={uniqueChangeKitGroups}
                  placeholder="Kit Groups"
                />
                <MultiSelectDropdown
                  values={filterLBGroups}
                  onChange={setFilterLBGroups}
                  options={uniqueLBGroups}
                  placeholder="LB Groups"
                />
                <div className="w-px h-4 bg-zinc-200 shrink-0 mx-1"></div>
                <MultiSelectDropdown
                  values={allColumns.filter(c => visibleColumns.includes(c.key)).map(c => c.label)}
                  onChange={(labels) => {
                    const keys = allColumns.filter(c => labels.includes(c.label)).map(c => c.key);
                    setVisibleColumns(keys);
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
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="relative overflow-hidden surface-card">
            <DoubleScrollbar>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50">
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
                        {columns.map(col => (
                          <td key={col.key} className="px-6 py-3">
                            <input
                              type="text"
                              autoFocus={col.key === 'facility'}
                              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                              onChange={(e) => setNewProduct({ ...newProduct, [col.key]: e.target.value })}
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
                    {filteredProducts.slice(0, displayCount).map((product, idx) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        idx={idx}
                        columns={columns}
                        isAdmin={isAdmin}
                        editingId={editingId}
                        setEditingId={setEditingId}
                        handleUpdate={handleUpdate}
                        setModal={setModal}
                        setSelectedDevice={setSelectedDevice}
                        setSaveModal={setSaveModal}
                      />
                    ))}
                  </AnimatePresence>
                  {filteredProducts.length > displayCount && (
                    <tr>
                      <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                        Showing {displayCount} of {filteredProducts.length} products. Use filters to narrow down results, or <button onClick={() => setDisplayCount(prev => prev + 200)} className="text-brand-primary hover:underline font-medium not-italic">load 200 more</button>.
                      </td>
                    </tr>
                  )}
                  {displayCount > 100 && filteredProducts.length <= displayCount && (
                    <tr>
                      <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                        Showing all {filteredProducts.length} products. <button onClick={() => setDisplayCount(100)} className="text-brand-primary hover:underline font-medium not-italic">Show less</button>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DoubleScrollbar>
          </div>
        </>
      ) : (
        <div className="surface-card p-6">
          <div className="mb-6 space-y-1">
            <h3 className="text-xl font-bold text-zinc-900">Missing Life Time Records</h3>
            <p className="text-sm text-zinc-500">The following Product Info entries have a Socket Name that is missing from the Life Time data.</p>
          </div>
          {missingLifeTimeData.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50">
              <Check className="mx-auto h-8 w-8 text-emerald-500 mb-3" />
              <div className="text-sm font-medium text-zinc-900">All Good!</div>
              <div className="text-xs text-zinc-500 mt-1">No missing life time records found.</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200">
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Facility</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Device</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Insertion</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Socket Name</th>
                    <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {missingLifeTimeData.map((item, idx) => (
                    <tr key={item.id} className={cn("hover:bg-zinc-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-zinc-50/30")}>
                      <td className="px-6 py-3 text-zinc-900">{item.facility}</td>
                      <td className="px-6 py-3 font-bold text-brand-primary">
                        <button onClick={() => setSelectedDevice(item.device)} className="hover:underline">{item.device}</button>
                      </td>
                      <td className="px-6 py-3 text-zinc-600">{item.insertion}</td>
                      <td className="px-6 py-3 text-rose-600 font-medium">{item.socketName}</td>
                      <td className="px-6 py-3 text-zinc-500 text-xs">{item.socketType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                Are you sure you want to delete this product record? This action cannot be undone and will be permanently removed from the system.
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

      {/* Device Details Modal */}
      <AnimatePresence>
        {selectedDevice && (
          <DeviceDetailsModal
            device={selectedDevice}
            products={products.filter(p => p.device === selectedDevice)}
            onClose={() => setSelectedDevice(null)}
            onNavigate={onNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeviceDetailsModal({ device, products, onClose, onNavigate }: { device: string, products: Product[], onClose: () => void, onNavigate?: (tab: string) => void }) {
  const { sockets: socketsData, changeKits: kitsData, loadBoards: loadBoardsData, lifeTimes: lifeTimesData, loading } = useData();

  const insertions = Array.from(new Set(products.map(p => p.insertion).filter(Boolean)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col rounded-[2rem] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 p-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-serif italic text-zinc-900">Device: {device}</h3>
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Insertion Details & Tooling Counts</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {insertions.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No insertions found for this device.</p>
              ) : (
                insertions.map(insertion => {
                  const insertionProducts = products.filter(p => p.insertion === insertion);
                  
                  const socket1Names = Array.from(new Set(
                    insertionProducts.flatMap(p => (p.socketName1 || '').split(',').map(s => s.trim()).filter(Boolean))
                  ));
                  const socket2Names = Array.from(new Set(
                    insertionProducts.flatMap(p => (p.socketName2 || '').split(',').map(s => s.trim()).filter(Boolean))
                  ));
                  const kitGroups = new Set(
                    insertionProducts.flatMap(p => (p.changeKitGroup || '').split(',').map(s => s.trim()).filter(Boolean))
                  );
                  const lbGroups = new Set(
                    insertionProducts.flatMap(p => (p.lbGroup || '').split(',').map(s => s.trim()).filter(Boolean))
                  );

                  return (
                    <div key={insertion} className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5">
                      <h4 className="mb-4 text-lg font-bold text-zinc-900">{insertion}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Sockets</div>
                          <div className="space-y-3">
                            {socket1Names.map(name => {
                              const count = socketsData.filter(s => {
                                const fac = (s.facility || '').trim().toUpperCase();
                                const loc = (s.location || '').trim().toUpperCase();
                                const sGroups = (s.socketGroupPin1 || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && sGroups.includes(name);
                              }).length;
                              const relatedLifeTimes = lifeTimesData.filter(lt => {
                                const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
                                return ltGroups.includes(name);
                              });
                              return (
                                <div key={`s1-${name}`} className="flex flex-col gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <button 
                                      onClick={() => {
                                        window.sessionStorage.setItem('socketInfo_filterSocketGroups', JSON.stringify([name]));
                                        onClose();
                                        onNavigate?.('socket');
                                      }}
                                      className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                      title={name}
                                    >
                                      {name} <span className="text-xs text-zinc-400 font-normal whitespace-nowrap">(Name1)</span>
                                    </button>
                                    <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                  </div>
                                  {relatedLifeTimes.length > 0 && (
                                    <div className="space-y-2 mt-1">
                                      {relatedLifeTimes.map((lt, idx) => (
                                        <div key={idx} className="bg-zinc-50/80 rounded p-2 text-[11px] space-y-1 border border-zinc-100">
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Pogo Pin:</span>
                                            {lt.pogoPin1Pn ? (
                                              <button 
                                                onClick={() => {
                                                  window.sessionStorage.setItem('pogoPinInfo_filterPinPns', JSON.stringify([lt.pogoPin1Pn]));
                                                  onClose();
                                                  onNavigate?.('pogo-pin');
                                                }}
                                                className="font-medium text-zinc-900 hover:text-brand-primary hover:underline text-left text-right break-words max-w-[120px]"
                                              >
                                                {lt.pogoPin1Pn}
                                              </button>
                                            ) : (
                                              <span className="font-medium text-zinc-900">-</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Req Q'ty:</span>
                                            <span className="font-medium text-zinc-900">{lt.pogoPinQty || '-'}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Life Time:</span>
                                            <span className="font-medium text-zinc-900">{lt.lifeTime || '-'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {socket2Names.map(name => {
                              const count = socketsData.filter(s => {
                                const fac = (s.facility || '').trim().toUpperCase();
                                const loc = (s.location || '').trim().toUpperCase();
                                const sGroups = (s.socketGroupPin1 || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && sGroups.includes(name);
                              }).length;
                              const relatedLifeTimes = lifeTimesData.filter(lt => {
                                const ltGroups = (lt.socketGroup || '').split(',').map((s: string) => s.trim());
                                return ltGroups.includes(name);
                              });
                              return (
                                <div key={`s2-${name}`} className="flex flex-col gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <button 
                                      onClick={() => {
                                        window.sessionStorage.setItem('socketInfo_filterSocketGroups', JSON.stringify([name]));
                                        onClose();
                                        onNavigate?.('socket');
                                      }}
                                      className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                      title={name}
                                    >
                                      {name} <span className="text-xs text-zinc-400 font-normal whitespace-nowrap">(Name2)</span>
                                    </button>
                                    <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                  </div>
                                  {relatedLifeTimes.length > 0 && (
                                    <div className="space-y-2 mt-1">
                                      {relatedLifeTimes.map((lt, idx) => (
                                        <div key={idx} className="bg-zinc-50/80 rounded p-2 text-[11px] space-y-1 border border-zinc-100">
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Pogo Pin:</span>
                                            {lt.pogoPin1Pn ? (
                                              <button 
                                                onClick={() => {
                                                  window.sessionStorage.setItem('pogoPinInfo_filterPinPns', JSON.stringify([lt.pogoPin1Pn]));
                                                  onClose();
                                                  onNavigate?.('pogo-pin');
                                                }}
                                                className="font-medium text-zinc-900 hover:text-brand-primary hover:underline text-left text-right break-words max-w-[120px]"
                                              >
                                                {lt.pogoPin1Pn}
                                              </button>
                                            ) : (
                                              <span className="font-medium text-zinc-900">-</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Req Q'ty:</span>
                                            <span className="font-medium text-zinc-900">{lt.pogoPinQty || '-'}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Life Time:</span>
                                            <span className="font-medium text-zinc-900">{lt.lifeTime || '-'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {socket1Names.length === 0 && socket2Names.length === 0 && (
                              <div className="text-2xl font-light text-brand-primary">0</div>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Change Kits</div>
                          <div className="space-y-3">
                            {Array.from(kitGroups).map(name => {
                              const count = kitsData.filter(k => {
                                const fac = (k.facility || '').trim().toUpperCase();
                                const loc = (k.location || '').trim().toUpperCase();
                                const kGroups = (k.changeKitGroup || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && kGroups.includes(name);
                              }).length;
                              return (
                                <div key={`kit-${name}`} className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <button 
                                    onClick={() => {
                                      window.sessionStorage.setItem('changeKitInfo_filterChangeKitGroups', JSON.stringify([name]));
                                      onClose();
                                      onNavigate?.('change-kit');
                                    }}
                                    className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                    title={name}
                                  >
                                    {name}
                                  </button>
                                  <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                </div>
                              );
                            })}
                            {kitGroups.size === 0 && (
                              <div className="text-2xl font-light text-brand-primary">0</div>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Load Boards</div>
                          <div className="space-y-3">
                            {Array.from(lbGroups).map(name => {
                              const count = loadBoardsData.filter(lb => {
                                const fac = (lb.facility || '').trim().toUpperCase();
                                const loc = (lb.location || '').trim().toUpperCase();
                                const lGroups = (lb.lbGroup || '').split(',').map((s: string) => s.trim());
                                return fac === loc && loc && lGroups.includes(name);
                              }).length;
                              return (
                                <div key={`lb-${name}`} className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <button 
                                    onClick={() => {
                                      window.sessionStorage.setItem('lbInfo_filterLBGroups', JSON.stringify([name]));
                                      onClose();
                                      onNavigate?.('load-board');
                                    }}
                                    className="text-sm font-medium text-zinc-700 hover:text-brand-primary hover:underline break-words text-left" 
                                    title={name}
                                  >
                                    {name}
                                  </button>
                                  <span className="text-lg font-light text-brand-primary shrink-0 mt-0.5">{count}</span>
                                </div>
                              );
                            })}
                            {lbGroups.size === 0 && (
                              <div className="text-2xl font-light text-brand-primary">0</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
