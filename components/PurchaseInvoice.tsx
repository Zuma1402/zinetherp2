import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Ledger, Voucher, VoucherType, InventoryItem, AccountType, StockTransaction, Department, Division } from '../types';
import { supabase } from '../services/supabaseService';
import ItemAutocomplete from './ItemAutocomplete';

interface PurchaseInvoiceProps {
  ledgers: Ledger[];
  items: InventoryItem[];
  trialBalance: TrialBalanceRow[];
  onSave: (voucher: Voucher, stockUpdates: StockTransaction[]) => void;
  onCancel: () => void;
  onAddLedger: (ledger: Ledger) => void;
}

const PurchaseInvoice: React.FC<PurchaseInvoiceProps> = ({ ledgers, items, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`PUR-${Math.floor(Math.random() * 10000)}`);
  const [supplierId, setSupplierId] = useState('');
  const [narration, setNarration] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  const [lineItems, setLineItems] = useState([
    { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }
  ]);

  const fetchLookups = async () => {
    const { data: d } = await supabase.from('departments').select('*').order('name');
    const { data: v } = await supabase.from('divisions').select('*').order('name');
    if (d) setDepartments(d);
    if (v) setDivisions(v);
  };

  useEffect(() => { fetchLookups(); }, []);

  const handleRowMetricChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    
    // ⭐ Inline dropdown select trigger
    if (field === 'departmentId' && value === 'QUICK_ADD_ROW_DEPT') {
      setActiveRowIndex(index);
      setIsDeptModalOpen(true);
      return;
    }
    if (field === 'divisionId' && value === 'QUICK_ADD_ROW_DIV') {
      setActiveRowIndex(index);
      setIsDivModalOpen(true);
      return;
    }

    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      updated[index].itemId = value;
      updated[index].rate = item?.costPrice || 0;
    } else {
      (updated[index] as any)[field] = value;
    }

    const base = (Number(updated[index].qty) || 0) * (Number(updated[index].rate) || 0);
    updated[index].amount = base;
    setLineItems(updated);
  };

  const handleQuickDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || activeRowIndex === null) return;
    const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('departments').insert([{ id, name: newDeptName.trim() }]);
    await fetchLookups();
    const updated = [...lineItems];
    updated[activeRowIndex].departmentId = id;
    setLineItems(updated);
    setIsDeptModalOpen(false);
    setNewDeptName('');
  };

  const handleQuickDivSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim() || activeRowIndex === null) return;
    const id = newDivName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('divisions').insert([{ id, name: newDivName.trim() }]);
    await fetchLookups();
    const updated = [...lineItems];
    updated[activeRowIndex].divisionId = id;
    setLineItems(updated);
    setIsDivModalOpen(false);
    setNewDivName('');
  };

  const suppliers = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-blue-50/20 rounded-[2rem] border mb-6">
        <div>
          <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">Supplier / Vendor Source</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none">
            <option value="">Select Supplier Registry...</option>
            {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">Vendor Bill #</label><input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full p-3 border rounded-xl bg-white text-blue-600 font-mono font-black text-xs text-center" /></div>
        <div><label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">Post Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-bold text-xs" /></div>
      </div>

      <div className="border border-blue-50 rounded-[2.5rem] overflow-hidden mb-8 bg-white">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-blue-50/30 border-b text-gray-400 font-black text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-5 pl-6">Procured Item / Notes</th>
              <th className="p-5 w-44">Cost Center (Dept)</th>
              <th className="p-5 w-44">Segment (Div)</th>
              <th className="p-5 w-20 text-center">Qty</th>
              <th className="p-5 w-28 text-right">Cost Rate</th>
              <th className="p-5 w-32 text-right pr-6">Ext. Price</th>
              <th className="p-5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
            {lineItems.map((line, idx) => (
              <tr key={idx} className="hover:bg-blue-50/10">
                <td className="p-4 pl-6"><ItemAutocomplete items={items} selectedId={line.itemId} onSelect={id => handleRowMetricChange(idx, 'itemId', id)} placeholder="Search item..." priceType="costPrice" /></td>
                
                {/* ⭐ Inline Dept dropdown quick add */}
                <td className="p-4">
                  <select value={line.departmentId} onChange={e => handleRowMetricChange(idx, 'departmentId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs">
                    <option value="">Global / Unallocated</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_ROW_DEPT" className="text-blue-600 font-bold bg-blue-50">➕ Add New Department</option>
                  </select>
                </td>

                {/* ⭐ Inline Div dropdown quick add */}
                <td className="p-4">
                  <select value={line.divisionId} onChange={e => handleRowMetricChange(idx, 'divisionId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs">
                    <option value="">Whole Strategy</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="QUICK_ADD_ROW_DIV" className="text-blue-600 font-bold bg-blue-50">➕ Add New Division</option>
                  </select>
                </td>

                <td className="p-4"><input type="number" value={line.qty} onChange={e => handleRowMetricChange(idx, 'qty', e.target.value)} className="w-full p-2 border text-center" /></td>
                <td className="p-4"><input type="number" value={line.rate} onChange={e => handleRowMetricChange(idx, 'rate', e.target.value)} className="w-full p-2 border text-right" /></td>
                <td className="p-4 text-right pr-6 text-sm">{line.amount.toLocaleString()}</td>
                <td className="p-4 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-gray-200 hover:text-rose-500"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals Popup Renderers */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Add Department</h3>
            <form onSubmit={handleQuickDeptSubmit} className="space-y-2">
              <input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded text-xs" required />
              <div className="flex justify-end gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Add Division</h3>
            <form onSubmit={handleQuickDivSubmit} className="space-y-2">
              <input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded text-xs" required />
              <div className="flex justify-end gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoice;