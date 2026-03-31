import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, Upload, FileSpreadsheet, Calculator, List } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface RowData {
  id: string;
  partNo: string;
  qty: number | '';
  remark: string;
  pogoPins: { name: string; need: number }[];
}

export default function RequiredPogoPin({ selectedFacility }: { selectedFacility: string }) {
  const [activeTab, setActiveTab] = useState<'input' | 'summary'>('input');
  const [rows, setRows] = useState<RowData[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lifeTimes, setLifeTimes] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    return () => {
      unsubProducts();
      unsubLifeTimes();
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
        const relatedLts = lts.filter(lt => lt.socketGroup === socketName);
        relatedLts.forEach(lt => {
          if (!lt || !qty || !lt.lifeTime || !lt.pogoPinQty) return;
          const lifeTime = Number(lt.lifeTime);
          const pogoQty = Number(lt.pogoPinQty);
          if (lifeTime === 0) return;
          const need = Math.ceil((qty / lifeTime) * 1.1 * 1.2 * pogoQty);
          const pinName = lt.pogoPin1Pn;
          if (pinName) {
            pogoMap[pinName] = (pogoMap[pinName] || 0) + need;
          }
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
    const summary: Record<string, number> = {};
    rows.forEach(row => {
      row.pogoPins.forEach(pin => {
        summary[pin.name] = (summary[pin.name] || 0) + pin.need;
      });
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
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
        </div>
      </div>

      {activeTab === 'input' ? (
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
            </div>
            <div className="text-xs text-zinc-400">
              Excel format: Col A = PartNo, Col B = Qty (starting from row 2)
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-medium">PartNo</th>
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
                    <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-2">
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
          </div>
        </motion.div>
      ) : (
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
              {getSummary().length === 0 ? (
                <div className="col-span-full text-center py-8 text-zinc-500">
                  No data to summarize. Please add items in the Input list.
                </div>
              ) : (
                getSummary().map(([name, total]) => (
                  <div key={name} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 bg-zinc-50">
                    <span className="font-medium text-zinc-700">{name}</span>
                    <span className="text-2xl font-light text-brand-primary">{total.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
