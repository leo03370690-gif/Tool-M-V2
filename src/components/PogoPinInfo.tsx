import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Search, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PogoPin {
  id: string;
  facility: string;
  pinPn: string;
  qty: number;
}

export default function PogoPinInfo({ isAdmin, selectedFacility }: { isAdmin: boolean, selectedFacility: string }) {
  const [pins, setPins] = useState<PogoPin[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  useEffect(() => {
    const q = query(collection(db, 'pogoPins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PogoPin));
      if (selectedFacility !== 'ALL') {
        data = data.filter(p => (p.facility || '').trim().toUpperCase() === selectedFacility);
      }
      data.sort((a, b) => (a.pinPn || '').localeCompare(b.pinPn || ''));
      setPins(data);
    }, (error) => {
      console.error("Error fetching pogo pins:", error);
    });
    return () => unsubscribe();
  }, [selectedFacility]);

  const handleUpdate = async (id: string, data: Partial<PogoPin>) => {
    await updateDoc(doc(db, 'pogoPins', id), data);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (modal.id) {
      await deleteDoc(doc(db, 'pogoPins', modal.id));
      setModal({ isOpen: false, id: null });
    }
  };

  const filteredPins = pins.filter(p => 
    (p.pinPn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900">Pogo Pin Info</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Monitor pogo pin inventory levels</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search pins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={async () => {
                const docRef = await addDoc(collection(db, 'pogoPins'), { pinPn: 'NEW_PIN', qty: 0, facility: '' });
                setEditingId(docRef.id);
              }}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>ADD PIN</span>
            </button>
          )}
        </div>
      </div>

      <motion.div 
        layout
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredPins.map((pin, idx) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              key={pin.id} 
              className="group relative rounded-3xl border border-zinc-100 bg-white p-8 card-shadow transition-all hover:border-brand-primary/20"
            >
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Facility</p>
                    {editingId === pin.id ? (
                      <input
                        type="text"
                        defaultValue={pin.facility || ''}
                        className="w-full border-b border-brand-primary bg-transparent text-sm font-bold focus:outline-none py-1"
                        onBlur={(e) => handleUpdate(pin.id, { facility: e.target.value })}
                      />
                    ) : (
                      <h3 className="text-sm font-bold text-zinc-500">{pin.facility || '-'}</h3>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Quantity</p>
                    {editingId === pin.id ? (
                      <input
                        type="number"
                        defaultValue={pin.qty}
                        className="w-20 border-b border-brand-primary bg-transparent text-3xl font-bold focus:outline-none py-1 text-right"
                        onBlur={(e) => handleUpdate(pin.id, { qty: Number(e.target.value) })}
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
                  {editingId === pin.id ? (
                    <input
                      type="text"
                      defaultValue={pin.pinPn}
                      className="w-full border-b border-brand-primary bg-transparent text-xl font-bold focus:outline-none py-1"
                      onBlur={(e) => handleUpdate(pin.id, { pinPn: e.target.value })}
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-brand-primary tracking-tight">{pin.pinPn}</h3>
                  )}
                </div>
              </div>
              
              {isAdmin && (
                <div className="mt-8 flex gap-2 opacity-0 transition-all group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
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
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
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
    </div>
  );
}
