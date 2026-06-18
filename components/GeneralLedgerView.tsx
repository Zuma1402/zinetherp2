import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, Department, Division } from '../types';
import { Save, Plus, Trash2, X } from 'lucide-react';
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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

  useEffect(() => { fetchDimensions(); }, []);

  const fetchDimensions = async () => {
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    const { data: divs } = await supabase.from('divisions').select('*').order('name');
    if (depts) setDepartments(depts);
    if (divs) setDivisions(divs);
  };

  const updateRow = (index: number, key: keyof RowEntry, value: any) => {
    const next = [...entries];
    if (key === 'departmentId' && value === 'QUICK_ADD_DEPT') {
      setActiveRowIndex(index);
      setIsDeptModalOpen(true);
      return;
    }
    if (key === 'divisionId' && value === 'QUICK_ADD_DIV') {
      setActiveRowIndex(index);
      setIsDivModalOpen(true);
      return;
    }
    next[index] = { ...next[index], [key]: value };
    setEntries(next);
  };

  const totalDebit = entries.reduce((acc, curr) => acc + curr.debit, 0);
  const totalCredit = entries.reduce((acc, curr) => acc + curr.credit, 0);
  const diff = Math.abs(totalDebit - totalCredit);

  const handleSubmit = () => {
    if (totalDebit !== totalCredit || totalDebit === 0 || entries.some(e => !e.ledgerId)) {
      alert("Please ensure debits equal credits, amounts are valid, and all ledgers are selected.");
      return;
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `JV-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.JOURNAL,
      narration: narration || 'Journal Transaction',
      entries: entries.map(e => ({
        ledgerId: e.ledgerId,
        debit: e.debit,
        credit: e.credit,
        departmentId: e.departmentId || undefined,
        divisionId: e.divisionId || undefined
      }))
    };
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-5xl mx-auto mt-6 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">New Voucher</h2>
          <span className={`text-xs px-2.5 py-0.5 rounded-sm font-medium ${totalDebit === totalCredit && totalDebit > 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {totalDebit === totalCredit && totalDebit > 0 ? 'Balanced' : 'Unbalanced'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-xs">
            <Save size={16} /> Save Voucher
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase">Voucher Type</label>
          <select className="w-full bg-white border p-2 rounded-lg mt-1 text-sm font-medium text-gray-700 outline-none"><option>JOURNAL</option></select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase">Voucher #</label>
          <input type="text" className="w-full bg-white border p-2 rounded-lg mt-1 text-sm font-medium text-gray-700 outline-none" value="VCH-AUTO" disabled />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border p-2 rounded-lg mt-1 text-sm text-gray-700 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase">Narration</label>
          <input type="text" value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g. Rent paid" className="w-full bg-white border p-2 rounded-lg mt-1 text-sm text-gray-700 outline-none" />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
            <tr>
              <th className="p-3 w-8 text-center">#</th>
              <th className="p-3">Ledger Account</th>
              <th className="p-3 w-40">Cost Center (Dept)</th>
              <th className="p-3 w-40">Segment (Div)</th>
              <th className="p-3 w-32 text-right">Debit</th>
              <th className="p-3 w-32 text-right">Credit</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-700">
            {entries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="p-3 text-center text-xs text-gray-400 font-medium">{idx + 1}</td>
                <td className="p-2">
                  <select value={entry.ledgerId} onChange={e => updateRow(idx, 'ledgerId', e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none bg-white">
                    <option value="">Select Ledger...</option>
                    {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select value={entry.departmentId} onChange={e => updateRow(idx, 'departmentId', e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-white">
                    <option value="">Choose Dept...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_DEPT" className="text-indigo-600 font-bold">➕ Quick Add</option>
                  </select>
                </td>
                <td className="p-2">
                  <select value={entry.divisionId} onChange={e => updateRow(idx, 'divisionId', e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-white">
                    <option value="">Choose Div...</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_DIV" className="text-indigo-600 font-bold">➕ Quick Add</option>
                  </select>
                </td>
                <td className="p-2">
                  <input type="number" value={entry.debit || ''} onChange={e => updateRow(idx, 'debit', Number(e.target.value))} placeholder="0.00" className="w-full p-2 border border-gray-200 rounded-lg text-right text-sm font-semibold tracking-wide text-gray-700 outline-none" />
                </td>
                <td className="p-2">
                  <input type="number" value={entry.credit || ''} onChange={e => updateRow(idx, 'credit', Number(e.target.value))} placeholder="0.00" className="w-full p-2 border border-gray-200 rounded-lg text-right text-sm font-semibold tracking-wide text-gray-700 outline-none" />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => setEntries(entries.filter((_, i) => i !== idx))} disabled={entries.length <= 2} className="text-gray-300 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50/60 font-semibold text-sm">
              <td colSpan={4} className="p-3 text-right text-gray-500 font-medium">Total</td>
              <td className="p-3 text-right text-indigo-700 tracking-wide font-bold">{totalDebit.toFixed(2)}</td>
              <td className="p-3 text-right text-indigo-700 tracking-wide font-bold">{totalCredit.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button onClick={() => setEntries([...entries, { ledgerId: '', debit: 0, credit: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-indigo-200 hover:bg-indigo-50/50 transition">
          <Plus size={14} /> Add Line Item
        </button>
        {diff !== 0 && (
          <div className="text-xs font-semibold text-red-600 flex items-center gap-1">
            <span>⚠️ Difference:</span>
            <span className="bg-red-50 px-2 py-0.5 rounded border border-red-100 font-bold tracking-wide">{diff.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Popups definitions matching standard */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-xs font-bold mb-2">Quick Add Department</h3>
            <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded text-xs mb-3" placeholder="Name" required />
            <button onClick={async () => {
              const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
              await supabase.from('departments').insert([{ id, name: newDeptName.trim() }]);
              await fetchDimensions();
              if(activeRowIndex !== null) updateRow(activeRowIndex, 'departmentId', id);
              setIsDeptModalOpen(false); setNewDeptName('');
            }} className="w-full bg-slate-700 text-white p-2 rounded text-xs font-medium">Save</button>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-xs font-bold mb-2">Quick Add Division</h3>
            <input type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded text-xs mb-3" placeholder="Name" required />
            <button onClick={async () => {
              const id = newDivName.trim().toLowerCase().replace(/\s+/g, '_');
              await supabase.from('divisions').insert([{ id, name: newDivName.trim() }]);
              await fetchDimensions();
              if(activeRowIndex !== null) updateRow(activeRowIndex, 'divisionId', id);
              setIsDivModalOpen(false); setNewDivName('');
            }} className="w-full bg-slate-700 text-white p-2 rounded text-xs font-medium">Save</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralVoucherEntry;