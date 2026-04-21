import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, Socket, ChangeKit, PogoPin, LifeTime, LoadBoard, RequiredPogoPinRow, MaintenanceRecord } from '../lib/types';

interface DataContextType {
  products: Product[];
  sockets: Socket[];
  changeKits: ChangeKit[];
  pogoPins: PogoPin[];
  lifeTimes: LifeTime[];
  loadBoards: LoadBoard[];
  requiredPogoPinRows: RequiredPogoPinRow[];
  maintenanceRecords: MaintenanceRecord[];
  loading: boolean;
}

const DataContext = createContext<DataContextType>({
  products: [],
  sockets: [],
  changeKits: [],
  pogoPins: [],
  lifeTimes: [],
  loadBoards: [],
  requiredPogoPinRows: [],
  maintenanceRecords: [],
  loading: true,
});

export const useData = () => useContext(DataContext);

const COLLECTION_COUNT = 8;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sockets, setSockets] = useState<Socket[]>([]);
  const [changeKits, setChangeKits] = useState<ChangeKit[]>([]);
  const [pogoPins, setPogoPins] = useState<PogoPin[]>([]);
  const [lifeTimes, setLifeTimes] = useState<LifeTime[]>([]);
  const [loadBoards, setLoadBoards] = useState<LoadBoard[]>([]);
  const [requiredPogoPinRows, setRequiredPogoPinRows] = useState<RequiredPogoPinRow[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Track first-load per collection to avoid relying on arbitrary timeouts
  const firstLoaded = useRef<Record<string, boolean>>({});
  const markLoaded = (key: string) => {
    if (firstLoaded.current[key]) return;
    firstLoaded.current[key] = true;
    if (Object.keys(firstLoaded.current).length >= COLLECTION_COUNT) {
      setLoading(false);
    }
  };

  useEffect(() => {
    const toDoc = <T,>(doc: any): T => ({ ...doc.data(), id: doc.id } as T);

    const unsubs = [
      onSnapshot(collection(db, 'products'), (snap) => {
        setProducts(snap.docs.map(d => toDoc<Product>(d)));
        markLoaded('products');
      }),
      onSnapshot(collection(db, 'sockets'), (snap) => {
        setSockets(snap.docs.map(d => toDoc<Socket>(d)));
        markLoaded('sockets');
      }),
      onSnapshot(collection(db, 'changeKits'), (snap) => {
        setChangeKits(snap.docs.map(d => toDoc<ChangeKit>(d)));
        markLoaded('changeKits');
      }),
      onSnapshot(collection(db, 'pogoPins'), (snap) => {
        setPogoPins(snap.docs.map(d => toDoc<PogoPin>(d)));
        markLoaded('pogoPins');
      }),
      onSnapshot(collection(db, 'lifeTimes'), (snap) => {
        setLifeTimes(snap.docs.map(d => toDoc<LifeTime>(d)));
        markLoaded('lifeTimes');
      }),
      onSnapshot(collection(db, 'loadBoards'), (snap) => {
        setLoadBoards(snap.docs.map(d => toDoc<LoadBoard>(d)));
        markLoaded('loadBoards');
      }),
      onSnapshot(collection(db, 'requiredPogoPinRows'), (snap) => {
        setRequiredPogoPinRows(snap.docs.map(d => toDoc<RequiredPogoPinRow>(d)));
        markLoaded('requiredPogoPinRows');
      }),
      onSnapshot(
        query(collection(db, 'maintenanceRecords'), orderBy('issueDate', 'desc'), limit(500)),
        (snap) => {
          setMaintenanceRecords(snap.docs.map(d => toDoc<MaintenanceRecord>(d)));
          markLoaded('maintenanceRecords');
        }
      ),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const value = useMemo<DataContextType>(() => ({
    products,
    sockets,
    changeKits,
    pogoPins,
    lifeTimes,
    loadBoards,
    requiredPogoPinRows,
    maintenanceRecords,
    loading,
  }), [products, sockets, changeKits, pogoPins, lifeTimes, loadBoards, requiredPogoPinRows, maintenanceRecords, loading]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
