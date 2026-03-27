import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { LogIn, Loader2, ShieldCheck, Lock, User, Mail, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState({ text: '', type: 'success' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const email = username.includes('@') ? username : `${username.toLowerCase()}@tooling.local`;

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (username.toLowerCase() === 'leo.lo' && password === '123456') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw new Error('Invalid password');
            }
            throw createErr;
          }
        } else {
          throw err;
        }
      }

      const isDefaultAdmin = username.toLowerCase() === 'leo.lo' && password === '123456';
      if (isDefaultAdmin && userCredential) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              username: 'Leo.Lo',
              email: email,
              role: 'admin',
              createdAt: new Date().toISOString()
            });
          }
        } catch (dbErr: any) {
          console.error("Database error during login:", dbErr);
          // Don't block login for admins if DB write fails due to quota
        }
      }
    } catch (err: any) {
      if (err.code === 'resource-exhausted' || err.message?.includes('quota')) {
        setError('系統寫入配額已滿，暫時無法處理新用戶登入。請稍後再試。');
      } else {
        setError('帳號或密碼錯誤');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage({ text: '', type: 'success' });
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage({ text: 'Reset link sent! Please check your email.', type: 'success' });
      setTimeout(() => {
        setShowResetModal(false);
        setResetMessage({ text: '', type: 'success' });
        setResetEmail('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setResetMessage({ text: 'Failed to send reset email. Please check the address.', type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F0] p-4 font-sans selection:bg-zinc-900 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div className="bg-[#141414] p-10 text-center text-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-white blur-3xl" />
          </div>

          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20">
                <ShieldCheck className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="font-serif text-4xl italic tracking-tight">Tooling Master</h1>
            <p className="mt-3 text-[10px] text-zinc-400 uppercase tracking-[0.3em] font-bold">
              Management System v2.0
            </p>
          </motion.div>
        </div>

        <div className="p-10">
          <AnimatePresence mode="wait">
            {!showResetModal ? (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin} 
                className="space-y-6"
              >
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-200 flex items-center gap-3"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Username / Email</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-11 py-3.5 text-sm transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5"
                      placeholder="e.g. Leo.Lo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</label>
                    <button 
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-11 py-3.5 text-sm transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-zinc-900 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 shadow-xl shadow-zinc-900/10"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      <span className="tracking-widest uppercase">Sign In</span>
                    </>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form 
                key="reset-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword} 
                className="space-y-6"
              >
                <button 
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Login
                </button>

                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Reset Password</h3>
                  <p className="text-sm text-zinc-500 mt-1">Enter your email to receive a reset link.</p>
                </div>

                <AnimatePresence mode="wait">
                  {resetMessage.text && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "rounded-xl p-4 text-sm ring-1 flex items-center gap-3",
                        resetMessage.type === 'success' ? "bg-green-50 text-green-600 ring-green-200" : "bg-red-50 text-red-600 ring-red-200"
                      )}
                    >
                      <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", resetMessage.type === 'success' ? "bg-green-600" : "bg-red-600")} />
                      {resetMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-11 py-3.5 text-sm transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={resetLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-zinc-900 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 shadow-xl shadow-zinc-900/10"
                >
                  {resetLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-5 w-5" />
                      <span className="tracking-widest uppercase">Send Reset Link</span>
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50/50 p-6 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold">
            Authorized Personnel Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
