import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getUsers, saveUser, deleteUser } from '../services/authService';
import { getCompanySettings, saveCompanySettings } from '../services/settingsService';
import { supabase } from '../services/supabaseService';
import { User as UserIcon, Save, Building, Hash, Shield, Trash2, Plus, Pencil, Landmark, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onUpdateCompany?: (name: string) => void;
  onCompanyCreated?: () => void; 
  activeCompanyId?: string; 
}

const Settings: React.FC<SettingsProps> = ({ 
  currentUser, 
  onUpdateUser, 
  onUpdateCompany, 
  onCompanyCreated,
  activeCompanyId: propCompanyId
}) => {
  // Profile State
  const [name, setName] = useState(currentUser.name);
  const [password, setPassword] = useState(currentUser.password);
  const [message, setMessage] = useState('');

  // Company State
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  
  // Invoice Settings State
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('VIEWER');

  // New Corporate Company Creation States
  const [newCorpCompanyName, setNewCorpCompanyName] = useState('');
  const [isCreatingCorp, setIsCreatingCorp] = useState(false);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  
  // Internal fallback state for loaded profile metadata
  const [realDatabaseCompanyId, setRealDatabaseCompanyId] = useState('');

  const getActiveCompanyToken = (): string => {
    if (propCompanyId && propCompanyId !== 'default') return propCompanyId;
    
    const commonKeys = [
      'supabase_active_company_id', 
      'active_company_id', 
      'selected_company_id', 
      'current_company_id', 
      'company_id'
    ];
    
    for (const key of commonKeys) {
      const val = localStorage.getItem(key);
      if (val && val.trim() !== '' && val !== 'default') return val;
    }
    return '';
  };

  const activeCompanyId = getActiveCompanyToken();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getCompanySettings();
        setCompanyName(settings.companyName);
        setCompanyEmail(settings.email || '');
        setTaxId(settings.taxId || '');
        setInvoicePrefix(settings.invoicePrefix || 'INV-');
        setNextInvoiceNumber(settings.nextInvoiceNumber || 1);

        // Extracting actual valid UUID from DB payload mapping
        if (settings && (settings.id || settings.companyId || settings.company_id)) {
          const matchedId = settings.id || settings.companyId || settings.company_id;
          if (matchedId !== 'default') {
            setRealDatabaseCompanyId(matchedId);
          }
        }

        const allUsers = await getUsers();
        const currentEffectiveId = activeCompanyId || settings.id || settings.company_id || '';
        
        if (currentUser.role === 'ADMIN') {
          const filteredUsers = allUsers.filter(u => u.company_id === currentEffectiveId || u.role === 'ADMIN');
          setUsers(filteredUsers);
        } else {
          setUsers(allUsers.filter(u => u.id === currentUser.id));
        }
      } catch (error) {
        console.error('Error loading isolated settings:', error);
      }
    };
    loadSettings();
  }, [currentUser, activeCompanyId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = { ...currentUser, name, password };
      await saveUser(updatedUser);
      onUpdateUser(updatedUser);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile');
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'ADMIN') return;

    try {
      const currentSettings = await getCompanySettings();
      await saveCompanySettings({ 
          ...currentSettings,
          companyName, 
          email: companyEmail, 
          taxId,
          invoicePrefix,
          nextInvoiceNumber: Number(nextInvoiceNumber)
      });

      if (onUpdateCompany) {
        onUpdateCompany(companyName);
      }
      setMessage('Company settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving company settings:', error);
      setMessage('Failed to save company settings');
    }
  };

  const handleCreateNewCorporateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorpCompanyName.trim() || isCreatingCorp) return;

    setIsCreatingCorp(true);
    try {
      const companyId = crypto.randomUUID();

      const { error: companyError } = await supabase
        .from('companies')
        .insert([{ id: companyId, name: newCorpCompanyName.trim() }]);

      if (companyError) throw companyError;

      const { error: mappingError } = await supabase
        .from('user_companies')
        .insert([{ 
          id: crypto.randomUUID(), 
          company_id: companyId,
          user_id: currentUser?.id || null
        }]);

      if (mappingError) throw mappingError;

      setNewCorpCompanyName('');
      setMessage('Enterprise Company Profile Successfully Deployed and Mapped!');
      setTimeout(() => setMessage(''), 4000);

      if (onCompanyCreated) {
        onCompanyCreated();
      }
    } catch (error: any) {
      console.error('Company insertion error:', error);
      alert(`Error: ${error?.message || 'Database rejected entry.'}`);
    } finally {
      setIsCreatingCorp(false);
    }
  };

  // 👑 FIXED BULLETPROOF CASCADE DELETE TARGETING ENGINE WITHOUT "DEFAULT" SYNTAX INJECTION
  const handleDeleteActiveCompany = async () => {
    if (currentUser.role !== 'ADMIN') return;
    
    // Safety check filter logic against string literals
    let targetCompanyId = activeCompanyId || realDatabaseCompanyId;
    
    if (!targetCompanyId || targetCompanyId === 'default') {
      targetCompanyId = localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
    }

    if (!targetCompanyId || targetCompanyId === 'default') {
      alert("⚠️ Verification Error: System resolved a literal 'default' pointer instead of a valid database UUID. Please select another company from the sidebar dropdown first to initialize memory tokens.");
      return;
    }

    const firstConfirm = confirm(
      `⚠️ WARNING: Are you absolutely sure you want to delete this active workspace?\n\nThis will permanently erase all Ledgers, Vouchers, Invoices, Stock Data, and Staff permissions inside this entity!`
    );

    if (!firstConfirm) return;

    const finalConfirm = prompt(
      `🔒 SECURITY CHECK:\nTo confirm deletion, please type the word "DELETE" in capital letters below:`
    );

    if (finalConfirm !== 'DELETE') {
      alert("Verification failed. Deletion canceled.");
      return;
    }

    setIsDeletingCompany(true);
    try {
      // 1. Clean transactions & vouchers matching exact UUID
      await supabase.from('stock_transactions').delete().eq('company_id', targetCompanyId);
      await supabase.from('vouchers').delete().eq('company_id', targetCompanyId);
      
      // 2. Clean ledgers & inventory items matching exact UUID
      await supabase.from('ledgers').delete().eq('company_id', targetCompanyId);
      await supabase.from('inventory_items').delete().eq('company_id', targetCompanyId);
      
      // 3. Clean user-company mapping links
      await supabase.from('user_companies').delete().eq('company_id', targetCompanyId);
      
      // 4. Remove the core company entry row matching exact UUID
      const { error: companyErr } = await supabase.from('companies').delete().eq('id', targetCompanyId);
      if (companyErr) throw companyErr;

      alert("🏢 Company and all associated records cleared successfully from cloud servers!");
      
      const keysToWipe = ['supabase_active_company_id', 'active_company_id', 'selected_company_id', 'current_company_id', 'company_id'];
      keysToWipe.forEach(k => localStorage.removeItem(k));
      
      if (onCompanyCreated) {
        await onCompanyCreated();
      }
      window.location.reload();

    } catch (error: any) {
      console.error("Cascade deletion failed:", error);
      alert(`Database Error: ${error?.message || 'Request rejected. Invalid table permissions.'}`);
    } finally {
      setIsDeletingCompany(false);
    }
  };

  const handleAddOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCompanyId = activeCompanyId || realDatabaseCompanyId;
    if (!newUsername || !newName || !effectiveCompanyId || effectiveCompanyId === 'default') {
      alert("Please ensure a valid active company is selected first.");
      return;
    }

    try {
      const id = editingUserId || crypto.randomUUID();
      
      let passwordToSave = newPassword;
      if (editingUserId && !newPassword) {
          const existing = users.find(u => u.id === editingUserId);
          if (existing) passwordToSave = existing.password;
      } else if (!editingUserId && !newPassword) {
          alert("Password is required for new users");
          return; 
      }

      const userToSave: any = {
          id,
          username: newUsername,
          password: passwordToSave,
          name: newName,
          role: newRole,
          company_id: effectiveCompanyId 
      };

      await saveUser(userToSave);

      await supabase
        .from('user_companies')
        .insert([{
          id: crypto.randomUUID(),
          user_id: id,
          company_id: effectiveCompanyId
        }]);

      const allUsers = await getUsers();
      setUsers(allUsers.filter(u => u.company_id === effectiveCompanyId || u.role === 'ADMIN'));
      resetUserForm();
      alert(`User registered and restricted to this workspace!`);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const resetUserForm = () => {
    setIsAddingUser(false);
    setEditingUserId(null);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('VIEWER');
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewName(user.name);
    setNewUsername(user.username);
    setNewPassword(''); 
    setNewRole(user.role);
    setIsAddingUser(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) {
      alert("You cannot delete yourself.");
      return;
    }
    const effectiveCompanyId = activeCompanyId || realDatabaseCompanyId;
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        const allUsers = await getUsers();
        setUsers(allUsers.filter(u => u.company_id === effectiveCompanyId || u.role === 'ADMIN'));
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500">Manage your profile, company details, and system users</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
               <UserIcon size={24} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-gray-800">My Profile</h2>
               <p className="text-sm text-gray-500">Update your personal details</p>
             </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            {message && !message.includes('Company') && !message.includes('Enterprise') && (
              <div className="text-green-600 text-sm font-medium">{message}</div>
            )}

            <div className="pt-2">
               <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2">
                 <Save size={16} /> Save Changes
               </button>
            </div>
          </form>
        </div>

        {/* Company Setup */}
        {currentUser.role === 'ADMIN' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                 <Building size={24} />
               </div>
               <div>
                 <h2 className="text-lg font-bold text-gray-800">Company Setup</h2>
                 <p className="text-sm text-gray-500">Manage business details</p>
               </div>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / GST</label>
                    <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
              </div>

              <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                      <Hash size={16} className="text-gray-400"/>
                      <span className="text-sm font-bold text-gray-700">Invoice Numbering</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                        <input
                            type="text"
                            value={invoicePrefix}
                            onChange={(e) => setInvoicePrefix(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Number</label>
                        <input
                            type="number"
                            value={nextInvoiceNumber}
                            onChange={(e) => setNextInvoiceNumber(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                  </div>
              </div>

              {message && message.includes('Company') && <div className="text-green-600 text-sm font-medium">{message}</div>}

              <div className="pt-2">
                 <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                   <Save size={16} /> Save Company
                 </button>
              </div>
            </form>
          </div>
        )}

        {/* Multi-Company Creation Control */}
        {currentUser.role === 'ADMIN' && (
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-xl shadow-lg p-6 border border-indigo-800">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
                 <Landmark size={24} />
               </div>
               <div>
                 <h2 className="text-lg font-bold tracking-tight">Enterprise Multi-Company Control</h2>
                 <p className="text-xs text-indigo-300 font-medium">Instantly launch independent multi-tenant corporate entities</p>
               </div>
            </div>

            <form onSubmit={handleCreateNewCorporateCompany} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-black/30 p-4 border border-indigo-900/50 rounded-xl">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-indigo-300 uppercase mb-1.5 tracking-wider">New Corporate Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Zineth Corp LLC"
                  value={newCorpCompanyName}
                  onChange={(e) => setNewCorpCompanyName(e.target.value)}
                  className="w-full p-2.5 text-sm bg-indigo-950/80 border border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white font-medium"
                />
              </div>
              <div>
                <button 
                  type="submit" 
                  disabled={isCreatingCorp}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  {isCreatingCorp ? 'Deploying...' : <><Plus size={16} /> Deploy Profile</>}
                </button>
              </div>
            </form>

            {message && message.includes('Enterprise') && (
              <div className="text-emerald-400 text-xs font-black mt-3 bg-emerald-950/40 border border-emerald-900/50 p-2 rounded-lg w-fit">
                ✓ {message}
              </div>
            )}
          </div>
        )}

        {/* Isolated User Management Table */}
        {currentUser.role === 'ADMIN' && (
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-800">User Workspace Management</h2>
                    <span className="text-[10px] font-black bg-indigo-100 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded uppercase">
                      Viewing Users for Selected Dropdown Company
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Displaying staff bound explicitly to this company workspace</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (isAddingUser) resetUserForm();
                  else setIsAddingUser(true);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition"
              >
                {isAddingUser ? 'Cancel' : <><Plus size={18}/> Add Workspace User</>}
              </button>
            </div>

            {isAddingUser && (
              <form onSubmit={handleAddOrUpdateUser} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 shadow-inner">
                 <h3 className="text-sm font-bold text-gray-800 uppercase mb-4">
                   {editingUserId ? 'Edit Staff Profile' : `Add Staff Member specifically into current Dropdown Company`}
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Display Name</label>
                        <input required placeholder="e.g. John Doe" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username</label>
                        <input required placeholder="johndoe" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                        <input placeholder={editingUserId ? "••••••" : "Required"} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
                        <select className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={newRole} onChange={e => setNewRole(e.target.value as Role)}>
                            <option value="ACCOUNTANT">Editor (Workspace Bound)</option>
                            <option value="VIEWER">Viewer (Workspace Bound)</option>
                        </select>
                    </div>
                 </div>
                 <div className="mt-4 flex justify-end">
                     <button type="submit" className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 flex items-center gap-2">
                        <Save size={16} /> {editingUserId ? 'Update Profile' : 'Lock User into Workspace'}
                     </button>
                 </div>
              </form>
            )}

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="p-3 pl-4">User</th>
                    <th className="p-3">Scope Lock</th>
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
                          ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                        `}>
                          {u.role === 'ADMIN' ? 'GLOBAL SUPERVISOR' : 'CURRENT WORKSPACE ONLY'}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                         <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => handleEditUser(u)}
                                className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                            >
                                <Pencil size={16} />
                            </button>
                            {u.id !== currentUser.id && (
                                <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Danger Zone Section */}
        {currentUser.role === 'ADMIN' && (
          <div className="md:col-span-2 bg-rose-50 rounded-xl border-2 border-rose-100 p-6 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-900">Danger Zone</h2>
                <p className="text-xs text-rose-600 font-medium">Irreversible system level cleanup operations</p>
              </div>
            </div>
            
            <div className="bg-white border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-gray-800">Delete Current Active Workspace Entity</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  This will completely destroy the currently active sidebar workspace along with all its financial accounts, transactions and history from the server.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeletingCompany}
                onClick={handleDeleteActiveCompany}
                className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition whitespace-nowrap shrink-0 shadow-sm shadow-rose-100"
              >
                <Trash2 size={14} />
                {isDeletingCompany ? 'Destroying Entity...' : 'Destroy Workspace Profile'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;