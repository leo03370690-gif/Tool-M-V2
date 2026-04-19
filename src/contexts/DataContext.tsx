import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface DataContextType {
  products: any[];
  sockets: any[];
  changeKits: any[];
  pogoPins: any[];
  lifeTimes: any[];
  loadBoards: any[];
  requiredPogoPinRows: any[];
  maintenanceRecords: any[];
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [sockets, setSockets] = useState<any[]>([]);
  const [changeKits, setChangeKits] = useState<any[]>([]);
  const [pogoPins, setPogoPins] = useState<any[]>([]);
  const [lifeTimes, setLifeTimes] = useState<any[]>([]);
  const [loadBoards, setLoadBoards] = useState<any[]>([]);
  const [requiredPogoPinRows, setRequiredPogoPinRows] = useState<any[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProducts: () => void;
    let unsubSockets: () => void;
    let unsubKits: () => void;
    let unsubPogoPins: () => void;
    let unsubLifeTimes: () => void;
    let unsubLoadBoards: () => void;
    let unsubRequiredPogoPinRows: () => void;
    let unsubMaintenanceRecords: () => void;

    try {
      unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      unsubSockets = onSnapshot(collection(db, 'sockets'), (snapshot) => {
        setSockets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      unsubKits = onSnapshot(collection(db, 'changeKits'), (snapshot) => {
        setChangeKits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      unsubPogoPins = onSnapshot(collection(db, 'pogoPins'), (snapshot) => {
        setPogoPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      unsubLifeTimes = onSnapshot(collection(db, 'lifeTimes'), (snapshot) => {
        setLifeTimes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      unsubLoadBoards = onSnapshot(collection(db, 'loadBoards'), (snapshot) => {
        setLoadBoards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      unsubRequiredPogoPinRows = onSnapshot(collection(db, 'requiredPogoPinRows'), (snapshot) => {
        setRequiredPogoPinRows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      // Limit maintenance records to the latest 500 to prevent massive read spikes
      const maintQuery = query(collection(db, 'maintenanceRecords'), orderBy('issueDate', 'desc'), limit(500));
      unsubMaintenanceRecords = onSnapshot(maintQuery, (snapshot) => {
        setMaintenanceRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Set loading to false after a short delay to allow initial data to load
      setTimeout(() => setLoading(false), 800);
    } catch (error) {
      console.error("Error setting up data listeners:", error);
      setLoading(false);
    }

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubSockets) unsubSockets();
      if (unsubKits) unsubKits();
      if (unsubPogoPins) unsubPogoPins();
      if (unsubLifeTimes) unsubLifeTimes();
      if (unsubLoadBoards) unsubLoadBoards();
      if (unsubRequiredPogoPinRows) unsubRequiredPogoPinRows();
      if (unsubMaintenanceRecords) unsubMaintenanceRecords();
    };
  }, []);

  return (
    <DataContext.Provider value={{
      products,
      sockets,
      changeKits,
      pogoPins,
      lifeTimes,
      loadBoards,
      requiredPogoPinRows,
      maintenanceRecords,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};
