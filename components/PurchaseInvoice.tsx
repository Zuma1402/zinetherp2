import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Ledger, Voucher, VoucherType, InventoryItem, AccountType, StockTransaction, TrialBalanceRow, Department, Division } from '../types';
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

const PurchaseInvoice: React.FC<PurchaseInvoiceProps> = ({ ledgers, items, trialBalance, onSave, onCancel, onAddLedger }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`PUR-${Math.floor(Math.random() * 10000)}`);
  const [supplierId, setSupplierId] = useState('');
  const [narration, setNarration] = useState('');

  // Dimensions Master Lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

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
    fetchLookups();
  }, []);

  const handleRowMetricChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      updated[index].itemId = value;
      updated[index].rate = item?.costPrice || 0;
    } else if (field === 'departmentId' || field === 'divisionId') {
      updated[index][field] = value;
    } else {
      (updated[index] as any)[field] = Number(value);
    }

    const base = updated[index].qty * updated[index].rate;
    updated[index].taxAmount = (base * updated[index].taxRate) / 100;
    updated[index].amount = base + updated[index].taxAmount;
    setLineItems(updated);
  };

  const suppliers = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    const stockLedger = ledgers.find(l => l.name.toLowerCase().includes('stock') && l.type === AccountType.ASSET);
    if (!supplierId || !stockLedger || totalAmount <= 0) {
      alert("Please fill registry details completely.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const finalEntries: any[] = [
      { ledgerId: supplierId, debit: 0, credit: totalAmount, departmentId: lineItems[0]?.departmentId || undefined, divisionId: lineItems[0]?.divisionId || undefined }
    ];

    lineItems.forEach(line => {
      finalEntries.push({ ledgerId: stockLedger.id, debit: line.amount, credit: 0, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
    });

    onSave({
      id: voucherId,
      date,
      number: invoiceNo,
      type: VoucherType.PURCHASE,
      narration: narration || `Purchase from Vendor #${invoiceNo}`,
      entries: finalEntries
    }, lineItems.map(line => ({ itemId: line.itemId, qty: line.qty, rate: line.rate, voucherId: voucherId })));
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-in fade-in relative">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <span className="bg-blue-600 text-white p-3 rounded-2xl shadow-md"><ShoppingBag size={20} /></span>
          New Purchase Bill
        </h2>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-100">Procurement</span>
      </div>

      {/* Clean Header Grid matching image_e06ee6.png */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-blue-50/20 rounded-[2rem] border border-blue-50 mb-6">
        <div>
          <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">Supplier / Vendor Source</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full p-3 bg-white border border-blue-100 rounded-xl text-xs font-black text-gray-900 shadow-sm outline-none">
            <option value="">Select Supplier Registry...</option>
            {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">Vendor Bill #</label>
          <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full p-3 border border-blue-100 rounded-xl bg-white text-blue-600 font-mono font-black text-xs text-center outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">Post Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-blue-100 rounded-xl bg-white font-bold text-xs text-gray-700 outline-none" />
        </div>
      </div>

      {/* Matrix Table Matrix matching image_e075c9.png */}
      <div className="border border-blue-50 rounded-[2.5rem] overflow-hidden mb-8 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-blue-50/30 border-b border-blue-50 text-gray-400 font-black text-[10px] uppercase tracking-widest">
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
                <tr key={idx} className="hover:bg-blue-50/10 transition-colors">
                  <td className="p-4 pl-6">
                    <ItemAutocomplete items={items} selectedId={line.itemId} onSelect={id => handleRowMetricChange(idx, 'itemId', id)} placeholder="Search materials or items..." priceType="costPrice" />
                  </td>
                  <td className="p-4">
                    <select value={line.departmentId} onChange={e => handleRowMetricChange(idx, 'departmentId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs text-gray-700 font-medium">
                      <option value="">Global / Unallocated</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <select value={line.divisionId} onChange={e => handleRowMetricChange(idx, 'divisionId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs text-gray-700 font-medium">
                      <option value="">Whole Strategy</option>
                      {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td className="p-4"><input type="number" value={line.qty} onChange={e => handleRowMetricChange(idx, 'qty', e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-center font-black" /></td>
                  <td className="p-4"><input type="number" value={line.rate} onChange={e => handleRowMetricChange(idx, 'rate', e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-right font-mono" /></td>
                  <td className="p-4 text-right font-mono text-blue-900 pr-6 text-sm">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-gray-300 hover:text-rose-500 transition-colors disabled:opacity-30"><Trash2 size={16}/></button></td>
                </tr>
              ))}
              <tr className="bg-blue-50/10 font-black text-sm text-gray-900">
                <td colSpan={5} className="p-5 text-right uppercase tracking-wider text-gray-400 text-[10px]">Total Bill Amount:</td>
                <td className="p-5 text-right font-mono text-base pr-6">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-blue-50/20 border-t">
          <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-blue-600 border border-dashed border-blue-200 px-5 py-2 rounded-xl bg-white hover:bg-blue-50 transition-all shadow-sm">
            + NEW PURCHASE ENTRY
          </button>
        </div>
      </div>

      <div className="bg-white p-5 border border-gray-200 rounded-2xl mb-6">
        <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-2">Narration / Internal Remarks</label>
        <textarea rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Purchase notes..." className="w-full border p-3 rounded-xl text-xs outline-none bg-white font-medium" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button onClick={onCancel} className="px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-700">Abort Post</button>
        <button onClick={handleSubmit} className="px-12 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-md">
          <Save size={16} /> Record Purchase Bill
        </button>
      </div>
    </div>
  );
};

export default PurchaseInvoice;