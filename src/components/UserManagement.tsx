import React, { useState, useEffect } from 'react';
import { db, auth, firebaseConfig } from '../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signOut, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { Plus, Trash2, UserPlus, Shield, User as UserIcon, Users, Edit2, Check, X, Loader2, Mail, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { logAuditAction } from '../lib/audit';
import { motion, AnimatePresence } from 'motion/react';
import { sendPasswordResetEmail } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface UserData {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null, username: string | null}>({ 
    isOpen: false, 
    id: null, 
    username: null 
  });

  useEffect(() => {
    const path = 'users';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    let secondaryApp;
    try {
      const email = newEmail.trim() || `${newUsername.trim().toLowerCase().replace(/\s+/g, '.')}@tooling.local`;
      
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      await setPersistence(secondaryAuth, inMemoryPersistence);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
      await signOut(secondaryAuth);
      
      const path = `users/${userCredential.user.uid}`;
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: newUsername,
          email: email,
          role: newRole,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      
      await logAuditAction('Add User', `Added user ${newUsername} with role ${newRole}`);
      setSuccess(`成功新增用戶：${newUsername}`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('此帳號或 Email 已被使用。如果您之前刪除過此用戶，其底層驗證帳號仍然存在，請使用不同的帳號名稱。');
      } else {
        setError('新增用戶失敗：' + (err.message || '未知錯誤'));
      }
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(console.error);
      }
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (user: UserData) => {
    if (!user.email) {
      alert('This user does not have an email address associated.');
      return;
    }
    
    setResettingId(user.id);
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert(`Password reset email sent to ${user.email}`);
      await logAuditAction('Send Reset Email', `Sent password reset email to ${user.username} (${user.email})`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to send reset email: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      const userToUpdate = users.find(u => u.id === userId);
      await updateDoc(doc(db, 'users', userId), { role: editRole });
      await logAuditAction('Update User Role', `Updated role for user ${userToUpdate?.username} to ${editRole}`);
      setEditingUserId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.id) return;
    
    setDeletingId(deleteModal.id);
    const path = `users/${deleteModal.id}`;
    try {
      const userToDelete = users.find(u => u.id === deleteModal.id);
      await deleteDoc(doc(db, 'users', deleteModal.id));
      await logAuditAction('Delete User', `Deleted user ${userToDelete?.username}`);
      setDeleteModal({ isOpen: false, id: null, username: null });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Add New Personnel</h3>
              <p className="text-xs text-zinc-500">Create a new user account with specific roles</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-600 shadow-sm border border-zinc-100">
            <Users className="h-3.5 w-3.5" />
            <span>Total: {users.length}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200 flex items-center gap-2 overflow-hidden"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="rounded-xl bg-green-50 p-3 text-sm text-green-600 ring-1 ring-green-200 flex items-center gap-2 overflow-hidden"
            >
              <Check className="h-4 w-4 shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Username</label>
            <input
              type="text"
              placeholder="e.g. John.Doe"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Email (Optional)</label>
            <input
              type="email"
              placeholder={`${newUsername.trim().toLowerCase().replace(/\s+/g, '.') || 'username'}@tooling.local`}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all"
            />
            <p className="text-[10px] text-zinc-500 ml-1">
              若填寫，該用戶必須使用此 Email 登入。若留白，則可直接使用 Username 登入。
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all appearance-none"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {users.map(user => (
            <motion.div 
              key={user.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-md hover:border-zinc-300"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
                  user.role === 'admin' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                )}>
                  {user.role === 'admin' ? <Shield className="h-6 w-6" /> : <UserIcon className="h-6 w-6" />}
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{user.username}</p>
                  <p className="text-[10px] text-zinc-400 truncate max-w-[120px]">{user.email}</p>
                  {editingUserId === user.id ? (
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'admin' | 'user')}
                      className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium focus:outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mt-1",
                      user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
              
              {user.username !== 'Leo.Lo' && user.username !== 'Owner' && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingUserId === user.id ? (
                    <>
                      <button 
                        onClick={() => handleUpdateRole(user.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setEditingUserId(null)}
                        className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleSendResetEmail(user)}
                        disabled={resettingId === user.id}
                        title="Send password reset email"
                        className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {resettingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditRole(user.role);
                        }}
                        className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, id: user.id, username: user.username })}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Confirm Personnel Deletion</h3>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-zinc-600">
                Are you sure you want to delete <span className="font-bold text-zinc-900">{deleteModal.username}</span>? 
                This will remove their access to the system. Note: This only removes their profile from the database, not their authentication record.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: null, username: null })}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={!!deletingId}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deletingId ? 'Deleting...' : 'Delete Personnel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
