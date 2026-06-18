import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, Department, Division } from '../types';
import { Save, Plus, Trash2, Calendar, Layers, Compass, Clock } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface GeneralVoucherEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

interface RowEntry {
  ledgerId: string;
  debit: number;
  credit: number;
  departmentId: string;
  divisionId: string;
}

const GeneralVoucherEntry: React.FC<GeneralVoucherEntryProps> = ({ ledgers, onSave, onCancel }) => {
  const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.JOURNAL);
  const [voucherNo, setVoucherNo] = useState('VCH-AUTO');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  
  const [entries, setEntries] = useState<RowEntry[]>([
    { ledgerId: '', debit: 0, credit: 0, departmentId: '', divisionId: '' },
    { ledgerId: '', debit: 0, credit: 0, departmentId: '', divisionId: '' }
  ]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  const fetchDimensions = async () => {
    const { data: d } = await supabase.from('departments').select('*').order('name');
    const { data: v } = await supabase.from('divisions').select('*').order('name');
    if (d) setDepartments(d);
    if (v) setDivisions(v);
  };

  useEffect(() => { 
    fetchDimensions(); 
  }, []);

  const updateRow = (index: number, key: keyof RowEntry, value: any) => {
    const next = [...entries];
    
    // Dropdown value validation trigger check
    if (key === 'departmentId' && value === 'QUICK_ADD_ROW_DEPT') {
      setActiveRowIndex(index);
      setIsDeptModalOpen(true);
      return;
    }
    if (key === 'divisionId' && value === 'QUICK_ADD_ROW_DIV') {
      setActiveRowIndex(index);
      setIsDivModalOpen(true);
      return;
    }
    
    if (key === 'debit' || key === 'credit') {
      next[index][key] = value === '' ? 0 : Number(value);
    } else {
      next[index][key] = value;
    }
    setEntries(next);
  };

  const addLineItem = () => {
    setEntries([
      ...entries,
      { ledgerId: '', debit: 0, credit: 0, departmentId: '', divisionId: '' }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleQuickDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || activeRowIndex === null) return;
    const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('departments').insert([{ id, name: newDeptName.trim() }]);
    await fetchDimensions();
    
    const next = [...entries];
    next[activeRowIndex].departmentId = id;
    setEntries(next);
    setIsDeptModalOpen(false);
    setNewDeptName('');
  };

  const handleQuickDivSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim() || activeRowIndex === null) return;
    const id = newDivName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('divisions').insert([{ id, name: newDivName.trim() }]);
    await fetchDimensions();
    
    const next = [...entries];
    next[activeRowIndex].divisionId = id;
    setEntries(next);
    setIsDivModalOpen(false);
    setNewDivName('');
  };

  const totalDebit = entries.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalCredit = entries.reduce((acc, curr) => acc + (curr.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = () => {
    if (!isBalanced) {
      alert("Voucher is unbalanced.");
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      date,
      number: voucherNo === 'VCH-AUTO' ? `VCH-${Math.floor(Math.random() * 100000)}` : voucherNo,
      type: voucherType,
      narration: narration || 'Journal adjustment post',
      entries: entries.map(e => ({
        ledgerId: e.ledgerId,
        debit: e.debit,
        credit: e.credit,
        departmentId: e.departmentId || undefined,
        divisionId: e.divisionId || undefined
      }))
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto p-2">
      {/* 1. RESTORED Upper Voucher Control Box Header Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">New Voucher</h2>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!isBalanced}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${isBalanced ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              <Save size={16} /> Save Voucher
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold text-gray-700">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Voucher Type</label>
            <select 
              value={voucherType} 
              onChange={e => setVoucherType(e.target.value as VoucherType)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-900 font-bold outline-none"
            >
              <option value="JOURNAL">JOURNAL</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="RECEIPT">RECEIPT</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Voucher #</label>
            <input 
              type="text" 
              value={voucherNo} 
              disabled
              className="w-full p-3 border border-gray-100 rounded-xl bg-gray-50/50 text-gray-500 font-mono font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-xs text-gray-800 font-bold outline-none" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Voucher Narration</label>
            <input 
              type="text" 
              placeholder="e.g. Adjustment entry notes..." 
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium outline-none placeholder:text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* 2. FIXED Grid Table Matrix Sheet */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/70 text-gray-400 border-b font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4 min-w-[240px]">Ledger Account</th>
                <th className="p-4 w-44">Cost Center (Dept)</th>
                <th className="p-4 w-44">Segment (Div)</th>
                <th className="p-4 w-36 text-right">Debit</th>
                <th className="p-4 w-36 text-right">Credit</th>
                <th className="p-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 text-center text-gray-400 font-mono text-xs">{idx + 1}</td>
                  
                  {/* Account Choice */}
                  <td className="p-3">
                    <select
                      value={item.ledgerId}
                      onChange={e => updateRow(idx, 'ledgerId', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold outline-none"
                    >
                      <option value="">Select Ledger...</option>
                      {ledgers.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.group})</option>
                      ))}
                    </select>
                  </td>

                  {/* Inline Department Selector Option */}
                  <td className="p-3">
                    <select
                      value={item.departmentId}
                      onChange={e => updateRow(idx, 'departmentId', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs outline-none"
                    >
                      <option value="">Choose Dept...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                      <option value="QUICK_ADD_ROW_DEPT" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Dept</option>
                    </select>
                  </td>

                  {/* Inline Division Selector Option */}
                  <td className="p-3">
                    <select
                      value={item.divisionId}
                      onChange={e => updateRow(idx, 'divisionId', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs outline-none"
                    >
                      <option value="">Choose Div...</option>
                      {divisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                      <option value="QUICK_ADD_ROW_DIV" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Div</option>
                    </select>
                  </td>

                  {/* Debit Amount */}
                  <td className="p-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={item.debit || ''}
                      onChange={e => updateRow(idx, 'debit', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-right font-mono font-bold text-xs outline-none"
                    />
                  </td>

                  {/* Credit Amount */}
                  <td className="p-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={item.credit || ''}
                      onChange={e => updateRow(idx, 'credit', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-right font-mono font-bold text-xs outline-none"
                    />
                  </td>

                  {/* Line Delete */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => removeLineItem(idx)}
                      disabled={entries.length <= 2}
                      className={`p-2 rounded-lg transition-colors ${entries.length <= 2 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-rose-50 hover:text-rose-500'}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* RESTORED Total Calculations Sheet Footer Row */}
              <tr className="bg-slate-50/50 font-mono font-black text-xs text-slate-700">
                <td colSpan={4} className="p-5 text-right font-sans uppercase tracking-widest text-gray-400 text-[10px]">Total</td>
                <td className="p-5 text-right text-indigo-700 text-sm border-t">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-5 text-right text-indigo-700 text-sm border-t">{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RESTORED Action Controls Footer Add Line Item Bar */}
        <div className="p-5 bg-gray-50/40 border-t flex justify-between items-center text-xs">
          <button
            onClick={addLineItem}
            className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-indigo-300 text-indigo-600 bg-indigo-50/30 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-sm"
          >
            <Plus size={14} /> Add Line Item
          </button>
          
          {difference > 0 && (
            <span className="font-mono font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
              Difference: {difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Popups Forms Blocks Modals */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Add Department</h3>
            <form onSubmit={handleQuickDeptSubmit} className="space-y-4">
              <input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="e.g. Marketing" required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Add Division</h3>
            <form onSubmit={handleQuickDivSubmit} className="space-y-4">
              <input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="e.g. Northern Region" required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsDivModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralVoucherEntry;