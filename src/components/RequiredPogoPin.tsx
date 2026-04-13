import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Plus, Trash2, Upload, FileSpreadsheet, Calculator, List, Eraser, Table, Search, Filter, ChevronDown, ArrowUpDown, Check, ExternalLink, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DoubleScrollbar } from './ui/DoubleScrollbar';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { usePersistentState } from '../lib/usePersistentState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RowData {
  id: string;
  partNo: string;
  qty: number | '';
  remark: string;
  pogoPins: { name: string; need: number }[];
  facility?: string;
}

export default function RequiredPogoPin({ selectedFacility }: { selectedFacility: string }) {
  const [activeTab, setActiveTab] = useState<'input' | 'summary' | 'detailed'>('input');
  const [rows, setRows] = useState<RowData[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lifeTimes, setLifeTimes] = useState<any[]>([]);
  const [pogoPinsData, setPogoPinsData] = useState<any[]>([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [detailedSearchTerm, setDetailedSearchTerm] = useState('');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [filterPogoPins, setFilterPogoPins] = usePersistentState<string[]>('reqPogoPin_filterPogoPins', []);
  const [filterNicknames, setFilterNicknames] = usePersistentState<string[]>('reqPogoPin_filterNicknames', []);
  const [filterDevices, setFilterDevices] = usePersistentState<string[]>('reqPogoPin_filterDevices', []);
  const [filterInsertions, setFilterInsertions] = usePersistentState<string[]>('reqPogoPin_filterInsertions', []);
  const [filterRequiredQty, setFilterRequiredQty] = usePersistentState<'all' | 'gt0' | 'lte0'>('reqPogoPin_filterRequiredQty', 'all');
  const [visibleColumns, setVisibleColumns] = usePersistentState<string[]>('pogoPin_visibleColumns', [
    'pinName', 'final', 'required', 'onHand', 'nickName', 'device', 'insertion', 'site', 'fcst', 'lifetime', 'reqPinQtyInOneSocket'
  ]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expandedPins, setExpandedPins] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubRows = onSnapshot(collection(db, 'requiredPogoPinRows'), (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RowData));
      if (selectedFacility !== 'ALL') {
        data = data.filter(r => (r.facility || '').trim().toUpperCase() === selectedFacility);
      }
      setRows(data);
    });

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

  const handleAddRow = async () => {
    try {
      await addDoc(collection(db, 'requiredPogoPinRows'), {
        partNo: '',
        qty: '',
        remark: '',
        pogoPins: [],
        facility: selectedFacility === 'ALL' ? '' : selectedFacility
      });
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleRowChange = async (id: string, field: keyof RowData, value: string | number) => {
    const rowToUpdate = rows.find(r => r.id === id);
    if (!rowToUpdate) return;
    
    const newRow = { ...rowToUpdate, [field]: value };
    const calculatedRow = calculateRow(newRow, products, lifeTimes);
    
    try {
      const docRef = doc(db, 'requiredPogoPinRows', id);
      await updateDoc(docRef, {
        [field]: value,
        remark: calculatedRow.remark,
        pogoPins: calculatedRow.pogoPins
      });
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const handleDeleteRow = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'requiredPogoPinRows', id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      try {
        const batch = writeBatch(db);
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0]) {
            const partNo = String(row[0]);
            const qty = Number(row[1]) || '';
            const newRow: RowData = {
              id: '', // Not needed for addDoc
              partNo,
              qty,
              remark: '',
              pogoPins: [],
              facility: selectedFacility === 'ALL' ? '' : selectedFacility
            };
            const calculatedRow = calculateRow(newRow, products, lifeTimes);
            
            const newDocRef = doc(collection(db, 'requiredPogoPinRows'));
            batch.set(newDocRef, {
              partNo: calculatedRow.partNo,
              qty: calculatedRow.qty,
              remark: calculatedRow.remark,
              pogoPins: calculatedRow.pogoPins,
              facility: calculatedRow.facility
            });
          }
        }
        await batch.commit();
      } catch (error) {
        console.error("Error importing rows: ", error);
      }
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

  const filteredSummaryData = React.useMemo(() => {
    if (!summarySearchTerm.trim()) return summaryData;
    const term = summarySearchTerm.toLowerCase();
    return summaryData.filter(([name]) => name.toLowerCase().includes(term));
  }, [summaryData, summarySearchTerm]);

  const topShortages = React.useMemo(() => {
    return summaryData
      .filter(([_, data]) => data.final > 0)
      .sort((a, b) => b[1].final - a[1].final)
      .slice(0, 5)
      .map(([name, data]) => ({ name, shortage: data.final }));
  }, [summaryData]);

  const overallStats = React.useMemo(() => {
    const totalRequired = summaryData.reduce((sum, [_, data]) => sum + data.required, 0);
    const totalOnHand = summaryData.reduce((sum, [_, data]) => sum + data.onHand, 0);
    const totalShortage = summaryData.reduce((sum, [_, data]) => sum + data.final, 0);
    const shortageItems = summaryData.filter(([_, data]) => data.final > 0).length;
    
    return { totalRequired, totalOnHand, totalShortage, shortageItems };
  }, [summaryData]);

  const getDetailedSummary = React.useCallback(() => {
    // 1. Find pogo pins from Summary list
    const targetPins = summaryData
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

  const getUniqueValues = (field: string, otherFilters: any) => {
    let filtered = detailedSummaryData;
    
    if (otherFilters.pogoPins?.length > 0) {
      filtered = filtered.filter(g => otherFilters.pogoPins.includes(String(g.pinName || '')));
    }
    if (otherFilters.nicknames?.length > 0) {
      filtered = filtered.filter(g => g.details.some(d => otherFilters.nicknames.includes(String(d.nickName || ''))));
    }
    if (otherFilters.devices?.length > 0) {
      filtered = filtered.filter(g => g.details.some(d => otherFilters.devices.includes(String(d.device || ''))));
    }
    if (otherFilters.insertions?.length > 0) {
      filtered = filtered.filter(g => g.details.some(d => otherFilters.insertions.includes(String(d.insertion || ''))));
    }

    if (field === 'pinName') {
      return Array.from(new Set(filtered.map(g => String(g.pinName || '')))).filter(Boolean).sort();
    } else {
      return Array.from(new Set(filtered.flatMap(g => g.details.map(d => {
        if (field === 'nickName') return String(d.nickName || '');
        if (field === 'device') return String(d.device || '');
        if (field === 'insertion') return String(d.insertion || '');
        return '';
      })))).filter(Boolean).sort();
    }
  };

  const uniquePogoPins = React.useMemo(() => getUniqueValues('pinName', {
    nicknames: filterNicknames,
    devices: filterDevices,
    insertions: filterInsertions
  }), [detailedSummaryData, filterNicknames, filterDevices, filterInsertions]);

  const uniqueNicknames = React.useMemo(() => getUniqueValues('nickName', {
    pogoPins: filterPogoPins,
    devices: filterDevices,
    insertions: filterInsertions
  }), [detailedSummaryData, filterPogoPins, filterDevices, filterInsertions]);

  const uniqueDevices = React.useMemo(() => getUniqueValues('device', {
    pogoPins: filterPogoPins,
    nicknames: filterNicknames,
    insertions: filterInsertions
  }), [detailedSummaryData, filterPogoPins, filterNicknames, filterInsertions]);

  const uniqueInsertions = React.useMemo(() => getUniqueValues('insertion', {
    pogoPins: filterPogoPins,
    nicknames: filterNicknames,
    devices: filterDevices
  }), [detailedSummaryData, filterPogoPins, filterNicknames, filterDevices]);

  const allDetailedColumns = [
    { key: 'pinName', label: 'Pogo pin name' },
    { key: 'final', label: 'Required Pin Qty' },
    { key: 'required', label: 'Calculation Pin Qty' },
    { key: 'onHand', label: 'On hand Qty' },
    { key: 'nickName', label: 'Nickname' },
    { key: 'device', label: 'Device' },
    { key: 'insertion', label: 'Insertion' },
    { key: 'site', label: 'Site number' },
    { key: 'fcst', label: 'FCST' },
    { key: 'lifetime', label: 'Lifetime' },
    { key: 'reqPinQtyInOneSocket', label: 'Required pin qty in one socket' },
  ];

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
      result = result.filter(group => group.final > 0);
    } else if (filterRequiredQty === 'lte0') {
      result = result.filter(group => group.final <= 0);
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
  }, [detailedSummaryData, detailedSearchTerm, filterPogoPins, filterNicknames, filterDevices, filterInsertions, filterRequiredQty, sortConfig]);

  const handleExportDetailed = () => {
    const exportData: any[] = [];
    const merges: any[] = [];
    let currentRow = 1; // Start after header

    filteredDetailedSummaryData.forEach(group => {
      const groupStartRow = currentRow;
      const detailsCount = group.details.length || 1;

      if (group.details.length === 0) {
        exportData.push({
          'Pogo Pin PN': group.pinName,
          'Final Required': group.final,
          'Total Required': group.required,
          'On Hand': group.onHand,
          'Nickname': 'No device details found',
          'Device': '',
          'Insertion': '',
          'Site': '',
          'FCST Qty': '',
          'Lifetime': '',
          'Required pin qty in one socket': ''
        });
        currentRow++;
      } else {
        // Track merges for Nickname and Device within the group
        let nicknameStartRow = currentRow;
        let deviceStartRow = currentRow;

        group.details.forEach((detail, detailIndex) => {
          const isFirstInGroup = detailIndex === 0;
          
          // Check for Nickname change
          if (detailIndex > 0 && detail.nickName !== group.details[detailIndex - 1].nickName) {
            if (currentRow - 1 > nicknameStartRow) {
              merges.push({ s: { r: nicknameStartRow, c: 4 }, e: { r: currentRow - 1, c: 4 } });
            }
            nicknameStartRow = currentRow;
          }

          // Check for Device change (within same nickname)
          if (detailIndex > 0 && (detail.device !== group.details[detailIndex - 1].device || detail.nickName !== group.details[detailIndex - 1].nickName)) {
            if (currentRow - 1 > deviceStartRow) {
              merges.push({ s: { r: deviceStartRow, c: 5 }, e: { r: currentRow - 1, c: 5 } });
            }
            deviceStartRow = currentRow;
          }

          exportData.push({
            'Pogo Pin PN': isFirstInGroup ? group.pinName : '',
            'Final Required': isFirstInGroup ? group.final : '',
            'Total Required': isFirstInGroup ? group.required : '',
            'On Hand': isFirstInGroup ? group.onHand : '',
            'Nickname': detail.nickName,
            'Device': detail.device,
            'Insertion': detail.insertion,
            'Site': detail.site,
            'FCST Qty': detail.fcst,
            'Lifetime': detail.lifetime,
            'Required pin qty in one socket': detail.reqPinQtyInOneSocket
          });
          currentRow++;

          // Handle last detail in group for nickname/device merges
          if (detailIndex === group.details.length - 1) {
            if (currentRow - 1 > nicknameStartRow) {
              merges.push({ s: { r: nicknameStartRow, c: 4 }, e: { r: currentRow - 1, c: 4 } });
            }
            if (currentRow - 1 > deviceStartRow) {
              merges.push({ s: { r: deviceStartRow, c: 5 }, e: { r: currentRow - 1, c: 5 } });
            }
          }
        });

        // Add merges for the main group columns (0 to 3)
        if (detailsCount > 1) {
          for (let col = 0; col <= 3; col++) {
            merges.push({ s: { r: groupStartRow, c: col }, e: { r: currentRow - 1, c: col } });
          }
        }
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detailed Analysis');
    XLSX.writeFile(wb, `PogoPin_Detailed_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const togglePin = (pinName: string) => {
    setExpandedPins(prev => ({ ...prev, [pinName]: !prev[pinName] }));
  };

  const expandAll = () => {
    const all = {};
    filteredDetailedSummaryData.forEach(g => {
      (all as any)[g.pinName] = true;
    });
    setExpandedPins(all);
  };

  const collapseAll = () => {
    setExpandedPins({});
  };

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-primary/10 p-2.5">
            <Calculator className="h-6 w-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-4xl font-serif italic text-zinc-900 tracking-tight">Required pogo pin(FCST)</h2>
            <p className="text-xs text-zinc-400 uppercase tracking-[0.2em] font-bold">Calculate required pogo pins based on forecast quantity</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100/50 p-1 rounded-xl border border-zinc-200 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('input')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'input' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            INPUT
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'summary' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <List className="h-3.5 w-3.5" />
            SUMMARY
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'detailed' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            DETAILED
          </button>
        </div>
      </div>

      {activeTab !== 'input' && summaryData.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-1 w-full md:w-auto">
            <div className="flex flex-col px-4 py-2 bg-white rounded-xl border border-zinc-200 shadow-sm min-w-[120px]">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Required</span>
              <span className="text-lg font-bold text-zinc-700">{overallStats.totalRequired.toLocaleString()}</span>
            </div>
            <div className="flex flex-col px-4 py-2 bg-white rounded-xl border border-zinc-200 shadow-sm min-w-[120px]">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total On Hand</span>
              <span className="text-lg font-bold text-emerald-600">{overallStats.totalOnHand.toLocaleString()}</span>
            </div>
            <div className="flex flex-col px-4 py-2 bg-rose-50 rounded-xl border border-rose-100 shadow-sm min-w-[120px]">
              <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Total Shortage</span>
              <span className="text-lg font-bold text-rose-600">{overallStats.totalShortage.toLocaleString()}</span>
            </div>
            <div className="flex flex-col px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 shadow-sm min-w-[120px]">
              <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">Shortage Items</span>
              <span className="text-lg font-bold text-amber-600">{overallStats.shortageItems}</span>
            </div>
          </div>
        )}

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
          className="flex flex-col gap-6"
        >
          {/* Chart Section */}
          {topShortages.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Top 5 Shortages</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topShortages} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      tick={{ fontSize: 12, fill: '#71717a' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="shortage" radius={[0, 4, 4, 0]} barSize={24}>
                      {topShortages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#e11d48' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* List Section */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Total Required Pogo Pins</h3>
                <p className="text-xs text-zinc-500">Aggregated quantities across all input rows</p>
              </div>
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search pogo pin..."
                  value={summarySearchTerm}
                  onChange={(e) => setSummarySearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSummaryData.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-zinc-500">
                    <Search className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                    <p>{summarySearchTerm ? 'No matching pogo pins found.' : 'No data to summarize. Please add items in the Input list.'}</p>
                  </div>
                ) : (
                  filteredSummaryData.map(([name, data]) => {
                    const stockLevel = data.required > 0 ? Math.min(100, (data.onHand / data.required) * 100) : 100;
                    const isShortage = data.final > 0;

                    return (
                      <div key={name} className="flex flex-col p-5 rounded-xl border border-zinc-100 bg-zinc-50 gap-4 hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                          <div className="font-bold text-zinc-800 text-lg truncate pr-2" title={name}>{name}</div>
                          {isShortage && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Shortage</span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Required</span>
                            <span className="text-lg font-bold text-zinc-700">{data.required.toLocaleString()}</span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">On Hand</span>
                            <span className="text-lg font-bold text-emerald-600">{data.onHand.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Stock Level Progress */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-zinc-400">Stock Level</span>
                            <span className={isShortage ? "text-rose-500" : "text-emerald-500"}>{Math.round(stockLevel)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stockLevel}%` }}
                              className={cn(
                                "h-full rounded-full",
                                isShortage ? "bg-rose-500" : "bg-emerald-500"
                              )}
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Final Required</span>
                            <span className={cn(
                              "text-xl font-bold",
                              isShortage ? "text-rose-600" : "text-emerald-600"
                            )}>
                              {data.final.toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setFilterPogoPins([name]);
                              setActiveTab('detailed');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-all shadow-sm active:scale-95"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 py-2">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Detailed Pogo Pin Analysis</h3>
                <p className="text-xs text-zinc-500">Comprehensive breakdown of pogo pin requirements by device and insertion</p>
              </div>
              <div className="flex items-center gap-3 self-end lg:self-auto">
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-1 py-1 shadow-sm">
                  <button
                    onClick={expandAll}
                    title="Expand All"
                    className="p-1.5 text-zinc-500 hover:text-brand-primary hover:bg-zinc-100 rounded-lg transition-all"
                  >
                    <ChevronsUpDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={collapseAll}
                    title="Collapse All"
                    className="p-1.5 text-zinc-500 hover:text-brand-primary hover:bg-zinc-100 rounded-lg transition-all"
                  >
                    <ChevronsDownUp className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={handleExportDetailed}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-95 text-sm font-bold"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>EXPORT EXCEL</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between surface-card p-2 mx-2 mb-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 w-full lg:w-auto pb-2 lg:pb-0">
                <div className="flex items-center gap-1.5 px-2">
                  <Filter className="h-3.5 w-3.5 text-zinc-400" />
                  <button
                    onClick={() => {
                      setFilterPogoPins([]);
                      setFilterNicknames([]);
                      setFilterDevices([]);
                      setFilterInsertions([]);
                      setFilterRequiredQty('all');
                    }}
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                </div>
                <div className="w-px h-4 bg-zinc-200 shrink-0"></div>
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <div className="flex items-center gap-1 bg-zinc-50 rounded-lg p-1 border border-zinc-100">
                    <button
                      onClick={() => setFilterRequiredQty(filterRequiredQty === 'gt0' ? 'all' : 'gt0')}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap",
                        filterRequiredQty === 'gt0' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      QTY &gt; 0
                    </button>
                    <button
                      onClick={() => setFilterRequiredQty(filterRequiredQty === 'lte0' ? 'all' : 'lte0')}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap",
                        filterRequiredQty === 'lte0' ? "bg-white text-brand-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      QTY &le; 0
                    </button>
                  </div>
                  <div className="w-px h-4 bg-zinc-200 shrink-0 mx-1"></div>
                  <MultiSelectDropdown
                    values={filterPogoPins}
                    onChange={setFilterPogoPins}
                    options={uniquePogoPins as string[]}
                    placeholder="Pogo Pins"
                  />
                  <MultiSelectDropdown
                    values={filterNicknames}
                    onChange={setFilterNicknames}
                    options={uniqueNicknames as string[]}
                    placeholder="Nicknames"
                  />
                  <MultiSelectDropdown
                    values={filterDevices}
                    onChange={setFilterDevices}
                    options={uniqueDevices as string[]}
                    placeholder="Devices"
                  />
                  <MultiSelectDropdown
                    values={filterInsertions}
                    onChange={setFilterInsertions}
                    options={uniqueInsertions as string[]}
                    placeholder="Insertions"
                  />
                  <div className="w-px h-4 bg-zinc-200 shrink-0 mx-1"></div>
                  <MultiSelectDropdown
                    values={allDetailedColumns.filter(c => visibleColumns.includes(c.key)).map(c => c.label)}
                    onChange={(labels) => {
                      const keys = allDetailedColumns.filter(c => labels.includes(c.label)).map(c => c.key);
                      setVisibleColumns(keys);
                    }}
                    options={allDetailedColumns.map(c => c.label)}
                    placeholder="Columns"
                  />
                </div>
              </div>
              
              <div className="relative w-full lg:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search pogo pins..."
                  value={detailedSearchTerm}
                  onChange={(e) => setDetailedSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
          <DoubleScrollbar className="p-6">
            <table className="w-full text-sm text-zinc-700 border-collapse">
              <thead className="bg-zinc-100 text-xs uppercase text-zinc-600 border-b border-zinc-300">
                <tr>
                  {visibleColumns.includes('pinName') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none sticky left-0 bg-zinc-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" onClick={() => handleSort('pinName')}>
                      <div className="flex items-center gap-1 justify-between">
                        <span>Pogo pin name</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'pinName' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('final') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap text-red-600 cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('final')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>Required Pin Qty</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'final' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('required') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('required')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>Calculation Pin Qty</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'required' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('onHand') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('onHand')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>On hand Qty</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'onHand' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('nickName') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('nickName')}>
                      <div className="flex items-center gap-1 justify-between">
                        <span>Nickname</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'nickName' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('device') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('device')}>
                      <div className="flex items-center gap-1 justify-between">
                        <span>Device</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'device' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('insertion') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-left whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('insertion')}>
                      <div className="flex items-center gap-1 justify-between">
                        <span>Insertion</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'insertion' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('site') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('site')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>Site number</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'site' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('fcst') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('fcst')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>FCST</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'fcst' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('lifetime') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('lifetime')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>Lifetime</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'lifetime' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.includes('reqPinQtyInOneSocket') && (
                    <th className="border border-zinc-300 px-3 py-2 font-medium text-right whitespace-nowrap cursor-pointer hover:bg-zinc-200 select-none" onClick={() => handleSort('reqPinQtyInOneSocket')}>
                      <div className="flex items-center gap-1 justify-end">
                        <span>Required pin qty in one socket</span>
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'reqPinQtyInOneSocket' ? "text-brand-primary opacity-100" : "text-zinc-400 opacity-50")} />
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredDetailedSummaryData.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-zinc-500 border border-zinc-300">
                      {detailedSearchTerm ? 'No matching pogo pins found.' : 'No data to display. Please add items in the Input list.'}
                    </td>
                  </tr>
                ) : (
                  filteredDetailedSummaryData.map((pinGroup, pinIndex) => {
                    const isExpanded = expandedPins[pinGroup.pinName];
                    const detailsToShow = isExpanded ? pinGroup.details : (pinGroup.details.length > 0 ? [pinGroup.details[0]] : []);
                    const hasDetails = pinGroup.details.length > 0;

                    if (!hasDetails) {
                      const remainingCols = visibleColumns.filter(c => !['pinName', 'final', 'required', 'onHand'].includes(c)).length;
                      return (
                        <tr key={pinGroup.pinName} className="hover:bg-zinc-50 group">
                          {visibleColumns.includes('pinName') && (
                            <td className="border border-zinc-300 px-3 py-2 text-left font-medium sticky left-0 bg-white group-hover:bg-zinc-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                              <div className="flex items-center gap-2 pl-6">
                                {pinGroup.pinName}
                              </div>
                            </td>
                          )}
                          {visibleColumns.includes('final') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right font-bold text-red-600">{pinGroup.final.toLocaleString()}</td>
                          )}
                          {visibleColumns.includes('required') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{pinGroup.required.toLocaleString()}</td>
                          )}
                          {visibleColumns.includes('onHand') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{pinGroup.onHand.toLocaleString()}</td>
                          )}
                          {remainingCols > 0 && (
                            <td className="border border-zinc-300 px-3 py-2 text-center text-zinc-400" colSpan={remainingCols}>No device details found</td>
                          )}
                        </tr>
                      );
                    }

                    return detailsToShow.map((detail, detailIndex) => {
                      const isFirstPin = detailIndex === 0;
                      
                      let isFirstNickName = false;
                      let nickNameRowSpan = 1;
                      if (isExpanded) {
                        if (detailIndex === 0 || pinGroup.details[detailIndex - 1].nickName !== detail.nickName) {
                          isFirstNickName = true;
                          let count = 1;
                          for (let i = detailIndex + 1; i < pinGroup.details.length; i++) {
                            if (pinGroup.details[i].nickName === detail.nickName) count++;
                            else break;
                          }
                          nickNameRowSpan = count;
                        }
                      } else {
                        isFirstNickName = true;
                      }

                      let isFirstDevice = false;
                      let deviceRowSpan = 1;
                      if (isExpanded) {
                        if (detailIndex === 0 || pinGroup.details[detailIndex - 1].device !== detail.device || pinGroup.details[detailIndex - 1].nickName !== detail.nickName) {
                          isFirstDevice = true;
                          let count = 1;
                          for (let i = detailIndex + 1; i < pinGroup.details.length; i++) {
                            if (pinGroup.details[i].device === detail.device && pinGroup.details[i].nickName === detail.nickName) count++;
                            else break;
                          }
                          deviceRowSpan = count;
                        }
                      } else {
                        isFirstDevice = true;
                      }

                      return (
                        <tr key={`${pinGroup.pinName}-${detailIndex}`} className={cn("hover:bg-zinc-50/50 group", !isExpanded && "bg-zinc-50/30")}>
                          {isFirstPin && (
                            <>
                              {visibleColumns.includes('pinName') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-left font-bold bg-yellow-100/50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  <button 
                                    onClick={() => togglePin(pinGroup.pinName)}
                                    className="flex items-center gap-2 hover:text-brand-primary transition-colors w-full text-left"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                    {pinGroup.pinName}
                                  </button>
                                </td>
                              )}
                              {visibleColumns.includes('final') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-right font-bold text-red-600 bg-yellow-100/50" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  {pinGroup.final.toLocaleString()}
                                </td>
                              )}
                              {visibleColumns.includes('required') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-right bg-yellow-100/50" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  {pinGroup.required.toLocaleString()}
                                </td>
                              )}
                              {visibleColumns.includes('onHand') && (
                                <td className="border border-zinc-300 px-3 py-2 align-top text-right bg-yellow-100/50" rowSpan={isExpanded ? pinGroup.details.length : 1}>
                                  {pinGroup.onHand.toLocaleString()}
                                </td>
                              )}
                            </>
                          )}
                          {visibleColumns.includes('nickName') && isFirstNickName && (
                            <td className="border border-zinc-300 px-3 py-2 align-top text-left font-medium bg-white" rowSpan={isExpanded ? nickNameRowSpan : 1}>
                              {detail.nickName}
                            </td>
                          )}
                          {visibleColumns.includes('device') && isFirstDevice && (
                            <td className="border border-zinc-300 px-3 py-2 align-top text-left bg-white" rowSpan={isExpanded ? deviceRowSpan : 1}>
                              {detail.device}
                            </td>
                          )}
                          {visibleColumns.includes('insertion') && (
                            <td className="border border-zinc-300 px-3 py-2 text-left">
                              {isExpanded ? detail.insertion : (
                                <span className="text-zinc-400 italic text-xs">
                                  {pinGroup.details.length > 1 ? `+ ${pinGroup.details.length - 1} more details...` : detail.insertion}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.includes('site') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? detail.site : '-'}</td>
                          )}
                          {visibleColumns.includes('fcst') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? (detail.fcst || 0) : '-'}</td>
                          )}
                          {visibleColumns.includes('lifetime') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? detail.lifetime : '-'}</td>
                          )}
                          {visibleColumns.includes('reqPinQtyInOneSocket') && (
                            <td className="border border-zinc-300 px-3 py-2 text-right">{isExpanded ? detail.reqPinQtyInOneSocket : '-'}</td>
                          )}
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
