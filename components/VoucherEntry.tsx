import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseService';
import { Ledger, VoucherType, Department, Division } from '../types';
import { Save, Trash2, Plus, Calendar } from 'lucide-react';

interface JournalGeneralViewProps {
  ledgers: Ledger[];
  onSave?: (voucherData: any) => void;
}

interface EntryLine {
  ledgerId: string;
  departmentId: string;
  divisionId: string;
  debit: number;
  credit: number;
}

const JournalGeneralView: React.FC<JournalGeneralViewProps> = ({ ledgers, onSave }) => {
  const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.JOURNAL);
  const [voucherNo, setVoucherNo] = useState('VCH-AUTO');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [narration, setNarration] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Initializing with two blank balanced matrix lines
  const [entries, setEntries] = useState<EntryLine[]>([
    { ledgerId: '', departmentId: '', divisionId: '', debit: 0, credit: 0 },
    { ledgerId: '', departmentId: '', divisionId: '', debit: 0, credit: 0 }
  ]);

  // Load Department and Division Dimensions
  useEffect(() => {
    const fetchDimensions = async () => {
      const { data: d } = await supabase.from('departments').select('*').order('name');
      const { data: v } = await supabase.from('divisions').select('*').order('name');
      if (d) setDepartments(d);
      if (v) setDivisions(v);
    };
    fetchDimensions();
  }, []);

  // Totals Calculations
  const totalDebit = entries.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredit = entries.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleLineChange = (index: number, field: keyof EntryLine, value: any) => {
    const updatedEntries = [...entries];
    if (field === 'debit' || field === 'credit') {
      updatedEntries[index][field] = value === '' ? 0 : Number(value);
    } else {
      updatedEntries[index][field] = value;
    }
    setEntries(updatedEntries);
  };

  const addLineItem = () => {
    setEntries([
      ...entries,
      { ledgerId: '', departmentId: '', divisionId: '', debit: 0, credit: 0 }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (entries.length <= 2) return; // Maintain minimum 2 lines for double entry
    setEntries(entries.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Upper Voucher Context Controls */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">New Voucher</h2>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
            <button 
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
            <div className="flex items-center border border-gray-200 rounded-xl p-3 bg-white">
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs outline-none bg-transparent text-gray-800 font-bold" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Narration</label>
            <input 
              type="text" 
              placeholder="e.g. Rent paid or adjustment entries..." 
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium outline-none placeholder:text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Grid Table Matrix Sheet */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/70 text-gray-400 border-b font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4 min-w-[240px]">Ledger Account</th>
                <th className="p-4 min-w-[180px]">Cost Center (Dept)</th>
                <th className="p-4 min-w-[180px]">Segment (Div)</th>
                <th className="p-4 w-40 text-right">Debit</th>
                <th className="p-4 w-40 text-right">Credit</th>
                <th className="p-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 text-center text-gray-400 font-mono text-xs">{idx + 1}</td>
                  
                  {/* Ledger Account Selection */}
                  <td className="p-3">
                    <select
                      value={item.ledgerId}
                      onChange={e => handleLineChange(idx, 'ledgerId', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-medium outline-none shadow-sm focus:border-indigo-500"
                    >
                      <option value="">Select Ledger...</option>
                      {ledgers.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                      ))}
                    </select>
                  </td>

                  {/* Row Level Cost Center Dimension */}
                  <td className="p-3">
                    <select
                      value={item.departmentId}
                      onChange={e => handleLineChange(idx, 'departmentId', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 outline-none shadow-sm focus:border-indigo-500"
                    >
                      <option value="">Choose Dept...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Row Level Segment Dimension */}
                  <td className="p-3">
                    <select
                      value={item.divisionId}
                      onChange={e => handleLineChange(idx, 'divisionId', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 outline-none shadow-sm focus:border-indigo-500"
                    >
                      <option value="">Choose Div...</option>
                      {divisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Debit Input */}
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.debit || ''}
                      onChange={e => handleLineChange(idx, 'debit', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-right font-mono font-bold text-xs text-gray-800 outline-none focus:border-indigo-500"
                    />
                  </td>

                  {/* Credit Input */}
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.credit || ''}
                      onChange={e => handleLineChange(idx, 'credit', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-right font-mono font-bold text-xs text-gray-800 outline-none focus:border-indigo-500"
                    />
                  </td>

                  {/* Delete Action Row */}
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

              {/* Total Summary Row Section */}
              <img src="" alt="" />
              <tr className="bg-slate-50/50 font-mono font-black text-xs text-slate-700">
                <td colSpan={4} className="p-5 text-right font-sans uppercase tracking-widest text-gray-400 text-[10px]">Total</td>
                <td className="p-5 text-right text-indigo-700 text-sm border-t">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-5 text-right text-indigo-700 text-sm border-t">{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Controls Footer Bar */}
        <div className="p-5 bg-gray-50/40 border-t flex justify-between items-center text-xs">
          <button
            onClick={addLineItem}
            className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-indigo-300 text-indigo-600 bg-indigo-50/30 rounded-xl font-bold hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-sm"
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
    </div>
  );
};

export default JournalGeneralView;