import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc, query, getCountFromServer, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Upload, Trash2, Loader2, AlertTriangle, CheckCircle2, FileSpreadsheet, DatabaseBackup, Download, Info, X } from 'lucide-react';
import { cn, getFirestoreErrorMessage } from '../lib/utils';
import { logAuditAction } from '../lib/audit';

const COLLECTIONS = [
  { id: 'products', label: 'Product Info' },
  { id: 'sockets', label: 'Socket Info' },
  { id: 'changeKits', label: 'Change Kit' },
  { id: 'pogoPins', label: 'Pogo Pin' },
  { id: 'lifeTimes', label: 'Life Time' },
  { id: 'loadBoards', label: 'Load Board' },
];

const SHEET_MAPPING: Record<string, string> = {
  'Tooling_Matrix': 'products',
  'socket': 'sockets',
  'KIT': 'changeKits',
  'LB_status': 'loadBoards',
  'on-hand pogo pin': 'pogoPins',
  'Life time': 'lifeTimes'
};

const TEMPLATES: Record<string, string[]> = {
  products: [
    'facility', 'device', 'projectName', 'nickname', 'tester', 'handler', 'temperature',
    'insertion', 'siteNumber', 'ballCountDevice', 'changeKitGroup',
    'kitName1', 'kitName2', 'kitName3', 'kitName4', 'kitName5', 'kitName6', 'lbGroup',
    'socketName1', 'socketName2'
  ],
  sockets: [
    'facility', 'location', 'toolsId', 'package', 'pinBall', 'packageSize', 'project', 'status',
    'contactCountPin1', 'lifeCountPin1', 'contactLimitPin1', 'socketGroupPin1',
    'contactCountOver70Pin1', 'pogoPinPnPin1', 'socketPnPin1', 'usedFag',
    'contactCountPin2', 'lifeCountPin2', 'contactLimitPin2', 'contactCountOver70Pin2',
    'pogoPinPnPin2', 'contactCountPcb', 'lifeCountPcb', 'contactLimitPcb',
    'contactCountOver70Pcb', 'pnPcb', 'usedFlag'
  ],
  changeKits: [
    'facility', 'kind', 'toolsId', 'packageSize', 'changeKitGroup', 'status', 'idleTime', 'location'
  ],
  pogoPins: [
    'facility', 'pinPn', 'qty'
  ],
  lifeTimes: [
    'facility', 'socketGroup', 'pogoPin1Pn', 'pogoPinQty', 'lifeTime', 'loadBoardGroup', 'remark'
  ],
  loadBoards: [
    'facility', 'projectName', 'lbName', 'lbGroup', 'location', 'insertion',
    'availableQty', 'remark', 'sendBackDate', 'targetReturnDate'
  ]
};

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
}

interface PreviewData {
  collectionId: string;
  collectionLabel: string;
  rows: Record<string, unknown>[];
  totalRows: number;
}

