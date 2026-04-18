import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Check, X, Loader2, ChevronDown } from 'lucide-react';
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

const SITES = [...Array.from({ length: 20 }, (_, i) => `Site ${i + 1}`), 'Other'];
const STATUS_OPTIONS = ['Done', 'On-going', 'Pending', 'Returned'];

export default function MaintenanceRecord({ initialData, onCancel, onSuccess, userEmail }: MaintenanceRecordProps) {
  const [loading, setLoading] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>(['Site 1']);
  const [otherSiteReason, setOtherSiteReason] = useState('');
  const [siteIssues, setSiteIssues] = useState<Record<string, string>>({});
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const siteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (siteRef.current && !siteRef.current.contains(event.target as Node)) {
        setIsSiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState({
    facility: initialData?.facility || '',
    lbNo: initialData?.lbName || '',
    sniNo: '',
    lbType: '',
    insertion: initialData?.insertion || '',
    vendor: '',
    status: 'Pending',
    issue: '',
    issueDate: new Date().toISOString().split('T')[0],
    repairDate: '',
    action: ''
  });

  const toggleSite = (site: string) => {
    if (selectedSites.includes(site)) {
      setSelectedSites(selectedSites.filter(s => s !== site));
      // Cleanup issue state when site is unselected
      const newIssues = { ...siteIssues };
      delete newIssues[site];
      setSiteIssues(newIssues);
    } else {
      setSelectedSites([...selectedSites, site]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSites.length === 0) {
      alert("Please select at least one site.");
      return;
    }
    
    // Validate that every selected site has an issue description
    const missingIssue = selectedSites.find(s => !siteIssues[s] || siteIssues[s].trim() === '');
    if (missingIssue) {
      const siteName = missingIssue === 'Other' ? (otherSiteReason || 'Other site') : missingIssue;
      alert(`Please enter an issue description for ${siteName}.`);
      return;
    }
    
    setLoading(true);
    try {
      const finalSitesStr = selectedSites
        .map(s => s === 'Other' ? (otherSiteReason ? `Other (${otherSiteReason})` : 'Other') : s)
        .join(', ');

      const combinedIssues = selectedSites
        .map(s => {
           const siteName = s === 'Other' ? (otherSiteReason ? `Other (${otherSiteReason})` : 'Other') : s;
           return `[${siteName}] ${siteIssues[s]}`;
        })
        .join(' • ');

      const record = {
        ...formData,
        site: finalSitesStr,
        issue: combinedIssues,
        createdBy: userEmail,
        createdAt: new Date().toISOString()
      };

      
      await addDoc(collection(db, 'maintenanceRecords'), record);
      
      // Perform success callback early to allow UI to transition while Firestore syncs in background
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

        <div className="space-y-6 md:col-span-2">
          <div className="space-y-2 relative" ref={siteRef}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Site(s)</label>
            <button
              type="button"
              onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
              className="w-full flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-left"
            >
              <span className="truncate text-zinc-700">
                {selectedSites.length > 0 ? selectedSites.join(', ') : 'Select Sites'}
              </span>
              <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform shrink-0", isSiteDropdownOpen && "rotate-180")} />
            </button>
            
            {isSiteDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl p-1 custom-scrollbar">
                {SITES.map(s => {
                  const isSelected = selectedSites.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSite(s); }}
                      className="w-full flex items-center px-3 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-700 text-sm text-left"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-[4px] border mr-3 flex items-center justify-center flex-shrink-0 transition-colors",
                        isSelected ? "border-brand-primary bg-brand-primary text-white" : "border-zinc-300 bg-white"
                      )}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{s}</span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Other Reason Input */}
            {selectedSites.includes('Other') && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="pt-2"
              >
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-primary/80 mb-1 block">Other Site Details</label>
                <input
                  type="text"
                  required={selectedSites.includes('Other')}
                  value={otherSiteReason}
                  onChange={(e) => setOtherSiteReason(e.target.value)}
                  className="w-full rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-brand-primary/40"
                  placeholder="Enter reason or site name"
                />
              </motion.div>
            )}
          </div>

          {/* Dynamic Issue Inputs by Site */}
          {selectedSites.length > 0 && (
            <div className="space-y-4 p-5 rounded-2xl border border-zinc-200 bg-zinc-50/50">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Issue Descriptions by Site</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSites.map(site => {
                  const displayName = site === 'Other' ? (otherSiteReason ? `Other (${otherSiteReason})` : 'Other') : site;
                  return (
                    <div key={site} className="space-y-1.5 p-4 bg-white rounded-xl border border-zinc-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary/30">
                      <span className="text-xs font-bold text-zinc-700 block line-clamp-1">{displayName}</span>
                      <input
                        type="text"
                        required
                        value={siteIssues[site] || ''}
                        onChange={(e) => setSiteIssues({ ...siteIssues, [site]: e.target.value })}
                        className="w-full bg-transparent text-sm focus:outline-none text-zinc-600 placeholder:text-zinc-300"
                        placeholder="Enter abnormality reason..."
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
