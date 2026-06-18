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
    const { data: d } = await supabase.from('departments').select('*').order('name');
    const { data: v } = await supabase.from('divisions').select('*').order('name');
    if (d) setDepartments(d);
    if (v) setDivisions(v);
  };

  const updateRow = (index: number, key: keyof RowEntry, value: any) => {
    const next = [...entries];
    
    // ⭐ Select index routing handler keys
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
    next[index] = { ...next[index], [key]: value };
    setEntries(next);
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

  const totalDebit = entries.reduce((acc, curr) => acc + curr.debit, 0);
  const totalCredit = entries.reduce((acc, curr) => acc + curr.credit, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-5xl mx-auto border mt-6">
      <div className="border rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
            <tr>
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
              <tr key={idx}>
                <td className="p-2">
                  <select value={entry.ledgerId} onChange={e => updateRow(idx, 'ledgerId', e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                    <option value="">Select Ledger...</option>
                    {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </td>
                
                {/* ⭐ Department option routing mapping code */}
                <td className="p-2">
                  <select value={entry.departmentId} onChange={e => updateRow(idx, 'departmentId', e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white">
                    <option value="">Choose Dept...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_ROW_DEPT" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Dept</option>
                  </select>
                </td>

                {/* ⭐ Division option routing mapping code */}
                <td className="p-2">
                  <select value={entry.divisionId} onChange={e => updateRow(idx, 'divisionId', e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white">
                    <option value="">Choose Div...</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_ROW_DIV" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Div</option>
                  </select>
                </td>

                <td className="p-2"><input type="number" value={entry.debit || ''} onChange={e => updateRow(idx, 'debit', Number(e.target.value))} className="w-full p-2 border rounded-lg text-right" /></td>
                <td className="p-2"><input type="number" value={entry.credit || ''} onChange={e => updateRow(idx, 'credit', Number(e.target.value))} className="w-full p-2 border rounded-lg text-right" /></td>
                <td className="p-2 text-center"><button onClick={() => setEntries(entries.filter((_, i) => i !== idx))} disabled={entries.length <= 2} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Quick Add Department</h3>
            <form onSubmit={handleQuickDeptSubmit} className="space-y-2">
              <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded text-xs" required />
              <button type="submit" className="w-full bg-slate-700 text-white p-2 rounded text-xs">Save</button>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Quick Add Division</h3>
            <form onSubmit={handleQuickDivSubmit} className="space-y-2">
              <input type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded text-xs" required />
              <button type="submit" className="w-full bg-slate-700 text-white p-2 rounded text-xs">Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralVoucherEntry;