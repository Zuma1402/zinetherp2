import React, { useState, useEffect } from 'react';
import { User, Role, Department, Division } from '../types';
import { getUsers, saveUser, deleteUser } from '../services/authService';
import { getCompanySettings, saveCompanySettings } from '../services/settingsService';
import { supabase } from '../services/supabaseService';
import { User as UserIcon, Save, Building, Hash, Shield, Trash2, Plus, Landmark, AlertTriangle, Key } from 'lucide-react';

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

  // Active Company Context Settings
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);

  // States Matrix
  const [users, setUsers] = useState<User[]>([]);
  const [allDbCompanies, setAllDbCompanies] = useState<{id: string, name: string}[]>([]);
  const [selectedCompanyToDelete, setSelectedCompanyToDelete] = useState('');
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [isCreatingCorp, setIsCreatingCorp] = useState(false);

  // Form Inputs
  const [newCorpCompanyName, setNewCorpCompanyName] = useState('');
  const [newCorpEmail, setNewCorpEmail] = useState('');
  const [newCorpTaxId, setNewCorpTaxId] = useState('');
  const [newCorpPrefix, setNewCorpPrefix] = useState('INV-');
  const [newCorpNextNumber, setNewCorpNextNumber] = useState(1);
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<Role>('ACCOUNTANT');
  const [isAddingTenantStaff, setIsAddingTenantStaff] = useState(false);

  // 🌟 LOCAL ENGINE STATE SYNCHRONIZER
  const [localActiveId, setLocalActiveId] = useState(
    propCompanyId || localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || ''
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const currentId = localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
      if (currentId !== localActiveId) {
        setLocalActiveId(currentId);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [localActiveId]);

  const masterCompanyRow = allDbCompanies.find(c => c.name.toLowerCase().replace(/\s+/g, '') === 'zinetherp');
  const activeSelectionObj = allDbCompanies.find(c => c.id === localActiveId);
  const activeSelectionNameClean = activeSelectionObj ? activeSelectionObj.name.toLowerCase().replace(/\s+/g, '') : '';
  
  const isMasterZenithScope = currentUser.role === 'ADMIN' && 
    (!localActiveId || localActiveId === '' || activeSelectionNameClean === 'zinetherp' || (masterCompanyRow && localActiveId === masterCompanyRow.id) || localActiveId === '11111111-1111-1111-1111-111111111111');

  const syncEngineData = async () => {
    try {
      const settings = await getCompanySettings();
      setCompanyName(settings.companyName || '');
      setCompanyEmail(settings.email || '');
      setTaxId(settings.taxId || '');
      setInvoicePrefix(settings.invoicePrefix || 'INV-');
      setNextInvoiceNumber(settings.nextInvoiceNumber || 1);

      const { data: companiesData, error: compErr } = await supabase.from('companies').select('id, name');
      if (!compErr && companiesData) {
        const uniqueCompaniesMap = new Map();
        companiesData.forEach(c => {
          const cleanName = c.name.trim().toLowerCase();
          if (!uniqueCompaniesMap.has(cleanName)) {
            uniqueCompaniesMap.set(cleanName, c);
          }
        });
        setAllDbCompanies(Array.from(uniqueCompaniesMap.values()));
      }

      const { data: junctionData } = await supabase.from('user_companies').select('user_id, company_id');
      const allUsers = await getUsers();

      const mappedUsers = allUsers.map(u => {
        const match = junctionData?.find(j => j.user_id === u.id);
        return { ...u, company_id: match ? match.company_id : u.company_id };
      });

      const currentSelectionId = localActiveId || '';
      if (currentUser.role === 'ADMIN' && (!currentSelectionId || activeSelectionNameClean === 'zinetherp' || currentSelectionId === '11111111-1111-1111-1111-111111111111')) {
        setUsers(mappedUsers);
      } else {
        setUsers(mappedUsers.filter(u => u.company_id === currentSelectionId));
      }
    } catch (e) {
      console.error("Scope synchronization failure:", e);
    }
  };

  useEffect(() => {
    syncEngineData();
  }, [currentUser, localActiveId, allDbCompanies.length]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = { ...currentUser, name, password };
      await saveUser(updatedUser);
      onUpdateUser(updatedUser);
      setMessage('Profile signature successfully updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveTenantConfig = async (e: React.FormEvent) => {
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
      setMessage('Configurations committed successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMasterClusterDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorpCompanyName.trim() || isCreatingCorp) return;

    setIsCreatingCorp(true);
    try {
      const targetNameClean = newCorpCompanyName.trim();
      const { data: existingComps } = await supabase.from('companies').select('id, name');
      
      const isDuplicate = existingComps?.some(c => c.name.trim().toLowerCase() === targetNameClean.toLowerCase());
      if (isDuplicate) {
        alert("Ecosystem Boundary Alert: Company name already deployed on this cluster node!");
        setIsCreatingCorp(false);
        return;
      }

      const companyId = crypto.randomUUID();
      const { error: companyError } = await supabase.from('companies').insert([{ id: companyId, name: targetNameClean }]);
      if (companyError) throw companyError;

      await supabase.from('user_companies').insert([{ id: crypto.randomUUID(), company_id: companyId, user_id: currentUser.id }]);

      if (staffUsername && staffName) {
        const staffId = crypto.randomUUID();
        await saveUser({
          id: staffId,
          username: staffUsername.trim().toLowerCase(),
          password: staffPassword || 'Testing@123',
          name: staffName,
          role: staffRole,
          company_id: companyId
        });
        await supabase.from('user_companies').insert([{ id: crypto.randomUUID(), company_id: companyId, user_id: staffId }]);
      }

      setNewCorpCompanyName('');
      setNewCorpEmail('');
      setNewCorpTaxId('');
      setNewCorpPrefix('INV-');
      setNewCorpNextNumber(1);
      setStaffName('');
      setStaffUsername('');
      setStaffPassword('');
      
      alert("Independent Corporate Entity deployed successfully!");
      await syncEngineData();
      if (onCompanyCreated) onCompanyCreated();
    } catch (err: any) {
      alert(`Server cluster failure: ${err?.message}`);
    } finally {
      setIsCreatingCorp(false);
    }
  };

  const handleTenantAddStaffOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUsername || !staffName || !localActiveId) return;

    try {
      const staffId = crypto.randomUUID();
      await saveUser({
        id: staffId,
        username: staffUsername.trim().toLowerCase(),
        password: staffPassword || 'Testing@123',
        name: staffName,
        role: staffRole,
        company_id: localActiveId
      });

      await supabase.from('user_companies').insert([{ id: crypto.randomUUID(), company_id: localActiveId, user_id: staffId }]);
      
      setStaffName('');
      setStaffUsername('');
      setStaffPassword('');
      setIsAddingTenantStaff(false);
      alert("Staff locked explicitly to this company scope!");
      await syncEngineData();
    } catch (e: any) {
      alert(e?.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) return;
    if (confirm('Are you sure you want to drop this user node?')) {
      try {
        await supabase.from('user_companies').delete().eq('user_id', id);
        await deleteUser(id);
        await syncEngineData();
      } catch (err: any) {
        alert(err?.message);
      }
    }
  };

  const handleDeleteActiveCompany = async () => {
    if (!selectedCompanyToDelete) return;
    if (!confirm("Are you sure you want to completely wipe this corporate entity profile?")) return;
    if (prompt('Type "DELETE" to verify destruction:') !== 'DELETE') return;

    setIsDeletingCompany(true);
    try {
      await supabase.from('stock_transactions').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('vouchers').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('ledgers').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('inventory_items').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('user_companies').delete().eq('company_id', selectedCompanyToDelete);
      await supabase.from('companies').delete().eq('id', selectedCompanyToDelete);
      
      alert("Corporate boundary dropped completely.");
      setSelectedCompanyToDelete('');
      await syncEngineData();
      if (onCompanyCreated) onCompanyCreated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingCompany(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Settings Panel
          <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-600 text-white rounded-md uppercase tracking-wider shadow-sm">
            {companyName || 'Resolving Scope Node...'}
          </span>
        </h1>
        <p className="text-sm text-gray-500 font-medium">Configure ecosystem access signatures, core numbering sequences, and tenant user boundaries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* PROFILE BLOCK */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
               <UserIcon size={20} />
             </div>
             <div>
               <h2 className="text-sm font-bold text-gray-800">My Profile Signature</h2>
               <p className="text-[11px] text-gray-400">Modify global credentials parameters</p>
             </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 font-medium outline-none text-sm bg-gray-50/50" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Access Key Password</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 font-medium outline-none text-sm bg-gray-50/50" />
            </div>
            {message && !message.includes('Enterprise') && !message.includes('Configurations') && (
              <div className="text-indigo-600 text-xs font-bold">{message}</div>
            )}
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-xs py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm">
              <Save size={13} /> Update Profile Node
            </button>
          </form>
        </div>

        {/* 🏢 ISOLATED CONFIGURATIONS LAYER */}
        {!isMasterZenithScope && (
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
            <div className="flex items-center gap-3 mb-5">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                 <Building size={20} />
               </div>
               <div>
                 <h2 className="text-sm font-bold text-gray-800">Tenant Workspace Environment</h2>
                 <p className="text-[11px] text-gray-400">Configure core metadata properties bound explicitly to this entity</p>
               </div>
            </div>

            <form onSubmit={handleSaveTenantConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Company Corporate Name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-2 border rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Billing Communications Anchor</label>
                  <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} className="w-full p-2 border rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax Registration ID / GST (Optional)</label>
                  <input type="text" placeholder="Optional" value={taxId} onChange={e => setTaxId(e.target.value)} className="w-full p-2 border rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="bg-slate-50 border p-4 rounded-xl grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Invoice Generation Prefix</label>
                  <input type="text" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} className="w-full p-2 border rounded text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Next Sequential Auto-Index</label>
                  <input type="number" value={nextInvoiceNumber} onChange={e => setNextInvoiceNumber(Number(e.target.value))} className="w-full p-2 border rounded text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
              </div>

              {message && message.includes('Configurations') && <div className="text-emerald-600 text-xs font-bold">{message}</div>}
              <button type="submit" className="bg-blue-600 text-white font-bold text-xs py-2 px-5 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm">
                <Save size={13} /> Save Workspace Changes
              </button>
            </form>
          </div>
        )}

        {/* 👑 THE OMNIPOTENT MASTER LAYER */}
        {isMasterZenithScope && (
          <div className="md:col-span-3 bg-gradient-to-br from-slate-900 via-indigo-950 to-black text-white rounded-2xl shadow-xl p-6 border border-indigo-900/40">
            <div className="flex items-center gap-3 mb-5 border-b border-indigo-900/60 pb-3">
               <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                 <Landmark size={22} />
               </div>
               <div>
                 <h2 className="text-md font-bold tracking-tight">Enterprise Multi-Company Control Centre</h2>
                 <p className="text-xs text-indigo-200/60 font-medium">Deploy independent isolated sub-tenant profiles along with bound staff in one streamlined terminal blueprint</p>
               </div>
            </div>

            <form onSubmit={handleMasterClusterDeployment} className="space-y-6">
              <div className="bg-black/30 border border-indigo-950/60 p-4 rounded-xl space-y-4 shadow-inner">
                <h4 className="text-[11px] font-black tracking-widest text-indigo-400 uppercase">Step 1: Corporate Domain Infrastructure Metadata</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">New Corporate Name</label>
                    <input required type="text" placeholder="e.g. Khaochey NW" value={newCorpCompanyName} onChange={e => setNewCorpCompanyName(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Corporate Email Anchor</label>
                    <input required type="email" placeholder="billing@tenant.com" value={newCorpEmail} onChange={e => setNewCorpEmail(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Tax ID / GST Reference (Optional)</label>
                    <input type="text" placeholder="Optional" value={newCorpTaxId} onChange={e => setNewCorpTaxId(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-indigo-950/50 pt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Invoice Format Code Prefix</label>
                    <input required type="text" value={newCorpPrefix} onChange={e => setNewCorpPrefix(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Next Document Sequence Index</label>
                    <input required type="number" value={newCorpNextNumber} onChange={e => setNewCorpNextNumber(Number(e.target.value))} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-bold" />
                  </div>
                </div>
              </div>

              <div className="bg-indigo-950/20 border border-indigo-950/40 p-4 rounded-xl space-y-4">
                <h4 className="text-[11px] font-black tracking-widest text-indigo-400 uppercase">Step 2: Bind Initial Workspace Staff Member Identity (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Staff Display Name</label>
                    <input type="text" placeholder="e.g. Accountant Staff" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Unique Username Handle</label>
                    <input type="text" placeholder="e.g. khaocheynw" value={staffUsername} onChange={e => setStaffUsername(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Security Login Password</label>
                    <input type="text" placeholder="Default: Testing@123" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} className="w-full p-2 text-xs bg-indigo-950/40 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Scope Locked Role Assignment</label>
                    <select value={staffRole} onChange={e => setStaffRole(e.target.value as Role)} className="w-full p-2 text-xs bg-indigo-950 text-indigo-300 border border-indigo-900/40 rounded focus:ring-1 focus:ring-indigo-500 outline-none font-bold">
                      <option value="ACCOUNTANT">Editor (Workspace Bound)</option>
                      <option value="VIEWER">Viewer (Workspace Bound)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isCreatingCorp} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 tracking-wider uppercase">
                {isCreatingCorp ? 'Deploying Decentralized Nodes...' : <><Plus size={15} /> Execute & Launch Corporate Cluster</>}
              </button>
            </form>
          </div>
        )}

        {/* 👑 USER MANAGEMENT MATRIX MONITOR TERMINAL */}
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                <Shield size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-md font-bold text-gray-800">User Workspace Management Terminal</h2>
                  <span className="text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                    {isMasterZenithScope ? 'GLOBAL MASTER BLUEPRINT VIEW' : 'TENANT ISOLATED BOUNDARY LAYER'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">
                  {isMasterZenithScope ? 'Supervising every active deployment employee across all corporate entities' : `Displaying staff members mapped exclusively inside ${companyName}`}
                </p>
              </div>
            </div>
            
            {!isMasterZenithScope && currentUser.role === 'ADMIN' && (
              <button onClick={() => setIsAddingTenantStaff(!isAddingTenantStaff)} className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition">
                {isAddingTenantStaff ? 'Cancel Configuration' : <><Plus size={13}/> Add Staff to {companyName}</>}
              </button>
            )}
          </div>

          {/* Inline Tenant Staff Form */}
          {isAddingTenantStaff && !isMasterZenithScope && (
            <form onSubmit={handleTenantAddStaffOnly} className="bg-slate-50 p-5 border border-slate-200 rounded-xl mb-6 space-y-4 shadow-inner">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Lock New Employee Account into "{companyName}" Workspace</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Staff Display Name</label>
                    <input required placeholder="e.g. Jane Accountant" className="w-full p-2 border rounded text-sm bg-white font-medium outline-none" value={staffName} onChange={e => setStaffName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Username Key Handle</label>
                    <input required placeholder="jane_staff" className="w-full p-2 border rounded text-sm bg-white font-medium outline-none" value={staffUsername} onChange={e => setStaffUsername(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Password Credentials</label>
                    <input placeholder="Default: Testing@123" className="w-full p-2 border rounded text-sm bg-white font-medium outline-none" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Role Type Control</label>
                    <select value={staffRole} onChange={e => setStaffRole(e.target.value as Role)} className="w-full p-2 border rounded text-sm font-bold bg-white outline-none">
                      <option value="ACCOUNTANT">Editor (Workspace Bound)</option>
                      <option value="VIEWER">Viewer (Workspace Bound)</option>
                    </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white py-2 px-5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <Save size={13}/> Save & Bind User Node
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b">
                <tr>
                  <th className="p-3 pl-4">Company Context Node</th>
                  <th className="p-3">Staff Member Identity</th>
                  <th className="p-3">Security Access Password</th>
                  <th className="p-3">Ecosystem Workspace Boundary Locking Node</th>
                  <th className="p-3">Scope Permissions</th>
                  <th className="p-3 text-right pr-4">Action Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-sm text-gray-800 bg-white">
                {users.map(u => {
                  const compMatch = allDbCompanies.find(c => c.id === u.company_id);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition group">
                      <td className="p-3 pl-4">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 shadow-sm">
                          🏢 {compMatch ? compMatch.name : 'ZinethERP Master'}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-gray-500 font-bold">
                                <UserIcon size={13} />
                            </div>
                            <div>
                                <div className="font-bold text-gray-900 text-sm">{u.name}</div>
                                <div className="text-xs text-gray-400 font-bold">@{u.username}</div>
                            </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-xs font-bold text-emerald-700 bg-emerald-50/30 rounded px-2">
                        <div className="flex items-center gap-1.5">
                          <Key size={11} className="text-emerald-600" />
                          <span>{u.password || '******'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-100/60 px-2 py-1 rounded-md shadow-sm">
                          ⚙️ {compMatch ? compMatch.name : `Master Root Cluster (ZinethERP)`}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider shadow-sm
                          ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : u.role === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}
                        `}>
                          {u.role === 'ADMIN' ? 'GLOBAL SUPERVISOR' : u.role === 'ACCOUNTANT' ? 'EDITOR (WORKSPACE BOUND)' : 'VIEWER (READ ONLY)'}
                        </span>
                      </td>

                      <td className="p-3 text-right pr-4">
                         <div className="flex justify-end gap-1">
                            {u.id !== currentUser.id && currentUser.role === 'ADMIN' && (
                                <button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
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

        {/* Danger Zone */}
        {isMasterZenithScope && (
          <div className="md:col-span-3 bg-rose-50 rounded-2xl border-2 border-rose-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-rose-900">Infrastructure Cascade Deletion Zone</h2>
                <p className="text-xs text-rose-500 font-semibold">Irreversible structural cloud cluster cleanups</p>
              </div>
            </div>
            
            <div className="bg-white border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row items-end gap-4 shadow-sm">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-rose-900 uppercase mb-1.5 tracking-wider">Select Corporate Target To Erase From Infrastructure Cloud</label>
                <select value={selectedCompanyToDelete} onChange={e => setSelectedCompanyToDelete(e.target.value)} className="w-full p-2.5 text-xs bg-white border border-rose-200 rounded-lg text-gray-800 font-bold focus:ring-2 focus:ring-rose-500 outline-none shadow-inner">
                  <option value="">-- Click To Select Profile Node Target --</option>
                  {allDbCompanies.map(comp => (
                    <option key={comp.id} value={comp.id}>🏢 {comp.name} ({comp.id.substring(0,8)}...)</option>
                  ))}
                </select>
              </div>
              <button type="button" disabled={isDeletingCompany || !selectedCompanyToDelete} onClick={handleDeleteActiveCompany} className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-1.5 transition shrink-0 shadow-md shadow-rose-200 uppercase tracking-wider">
                <Trash2 size={13} /> {isDeletingCompany ? 'Wiping Node...' : 'Erase Corporate Profile Node'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;