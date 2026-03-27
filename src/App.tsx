import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

import { Loader2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentUser) {
        // Listen to the user document for real-time role updates
        unsubscribeDoc = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          } else {
            // Check if it's the owner or the default admin by email/username
            const userEmail = currentUser.email?.toLowerCase();
            const isOwner = userEmail === 'leo03370690@gmail.com';
            const isDefaultAdmin = userEmail === 'leo.lo@tooling.local';

            if (isOwner || isDefaultAdmin) {
              setRole('admin');
              try {
                await setDoc(doc(db, 'users', currentUser.uid), {
                  username: isOwner ? 'Owner' : 'Leo.Lo',
                  role: 'admin',
                  createdAt: new Date().toISOString()
                });
              } catch (e: any) {
                console.error("Error creating admin doc:", e);
                if (e.code === 'resource-exhausted' || e.message?.includes('quota')) {
                  setQuotaExceeded(true);
                }
              }
            } else {
              setRole(null);
            }
          }
          setLoading(false);
        }, (error: any) => {
          console.error("Error listening to user doc:", error);
          if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
            setQuotaExceeded(true);
          }
          // Fallback for default admin even if snapshot fails
          const userEmail = currentUser.email?.toLowerCase();
          const isOwner = userEmail === 'leo03370690@gmail.com';
          const isDefaultAdmin = userEmail === 'leo.lo@tooling.local';
          if (isOwner || isDefaultAdmin) {
            setRole('admin');
          } else {
            setRole(null);
          }
          setLoading(false);
        });
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <AnimatePresence>
        {quotaExceeded && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-6 py-3 shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-bold tracking-wide">
                系統配額已達上限（每日寫入額度已滿）。部分功能（如匯入、刪除、修改）將暫時無法使用。
              </p>
            </div>
            <button 
              onClick={() => setQuotaExceeded(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/*" 
            element={user ? <Dashboard user={user} role={role} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </Router>
    </div>
  );
}
