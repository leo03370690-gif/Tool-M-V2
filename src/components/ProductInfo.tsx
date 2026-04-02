import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Search, MoreHorizontal, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';

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
  setSelectedDevice
}: { 
  product: Product, 
  idx: number, 
  columns: any[], 
  isAdmin: boolean, 
  editingId: string | null, 
  setEditingId: (id: string | null) => void, 
  handleUpdate: (id: string, data: any) => void, 
  setModal: (modal: any) => void,
  setSelectedDevice: (device: string) => void
}) => {
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
          {editingId === product.id ? (
            <input
              type="text"
              defaultValue={product[col.key as keyof Product] as string}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
              onBlur={(e) => handleUpdate(product.id, { [col.key]: e.target.value })}
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
        </td>
      )}
    </motion.tr>
  );
});

export default function ProductInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const [filterDevices, setFilterDevices] = useState<string[]>([]);
  const [filterProjectNames, setFilterProjectNames] = useState<string[]>([]);
  const [filterNicknames, setFilterNicknames] = useState<string[]>([]);
  const [filterChangeKitGroups, setFilterChangeKitGroups] = useState<string[]>([]);
  const [filterLBGroups, setFilterLBGroups] = useState<string[]>([]);

  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      if (selectedFacility !== 'ALL') {
        data = data.filter(p => (p.facility || '').trim().toUpperCase() === selectedFacility);
      }
      data.sort((a, b) => (a.device || '').localeCompare(b.device || ''));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedFacility]);

  const handleAdd = async () => {
    if (!newProduct.device) return;
    await addDoc(collection(db, 'products'), newProduct);
    setNewProduct({});
    setEditingId(null);
  };

  const handleUpdate = async (id: string, data: Partial<Product>) => {
    await updateDoc(doc(db, 'products', id), data);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      await deleteDoc(doc(db, 'products', modal.id));
      setModal({ isOpen: false, id: null });
    }
  };

  const uniqueDevices = React.useMemo(() => Array.from(new Set(products.map(p => String(p.device || '')).filter(Boolean))).sort(), [products]);
  const uniqueProjectNames = React.useMemo(() => Array.from(new Set(products.map(p => String(p.projectName || '')).filter(Boolean))).sort(), [products]);
  const uniqueNicknames = React.useMemo(() => Array.from(new Set(products.map(p => String(p.nickname || '')).filter(Boolean))).sort(), [products]);
  const uniqueChangeKitGroups = React.useMemo(() => Array.from(new Set(products.map(p => String(p.changeKitGroup || '')).filter(Boolean))).sort(), [products]);
  const uniqueLBGroups = React.useMemo(() => Array.from(new Set(products.map(p => String(p.lbGroup || '')).filter(Boolean))).sort(), [products]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchSearch = (p.device || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.nickname || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDevice = filterDevices.length === 0 || filterDevices.includes(String(p.device || ''));
      const matchProjectName = filterProjectNames.length === 0 || filterProjectNames.includes(String(p.projectName || ''));
      const matchNickname = filterNicknames.length === 0 || filterNicknames.includes(String(p.nickname || ''));
      const matchChangeKitGroup = filterChangeKitGroups.length === 0 || filterChangeKitGroups.includes(String(p.changeKitGroup || ''));
      const matchLBGroup = filterLBGroups.length === 0 || filterLBGroups.includes(String(p.lbGroup || ''));

      return matchSearch && matchDevice && matchProjectName && matchNickname && matchChangeKitGroup && matchLBGroup;
    });
  }, [products, searchTerm, filterDevices, filterProjectNames, filterNicknames, filterChangeKitGroups, filterLBGroups]);

  const columns = [
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
    { key: 'lbGroup', label: 'LB Group' },
    { key: 'socketName1', label: 'Socket Name1' },
    { key: 'socketName2', label: 'Socket Name2' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900">Product Inventory</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Manage your tooling assets</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-2 py-1 shadow-sm">
            <Filter className="h-4 w-4 text-zinc-400 ml-2" />
            <MultiSelectDropdown
              values={filterDevices}
              onChange={setFilterDevices}
              options={uniqueDevices}
              placeholder="All Devices"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterProjectNames}
              onChange={setFilterProjectNames}
              options={uniqueProjectNames}
              placeholder="All Project Names"
            />
            <div className="w-px h-4 bg-zinc-200 mx-1"></div>
            <MultiSelectDropdown
              values={filterNicknames}
              onChange={setFilterNicknames}
              options={uniqueNicknames}
              placeholder="All Nicknames"
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
              values={filterLBGroups}
              onChange={setFilterLBGroups}
              options={uniqueLBGroups}
              placeholder="All LB Groups"
            />
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setEditingId('new')}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>ADD PRODUCT</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white">
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
                {filteredProducts.slice(0, 100).map((product, idx) => (
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
                  />
                ))}
              </AnimatePresence>
              {filteredProducts.length > 100 && (
                <tr>
                  <td colSpan={columns.length + (isAdmin ? 1 : 0)} className="px-6 py-8 text-center text-zinc-400 italic">
                    Showing first 100 of {filteredProducts.length} products. Use filters to narrow down results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DoubleScrollbar>
      </div>

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

      {/* Device Details Modal */}
      <AnimatePresence>
        {selectedDevice && (
          <DeviceDetailsModal
            device={selectedDevice}
            products={products.filter(p => p.device === selectedDevice)}
            onClose={() => setSelectedDevice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeviceDetailsModal({ device, products, onClose }: { device: string, products: Product[], onClose: () => void }) {
  const [socketsData, setSocketsData] = useState<any[]>([]);
  const [kitsData, setKitsData] = useState<any[]>([]);
  const [loadBoardsData, setLoadBoardsData] = useState<any[]>([]);
  const [lifeTimesData, setLifeTimesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSockets = onSnapshot(collection(db, 'sockets'), (snapshot) => {
      setSocketsData(snapshot.docs.map(doc => doc.data()));
    });
    const unsubKits = onSnapshot(collection(db, 'changeKits'), (snapshot) => {
      setKitsData(snapshot.docs.map(doc => doc.data()));
    });
    const unsubLoadBoards = onSnapshot(collection(db, 'loadBoards'), (snapshot) => {
      setLoadBoardsData(snapshot.docs.map(doc => doc.data()));
    });
    const unsubLifeTimes = onSnapshot(collection(db, 'lifeTimes'), (snapshot) => {
      setLifeTimesData(snapshot.docs.map(doc => doc.data()));
    });

    const timer = setTimeout(() => setLoading(false), 500);

    return () => {
      unsubSockets();
      unsubKits();
      unsubLoadBoards();
      unsubLifeTimes();
      clearTimeout(timer);
    };
  }, []);

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
                  
                  const socket1Names = Array.from(new Set(insertionProducts.map(p => p.socketName1).filter(Boolean)));
                  const socket2Names = Array.from(new Set(insertionProducts.map(p => p.socketName2).filter(Boolean)));
                  const kitGroups = new Set(insertionProducts.map(p => p.changeKitGroup).filter(Boolean));
                  const lbGroups = new Set(insertionProducts.map(p => p.lbGroup).filter(Boolean));

                  return (
                    <div key={insertion} className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5">
                      <h4 className="mb-4 text-lg font-bold text-zinc-900">{insertion}</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Sockets</div>
                          <div className="space-y-3">
                            {socket1Names.map(name => {
                              const count = socketsData.filter(s => {
                                const fac = (s.facility || '').trim().toUpperCase();
                                const loc = (s.location || '').trim().toUpperCase();
                                return fac === loc && loc && s.socketGroupPin1 === name;
                              }).length;
                              const relatedLifeTimes = lifeTimesData.filter(lt => lt.socketGroup === name);
                              return (
                                <div key={`s1-${name}`} className="flex flex-col gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-700 truncate pr-2" title={name}>
                                      {name} <span className="text-xs text-zinc-400 font-normal">(Name1)</span>
                                    </span>
                                    <span className="text-lg font-light text-brand-primary">{count}</span>
                                  </div>
                                  {relatedLifeTimes.length > 0 && (
                                    <div className="space-y-2 mt-1">
                                      {relatedLifeTimes.map((lt, idx) => (
                                        <div key={idx} className="bg-zinc-50/80 rounded p-2 text-[11px] space-y-1 border border-zinc-100">
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Pogo Pin:</span>
                                            <span className="font-medium text-zinc-900">{lt.pogoPin1Pn || '-'}</span>
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
                                return fac === loc && loc && s.socketGroupPin1 === name;
                              }).length;
                              const relatedLifeTimes = lifeTimesData.filter(lt => lt.socketGroup === name);
                              return (
                                <div key={`s2-${name}`} className="flex flex-col gap-2 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-700 truncate pr-2" title={name}>
                                      {name} <span className="text-xs text-zinc-400 font-normal">(Name2)</span>
                                    </span>
                                    <span className="text-lg font-light text-brand-primary">{count}</span>
                                  </div>
                                  {relatedLifeTimes.length > 0 && (
                                    <div className="space-y-2 mt-1">
                                      {relatedLifeTimes.map((lt, idx) => (
                                        <div key={idx} className="bg-zinc-50/80 rounded p-2 text-[11px] space-y-1 border border-zinc-100">
                                          <div className="flex justify-between items-center">
                                            <span className="text-zinc-500">Pogo Pin:</span>
                                            <span className="font-medium text-zinc-900">{lt.pogoPin1Pn || '-'}</span>
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
                                return fac === loc && loc && k.changeKitGroup === name;
                              }).length;
                              return (
                                <div key={`kit-${name}`} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <span className="text-sm font-medium text-zinc-700 truncate pr-2" title={name}>
                                    {name}
                                  </span>
                                  <span className="text-lg font-light text-brand-primary">{count}</span>
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
                                return fac === loc && loc && lb.lbGroup === name;
                              }).length;
                              return (
                                <div key={`lb-${name}`} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                                  <span className="text-sm font-medium text-zinc-700 truncate pr-2" title={name}>
                                    {name}
                                  </span>
                                  <span className="text-lg font-light text-brand-primary">{count}</span>
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