export default function DataManagement() {
  const [maintenanceTarget, setMaintenanceTarget] = useState<string>('all');
  const [maintenanceAction, setMaintenanceAction] = useState<'clear_all' | 'clear_facility'>('clear_all');
  const [deleteFacility, setDeleteFacility] = useState<string>('');
  const [importMode, setImportMode] = useState<'auto' | 'specific'>('auto');
  const [targetCollection, setTargetCollection] = useState<string>('products');
  const [clearBeforeImport, setClearBeforeImport] = useState<boolean>(false);
  const [globalFacility, setGlobalFacility] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => {} });
  const [preview, setPreview] = useState<PreviewData[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const clearCollection = async (collectionName: string) => {
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    const batches = [];
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;

    for (const document of snapshot.docs) {
      batch.delete(document.ref);
      count++;
      totalDeleted++;
      if (count === 490) {
        batches.push(batch.commit());
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      batches.push(batch.commit());
    }
    await Promise.all(batches);
    return totalDeleted;
  };

  const clearByFacility = async (facilityName: string, targetCollection: string) => {
    const batches = [];
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;

    const collectionsToClear = targetCollection === 'all' ? COLLECTIONS : COLLECTIONS.filter(c => c.id === targetCollection);

    for (const col of collectionsToClear) {
      const q = query(collection(db, col.id), where('facility', '==', facilityName));
      const snapshot = await getDocs(q);
      
      for (const document of snapshot.docs) {
        batch.delete(document.ref);
        count++;
        totalDeleted++;
        if (count === 490) {
          batches.push(batch.commit());
          batch = writeBatch(db);
          count = 0;
        }
      }
    }
    
    if (count > 0) {
      batches.push(batch.commit());
    }
    await Promise.all(batches);
    return totalDeleted;
  };

  const addDocuments = async (collectionName: string, data: any[]) => {
    const batches = [];
    let batch = writeBatch(db);
    let count = 0;
    let totalAdded = 0;

    for (const item of data) {
      const docRef = doc(collection(db, collectionName));
      batch.set(docRef, item);
      count++;
      totalAdded++;
      if (count === 490) {
        batches.push(batch.commit());
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      batches.push(batch.commit());
    }
    await Promise.all(batches);
    return totalAdded;
  };

  const processSheetData = (worksheet: XLSX.WorkSheet, targetCollection: string) => {
    const rawAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
    const expectedKeys = TEMPLATES[targetCollection] || [];
    
    const normalizedExpectedKeys = expectedKeys.reduce((acc, key) => {
      acc[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = key;
      return acc;
    }, {} as Record<string, string>);

    const fallbacks: Record<string, string[]> = {
      'facility': ['facility', 'fac', 'plant'],
      'lifeTime': ['life', 'lifecount', 'lifelimit', 'lifespan', 'lt', 'touchdown', 'td'],
      'pogoPinQty': ['qty', 'quantity', 'pinqty', 'pogopinqty', 'count'],
      'pogoPin1Pn': ['pinpn', 'pogopin', 'partnumber', 'pn', 'pin1pn'],
      'loadBoardGroup': ['loadboard', 'lbgroup', 'lb'],
      'remark': ['note', 'remarks', 'comment', 'comments'],
      'device': ['devicename', 'part', 'partno', 'pkg', 'package', 'product', 'ic'],
      'projectName': ['project', 'projectname'],
      'socketGroup': ['socket', 'group', 'socketname'],
      'tester': ['testername', 'platform', 'testerplatform'],
      'handler': ['handlername'],
      'temperature': ['temp'],
      'insertion': ['insert'],
      'siteNumber': ['site', 'sitenum', 'sites'],
      'changeKitGroup': ['kitgroup', 'changekit', 'kit'],
      'nickname': ['nick'],
      'ballCountDevice': ['ballcount', 'balls', 'ball'],
      'kitName1': ['kit1'],
      'kitName2': ['kit2'],
      'kitName3': ['kit3'],
      'kitName4': ['kit4'],
      'kitName5': ['kit5'],
      'kitName6': ['kit6'],
      'socketName1': ['socket1'],
      'socketName2': ['socket2'],
      'lbGroup': ['lbgroup', 'loadboardgroup'],
      'socketName': ['socket', 'name'],
      'status': ['stat', 'state'],
      'location': ['loc'],
      'kind': ['type'],
      'toolsId': ['toolid', 'tool'],
      'packageSize': ['pkgsize', 'size'],
      'idleTime': ['idle'],
      'pinPn': ['pin', 'pn', 'partnumber'],
      'lbName': ['lbname', 'loadboardname'],
      'availableQty': ['available', 'availqty'],
      'sendBackDate': ['sendback', 'returndate'],
      'targetReturnDate': ['targetreturn', 'targetdate'],
      'contactCountPin1': ['pogopincontactcount', 'contactcountpin1', 'down', 'touchdown'],
      'contactLimitPin1': ['pogopincontactlimit', 'contactlimitpin1'],
      'socketGroupPin1': ['socketname', 'socketgroup', 'socketgrouppin1'],
      'socketPnPin1': ['socketpn', 'socketpnpin1'],
      'contactCountOver70Pin1': ['contactcountover70', 'contactcountover70pin1'],
      'package': ['pkg', 'package'],
      'pinBall': ['pinball', 'ball', 'balls'],
      'project': ['project', 'proj'],
      'usedFlag': ['usedflag', 'flag', 'usedfag', 'usedfag'],
      'contactCountPin2': ['contactcountpin2'],
      'lifeCountPin2': ['lifecountpin2'],
      'contactLimitPin2': ['contactlimitpin2'],
      'contactCountOver70Pin2': ['contactcountover70pin2'],
      'pogoPinPnPin2': ['pogopin1pn2', 'pogopinpn2', 'pin2pn'],
      'contactCountPcb': ['contactcountpcb'],
      'lifeCountPcb': ['lifecountpcb'],
      'contactLimitPcb': ['contactlimitpcb'],
      'contactCountOver70Pcb': ['contactcountover70pcb'],
      'pnPcb': ['pnpcb', 'pcbpn']
    };

    // Find the header row
    let headerRowIndex = 0;
    let maxMatches = 0;

    for (let i = 0; i < Math.min(20, rawAoa.length); i++) {
      const row = rawAoa[i];
      let matches = 0;
      for (const cell of row) {
        const cellStr = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cellStr) continue;
        
        if (normalizedExpectedKeys[cellStr]) {
          matches += 10;
        } else {
          let matched = false;
          for (const [orig, aliases] of Object.entries(fallbacks)) {
            if (expectedKeys.includes(orig) && aliases.includes(cellStr)) {
              matches += 8;
              matched = true;
              break;
            }
          }
          if (!matched) {
            for (const normKey of Object.keys(normalizedExpectedKeys)) {
              if (cellStr.includes(normKey)) {
                matches += 5;
                matched = true;
                break;
              }
            }
          }
          if (!matched) {
            for (const [orig, aliases] of Object.entries(fallbacks)) {
              if (expectedKeys.includes(orig) && aliases.some(a => cellStr.includes(a))) {
                matches += 3;
                break;
              }
            }
          }
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        headerRowIndex = i;
      }
    }

    if (maxMatches === 0) return [];

    const headers = rawAoa[headerRowIndex].map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Score-based mapping
    const headerMapping: Record<number, string> = {};
    const claimedCols = new Set<number>();

    // For each expected key, find the best matching column
    for (const expectedKey of expectedKeys) {
      const normKey = expectedKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      const aliases = fallbacks[expectedKey] || [];
      
      let bestColIndex = -1;
      let bestScore = 0;

      for (let j = 0; j < headers.length; j++) {
        if (claimedCols.has(j)) continue; // Column already assigned to another key
        
        const cellStr = headers[j];
        if (!cellStr) continue;

        let score = 0;
        if (cellStr === normKey) score = 100;
        else if (aliases.includes(cellStr)) score = 90;
        else if (cellStr.startsWith(normKey)) score = 80;
        else if (aliases.some(a => cellStr.startsWith(a))) score = 70;
        else if (cellStr.includes(normKey)) score = 60;
        else if (aliases.some(a => cellStr.includes(a))) score = 50;

        if (score > bestScore) {
          bestScore = score;
          bestColIndex = j;
        }
      }

      if (bestColIndex !== -1) {
        headerMapping[bestColIndex] = expectedKey;
        claimedCols.add(bestColIndex);
      }
    }

    const jsonData = [];
    for (let i = headerRowIndex + 1; i < rawAoa.length; i++) {
      const row = rawAoa[i];
      const mappedRow: any = {};
      let hasData = false;
      
      for (let j = 0; j < headers.length; j++) {
        const cellValue = row[j];
        const finalKey = headerMapping[j];
        
        if (finalKey) {
          if (cellValue !== "" && cellValue !== null && cellValue !== undefined) {
            hasData = true;
          }
          if (typeof cellValue === 'number') {
            mappedRow[finalKey] = cellValue;
          } else {
            mappedRow[finalKey] = String(cellValue ?? "");
          }
        }
      }
      if (hasData) {
        if (globalFacility && expectedKeys.includes('facility')) {
          mappedRow['facility'] = globalFacility;
        }
        jsonData.push(mappedRow);
      }
    }
    return jsonData;
  };

  const getCollectionSize = async (collectionName: string) => {
    try {
      const coll = collection(db, collectionName);
      const snapshot = await getCountFromServer(coll);
      return snapshot.data().count;
    } catch (err) {
      console.error('Failed to get collection size:', err);
      return 0;
    }
  };

  const handlePreviewClick = async () => {
    if (!files || files.length === 0) {
      setModal({ isOpen: true, title: 'Error', message: 'Please select at least one Excel file.', type: 'danger', onConfirm: closeModal, confirmText: 'OK' });
      return;
    }
    setLoading(true);
    try {
      const previewResult: PreviewData[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        if (importMode === 'specific') {
          const jsonData = processSheetData(workbook.Sheets[workbook.SheetNames[0]], targetCollection);
          const label = COLLECTIONS.find(c => c.id === targetCollection)?.label ?? targetCollection;
          previewResult.push({ collectionId: targetCollection, collectionLabel: label, rows: jsonData, totalRows: jsonData.length });
        } else {
          // Auto mode: parse all matching sheets
          for (const sheetName of workbook.SheetNames) {
            const normalized = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
            let matchedCollection: string | null = null;
            for (const [key, val] of Object.entries(SHEET_MAPPING)) {
              const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normalized === normKey || normalized.includes(normKey) || normKey.includes(normalized)) {
                matchedCollection = val;
                break;
              }
            }
            if (!matchedCollection) continue;
            const jsonData = processSheetData(workbook.Sheets[sheetName], matchedCollection);
            if (jsonData.length === 0) continue;
            const label = COLLECTIONS.find(c => c.id === matchedCollection)?.label ?? matchedCollection!;
            const existing = previewResult.find(p => p.collectionId === matchedCollection);
            if (existing) {
              existing.rows.push(...jsonData);
              existing.totalRows += jsonData.length;
            } else {
              previewResult.push({ collectionId: matchedCollection!, collectionLabel: label, rows: jsonData, totalRows: jsonData.length });
            }
          }
        }
      }
      setPreview(previewResult.length > 0 ? previewResult : [{ collectionId: 'none', collectionLabel: '無匹配資料', rows: [], totalRows: 0 }]);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    if (!files || files.length === 0) {
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Please select at least one Excel file to import.',
        type: 'danger',
        onConfirm: closeModal,
        confirmText: 'OK'
      });
      return;
    }

    setModal({
      isOpen: true,
      title: 'Confirm Batch Import',
      message: `You have selected ${files.length} file(s).\n\n${clearBeforeImport ? 'Existing data in the target sections will be CLEARED once before importing.' : 'Data will be APPENDED to existing records.'}\n\n⚠️ NOTE: Large imports consume your daily Firestore write quota (20,000 units on free tier).\n\nDo you want to proceed?`,
      type: 'info',
      confirmText: 'Yes, Start Import',
      onCancel: closeModal,
      onConfirm: async () => {
        closeModal();
        setLoading(true);
        try {
          const clearedCollections = new Set<string>();
          const importStats: Record<string, number> = {};
          let totalDeleted = 0;
          let totalAdded = 0;

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Estimate total rows across all sheets to warn user
            let estimatedRows = 0;
            workbook.SheetNames.forEach(name => {
              const sheet = workbook.Sheets[name];
              const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
              estimatedRows += (range.e.r - range.s.r);
            });

            if (importMode === 'specific') {
              // Specific Page Mode: Try to find a matching sheet, otherwise use the first sheet
              let targetSheetName = workbook.SheetNames[0]; // Default to first sheet
              
              // Try to find the exact sheet for this collection
              const expectedSheetName = Object.keys(SHEET_MAPPING).find(key => SHEET_MAPPING[key] === targetCollection);
              if (expectedSheetName) {
                const normalizedExpected = expectedSheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                // 1. Try exact match first
                const exactMatch = workbook.SheetNames.find(name => name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedExpected);
                if (exactMatch) {
                  targetSheetName = exactMatch;
                } else {
                  // 2. Try fuzzy match
                  for (const sheetName of workbook.SheetNames) {
                    const normalizedSheetName = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normalizedSheetName.includes(normalizedExpected) || normalizedExpected.includes(normalizedSheetName)) {
                      targetSheetName = sheetName;
                      break;
                    }
                  }
                }
              }

              const worksheet = workbook.Sheets[targetSheetName];
              const jsonData = processSheetData(worksheet, targetCollection);
              
              if (jsonData.length > 0) {
                if (clearBeforeImport && !clearedCollections.has(targetCollection)) {
                  const deletedCount = await clearCollection(targetCollection);
                  totalDeleted += deletedCount;
                  clearedCollections.add(targetCollection);
                }
                const addedCount = await addDocuments(targetCollection, jsonData);
                importStats[targetCollection] = (importStats[targetCollection] || 0) + addedCount;
                totalAdded += addedCount;
              }
            } else {
              // Auto-Detect Mode
              let fileHasMatchingSheet = false;

              const normalizedSheetMapping = Object.entries(SHEET_MAPPING).reduce((acc, [key, value]) => {
                acc[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = value;
                return acc;
              }, {} as Record<string, string>);

              for (const sheetName of workbook.SheetNames) {
                const normalizedSheetName = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const mappedCollection = normalizedSheetMapping[normalizedSheetName];
                if (mappedCollection) {
                  fileHasMatchingSheet = true;
                  const worksheet = workbook.Sheets[sheetName];
                  const jsonData = processSheetData(worksheet, mappedCollection);
                  
                  if (jsonData.length > 0) {
                    if (clearBeforeImport && !clearedCollections.has(mappedCollection)) {
                      const deletedCount = await clearCollection(mappedCollection);
                      totalDeleted += deletedCount;
                      clearedCollections.add(mappedCollection);
                    }
                    const addedCount = await addDocuments(mappedCollection, jsonData);
                    importStats[mappedCollection] = (importStats[mappedCollection] || 0) + addedCount;
                    totalAdded += addedCount;
                  }
                }
              }

              if (!fileHasMatchingSheet && workbook.SheetNames.length > 0) {
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = processSheetData(worksheet, targetCollection); // Fallback to selected target
                
                if (jsonData.length > 0) {
                  if (clearBeforeImport && !clearedCollections.has(targetCollection)) {
                    const deletedCount = await clearCollection(targetCollection);
                    totalDeleted += deletedCount;
                    clearedCollections.add(targetCollection);
                  }
                  const addedCount = await addDocuments(targetCollection, jsonData);
                  importStats[targetCollection] = (importStats[targetCollection] || 0) + addedCount;
                  totalAdded += addedCount;
                }
              }
            }
          }

          if (totalAdded === 0) {
            throw new Error("No data found to import in the selected files.");
          }

          const statsMessages = Object.entries(importStats).map(([colId, count]) => {
            const label = COLLECTIONS.find(c => c.id === colId)?.label || colId;
            return `${label}: ${count} records`;
          });

          await logAuditAction('Import Data', `Imported ${totalAdded} records across ${files.length} files. ${clearBeforeImport ? `Cleared ${totalDeleted} old records.` : ''}`);

          sessionStorage.removeItem('cachedFacilities');

          setModal({
            isOpen: true,
            title: 'Batch Import Successful',
            message: `Processed ${files.length} file(s).\n\n${clearBeforeImport ? `Cleared ${totalDeleted} old records.\n\n` : ''}Imported a total of ${totalAdded} records:\n${statsMessages.join('\n')}`,
            type: 'success',
            onConfirm: closeModal,
            confirmText: 'OK'
          });
          
          setFiles(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
          console.error(err);
          let errorMessage = getFirestoreErrorMessage(err);
          
          if (err.code === 'resource-exhausted' || err.message?.includes('quota')) {
            errorMessage = "Firestore 寫入配額已用盡 (每日 20,000 次)。請等待 24 小時後重置，或聯繫管理員升級方案。";
          }

          setModal({
            isOpen: true,
            title: 'Import Failed',
            message: errorMessage,
            type: 'danger',
            onConfirm: closeModal,
            confirmText: 'OK'
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleMaintenanceExecute = async () => {
    if (maintenanceAction === 'clear_facility' && !deleteFacility.trim()) {
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Please enter a facility name to delete.',
        type: 'danger',
        onConfirm: closeModal,
        confirmText: 'OK'
      });
      return;
    }

    const targetLabel = maintenanceTarget === 'all' ? 'ALL SECTIONS' : COLLECTIONS.find(c => c.id === maintenanceTarget)?.label;
    
    let estimatedWrites = 0;
    let quotaWarning = '';

    if (maintenanceAction === 'clear_all') {
      setLoading(true);
      try {
        if (maintenanceTarget === 'all') {
          for (const col of COLLECTIONS) {
            estimatedWrites += await getCollectionSize(col.id);
          }
        } else {
          estimatedWrites = await getCollectionSize(maintenanceTarget);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      quotaWarning = estimatedWrites > 1000 ? `\n\n⚠️ WARNING: This operation involves approximately ${estimatedWrites.toLocaleString()} write units. You have a daily limit of 20,000 writes on the free tier.` : '';
    }

    const modalTitle = maintenanceAction === 'clear_all' ? 'Confirm Clear Data' : 'Confirm Delete by Facility';
    const modalMessage = maintenanceAction === 'clear_all' 
      ? `Are you absolutely sure you want to clear ALL data in "${targetLabel}"? This action CANNOT be undone.${quotaWarning}`
      : `Are you absolutely sure you want to delete data for facility "${deleteFacility}" in "${targetLabel}"? This action CANNOT be undone.`;

    setModal({
      isOpen: true,
      title: modalTitle,
      message: modalMessage,
      type: 'danger',
      confirmText: 'Yes, Delete Data',
      onCancel: closeModal,
      onConfirm: async () => {
        closeModal();
        setLoading(true);
        try {
          let totalDeleted = 0;
          
          if (maintenanceAction === 'clear_all') {
            if (maintenanceTarget === 'all') {
              for (const col of COLLECTIONS) {
                totalDeleted += await clearCollection(col.id);
              }
            } else {
              totalDeleted = await clearCollection(maintenanceTarget);
            }
            await logAuditAction('Clear Data', `Cleared ${totalDeleted} records from ${targetLabel}`);
          } else {
            totalDeleted = await clearByFacility(deleteFacility, maintenanceTarget);
            await logAuditAction('Delete by Facility', `Deleted ${totalDeleted} records for facility ${deleteFacility} in ${targetLabel}`);
          }

          sessionStorage.removeItem('cachedFacilities');

          setModal({
            isOpen: true,
            title: 'Delete Successful',
            message: `Successfully deleted ${totalDeleted} records.`,
            type: 'success',
            onConfirm: closeModal,
            confirmText: 'OK'
          });
          
          if (maintenanceAction === 'clear_facility') {
            setDeleteFacility('');
          }
        } catch (err: any) {
          console.error(err);
          setModal({
            isOpen: true,
            title: 'Delete Failed',
            message: getFirestoreErrorMessage(err),
            type: 'danger',
            onConfirm: closeModal,
            confirmText: 'OK'
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Quota Info */}
      <div className="surface-card p-4 flex items-start gap-4 border-l-4 border-l-amber-500">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-zinc-900">Firestore Free Tier Quota Notice</h4>
          <p className="text-xs text-zinc-500 leading-relaxed mt-1">
            The Firebase free tier includes <strong>20,000 write operations per day</strong>. 
            Large imports or clearing large collections will consume this quota. 
            <br />
            <span className="font-semibold text-zinc-700">Current Status:</span> If you encounter "Quota limit exceeded", please wait 24 hours for the limit to reset.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section (Left Column) */}
        <div className="surface-card p-4 sm:p-8 relative overflow-hidden flex flex-col h-full">
          <div className="mb-6 sm:mb-8 flex items-center gap-4 border-b border-zinc-100 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-brand-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900">Import Data</h3>
              <p className="text-sm text-zinc-500">Upload Excel files to update system records</p>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                Import Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all",
                  importMode === 'auto' 
                    ? "border-brand-primary bg-brand-primary/5 text-brand-primary" 
                    : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                )}>
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="auto" 
                    checked={importMode === 'auto'} 
                    onChange={() => setImportMode('auto' as 'auto' | 'specific')} 
                    className="sr-only" 
                  />
                  Auto-Detect Sheets
                </label>
                <label className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all",
                  importMode === 'specific' 
                    ? "border-brand-primary bg-brand-primary/5 text-brand-primary" 
                    : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                )}>
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="specific" 
                    checked={importMode === 'specific'} 
                    onChange={() => setImportMode('specific' as 'auto' | 'specific')} 
                    className="sr-only" 
                  />
                  Specific Page
                </label>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {importMode === 'specific' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                    Target Page
                  </label>
                  <select
                    value={targetCollection}
                    onChange={(e) => setTargetCollection(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 hover:bg-zinc-50 transition-all appearance-none"
                  >
                    {COLLECTIONS.map(col => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                Excel Files (.xlsx, .xls)
              </label>
              <div className="relative group">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .xlsm"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => setFiles(e.target.files)}
                  className="w-full rounded-xl border-2 border-dashed border-zinc-200/80 bg-zinc-50/30 px-4 py-8 text-sm transition-all hover:border-brand-primary/50 hover:bg-zinc-50 focus:outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand-primary file:px-4 sm:file:px-6 file:py-2 file:text-[10px] sm:file:text-xs file:font-bold file:text-white hover:file:bg-zinc-800 cursor-pointer text-transparent"
                />
                {!files && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 text-xs font-medium px-4 text-center">
                    Drag and drop or click to select files
                  </div>
                )}
              </div>
              {files && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(files as any).map((file: any, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold text-zinc-700 border border-zinc-200/80">
                      <FileSpreadsheet className="h-3 w-3" />
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                Facility Override (Optional)
              </label>
              <input
                type="text"
                value={globalFacility}
                onChange={(e) => setGlobalFacility(e.target.value)}
                placeholder="e.g. FACILITY_A"
                className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 hover:bg-zinc-50 transition-all"
              />
            </div>
          </div>

          <div className="mt-8 space-y-4 border-t border-zinc-100 pt-6">
            <div className="flex items-center gap-3">
              <label htmlFor="clearBeforeImport" className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="clearBeforeImport"
                  checked={clearBeforeImport}
                  onChange={(e) => setClearBeforeImport(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary shrink-0"></div>
                <span className="ml-3 text-sm font-medium text-zinc-700">
                  Clear existing data before importing
                </span>
              </label>
            </div>

            <button
              onClick={handlePreviewClick}
              disabled={loading || !files || files.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-8 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 shadow-lg shadow-brand-primary/20 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Processing...' : 'Start Import'}
            </button>
          </div>
        </div>

        {/* Maintenance Section (Right Column) */}
        <div className="surface-card p-4 sm:p-8 relative overflow-hidden flex flex-col h-full">
          <div className="mb-6 sm:mb-8 flex items-center gap-4 border-b border-zinc-100 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-brand-primary">
              <DatabaseBackup className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900">Maintenance</h3>
              <p className="text-sm text-zinc-500">Bulk delete records from system collections</p>
            </div>
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                  Target Section
                </label>
                <select
                  value={maintenanceTarget}
                  onChange={(e) => setMaintenanceTarget(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 hover:bg-zinc-50 transition-all appearance-none"
                >
                  <option value="all">⚠️ ALL SECTIONS</option>
                  {COLLECTIONS.map(col => (
                    <option key={col.id} value={col.id}>{col.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                  Action Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all",
                    maintenanceAction === 'clear_all' 
                      ? "border-red-500 bg-red-50 text-red-700" 
                      : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                  )}>
                    <input 
                      type="radio" 
                      name="maintenanceAction" 
                      value="clear_all" 
                      checked={maintenanceAction === 'clear_all'} 
                      onChange={() => setMaintenanceAction('clear_all')} 
                      className="sr-only" 
                    />
                    Clear Entire Section
                  </label>
                  <label className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all",
                    maintenanceAction === 'clear_facility' 
                      ? "border-red-500 bg-red-50 text-red-700" 
                      : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                  )}>
                    <input 
                      type="radio" 
                      name="maintenanceAction" 
                      value="clear_facility" 
                      checked={maintenanceAction === 'clear_facility'} 
                      onChange={() => setMaintenanceAction('clear_facility')} 
                      className="sr-only" 
                    />
                    Delete by Facility
                  </label>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {maintenanceAction === 'clear_facility' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">
                      Facility Name
                    </label>
                    <input
                      type="text"
                      value={deleteFacility}
                      onChange={(e) => setDeleteFacility(e.target.value)}
                      placeholder="Enter Facility name..."
                      className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 hover:bg-zinc-50 transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-4">
                <button
                  onClick={handleMaintenanceExecute}
                  disabled={loading || (maintenanceAction === 'clear_facility' && !deleteFacility.trim())}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {loading ? 'Processing...' : (maintenanceAction === 'clear_all' ? 'Clear Section Data' : 'Delete Facility Data')}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex items-center gap-2 text-[10px] text-zinc-400 font-medium bg-zinc-50 p-3 rounded-lg">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            <span>Warning: This action is destructive and cannot be undone. Always backup your data before clearing.</span>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">匯入預覽</h3>
                <p className="text-sm text-zinc-500 mt-1">確認欄位對應正確後再執行匯入</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {preview.map(p => (
                <div key={p.collectionId}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-zinc-800">{p.collectionLabel}</h4>
                    <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">共 {p.totalRows} 筆</span>
                  </div>
                  {p.rows.length === 0 ? (
                    <div className="py-4 text-center text-zinc-400 text-sm border border-dashed rounded-xl">未偵測到有效資料列</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-zinc-200">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            {Object.keys(p.rows[0]).map(key => (
                              <th key={key} className="px-3 py-2 text-left font-bold text-zinc-500 whitespace-nowrap">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {p.rows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-3 py-2 text-zinc-700 whitespace-nowrap max-w-[150px] truncate">{String(val ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                          {p.totalRows > 10 && (
                            <tr>
                              <td colSpan={Object.keys(p.rows[0]).length} className="px-3 py-2 text-center text-zinc-400 italic">
                                … 另有 {p.totalRows - 10} 筆未顯示
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-zinc-100">
              <button onClick={() => setPreview(null)} className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors">
                取消
              </button>
              <button
                onClick={() => {
                  setPreview(null);
                  handleImportClick();
                }}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-700 rounded-xl transition-colors shadow-lg"
              >
                確認匯入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal */}
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
                {modal.type === 'danger' && <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle className="h-6 w-6" /></div>}
                {modal.type === 'success' && <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600"><CheckCircle2 className="h-6 w-6" /></div>}
                {modal.type === 'info' && <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><AlertTriangle className="h-6 w-6" /></div>}
                <h3 className="text-xl font-bold text-zinc-900">{modal.title}</h3>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{modal.message}</p>
              <div className="flex justify-end gap-3">
                {modal.onCancel && (
                  <button
                    onClick={modal.onCancel}
                    disabled={loading}
                    className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={modal.onConfirm}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 shadow-lg",
                    modal.type === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" : 
                    modal.type === 'success' ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : 
                    "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  )}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {modal.confirmText || 'OK'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
