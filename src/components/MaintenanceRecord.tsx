import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface MaintenanceRecordProps {
  initialData?: {
    facility?: string;
    lbName?: string;
    insertion?: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
  userEmail: string;
}

const SITES = Array.from({ length: 20 }, (_, i) => `Site ${i + 1}`);
const STATUS_OPTIONS = ['Done', 'On-going', 'Pending'];

export default function MaintenanceRecord({ initialData, onCancel, onSuccess, userEmail }: MaintenanceRecordProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    facility: initialData?.facility || '',
    lbNo: initialData?.lbName || '',
    sniNo: '',
    lbType: '',
    insertion: initialData?.insertion || '',
    vendor: '',
    status: 'Pending',
    site: SITES[0],
    issue: '',
    issueDate: new Date().toISOString().split('T')[0],
    repairDate: '',
    action: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'maintenanceRecords'), {
        ...formData,
        createdBy: userEmail,
        createdAt: new Date().toISOString()
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      alert('Failed to save record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-6">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl italic text-zinc-900 tracking-tight">New Maintenance Record</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Record Load Board issues and repairs</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Facility</label>
          <input
            type="text"
            required
            value={formData.facility}
            onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
            placeholder="Enter facility"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">LB No.</label>
          <input
            type="text"
            required
            value={formData.lbNo}
            onChange={(e) => setFormData({ ...formData, lbNo: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
            placeholder="Enter LB Number"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">SNI No.</label>
          <input
            type="text"
            value={formData.sniNo}
            onChange={(e) => setFormData({ ...formData, sniNo: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
            placeholder="Enter SNI Number"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">LB Type</label>
          <input
            type="text"
            value={formData.lbType}
            onChange={(e) => setFormData({ ...formData, lbType: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
            placeholder="Enter LB Type"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Insertion</label>
          <input
            type="text"
            value={formData.insertion}
            onChange={(e) => setFormData({ ...formData, insertion: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
            placeholder="Enter Insertion"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Vendor</label>
          <input
            type="text"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
            placeholder="Enter Vendor"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all appearance-none"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Issue Date</label>
          <input
            type="date"
            required
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Repair Date</label>
          <input
            type="date"
            value={formData.repairDate}
            onChange={(e) => setFormData({ ...formData, repairDate: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Site</label>
              <select
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all appearance-none"
              >
                {SITES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Issue Description</label>
              <input
                type="text"
                value={formData.issue}
                onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                placeholder="Enter abnormality reason"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Action</label>
          <textarea
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all min-h-[100px]"
            placeholder="Enter action taken"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-zinc-100">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-8 py-3 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-10 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 shadow-lg shadow-black/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>Save Record</span>
          </button>
        </div>
      </form>
    </div>
  );
}
