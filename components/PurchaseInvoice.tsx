import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, AccountType, Department, Division } from '../types';
import { Save, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface PurchaseEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

interface PurchaseLineItem {
  expenseId: string;
  qty: number;
  unitPrice: number;
  departmentId: string;
  divisionId: string;
}

const PurchaseEntry: React.FC<PurchaseEntryProps> = ({ ledgers, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorLedgerId, setVendorLedgerId] = useState('');
  const [purchaseLedgerId, setPurchaseLedgerId] = useState('');
  const [narration, setNarration] = useState('');
  
  const [items, setItems] = useState<PurchaseLineItem[]>([
    { expenseId: '', qty: 1, unitPrice: 0, departmentId: '', divisionId: '' }
  ]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => { fetchDimensions(); }, []);

  const fetchDimensions = async () => {
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    const { data: divs } = await supabase.from('divisions').select('*').order('name');
    if (depts) setDepartments(depts);
    if (divs) setDivisions(divs);
  };

  const updateItemRow = (index: number, key: keyof PurchaseLineItem, value: any) => {
    const next = [...items];
    if (key === 'departmentId' && value === 'QUICK_ADD_DEPT') {
      setActiveIndex(index);
      setIsDeptModalOpen(true);
      return;
    }
    if (key === 'divisionId' && value === 'QUICK_ADD_DIV') {
      setActiveIndex(index);
      setIsDivModalOpen(true);
      return;
    }
    next[index] = { ...next[index], [key]: value };
    setItems(next);
  };

  const handleQuickDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || activeIndex === null) return;
    const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('departments').insert([{ id, name: newDeptName.trim() }]);
    await fetchDimensions();
    updateItemRow(activeIndex, 'departmentId', id);
    setIsDeptModalOpen(false);
    setNewDeptName('');
  };

  const handleQuickDiv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim() || activeIndex === null) return;
    const id = newDivName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('divisions').insert([{ id, name: newDivName.trim() }]);
    await fetchDimensions();
    updateItemRow(activeIndex, 'divisionId', id);
    setIsDivModalOpen(false);
    setNewDivName('');
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const vendorAccounts = ledgers.filter(l => l.type === AccountType.LIABILITY || l.group.includes('Creditors'));
  const purchaseAccounts = ledgers.filter(l => l.type === AccountType.EXPENSE || l.group.includes('Purchase'));

  const handleSubmit = () => {
    if (!vendorLedgerId || !purchaseLedgerId || totalAmount <= 0) {
      alert("Please fill in Vendor, Purchase Account and row totals correctly.");
      return;
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `PUR-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.PURCHASE,
      narration: narration || 'Purchase Bill Recorded',
      entries: [
        { ledgerId: vendorLedgerId, debit: 0, credit: totalAmount },
        ...items.map(item => ({
          ledgerId: purchaseLedgerId,
          debit: item.qty * item.unitPrice,
          credit: 0,
          departmentId: item.departmentId || undefined,
          divisionId: item.divisionId || undefined
        }))
      ]
    };
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 max-w-6xl mx-auto mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Record Purchase Bill</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor (Creditor)</label>
          <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={vendorLedgerId} onChange={e => setVendorLedgerId(e.target.value)}>
            <option value="">-- Choose Vendor --</option>
            {vendorAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Cost Ledger</label>
          <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={purchaseLedgerId} onChange={e => setPurchaseLedgerId(e.target.value)}>
            <option value="">-- Select Expense/Cost Account --</option>
            {purchaseAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border p-2 rounded-lg mt-1 text-sm" />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
            <tr>
              <th className="p-3">Expense Item / Details</th>
              <th className="p-3 w-40">Cost Center (Dept)</th>
              <th className="p-3 w-40">Segment (Div)</th>
              <th className="p-3 w-20 text-center">Qty</th>
              <th className="p-3 w-28 text-right">Cost Price</th>
              <th className="p-3 w-28 text-right">Line Total</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="p-2">
                  <input type="text" placeholder="Item spec..." value={item.expenseId} onChange={e => updateItemRow(idx, 'expenseId', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs" />
                </td>
                <td className="p-2">
                  <select value={item.departmentId} onChange={e => updateItemRow(idx, 'departmentId', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs">
                    <option value="">Global / Unallocated</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_DEPT" className="text-teal-600 font-bold">➕ Add New</option>
                  </select>
                </td>
                <td className="p-2">
                  <select value={item.divisionId} onChange={e => updateItemRow(idx, 'divisionId', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs">
                    <option value="">Whole Strategy</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_DIV" className="text-teal-600 font-bold">➕ Add New</option>
                  </select>
                </td>
                <td className="p-2">
                  <input type="number" value={item.qty} onChange={e => updateItemRow(idx, 'qty', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-center text-xs" />
                </td>
                <td className="p-2">
                  <input type="number" value={item.unitPrice} onChange={e => updateItemRow(idx, 'unitPrice', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-right text-xs" />
                </td>
                <td className="p-2 text-right font-bold text-gray-700 pr-4">
                  {(item.qty * item.unitPrice).toFixed(2)}
                </td>
                <td className="p-2 text-center">
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setItems([...items, { expenseId: '', qty: 1, unitPrice: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-teal-600 border border-dashed border-teal-300 px-4 py-2 rounded-lg hover:bg-teal-50">
          + ADD NEW ROW
        </button>
        <div className="text-right text-sm font-bold text-gray-900">Total Bill: ${totalAmount.toFixed(2)}</div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2 text-gray-700 bg-gray-100 rounded-lg text-sm font-semibold">Cancel</button>
        <button onClick={handleSubmit} className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700">Save Purchase Bill</button>
      </div>

      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-xs font-bold mb-2">Add Dept</h3>
            <form onSubmit={handleQuickDept} className="space-y-2">
              <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded text-xs" required />
              <button type="submit" className="w-full bg-teal-600 text-white p-2 rounded text-xs">Save</button>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-xs font-bold mb-2">Add Division</h3>
            <form onSubmit={handleQuickDiv} className="space-y-2">
              <input type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded text-xs" required />
              <button type="submit" className="w-full bg-teal-600 text-white p-2 rounded text-xs">Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseEntry;