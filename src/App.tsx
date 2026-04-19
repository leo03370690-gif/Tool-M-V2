import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FacilitySelection from './components/FacilitySelection';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';

const ADMIN_EMAILS = ['leo03370690@gmail.com', 'leo.lo@tooling.local'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

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
            // Check if it's a hardcoded admin email
            const userEmail = currentUser.email?.toLowerCase();
            const isHardcodedAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail) : false;

            if (isHardcodedAdmin) {
              setRole('admin');
              try {
                await setDoc(doc(db, 'users', currentUser.uid), {
                  username: userEmail === 'leo03370690@gmail.com' ? 'Owner' : 'Leo.Lo',
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
          // Fallback for hardcoded admin emails if snapshot fails
          const userEmail = currentUser.email?.toLowerCase();
          if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
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
    <ThemeProvider>
      <div className="min-h-screen bg-bg-canvas">
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
              element={
                user ? (
                  selectedFacility ? (
                    <DataProvider>
                      <Dashboard 
                        user={user} 
                        role={role} 
                        selectedFacility={selectedFacility} 
                        onBackToFacility={() => {
                          Object.keys(window.sessionStorage).forEach(key => {
                            if (key.includes('_filter')) {
                              window.sessionStorage.removeItem(key);
                            }
                          });
                          setSelectedFacility(null);
                        }} 
                      />
                    </DataProvider>
                  ) : (
                    <FacilitySelection onSelect={(facility) => {
                      Object.keys(window.sessionStorage).forEach(key => {
                        if (key.includes('_filter')) {
                          window.sessionStorage.removeItem(key);
                        }
                      });
                      setSelectedFacility(facility);
                    }} />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />
          </Routes>
        </Router>
      </div>
    </ThemeProvider>
  );
}
