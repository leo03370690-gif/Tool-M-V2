import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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

export default function ProductInfo({ isAdmin }: { isAdmin: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});

  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('device'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const filteredProducts = products.filter(p => 
    (p.device || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.nickname || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center gap-4">
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
                {filteredProducts.map((product, idx) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    key={product.id} 
                    className="group hover:bg-zinc-50/80 transition-colors"
                  >
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-4 text-zinc-600 whitespace-nowrap">
                        {editingId === product.id ? (
                          <input
                            type="text"
                            defaultValue={product[col.key as keyof Product] as string}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                            onBlur={(e) => handleUpdate(product.id, { [col.key]: e.target.value })}
                          />
                        ) : (
                          <span className={cn(
                            "font-medium",
                            col.key === 'device' ? "text-brand-primary font-bold" : "text-zinc-500"
                          )}>
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
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
