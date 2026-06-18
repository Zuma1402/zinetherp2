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

  // Table Row Level Matrix Data State
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
    if (field === 'itemId') {
      const target = items.find(i => i.id === value);
      updated[index].itemId = value;
      updated[index].rate = target ? target.rate : 0;
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

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    const salesLedger = ledgers.find(l => l.name.toLowerCase().includes('sales') && l.type === AccountType.INCOME);
    const cogsLedger = ledgers.find(l => l.name.toLowerCase().includes('cost of goods') && l.type === AccountType.EXPENSE);
    const stockLedger = ledgers.find(l => l.name.toLowerCase().includes('stock') && l.type === AccountType.ASSET);

    if (!customerId || !salesLedger || totalAmount <= 0) {
      alert("Please select a customer and add items.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const finalEntries: any[] = [
      { ledgerId: customerId, debit: totalAmount, credit: 0, departmentId: lineItems[0]?.departmentId || undefined, divisionId: lineItems[0]?.divisionId || undefined }
    ];

    lineItems.forEach(line => {
      finalEntries.push({ ledgerId: salesLedger.id, debit: 0, credit: line.amount, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      if (cogsLedger && stockLedger) {
        const item = items.find(i => i.id === line.itemId);
        const cost = line.qty * (item?.costPrice || 0);
        finalEntries.push({ ledgerId: cogsLedger.id, debit: cost, credit: 0, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
        finalEntries.push({ ledgerId: stockLedger.id, debit: 0, credit: cost, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      }
    });

    onSave({
      id: voucherId,
      date,
      number: invoiceNo,
      type: VoucherType.SALES,
      narration: narration || `Sales Inv #${invoiceNo}`,
      entries: finalEntries
    }, lineItems.map(l => ({ itemId: l.itemId, qty: -Math.abs(l.qty), rate: l.rate, voucherId: voucherId })));

    (async () => {
      try {
        const currentSettings = await getCompanySettings();
        await saveCompanySettings({ ...currentSettings, nextInvoiceNumber: (currentSettings.nextInvoiceNumber || 1) + 1 });
      } catch (error) {
        console.error(error);
      }
    })();
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 max-w-6xl mx-auto border border-gray-100 animate-in fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <span className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md"><ShoppingCart size={20} /></span>
          Create Sales Invoice
        </h2>
        <span className="text-[10px] bg-green-50 text-green-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-green-100"><LinkIcon size={12} className="inline mr-1"/>Live Sync</span>
      </div>

      {/* Clean Header Row matching image_e06ee6.png */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50 border border-gray-200/60 rounded-2xl mb-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed To (Customer)</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 shadow-sm outline-none">
            <option value="">Select Customer Registry...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice #</label>
          <input type="text" value={invoiceNo} readOnly className="w-full p-3 bg-white border border-gray-200 rounded-xl text-indigo-600 font-mono font-black text-xs text-center shadow-inner" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white text-xs text-gray-800 font-bold outline-none shadow-sm" />
        </div>
      </div>

      {/* Columns Alignment Matrix layout matching image_e075c9.png */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-400 font-black text-[10px] uppercase tracking-widest">
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
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 pl-6">
                    <ItemAutocomplete items={items} selectedId={line.itemId} onSelect={id => handleRowMetricChange(idx, 'itemId', id)} placeholder="Search product or description..." priceType="rate" />
                  </td>
                  <td className="p-3">
                    <select value={line.departmentId} onChange={e => handleRowMetricChange(idx, 'departmentId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs text-gray-700 font-medium">
                      <option value="">Global / Unallocated</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <select value={line.divisionId} onChange={e => handleRowMetricChange(idx, 'divisionId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs text-gray-700 font-medium">
                      <option value="">Whole Strategy</option>
                      {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3"><input type="number" value={line.qty} onChange={e => handleRowMetricChange(idx, 'qty', e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl text-center font-black" /></td>
                  <td className="p-3"><input type="number" value={line.rate} onChange={e => handleRowMetricChange(idx, 'rate', e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl text-right font-mono" /></td>
                  <td className="p-3 text-right font-mono text-gray-900 pr-6 text-sm">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-gray-300 hover:text-rose-500 transition-colors disabled:opacity-30"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50/60 font-black text-sm">
                <td colSpan={5} className="p-4 text-right uppercase tracking-wider text-slate-400 text-[10px]">Total Amount:</td>
                <td className="p-4 text-right font-mono text-base text-gray-900 pr-6">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50/50 border-t">
          <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 transition-all shadow-sm">
            + ADD NEW ROW
          </button>
        </div>
      </div>

      <div className="bg-white p-5 border border-gray-200 rounded-2xl">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Narration / Internal Remarks</label>
        <textarea rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Invoice notes..." className="w-full border p-3 rounded-xl text-xs outline-none bg-white font-medium" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button onClick={onCancel} className="px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Discard Draft</button>
        <button onClick={handleSubmit} className="px-10 py-3 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black flex items-center gap-2 shadow-md">
          <Save size={16} /> Save Invoice
        </button>
      </div>
    </div>
  );
};

export default SalesInvoice;