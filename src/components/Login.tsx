import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
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

    const trimmedUsername = username.trim();
    const email = trimmedUsername.includes('@') ? trimmedUsername.toLowerCase() : `${trimmedUsername.toLowerCase().replace(/\s+/g, '.')}@tooling.local`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'resource-exhausted' || err.message?.includes('quota')) {
        setError('系統寫入配額已滿，暫時無法處理新用戶登入。請稍後再試。');
      } else if (err.code === 'auth/invalid-credential') {
        setError('帳號或密碼錯誤。如果您有設定自訂 Email，請使用 Email 登入。');
      } else {
        setError('登入失敗：' + (err.message || '未知錯誤'));
      }
      console.error('Login error:', err);
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
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas p-4 font-sans selection:bg-zinc-900 selection:text-white relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="surface-card p-6 sm:p-10 shadow-2xl shadow-black/[0.03]">
          <div className="text-center mb-8 sm:mb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
            >
              <ShieldCheck className="h-8 w-8" />
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="font-serif text-4xl italic tracking-tight text-zinc-900">Tooling Matrix</h1>
              <p className="mt-3 text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
                Management System v2.0
              </p>
            </motion.div>
          </div>

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
                      className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-11 py-3.5 text-sm transition-all focus:border-brand-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-primary/10 hover:bg-zinc-50"
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
                      className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-11 py-3.5 text-sm transition-all focus:border-brand-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-primary/10 hover:bg-zinc-50"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-primary py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 shadow-lg shadow-brand-primary/20 active:scale-[0.98]"
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
                      className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-11 py-3.5 text-sm transition-all focus:border-brand-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-primary/10 hover:bg-zinc-50"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={resetLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-primary py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 shadow-lg shadow-brand-primary/20 active:scale-[0.98]"
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
        <div className="mt-8 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold">
            Authorized Personnel Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
