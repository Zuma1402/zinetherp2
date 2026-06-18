import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, AccountType, Department, Division } from '../types';
import { Save, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface SalesEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

interface SalesLineItem {
  productId: string;
  qty: number;
  unitPrice: number;
  taxPercent: number;
  departmentId: string;
  divisionId: string;
}

const SalesEntry: React.FC<SalesEntryProps> = ({ ledgers, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerLedgerId, setCustomerLedgerId] = useState('');
  const [salesLedgerId, setSalesLedgerId] = useState('');
  const [narration, setNarration] = useState('');
  
  const [items, setItems] = useState<SalesLineItem[]>([
    { productId: '', qty: 1, unitPrice: 0, taxPercent: 0, departmentId: '', divisionId: '' }
  ]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchDimensions();
  }, []);

  const fetchDimensions = async () => {
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    const { data: divs } = await supabase.from('divisions').select('*').order('name');
    if (depts) setDepartments(depts);
    if (divs) setDivisions(divs);
  };

  const updateItemRow = (index: number, key: keyof SalesLineItem, value: any) => {
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
  const customerAccounts = ledgers.filter(l => l.type === AccountType.ASSET || l.group.includes('Debtors'));
  const salesAccounts = ledgers.filter(l => l.type === AccountType.REVENUE);

  const handleSubmit = () => {
    if (!customerLedgerId || !salesLedgerId || totalAmount <= 0) {
      alert("Please enter customer, sales account, and valid items.");
      return;
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `INV-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.SALES,
      narration: narration || 'Sales Invoice Recorded',
      entries: [
        { ledgerId: customerLedgerId, debit: totalAmount, credit: 0 },
        ...items.map(item => ({
          ledgerId: salesLedgerId,
          debit: 0,
          credit: item.qty * item.unitPrice,
          departmentId: item.departmentId || undefined,
          divisionId: item.divisionId || undefined
        }))
      ]
    };
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 max-w-6xl mx-auto mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Create Sales Invoice</h2>
        <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium">Perpetual Integration Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Billed To (Customer)</label>
          <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={customerLedgerId} onChange={e => setCustomerLedgerId(e.target.value)}>
            <option value="">-- Choose Customer --</option>
            {customerAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Account Ledger</label>
          <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={salesLedgerId} onChange={e => setSalesLedgerId(e.target.value)}>
            <option value="">-- Select Revenue Account --</option>
            {salesAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
              <th className="p-3">Product Detail / Notes</th>
              <th className="p-3 w-40">Cost Center (Dept)</th>
              <th className="p-3 w-40">Segment (Div)</th>
              <th className="p-3 w-20 text-center">Qty</th>
              <th className="p-3 w-28 text-right">Unit Price</th>
              <th className="p-3 w-28 text-right">Line Total</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="p-2">
                  <input type="text" placeholder="Search product or description..." value={item.productId} onChange={e => updateItemRow(idx, 'productId', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs" />
                </td>
                <td className="p-2">
                  <select value={item.departmentId} onChange={e => updateItemRow(idx, 'departmentId', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs">
                    <option value="">Global / Unallocated</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_DEPT" className="text-blue-600 font-bold">➕ Add New</option>
                  </select>
                </td>
                <td className="p-2">
                  <select value={item.divisionId} onChange={e => updateItemRow(idx, 'divisionId', e.target.value)} className="w-full p-1.5 border rounded-lg text-xs">
                    <option value="">Whole Strategy</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_DIV" className="text-blue-600 font-bold">➕ Add New</option>
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
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1} className="text-gray-300 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setItems([...items, { productId: '', qty: 1, unitPrice: 0, taxPercent: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-blue-600 border border-dashed border-blue-300 px-4 py-2 rounded-lg hover:bg-blue-50 transition">
          + ADD NEW ROW
        </button>
        <div className="text-right text-sm font-bold text-gray-900">
          Total Amount: <span className="text-lg ml-2">${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Narration / Internal Remarks</label>
        <textarea className="w-full border p-2 rounded-lg mt-1 text-sm" rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Invoice notes..." />
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">Cancel</button>
        <button onClick={handleSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex justify-center items-center gap-2">
          <Save size={16} /> Save Invoice
        </button>
      </div>

      {/* Modals Popup Renderers */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
            <h3 className="text-sm font-bold mb-3 text-gray-900">Quick Add Department</h3>
            <form onSubmit={handleQuickDept} className="space-y-3">
              <input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded text-xs" placeholder="e.g. Finance" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded text-xs">Cancel</button><button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
            <h3 className="text-sm font-bold mb-3 text-gray-900">Quick Add Division</h3>
            <form onSubmit={handleQuickDiv} className="space-y-3">
              <input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded text-xs" placeholder="e.g. Retail" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDivModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded text-xs">Cancel</button><button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesEntry;