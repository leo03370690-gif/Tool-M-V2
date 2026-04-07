import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, Upload, FileSpreadsheet, Calculator, List, Eraser, Table, Search, Filter, ChevronDown, ArrowUpDown, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';

interface RowData {
  id: string;
  partNo: string;
  qty: number | '';
  remark: string;
  pogoPins: { name: string; need: number }[];
}

export default function RequiredPogoPin({ selectedFacility }: { selectedFacility: string }) {
  const [activeTab, setActiveTab] = useState<'input' | 'summary' | 'detailed'>('input');
  const [rows, setRows] = useState<RowData[]>(() => {
    const saved = localStorage.getItem('requiredPogoPinRows');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [products, setProducts] = useState<any[]>([]);
  const [lifeTimes, setLifeTimes] = useState<any[]>([]);
  const [pogoPinsData, setPogoPinsData] = useState<any[]>([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [detailedSearchTerm, setDetailedSearchTerm] = useState('');
  const [filterPogoPins, setFilterPogoPins] = usePersistentState<string[]>('reqPogoPin_filterPogoPins', []);
  const [filterNicknames, setFilterNicknames] = usePersistentState<string[]>('reqPogoPin_filterNicknames', []);
  const [filterDevices, setFilterDevices] = usePersistentState<string[]>('reqPogoPin_filterDevices', []);
  const [filterInsertions, setFilterInsertions] = usePersistentState<string[]>('reqPogoPin_filterInsertions', []);
  const [filterRequiredQty, setFilterRequiredQty] = usePersistentState<'all' | 'gt0' | 'lte0'>('reqPogoPin_filterRequiredQty', 'all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('requiredPogoPinRows', JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      let data = snapshot.docs.map(doc => doc.data());
      if (selectedFacility !== 'ALL') {
        data = data.filter(p => (p.facility || '').trim().toUpperCase() === selectedFacility);
      }
      setProducts(data);
    });
    
    const unsubLifeTimes = onSnapshot(collection(db, 'lifeTimes'), (snapshot) => {
      let data = snapshot.docs.map(doc => doc.data());
      if (selectedFacility !== 'ALL') {
        data = data.filter(r => (r.facility || '').trim().toUpperCase() === selectedFacility);
      }
      setLifeTimes(data);
    });

    const unsubPogoPins = onSnapshot(collection(db, 'pogoPins'), (snapshot) => {
      let data = snapshot.docs.map(doc => doc.data());
      if (selectedFacility !== 'ALL') {
        data = data.filter(p => (p.facility || '').trim().toUpperCase() === selectedFacility);
      }
      setPogoPinsData(data);
    });

    return () => {
      unsubProducts();
      unsubLifeTimes();
      unsubPogoPins();
    };
  }, [selectedFacility]);

  useEffect(() => {
    setRows(prevRows => prevRows.map(row => calculateRow(row, products, lifeTimes)));
  }, [products, lifeTimes]);

  const calculateRow = (row: RowData, prods: any[], lts: any[]): RowData => {
    if (!row.partNo) return { ...row, remark: '', pogoPins: [] };
    
    const deviceProducts = prods.filter(p => (p.device || '').trim().toUpperCase() === row.partNo.trim().toUpperCase());
    
    if (deviceProducts.length === 0) {
      return {
        ...row,
        remark: 'can not find product info',
        pogoPins: []
      };
    }

    const qty = Number(row.qty) || 0;
    const pogoMap: Record<string, number> = {};

    deviceProducts.forEach(product => {
      const processSocket = (socketName: string) => {
        if (!socketName) return;
        const relatedLts = lts.filter(lt => (lt.socketGroup || '').trim().toUpperCase() === socketName.trim().toUpperCase());
        relatedLts.forEach(lt => {
          if (!lt || !lt.lifeTime) return;
          const lifeTime = Number(lt.lifeTime);
          if (lifeTime === 0) return;

          const processPin = (pinName: string, pinQtyStr: string) => {
            if (!pinName || !pinQtyStr) return;
            const pogoQty = Number(pinQtyStr);
            if (!pogoQty) return;
            const need = qty ? Math.ceil((qty / lifeTime) * 1.1 * 1.2 * pogoQty) : 0;
            pogoMap[pinName] = (pogoMap[pinName] || 0) + need;
          };

          processPin(lt.pogoPin1Pn, lt.pogoPinQty);
          processPin(lt.pogoPin2Pn, lt.pogoPin2Qty);
          processPin(lt.pogoPin3Pn, lt.pogoPin3Qty);
          processPin(lt.pogoPin4Pn, lt.pogoPin4Qty);
        });
      };
      processSocket(product.socketName1);
      processSocket(product.socketName2);
    });

    const pogoPins = Object.entries(pogoMap).map(([name, need]) => ({ name, need }));

    return {
      ...row,
      remark: '',
      pogoPins
    };
  };

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now().toString(), partNo: '', qty: '', remark: '', pogoPins: [] }]);
  };

  const handleRowChange = (id: string, field: keyof RowData, value: string | number) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        return calculateRow(newRow, products, lifeTimes);
      }
      return row;
    }));
  };

  const handleDeleteRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const newRows: RowData[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {
          const partNo = String(row[0]);
          const qty = Number(row[1]) || '';
          const newRow: RowData = {
            id: Date.now().toString() + i,
            partNo,
            qty,
            remark: '',
            pogoPins: []
          };
          newRows.push(calculateRow(newRow, products, lifeTimes));
        }
      }
      setRows(prev => [...prev, ...newRows]);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getSummary = () => {
    const summary: Record<string, { required: number; onHand: number; final: number }> = {};
    
    // Calculate required
    rows.forEach(row => {
      row.pogoPins.forEach(pin => {
        if (!summary[pin.name]) {
          summary[pin.name] = { required: 0, onHand: 0, final: 0 };
        }
        summary[pin.name].required += pin.need;
      });
    });

    // Add on-hand and calculate final
    Object.keys(summary).forEach(pinName => {
      const onHandQty = pogoPinsData
        .filter(p => p.pinPn === pinName)
        .reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
      
      summary[pinName].onHand = onHandQty;
      summary[pinName].final = Math.max(0, summary[pinName].required - onHandQty);
    });

    return Object.entries(summary).sort((a, b) => b[1].required - a[1].required);
  };

  const summaryData = React.useMemo(() => getSummary(), [rows, pogoPinsData]);

  const getDetailedSummary = React.useCallback(() => {
    // 1. Find pogo pins from Summary list where final required > 0
    const targetPins = summaryData
      .filter(([, data]) => data.final > 0)
      .map(([pinName, data]) => ({ pinName, data }));
    
    return targetPins.map(({ pinName, data }) => {
      const details: any[] = [];
      const seen = new Set<string>();

      // Find all lifeTimes that use this pinName
      const relatedLts = lifeTimes.filter(lt => 
        lt.pogoPin1Pn === pinName || 
        lt.pogoPin2Pn === pinName || 
        lt.pogoPin3Pn === pinName || 
        lt.pogoPin4Pn === pinName
      );

      // 2. Find all insertions that use this pin
      const insertionsUsingPin = products.filter(prod => {
        const s1 = (prod.socketName1 || '').trim().toUpperCase();
        const s2 = (prod.socketName2 || '').trim().toUpperCase();
        
        return relatedLts.some(lt => {
          const sg = (lt.socketGroup || '').trim().toUpperCase();
          return sg === s1 || sg === s2;
        });
      });

      // 3. Process each matching insertion
      insertionsUsingPin.forEach(insertionProd => {
        const device = insertionProd.device || '';
        const nickName = insertionProd.nickname || '(No Nickname)';
        const insertion = insertionProd.insertion || '';
        const site = insertionProd.siteNumber || '';
        
        // 4. FCST from input list
        const matchingRows = rows.filter(r => r.partNo && r.partNo.trim().toUpperCase() === device.trim().toUpperCase());
        const fcst = matchingRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
        
        // 5. Find lifetime and reqQty for THIS SPECIFIC INSERTION and THIS PIN
        const s1 = (insertionProd.socketName1 || '').trim().toUpperCase();
        const s2 = (insertionProd.socketName2 || '').trim().toUpperCase();
        
        const matchedLt1 = relatedLts.find(lt => (lt.socketGroup || '').trim().toUpperCase() === s1);
        const matchedLt2 = relatedLts.find(lt => (lt.socketGroup || '').trim().toUpperCase() === s2);
        const matchedLt = matchedLt1 || matchedLt2;
        
        let reqPinQty = '';
        let lifetimeVal = matchedLt?.lifeTime || '';
        
        if (matchedLt) {
          if (matchedLt.pogoPin1Pn === pinName) reqPinQty = matchedLt.pogoPinQty;
          else if (matchedLt.pogoPin2Pn === pinName) reqPinQty = matchedLt.pogoPin2Qty;
          else if (matchedLt.pogoPin3Pn === pinName) reqPinQty = matchedLt.pogoPin3Qty;
          else if (matchedLt.pogoPin4Pn === pinName) reqPinQty = matchedLt.pogoPin4Qty;
        }

        const key = `${device}-${insertion}-${site}-${nickName}`;
        if (!seen.has(key)) {
          seen.add(key);
          details.push({
            nickName,
            device,
            insertion,
            site,
            fcst,
            lifetime: lifetimeVal,
            reqPinQtyInOneSocket: reqPinQty
          });
        }
      });

      details.sort((a, b) => {
        if (a.nickName !== b.nickName) return a.nickName.localeCompare(b.nickName);
        if (a.device !== b.device) return a.device.localeCompare(b.device);
        return a.insertion.localeCompare(b.insertion);
      });

      return {
        pinName,
        required: data.required,
        onHand: data.onHand,
        final: data.final,
        details
      };
    });
  }, [summaryData, rows, products, lifeTimes]);

  const detailedSummaryData = React.useMemo(() => getDetailedSummary(), [getDetailedSummary]);

  const uniquePogoPins = React.useMemo(() => {
    return Array.from(new Set(detailedSummaryData.map(g => String(g.pinName || '')))).filter(Boolean).sort();
  }, [detailedSummaryData]);

  const uniqueNicknames = React.useMemo(() => {
    return Array.from(new Set(detailedSummaryData.flatMap(g => g.details.map(d => String(d.nickName || ''))))).filter(Boolean).sort();
  }, [detailedSummaryData]);

  const uniqueDevices = React.useMemo(() => {
    return Array.from(new Set(detailedSummaryData.flatMap(g => g.details.map(d => String(d.device || ''))))).filter(Boolean).sort();
  }, [detailedSummaryData]);

  const uniqueInsertions = React.useMemo(() => {
    return Array.from(new Set(detailedSummaryData.flatMap(g => g.details.map(d => String(d.insertion || ''))))).filter(Boolean).sort();
  }, [detailedSummaryData]);

  const filteredDetailedSummaryData = React.useMemo(() => {
    let result = detailedSummaryData;

    if (detailedSearchTerm.trim()) {
      const term = detailedSearchTerm.toLowerCase();
      result = result.filter(group => String(group.pinName || '').toLowerCase().includes(term));
    }

    if (filterPogoPins.length > 0) {
      result = result.filter(group => filterPogoPins.includes(String(group.pinName || '')));
    }

    if (filterNicknames.length > 0 || filterDevices.length > 0 || filterInsertions.length > 0) {
      result = result.map(group => {
        const filteredDetails = group.details.filter(detail => {
          const matchNickname = filterNicknames.length === 0 || filterNicknames.includes(String(detail.nickName || ''));
          const matchDevice = filterDevices.length === 0 || filterDevices.includes(String(detail.device || ''));
          const matchInsertion = filterInsertions.length === 0 || filterInsertions.includes(String(detail.insertion || ''));
          return matchNickname && matchDevice && matchInsertion;
        });
        return { ...group, details: filteredDetails };
      }).filter(group => group.details.length > 0);
    }

    if (filterRequiredQty === 'gt0') {
      result = result.filter(group => group.requiredPinQty > 0);
    } else if (filterRequiredQty === 'lte0') {
      result = result.filter(group => group.requiredPinQty <= 0);
    }

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (['pinName', 'final', 'required', 'onHand'].includes(sortConfig.key)) {
          aValue = a[sortConfig.key as keyof typeof a];
          bValue = b[sortConfig.key as keyof typeof b];
        } else {
          aValue = a.details[0]?.[sortConfig.key as keyof typeof a.details[0]];
          bValue = b.details[0]?.[sortConfig.key as keyof typeof b.details[0]];
        }

        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [detailedSummaryData, detailedSearchTerm, filterPogoPins, filterNicknames, filterDevices, filterInsertions, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-primary/10 p-2.5">
            <Calculator className="h-6 w-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-serif italic text-zinc-900">Required pogo pin(FCST)</h2>
            <p className="text-sm text-zinc-500">Calculate required pogo pins based on forecast quantity</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
          <button
            onClick={() => setActiveTab('input')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'input' ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Input list
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'summary' ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <List className="h-4 w-4" />
            Summary list
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'detailed' ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Table className="h-4 w-4" />
            Detailed list
          </button>
        </div>
      </div>

      {activeTab === 'input' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <div className="flex gap-3">
              <button
                onClick={handleAddRow}
                className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-primary/90 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </button>
              <label className="flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-50 cursor-pointer shadow-sm">
                <Upload className="h-4 w-4" />
                Import Excel
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </label>
              {rows.length > 0 && (
                <button
                  onClick={() => setIsClearModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-white border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-50 cursor-pointer shadow-sm"
                >
                  <Eraser className="h-4 w-4" />
                  Clear All
                </button>
              )}
            </div>
            <div className="text-xs text-zinc-400">
              Excel format: Col A = PartNo, Col B = Qty (starting from row 2)
            </div>
          </div>
          
          <DoubleScrollbar>
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-medium sticky left-0 bg-zinc-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">PartNo</th>
                  <th className="px-4 py-3 font-medium w-32">Qty</th>
                  <th className="px-4 py-3 font-medium">Remark</th>
                  <th className="px-4 py-3 font-medium">Pogo pin1 need</th>
                  <th className="px-4 py-3 font-medium">Pogo pin2 need</th>
                  <th className="px-4 py-3 font-medium">Pogo pin3 need</th>
                  <th className="px-4 py-3 font-medium">Pogo pin4 need</th>
                  <th className="px-4 py-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      No data. Add a row or import an Excel file.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-zinc-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                        <input
                          type="text"
                          value={row.partNo}
                          onChange={(e) => handleRowChange(row.id, 'partNo', e.target.value)}
                          className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                          placeholder="Enter PartNo"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={row.qty}
                          onChange={(e) => handleRowChange(row.id, 'qty', e.target.value ? Number(e.target.value) : '')}
                          className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white"
                          placeholder="Qty"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn("text-xs", row.remark ? "text-red-500 font-medium" : "text-zinc-400")}>
                          {row.remark || '-'}
                        </span>
                      </td>
                      {[0, 1, 2, 3].map(index => {
                        const pin = row.pogoPins[index];
                        return (
                          <td key={index} className="px-4 py-2">
                            {pin ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{pin.name}</span>
                                <span className="font-medium text-brand-primary">{pin.need}</span>
                              </div>
                            ) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DoubleScrollbar>
        </motion.div>
      )}

      {activeTab === 'summary' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="text-lg font-bold text-zinc-900">Total Required Pogo Pins</h3>
            <p className="text-sm text-zinc-500">Aggregated quantities across all input rows</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaryData.length === 0 ? (
                <div className="col-span-full text-center py-8 text-zinc-500">
                  No data to summarize. Please add items in the Input list.
                </div>
              ) : (
                summaryData.map(([name, data]) => (
                  <div key={name} className="flex flex-col p-5 rounded-xl border border-zinc-100 bg-zinc-50 gap-4">
                    <div className="font-bold text-zinc-800 text-lg border-b border-zinc-200 pb-2">{name}</div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Required</span>
                        <span className="text-xl font-semibold text-zinc-700">{data.required.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">On Hand</span>
                        <span className="text-xl font-semibold text-emerald-600">{data.onHand.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-700">Final Required</span>
                      <span className={cn(
                        "text-2xl font-bold",
                        data.final > 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {data.final.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'detailed' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Detailed Pogo Pin Analysis</h3>
                <p className="text-sm text-zinc-500">Comprehensive breakdown of pogo pin requirements by device and insertion</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-2 py-1 shadow-sm">
                  <button
                    onClick={() => {
                      setFilterPogoPins([]);
                      setFilterNicknames([]);
                      setFilterDevices([]);
                      setFilterInsertions([]);
                      setFilterRequiredQty('all');
                    }}
                    className="px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap"
                  >
                    Clear All Filters
                  </button>
                  <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                  <button
                    onClick={() => setFilterRequiredQty(filterRequiredQty === 'gt0' ? 'all' : 'gt0')}
                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${filterRequiredQty === 'gt0' ? 'bg-brand-primary/10 text-brand-primary' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                  >
                    Required Qty &gt; 0
                  </button>
                  <button
                    onClick={() => setFilterRequiredQty(filterRequiredQty === 'lte0' ? 'all' : 'lte0')}
                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${filterRequiredQty === 'lte0' ? 'bg-brand-primary/10 text-brand-primary' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                  >
                    Required Qty &le; 0
                  </button>
                  <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                  <Filter className="h-4 w-4 text-zinc-400 ml-2" />
                  <MultiSelectDropdown
                    values={filterPogoPins}
                    onChange={setFilterPogoPins}
                    options={uniquePogoPins as string[]}
                    placeholder="All Pogo Pins"
                  />
                  <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                  <MultiSelectDropdown
                    values={filterNicknames}
                    onChange={setFilterNicknames}
                    options={uniqueNicknames as string[]}
                    placeholder="All Nicknames"
                  />
                  <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                  <MultiSelectDropdown
                    values={filterDevices}
                    onChange={setFilterDevices}
                    options={uniqueDevices as string[]}
                    placeholder="All Devices"
                  />
                  <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                  <MultiSelectDropdown
                    values={filterInsertions}
                    onChange={setFilterInsertions}
                    options={uniqueInsertions as string[]}
                    placeholder="All Insertions"
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search Pogo Pin..."
                    value={detailedSearchTerm}
                    onChange={(e) => setDetailedSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all w-64 shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          <DoubleScrollbar className="p-6">
            <table className="w-full text-sm text-zinc-700 border-collapse">
              <thead className="bg-zinc-100 text-xs uppercase text-zinc-600 border-b border-zinc-300">
                <tr>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none sticky left-0 bg-zinc-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" onClick={() => handleSort('pinName')}>
                    <div className="flex items-center gap-1 justify-between">
                      <span>Pogo pin name</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'pinName' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap text-red-600 cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('final')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Required Pin Qty</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'final' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('required')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Calculation Pin Qty</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'required' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('onHand')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>On hand Qty</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'onHand' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('nickName')}>
                    <div className="flex items-center gap-1 justify-between">
                      <span>Nickname</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'nickName' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('device')}>
                    <div className="flex items-center gap-1 justify-between">
                      <span>Device</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'device' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('insertion')}>
                    <div className="flex items-center gap-1 justify-between">
                      <span>Insertion</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'insertion' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('siteNumber')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Site number</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'siteNumber' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('fcst')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>FCST</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'fcst' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('lifeTime')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Lifetime</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'lifeTime' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                  <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('requiredQty')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Required pin qty in one socket</span>
                      <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'requiredQty' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDetailedSummaryData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-zinc-500 border border-zinc-300">
                      {detailedSearchTerm ? 'No matching pogo pins found.' : 'No data to display. Please add items in the Input list.'}
                    </td>
                  </tr>
                ) : (
                  filteredDetailedSummaryData.map((pinGroup, pinIndex) => {
                    if (pinGroup.details.length === 0) {
                      return (
                        <tr key={pinGroup.pinName} className="hover:bg-zinc-50 group">
                          <td className="border border-zinc-300 px-3 py-2 text-left font-medium sticky left-0 bg-white group-hover:bg-zinc-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">{pinGroup.pinName}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-right font-bold text-red-600">{pinGroup.final.toLocaleString()}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-right">{pinGroup.required.toLocaleString()}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-right">{pinGroup.onHand.toLocaleString()}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-center text-zinc-400" colSpan={7}>No device details found</td>
                        </tr>
                      );
                    }

                    return pinGroup.details.map((detail, detailIndex) => {
                      const isFirstPin = detailIndex === 0;
                      
                      let isFirstNickName = false;
                      let nickNameRowSpan = 1;
                      if (detailIndex === 0 || pinGroup.details[detailIndex - 1].nickName !== detail.nickName) {
                        isFirstNickName = true;
                        let count = 1;
                        for (let i = detailIndex + 1; i < pinGroup.details.length; i++) {
                          if (pinGroup.details[i].nickName === detail.nickName) count++;
                          else break;
                        }
                        nickNameRowSpan = count;
                      }

                      let isFirstDevice = false;
                      let deviceRowSpan = 1;
                      if (detailIndex === 0 || pinGroup.details[detailIndex - 1].device !== detail.device || pinGroup.details[detailIndex - 1].nickName !== detail.nickName) {
                        isFirstDevice = true;
                        let count = 1;
                        for (let i = detailIndex + 1; i < pinGroup.details.length; i++) {
                          if (pinGroup.details[i].device === detail.device && pinGroup.details[i].nickName === detail.nickName) count++;
                          else break;
                        }
                        deviceRowSpan = count;
                      }

                      return (
                        <tr key={`${pinGroup.pinName}-${detailIndex}`} className="hover:bg-zinc-50/50 group">
                          {isFirstPin && (
                            <>
                              <td className="border border-zinc-300 px-3 py-2 align-top text-left font-bold bg-yellow-100/50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" rowSpan={pinGroup.details.length}>
                                <div className="flex items-center gap-1">
                                  <span className="text-zinc-400 text-xs">⊟</span>
                                  {pinGroup.pinName}
                                </div>
                              </td>
                              <td className="border border-zinc-300 px-3 py-2 align-top text-right font-bold text-red-600 bg-yellow-100/50" rowSpan={pinGroup.details.length}>
                                {pinGroup.final.toLocaleString()}
                              </td>
                              <td className="border border-zinc-300 px-3 py-2 align-top text-right bg-yellow-100/50" rowSpan={pinGroup.details.length}>
                                {pinGroup.required.toLocaleString()}
                              </td>
                              <td className="border border-zinc-300 px-3 py-2 align-top text-right bg-yellow-100/50" rowSpan={pinGroup.details.length}>
                                {pinGroup.onHand.toLocaleString()}
                              </td>
                            </>
                          )}
                          {isFirstNickName && (
                            <td className="border border-zinc-300 px-3 py-2 align-top text-left font-medium bg-white" rowSpan={nickNameRowSpan}>
                              <div className="flex items-center gap-1">
                                <span className="text-zinc-400 text-xs">⊟</span>
                                {detail.nickName}
                              </div>
                            </td>
                          )}
                          {isFirstDevice && (
                            <td className="border border-zinc-300 px-3 py-2 align-top text-left bg-white" rowSpan={deviceRowSpan}>
                              <div className="flex items-center gap-1">
                                <span className="text-zinc-400 text-xs">⊟</span>
                                {detail.device}
                              </div>
                            </td>
                          )}
                          <td className="border border-zinc-300 px-3 py-2 text-left">
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-400 text-xs">⊟</span>
                              {detail.insertion}
                            </div>
                          </td>
                          <td className="border border-zinc-300 px-3 py-2 text-right">{detail.site}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-right">{detail.fcst || 0}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-right">{detail.lifetime}</td>
                          <td className="border border-zinc-300 px-3 py-2 text-right">{detail.reqPinQtyInOneSocket}</td>
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          </DoubleScrollbar>
        </motion.div>
      )}

      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-2">Clear All Data</h3>
              <p className="text-sm text-zinc-500 mb-6">Are you sure you want to clear all imported and manually entered data? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setRows([]);
                    setIsClearModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
