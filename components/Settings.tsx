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

  // Active Single Company State (Used for non-Zineth isolated scopes)
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);

  // Users Storage Matrix
  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Integrated Deployer State Matrix
  const [newCorpCompanyName, setNewCorpCompanyName] = useState('');
  const [newCorpEmail, setNewCorpEmail] = useState('');
  const [newCorpTaxId, setNewCorpTaxId] = useState('');
  const [newCorpPrefix, setNewCorpPrefix] = useState('INV-');
  const [newCorpNextNumber, setNewCorpNextNumber] = useState(1);
  const [isCreatingCorp, setIsCreatingCorp] = useState(false);
  
  // Isolated Management States
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('VIEWER');
  const [formSelectedCompanyId, setFormSelectedCompanyId] = useState('');

  // Shared Core Systems States
  const [allDbCompanies, setAllDbCompanies] = useState<{id: string, name: string}[]>([]);
  const [selectedCompanyToDelete, setSelectedCompanyToDelete] = useState('');
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);

  // Strict Runtime Scope Resolution Keys
  const activeCompanyId = propCompanyId || localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
  
  // 👑 DETERMINING SCOPE ARCHITECTURE: Is the user inside the global master Zenith system node?
  const isMasterZenithScope = companyName.toLowerCase().replace(/\s+/g, '') === 'zinetherp';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getCompanySettings();
        setCompanyName(settings.companyName || '');
        setCompanyEmail(settings.email || '');
        setTaxId(settings.taxId || '');
        setInvoicePrefix(settings.invoicePrefix || 'INV-');
        setNextInvoiceNumber(settings.nextInvoiceNumber || 1);

        // Synchronize and load master system tables for deployment control mapping
        const { data: companiesData, error: compErr } = await supabase.from('companies').select('id, name');
        if (!compErr && companiesData) {
          setAllDbCompanies(companiesData);

          if (currentUser.role === 'ADMIN') {
            const { data: mappingsData } = await supabase
              .from('user_companies')
              .select('company_id')
              .eq('user_id', currentUser.id);

            const mappedIds = mappingsData ? mappingsData.map(m => m.company_id) : [];
            const missingCompanies = companiesData.filter(c => !mappedIds.includes(c.id));

            if (missingCompanies.length > 0) {
              const injectRows = missingCompanies.map(c => ({
                id: crypto.randomUUID(),
                user_id: currentUser.id,
                company_id: c.id
              }));
              await supabase.from('user_companies').insert(injectRows);
              if (onCompanyCreated) onCompanyCreated();
            }
          }
        }

        const allUsers = await getUsers();
        const currentEffectiveId = activeCompanyId || settings.id || settings.company_id || '';
        
        // 👑 Strict Global View Matrix logic allocation boundaries
        if (currentUser.role === 'ADMIN' && (settings.companyName?.toLowerCase().replace(/\s+/g, '') === 'zinetherp')) {
          setUsers(allUsers); // Master Zenith views everyone globally across all tenant nodes
        } else {
          setUsers(allUsers.filter(u => u.company_id === currentEffectiveId)); // Tenant Isolation Node mapping boundary lock
        }
      } catch (error) {
        console.error('Error loading corporate network scope architecture state:', error);
      }
    };
    loadSettings();
  }, [currentUser, activeCompanyId, onCompanyCreated, companyName]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = { ...currentUser, name, password };
      await saveUser(updatedUser);
      onUpdateUser(updatedUser);
      setMessage('Profile credentials successfully updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveIsolatedCompany = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (onUpdateCompany) onUpdateCompany(companyName);
      setMessage('Tenant configuration saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  // 👑 MEGA CORPORATE INTEGRATED DEPLOYER ENGINE
  const handleDeployFullCorporateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorpCompanyName.trim() || isCreatingCorp) return;

    setIsCreatingCorp(true);
    try {
      const companyId = crypto.randomUUID();

      // 1. Instantly spin up core company entity with settings embedded inside deployment block
      const { error: companyError } = await supabase
        .from('companies')
        .insert([{ 
          id: companyId, 
          name: newCorpCompanyName.trim(),
          email: newCorpEmail.trim(),
          tax_id: newCorpTaxId.trim(),
          invoice_prefix: newCorpPrefix.trim(),
          next_invoice_number: Number(newCorpNextNumber)
        }]);

      if (companyError) throw companyError;

      // 2. Automatically link logged-in corporate admin token pointer to this new profile branch
      await supabase
        .from('user_companies')
        .insert([{ 
          id: crypto.randomUUID(), 
          company_id: companyId,
          user_id: currentUser?.id || null
        }]);

      setNewCorpCompanyName('');
      setNewCorpEmail('');
      setNewCorpTaxId('');
      setNewCorpPrefix('INV-');
      setNewCorpNextNumber(1);
      
      setMessage('Enterprise Corporate Entity and Mappings fully deployed to cloud infrastructure!');
      
      const { data } = await supabase.from('companies').select('id, name');
      if (data) setAllDbCompanies(data);

      setTimeout(() => setMessage(''), 4000);
      if (onCompanyCreated) onCompanyCreated();
    } catch (error: any) {
      alert(`Database rejected deployment setup: ${error?.message}`);
    } finally {
      setIsCreatingCorp(false);
    }
  };

  const handleAddOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit targeting strategy allocation
    const targetCompanyUuid = formSelectedCompanyId || activeCompanyId;
    
    if (!newUsername || !newName || !targetCompanyUuid || targetCompanyUuid === 'default') {
      alert("Please ensure a clear target destination workspace mapping is configured.");
      return;
    }

    try {
      const id = editingUserId || crypto.randomUUID();
      let passwordToSave = newPassword;
      if (editingUserId && !newPassword) {
          const existing = users.find(u => u.id === editingUserId);
          if (existing) passwordToSave = existing.password;
      }

      const sanitizedUsername = newUsername.trim().toLowerCase();

      await saveUser({
          id,
          username: sanitizedUsername,
          password: passwordToSave,
          name: newName,
          role: newRole,
          company_id: targetCompanyUuid 
      });

      await supabase
        .from('user_companies')
        .insert([{
          id: crypto.randomUUID(),
          user_id: id,
          company_id: targetCompanyUuid
        }]);

      const allUsers = await getUsers();
      setUsers(isMasterZenithScope ? allUsers : allUsers.filter(u => u.company_id === activeCompanyId));
      resetUserForm();
      alert(`Staff registered and mapped into target workspace cluster!`);
    } catch (error: any) {
      alert(`Failed to lock user boundary profile: ${error?.message}`);
    }
  };

  const resetUserForm = () => {
    setIsAddingUser(false);
    setEditingUserId(null);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('VIEWER');
    setFormSelectedCompanyId('');
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewName(user.name);
    setNewUsername(user.username);
    setNewPassword(''); 
    setNewRole(user.role);
    setFormSelectedCompanyId(user.company_id || '');
    setIsAddingUser(true);
  };

  const handleDeleteActiveCompany = async () => {
    if (currentUser.role !== 'ADMIN' || !selectedCompanyToDelete) return;
    const target = allDbCompanies.find(c => c.id === selectedCompanyToDelete);
    if (!confirm(`Are you sure you want to permanently erase "${target?.name}"?`)) return;
    if (prompt('Type "DELETE" to confirm:') !== 'DELETE') return;

    setIsDeletingCompany(true);
    try {
      await supabase.from('stock_transactions').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('vouchers').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('ledgers').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('inventory_items').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('user_companies').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('companies').delete().eq('id', selectedCompanyToDelete);
      
      alert("Corporate identity deleted from system infrastructure cluster.");
      const { data } = await supabase.from('companies').select('id, name');
      if (data) setAllDbCompanies(data);
      if (onCompanyCreated) onCompanyCreated();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeletingCompany(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Settings 
          <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 border text-gray-600 rounded-md uppercase tracking-wider">
            {companyName || 'Resolving Cluster Scope...'}
          </span>
        </h1>
        <p className="text-sm text-gray-500 font-medium">Manage server credentials, tenant isolation properties, and workspace routing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* PROFILE SECTION: Shared Across All Isolated Company Scopes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
               <UserIcon size={22} />
             </div>
             <div>
               <h2 className="text-md font-bold text-gray-800">My Profile</h2>
               <p className="text-xs text-gray-400">Update workspace personal access key signature</p>
             </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 font-medium outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Secret Access Key Password</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 font-medium outline-none text-sm" />
            </div>
            {message && !message.includes('Enterprise') && !message.includes('Tenant') && (
              <div className="text-green-600 text-xs font-bold">{message}</div>
            )}
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-xs py-2 rounded hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm">
              <Save size={14} /> Update Signature Details
            </button>
          </form>
        </div>

        {/* 🏢 CONDITIONAL SCOPE ROUTING LOGIC BLOCK */}
        {!isMasterZenithScope ? (
          /* TENANT ISOLATION VIEW LAYER: Displayed ONLY when outside the master scope */
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
            <div className="flex items-center gap-3 mb-5">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                 <Building size={22} />
               </div>
               <div>
                 <h2 className="text-md font-bold text-gray-800">Tenant Environment Configurations</h2>
                 <p className="text-xs text-gray-400">Manage financial bound metrics explicitly for {companyName}</p>
               </div>
            </div>

            <form onSubmit={handleSaveIsolatedCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Workspace Name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-2 border rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Email Anchor</label>
                  <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} className="w-full p-2 border rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corporate Tax ID / GST</label>
                  <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} className="w-full p-2 border rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="bg-slate-50 border p-4 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Invoice Code Prefix</label>
                  <input type="text" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} className="w-full p-2 border rounded text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Next Sequence Index Number</label>
                  <input type="number" value={nextInvoiceNumber} onChange={e => setNextInvoiceNumber(Number(e.target.value))} className="w-full p-2 border rounded text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
              </div>

              {message && message.includes('Tenant') && <div className="text-emerald-600 text-xs font-bold">{message}</div>}
              <button type="submit" className="bg-blue-600 text-white font-bold text-xs py-2 px-4 rounded hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm">
                <Save size={14} /> Commit Changes
              </button>
            </form>
          </div>
        ) : (
          /* ZENITH MASTER SCOPE LAYER: Injected Corporate Multi-Company Deployment Terminal Module */
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-black text-white rounded-xl shadow-lg p-6 border border-indigo-950 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                   <Landmark size={22} />
                 </div>
                 <div>
                   <h2 className="text-md font-bold tracking-tight">Enterprise Multi-Company Control</h2>
                   <p className="text-xs text-indigo-200/70 font-medium">Instantly initialize fully functional isolated business profiles</p>
                 </div>
              </div>

              <form onSubmit={handleDeployFullCorporateEnterprise} className="space-y-4 bg-black/40 border border-indigo-950 p-4 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1 tracking-wider">New Corporate Name</label>
                    <input required type="text" placeholder="e.g. Zineth Corp LLC" value={newCorpCompanyName} onChange={(e) => setNewCorpCompanyName(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1 tracking-wider">Corporate Email Anchor</label>
                    <input required type="email" placeholder="billing@corp.com" value={newCorpEmail} onChange={(e) => setNewCorpEmail(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1 tracking-wider">Tax ID / GST Number</label>
                    <input required type="text" placeholder="TX-991002" value={newCorpTaxId} onChange={(e) => setNewCorpTaxId(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-indigo-950/60 pt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1 tracking-wider">Invoice Code Prefix</label>
                    <input required type="text" value={newCorpPrefix} onChange={(e) => setNewCorpPrefix(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1 tracking-wider">Next Index sequence</label>
                    <input required type="number" value={newCorpNextNumber} onChange={(e) => setNewCorpNextNumber(Number(e.target.value))} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-bold" />
                  </div>
                </div>

                <button type="submit" disabled={isCreatingCorp} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded transition flex items-center justify-center gap-1.5 shadow-md">
                  {isCreatingCorp ? 'Deploying Core Ecosystem...' : <><Plus size={14} /> Initialize & Deploy Corporate Node</>}
                </button>
              </form>
            </div>
            {message && message.includes('Enterprise') && (
              <div className="text-emerald-400 text-xs font-bold mt-2 bg-emerald-950/30 border border-emerald-900/50 p-2 rounded w-fit">✓ {message}</div>
            )}
          </div>
        )}

        {/* 👑 USER WORKSPACE MANAGEMENT CLUSTER COMPONENT MATRIX LAYER */}
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                <Shield size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-md font-bold text-gray-800">User Workspace Management Terminal</h2>
                  <span className="text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wider">
                    {isMasterZenithScope ? 'GLOBAL MANAGEMENT MATRIX (ZENITH MASTER VIEW)' : `TENANT PROFILE ISOLATION ENFORCED LOCK`}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">
                  {isMasterZenithScope ? 'Displaying every registered employee user bound across the infrastructure ecosystem' : `Displaying users explicitly mapped inside ${companyName}`}
                </p>
              </div>
            </div>
            <button onClick={() => isAddingUser ? resetUserForm() : setIsAddingUser(true)} className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition shadow-sm">
              {isAddingUser ? 'Cancel Configuration' : <><Plus size={14}/> Add New Staff Member</>}
            </button>
          </div>

          {isAddingUser && (
            <form onSubmit={handleAddOrUpdateUser} className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-6 shadow-inner">
               <h3 className="text-xs font-bold text-gray-700 uppercase mb-4">Staff Registration Boundary Mapping Setup</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label>
                      <input required placeholder="e.g. Accountant Staff" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 text-sm font-medium outline-none bg-white" value={newName} onChange={e => setNewName(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username Handle</label>
                      <input required placeholder="staff_accountant" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 text-sm font-medium outline-none bg-white" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Password</label>
                      <input placeholder={editingUserId ? "••••••" : "Required"} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 text-sm font-medium outline-none bg-white" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">System Scope Role</label>
                      <select className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 text-sm font-bold outline-none bg-white text-gray-800" value={newRole} onChange={e => setNewRole(e.target.value as Role)}>
                          <option value="ACCOUNTANT">Editor (Workspace Bound)</option>
                          <option value="VIEWER">Viewer (Workspace Bound)</option>
                      </select>
                  </div>

                  {/* ⚡️ DROPBOX CONTEXT TARGET SELECTION */}
                  <div>
                      <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Target Cluster Destination</label>
                      <select 
                        required={isMasterZenithScope}
                        disabled={!isMasterZenithScope}
                        className="w-full p-2 border-2 border-indigo-200 rounded text-sm font-bold outline-none bg-white text-indigo-900 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400"
                        value={formSelectedCompanyId}
                        onChange={e => setFormSelectedCompanyId(e.target.value)}
                      >
                          {!isMasterZenithScope ? (
                            <option value="">🏢 Boundary Mapped: {companyName}</option>
                          ) : (
                            <>
                              <option value="">-- Select Destination Company --</option>
                              {allDbCompanies.map((comp) => <option key={comp.id} value={comp.id}>🏢 {comp.name}</option>)}
                            </>
                          )}
                      </select>
                  </div>
               </div>
               <div className="mt-4 flex justify-end">
                   <button type="submit" className="bg-indigo-600 text-white font-bold text-xs py-2 px-5 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-1.5">
                      <Save size={14} /> Commit Staff Registration Node
                   </button>
               </div>
            </form>
          )}

          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b">
                <tr>
                  <th className="p-3 pl-4">Staff Member Identity</th>
                  <th className="p-3">Ecosystem Workspace Boundary Locking Node</th>
                  <th className="p-3">Scope Permissions</th>
                  <th className="p-3 text-right pr-4">Action Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-sm text-gray-800">
                {users.map(u => {
                  const compMatch = allDbCompanies.find(c => c.id === u.company_id);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-gray-500">
                                <UserIcon size={14} />
                            </div>
                            <div>
                                <div className="font-bold text-gray-900 text-sm">{u.name}</div>
                                <div className="text-xs text-gray-400 font-bold">@{u.username}</div>
                            </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">
                          🏢 {compMatch ? compMatch.name : `Workspace Cluster Node (ID: ${u.company_id?.substring(0,6)}...)`}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider
                          ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                        `}>
                          {u.role === 'ADMIN' ? 'GLOBAL SUPERVISOR' : 'TENANT WORKSPACE RESTRICTED'}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                         <div className="flex justify-end gap-1">
                            <button onClick={() => handleEditUser(u)} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded-md transition"><Pencil size={15} /></button>
                            {u.id !== currentUser.id && (
                                <button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition"><Trash2 size={15} /></button>
                            )}
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 👑 MASTER ZENITH CONTROLLED DANGER ZONE SECTION */}
        {currentUser.role === 'ADMIN' && isMasterZenithScope && (
          <div className="md:col-span-3 bg-rose-50 rounded-xl border-2 border-rose-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 className="text-md font-bold text-rose-900">Infrastructure Danger Zone</h2>
                <p className="text-xs text-rose-500 font-semibold">Irreversible structural cluster server cleanup protocols</p>
              </div>
            </div>
            
            <div className="bg-white border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-rose-900 uppercase mb-1.5 tracking-wider">Select Corporate Target To Erase From Infrastructure Cloud</label>
                <select value={selectedCompanyToDelete} onChange={e => setSelectedCompanyToDelete(e.target.value)} className="w-full p-2.5 text-xs bg-white border border-rose-200 rounded-lg text-gray-800 font-bold focus:ring-2 focus:ring-rose-500 outline-none">
                  <option value="">-- Click To Select Profile Node Target --</option>
                  {allDbCompanies.map(comp => (
                    <option key={comp.id} value={comp.id}>🏢 {comp.name} ({comp.id.substring(0,8)}...)</option>
                  ))}
                </select>
              </div>
              <button type="button" disabled={isDeletingCompany || !selectedCompanyToDelete} onClick={handleDeleteActiveCompany} className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs py-3 px-5 rounded-lg flex items-center justify-center gap-1.5 transition shrink-0 shadow-sm shadow-rose-100">
                <Trash2 size={14} /> {isDeletingCompany ? 'Wiping Node...' : 'Erase Selected Company Profile'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;