import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getUsers, saveUser, deleteUser } from '../services/authService';
import { Shield, Trash2, Plus, User as UserIcon, Save, Loader2 } from 'lucide-react';

interface UserManagementProps {
  currentUser: User | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('VIEWER');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const userData = await getUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) return;

    try {
      setIsLoading(true);
      const currentActiveId = localStorage.getItem('supabase_active_company_id') || '';
      
      const newUser: User = {
        id: crypto.randomUUID(),
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        name: newName.trim(),
        role: newRole,
        company_id: currentActiveId || undefined
      };

      await saveUser(newUser);
      await loadUsers();
      setIsAddingUser(false);
      
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewRole('VIEWER');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (currentUser && id === currentUser.id) {
      alert("You cannot delete yourself.");
      return;
    }
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        setIsLoading(true);
        await deleteUser(id);
        await loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-500">Manage system users and access roles</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <Shield size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">System Users</h2>
                  <p className="text-sm text-gray-500">Control who can access ZinethERP</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddingUser(!isAddingUser)}
                disabled={isLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isAddingUser ? 'Cancel' : <><Plus size={18}/> Add User</>}
              </button>
            </div>

            {isAddingUser && (
              <form onSubmit={handleAddUser} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 shadow-inner">
                 <h3 className="text-sm font-bold text-gray-800 uppercase mb-4">New User Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Display Name</label>
                        <input required placeholder="e.g. John Doe" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={newName} onChange={e => setNewName(e.target.value)} disabled={isLoading} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username</label>
                        <input required placeholder="johndoe" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={newUsername} onChange={e => setNewUsername(e.target.value)} disabled={isLoading} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                        <input required placeholder="••••••" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isLoading} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role & Authority</label>
                        <select className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={newRole} onChange={e => setNewRole(e.target.value as Role)} disabled={isLoading}>
                            <option value="ADMIN">Admin (Full Access & Settings)</option>
                            <option value="ACCOUNTANT">Editor (View, Edit & Create)</option>
                            <option value="VIEWER">Viewer (Read Only Access)</option>
                        </select>
                    </div>
                 </div>
                 <div className="mt-4 flex justify-end">
                     <button type="submit" disabled={isLoading} className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50">
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                        {isLoading ? 'Creating...' : 'Create User'}
                     </button>
                 </div>
              </form>
            )}

            {isLoading && users.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="p-3 pl-4">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 group">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                <UserIcon size={16} />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{u.name}</div>
                                <div className="text-xs text-gray-500">@{u.username}</div>
                            </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold border
                          ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                          ${u.role === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                          ${u.role === 'VIEWER' ? 'bg-gray-50 text-gray-600 border-gray-200' : ''}
                        `}>
                          {u.role === 'ACCOUNTANT' ? 'EDITOR' : u.role}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                         {currentUser && u.id !== currentUser.id && (
                           <button 
                             onClick={() => handleDeleteUser(u.id)}
                             disabled={isLoading}
                             className="text-gray-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded disabled:opacity-50"
                             title="Delete User"
                           >
                             <Trash2 size={16} />
                           </button>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
      </div>
    </div>
  );
};

export default UserManagement;