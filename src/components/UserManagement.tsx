import React, { useState, useEffect } from 'react';
import { db, auth, firebaseConfig } from '../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { Plus, Trash2, UserPlus, Shield, User as UserIcon, Users, Edit2, Check, X, Loader2, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { logAuditAction } from '../lib/audit';
import { motion, AnimatePresence } from 'motion/react';
import { sendPasswordResetEmail } from 'firebase/auth';

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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(data);
    }, (error) => {
      console.error("Error fetching users:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let secondaryApp;
    try {
      const email = newEmail || `${newUsername.toLowerCase()}@tooling.local`;
      
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
      await signOut(secondaryAuth);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: newUsername,
        email: email,
        role: newRole,
        createdAt: new Date().toISOString()
      });
      
      await logAuditAction('Add User', `Added user ${newUsername} with role ${newRole}`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        alert('A user with this email/username already exists.');
      } else {
        alert('Failed to add user: ' + err.message);
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
    try {
      const userToUpdate = users.find(u => u.id === userId);
      await updateDoc(doc(db, 'users', userId), { role: editRole });
      await logAuditAction('Update User Role', `Updated role for user ${userToUpdate?.username} to ${editRole}`);
      setEditingUserId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const userToDelete = users.find(u => u.id === userId);
      await deleteDoc(doc(db, 'users', userId));
      await logAuditAction('Delete User', `Deleted user ${userToDelete?.username}`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
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
              placeholder="john@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
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
                        onClick={() => handleDeleteUser(user.id)}
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
    </motion.div>
  );
}
