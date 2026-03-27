import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Socket {
  id: string;
  facility: string;
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

export default function SocketInfo({ isAdmin }: { isAdmin: boolean }) {
  const [sockets, setSockets] = useState<Socket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'sockets'), orderBy('toolsId'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socket));
      setSockets(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sockets:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const filteredSockets = sockets.filter(s => 
    (s.toolsId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.project || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: 'facility', label: 'Facility' },
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900">Socket Inventory</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Monitor socket health and usage</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search sockets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={async () => {
                const docRef = await addDoc(collection(db, 'sockets'), { toolsId: 'NEW_SOCKET' });
                setEditingId(docRef.id);
              }}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>ADD SOCKET</span>
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
                {filteredSockets.map((socket, idx) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.01 }}
                    key={socket.id} 
                    className="group hover:bg-zinc-50/80 transition-colors"
                  >
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-4 text-zinc-600 whitespace-nowrap">
                        {editingId === socket.id ? (
                          <input
                            type={typeof socket[col.key as keyof Socket] === 'number' ? 'number' : 'text'}
                            defaultValue={socket[col.key as keyof Socket] as any}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                            onBlur={(e) => handleUpdate(socket.id, { [col.key]: typeof socket[col.key as keyof Socket] === 'number' ? Number(e.target.value) : e.target.value })}
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
