import React, { useState } from 'react';
import { AccountType, Ledger, TrialBalanceRow, Voucher } from '../types';
import { ACCOUNT_GROUPS } from '../constants';
import { Plus, Search, Trash2, Eye, AlertCircle } from 'lucide-react';

interface LedgerListProps {
  ledgers: Ledger[];
  vouchers: Voucher[];
  onAddLedger: (ledger: Ledger) => void;
  onDeleteLedger?: (id: string) => void;
  onViewLedger?: (id: string) => void;
  trialBalance?: TrialBalanceRow[];
}

const LedgerList: React.FC<LedgerListProps> = ({ ledgers, vouchers, onAddLedger, onDeleteLedger, onViewLedger, trialBalance = [] }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Ledger State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>(AccountType.ASSET);
  const [newGroup, setNewGroup] = useState(ACCOUNT_GROUPS[4]); // Default Current Assets
  const [newOpening, setNewOpening] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    onAddLedger({
      id: crypto.randomUUID(),
      name: newName,
      type: newType,
      group: newGroup,
      openingBalance: Number(newOpening)
    });
    
    setNewName('');
    setNewOpening(0);
    setShowForm(false);
  };

  const getTransactionCount = (id: string) => {
    return vouchers.filter(v => v.entries.some(e => e.ledgerId === id)).length;
  };

  const handleDelete = (id: string, name: string) => {
    if (!onDeleteLedger) return;
    
    const txnCount = getTransactionCount(id);

    if (txnCount > 0) {
      if (confirm(`ALERT: This account has ${txnCount} existing transactions.\n\nDeleting "${name}" will also erase all associated Journal Entries and Invoices to maintain accounting balance.\n\nAre you sure you want to proceed with this PERMANENT cascading delete?`)) {
        onDeleteLedger(id);
      }
    } else {
      if (confirm(`Are you sure you want to delete the ledger account "${name}"?`)) {
        onDeleteLedger(id);
      }
    }
  };

  const filteredLedgers = ledgers.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBalanceDisplay = (ledgerId: string, opening: number) => {
    const row = trialBalance.find(r => r.ledgerId === ledgerId);
    if (!row) return opening.toLocaleString();
    return `${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Chart of Accounts</h2>
           <p className="text-gray-500 text-sm">Organize your ledger accounts and view live balances</p>
        </div>
        <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2 transition shadow-lg shadow-indigo-100 font-bold"
        >
            <Plus size={18} />
            {showForm ? 'Cancel' : 'Add New Account'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="font-bold text-xl mb-6 text-gray-800">New Ledger Account</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Account Name</label>
                    <input required className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-4 ring-indigo-50 outline-none bg-white text-gray-900 font-bold" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Petty Cash" />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Account Type</label>
                    <select className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 font-bold" value={newType} onChange={e => setNewType(e.target.value as AccountType)}>
                        {Object.values(AccountType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Under Group</label>
                    <select className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 font-bold" value={newGroup} onChange={e => setNewGroup(e.target.value)}>
                        {ACCOUNT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Opening Balance</label>
                    <input type="number" step="0.01" className="w-full p-3 border-2 border-gray-100 rounded-xl bg-white text-gray-900 font-mono font-bold" value={newOpening} onChange={e => setNewOpening(Number(e.target.value))} />
                </div>
                <div className="md:col-span-2 flex justify-end mt-4">
                    <button type="submit" className="bg-gray-900 text-white px-8 py-3 rounded-xl hover:bg-black transition font-bold shadow-lg">Create Ledger</button>
                </div>
            </form>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
             <Search className="text-gray-400" size={20} />
             <input 
                type="text" 
                placeholder="Search accounts by name or group..." 
                className="flex-1 outline-none text-gray-700 bg-transparent font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white text-gray-400 font-black uppercase text-[10px] tracking-[0.15em] border-b">
                    <tr>
                        <th className="p-6">Name</th>
                        <th className="p-6">Group</th>
                        <th className="p-6">Type</th>
                        <th className="p-6 text-right">Opening</th>
                        <th className="p-6 text-right">Closing Balance</th>
                        <th className="p-6 text-center w-32">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {filteredLedgers.map(l => {
                        const txnVol = getTransactionCount(l.id);
                        return (
                        <tr key={l.id} className="hover:bg-indigo-50/10 group transition-colors">
                            <td className="p-6 font-bold text-gray-900">
                                {l.name}
                                {txnVol > 0 && <div className="text-[9px] text-indigo-400 font-black uppercase mt-1 tracking-tighter">{txnVol} Txns</div>}
                            </td>
                            <td className="p-6 text-gray-500 font-medium">{l.group}</td>
                            <td className="p-6">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider
                                    ${l.type === AccountType.ASSET ? 'bg-green-50 text-green-700 border border-green-100' : ''}
                                    ${l.type === AccountType.LIABILITY ? 'bg-red-50 text-red-700 border border-red-100' : ''}
                                    ${l.type === AccountType.INCOME ? 'bg-blue-50 text-blue-700 border border-blue-100' : ''}
                                    ${l.type === AccountType.EXPENSE ? 'bg-orange-50 text-orange-700 border border-orange-100' : ''}
                                    ${l.type === AccountType.EQUITY ? 'bg-purple-50 text-purple-700 border border-purple-100' : ''}
                                `}>
                                    {l.type}
                                </span>
                            </td>
                            <td className="p-6 text-right text-gray-400 font-mono font-medium">{l.openingBalance.toLocaleString()}</td>
                            <td className="p-6 text-right font-black text-gray-900 font-mono text-base">
                                {getBalanceDisplay(l.id, l.openingBalance)}
                            </td>
                            <td className="p-6 text-center">
                                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onViewLedger && (
                                      <button 
                                        onClick={() => onViewLedger(l.id)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                                        title="View Account Statement"
                                      >
                                        <Eye size={18} />
                                      </button>
                                    )}
                                    {onDeleteLedger && (
                                      <button 
                                        onClick={() => handleDelete(l.id, l.name)}
                                        className="p-2 rounded-xl transition-colors text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                        title={txnVol > 0 ? "Delete account and all its transactions" : "Delete Account"}
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                    {filteredLedgers.length === 0 && (
                        <tr><td colSpan={6} className="p-20 text-center text-gray-400 font-medium italic">No ledger accounts match your search.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default LedgerList;