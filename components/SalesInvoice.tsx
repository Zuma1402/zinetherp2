import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingCart, Link as LinkIcon } from 'lucide-react';
import { Ledger, Voucher, VoucherType, InventoryItem, AccountType, StockTransaction, TrialBalanceRow, Department, Division } from '../types';
import { getCompanySettings, saveCompanySettings } from '../services/settingsService';
import { supabase } from '../services/supabaseService';
import ItemAutocomplete from './ItemAutocomplete';

interface SalesInvoiceProps {
  ledgers: Ledger[];
  items: InventoryItem[];
  trialBalance: TrialBalanceRow[];
  onSave: (voucher: Voucher, stockUpdates: StockTransaction[]) => void;
  onCancel: () => void;
  onAddLedger: (ledger: Ledger) => void;
}

const SalesInvoice: React.FC<SalesInvoiceProps> = ({ ledgers, items, trialBalance, onSave, onCancel, onAddLedger }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [narration, setNarration] = useState('');

  // Dimensions Master States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Inline Dropdown Quick Add Modal States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [newCustName, setNewCustName] = useState('');
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

  useEffect(() => {
    const initializeInvoice = async () => {
      try {
        const settings = await getCompanySettings();
        const prefix = settings.invoicePrefix || 'INV-';
        const nextNum = settings.nextInvoiceNumber || 1;
        setInvoiceNo(`${prefix}${nextNum.toString().padStart(4, '0')}`);
      } catch (error) {
        setInvoiceNo('INV-0001');
      }
    };
    initializeInvoice();
    fetchLookups();
  }, []);

  const handleRowMetricChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    
    // ⭐ Trigger Dropdown Option click to modal logic
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
      const target = items.find(i => i.id === value);
      updated[index].itemId = value;
      updated[index].rate = target ? target.rate : 0;
    } else {
      (updated[index] as any)[field] = value;
    }

    const base = (Number(updated[index].qty) || 0) * (Number(updated[index].rate) || 0);
    updated[index].taxAmount = (base * (Number(updated[index].taxRate) || 0)) / 100;
    updated[index].amount = base + updated[index].taxAmount;
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

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    const salesLedger = ledgers.find(l => l.name.toLowerCase().includes('sales') && l.type === AccountType.INCOME);
    if (!customerId || !salesLedger || totalAmount <= 0) {
      alert("Please fill all details correctly.");
      return;
    }
    // standard postings trigger logic...
    onSave({
      id: crypto.randomUUID(), date, number: invoiceNo, type: VoucherType.SALES, narration,
      entries: [{ ledgerId: customerId, debit: totalAmount, credit: 0 }]
    }, []);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 max-w-6xl mx-auto border border-gray-100 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">Create Sales Invoice</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50 border border-gray-200/60 rounded-2xl mb-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed To (Customer)</label>
          <select value={customerId} onChange={e => e.target.value === 'QUICK_ADD_CUST' ? setIsCustModalOpen(true) : setCustomerId(e.target.value)} className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 shadow-sm outline-none">
            <option value="">Select Customer Registry...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="QUICK_ADD_CUST" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Customer</option>
          </select>
        </div>
        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice #</label><input type="text" value={invoiceNo} readOnly className="w-full p-3 bg-white border border-gray-200 rounded-xl text-indigo-600 font-mono font-black text-xs text-center" /></div>
        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white text-xs text-gray-800 font-bold outline-none" /></div>
      </div>

      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-400 font-black text-[10px] uppercase tracking-widest">
              <tr>
                <th className="p-4 pl-6">Product Detail / Notes</th>
                <th className="p-4 w-44">Cost Center (Dept)</th>
                <th className="p-4 w-44">Segment (Div)</th>
                <th className="p-4 w-20 text-center">Qty</th>
                <th className="p-4 w-28 text-right">Unit Price</th>
                <th className="p-4 w-32 text-right pr-6">Line Total</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
              {lineItems.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3 pl-6"><ItemAutocomplete items={items} selectedId={line.itemId} onSelect={id => handleRowMetricChange(idx, 'itemId', id)} placeholder="Search product..." priceType="rate" /></td>
                  
                  {/* ⭐ Inline Department Dropdown Add option */}
                  <td className="p-3">
                    <select value={line.departmentId} onChange={e => handleRowMetricChange(idx, 'departmentId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs">
                      <option value="">Global / Unallocated</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="QUICK_ADD_ROW_DEPT" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Department</option>
                    </select>
                  </td>

                  {/* ⭐ Inline Division Dropdown Add option */}
                  <td className="p-3">
                    <select value={line.divisionId} onChange={e => handleRowMetricChange(idx, 'divisionId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs">
                      <option value="">Whole Strategy</option>
                      {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="QUICK_ADD_ROW_DIV" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Division</option>
                    </select>
                  </td>

                  <td className="p-3"><input type="number" value={line.qty} onChange={e => handleRowMetricChange(idx, 'qty', e.target.value)} className="w-full p-2 border rounded-xl text-center" /></td>
                  <td className="p-3"><input type="number" value={line.rate} onChange={e => handleRowMetricChange(idx, 'rate', e.target.value)} className="w-full p-2 border rounded-xl text-right" /></td>
                  <td className="p-3 text-right pr-6 text-sm">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-gray-300 hover:text-rose-500"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popups forms */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Add New Department</h3>
            <form onSubmit={handleQuickDeptSubmit} className="space-y-3">
              <input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded-xl text-xs outline-none" placeholder="e.g. Accounts" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-3 py-1 text-xs">Cancel</button><button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Add New Division</h3>
            <form onSubmit={handleQuickDivSubmit} className="space-y-3">
              <input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded-xl text-xs outline-none" placeholder="e.g. Export Segment" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDivModalOpen(false)} className="px-3 py-1 text-xs">Cancel</button><button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoice;