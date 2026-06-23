import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingCart, Link as LinkIcon, Printer } from 'lucide-react';
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

  // 🧾 Multi-Currency State Framework Variables
  const [currency, setCurrency] = useState<string>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

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
    preventDefault();
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

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const newId = crypto.randomUUID();
    onAddLedger({
      id: newId,
      name: newCustName.trim(),
      type: AccountType.ASSET,
      group: 'Sundry Debtors',
      openingBalance: 0
    });
    setCustomerId(newId);
    setNewCustName('');
    setIsCustModalOpen(false);
  };

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);
  const foreignTotalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  // 🧮 Conversion Rule: Scaled base amount processing layer
  const totalAmountBasePKR = foreignTotalAmount * exchangeRate;

  const handleSubmit = () => {
    const salesLedger = ledgers.find(l => l.name.toLowerCase().includes('sales') && l.type === AccountType.INCOME);
    const cogsLedger = ledgers.find(l => l.name.toLowerCase().includes('cost of goods') && l.type === AccountType.EXPENSE);
    const stockLedger = ledgers.find(l => l.name.toLowerCase().includes('stock') && l.type === AccountType.ASSET);

    if (!customerId || !salesLedger || foreignTotalAmount <= 0) {
      alert("Please fill all details correctly.");
      return;
    }

    const voucherId = crypto.randomUUID();
    // 🪙 Lock Debits/Credits scaled with currency metrics inside accounting ledgers
    const finalEntries: any[] = [
      { ledgerId: customerId, debit: totalAmountBasePKR, credit: 0, departmentId: lineItems[0]?.departmentId || undefined, divisionId: lineItems[0]?.divisionId || undefined }
    ];

    lineItems.forEach(line => {
      const lineAmountBase = line.amount * exchangeRate;
      finalEntries.push({ ledgerId: salesLedger.id, debit: 0, credit: lineAmountBase, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      if (cogsLedger && stockLedger) {
        const item = items.find(i => i.id === line.itemId);
        const cost = line.qty * (item?.costPrice || 0); // COGS calculation stays on original asset cost base valuation
        finalEntries.push({ ledgerId: cogsLedger.id, debit: cost, credit: 0, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
        finalEntries.push({ ledgerId: stockLedger.id, debit: 0, credit: cost, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      }
    });

    onSave({
      id: voucherId,
      date,
      number: invoiceNo,
      type: VoucherType.SALES,
      narration: narration || `Sales Inv #${invoiceNo} (${currency} ${foreignTotalAmount.toLocaleString()} @ ${exchangeRate})`,
      entries: finalEntries,
      currency,
      exchangeRate,
      foreignTotal: foreignTotalAmount
    } as any, lineItems.map(l => ({ itemId: l.itemId, qty: -Math.abs(l.qty), rate: l.rate * exchangeRate, voucherId: voucherId })));

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
    <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 max-w-6xl mx-auto border border-gray-100 animate-in fade-in dynamic-layouts relative">
      <style>{`
        @media print {
          body * { visibility: hidden; background: white !important; }
          .dynamic-layouts, .dynamic-layouts * { visibility: visible; }
          .dynamic-layouts { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .no-print-el { display: none !important; }
          select { -webkit-appearance: none; -moz-appearance: none; appearance: none; border: none !important; padding: 0.25rem !important; font-weight: bold; }
          input { border: none !important; background: transparent !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <span className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md"><ShoppingCart size={20} /></span>
          Create Sales Invoice
        </h2>
        <div className="flex items-center gap-3 no-print-el">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl flex items-center gap-2 border border-slate-200 transition-all shadow-sm"
          >
            <Printer size={15} /> Export PDF / Print
          </button>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
            Current Base: <span className="font-black text-indigo-950">PKR</span>
          </span>
          <span className="text-[10px] bg-green-50 text-green-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-green-100"><LinkIcon size={12} className="inline mr-1"/>Live Sync</span>
        </div>
      </div>

      {/* RE-ARCHITECTED CONTROLS GRID WITH INTEGRATED CURRENCY CHANNELS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 bg-slate-50 border border-gray-200/60 rounded-2xl mb-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed To (Customer)</label>
          <select value={customerId} onChange={e => e.target.value === 'QUICK_ADD_CUST' ? setIsCustModalOpen(true) : setCustomerId(e.target.value)} className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 shadow-sm outline-none">
            <option value="">Select Customer Registry...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="QUICK_ADD_CUST" className="text-indigo-600 font-bold bg-indigo-50 no-print-el">➕ Add New Customer</option>
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
        
        {/* 📑 Currency Matrix Controllers Section */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billing Currency</label>
          <select value={currency} onChange={e => { const selected = e.target.value; setCurrency(selected); if (selected === 'PKR') setExchangeRate(1); }} className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-black text-gray-800 shadow-sm outline-none">
            <option value="PKR">PKR (Base)</option>
            <option value="USD">USD ($)</option>
            <option value="AED">AED (Dirham)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Exchange Rate (1 {currency} = ? PKR)</label>
          <input type="number" value={exchangeRate} disabled={currency === 'PKR'} onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-indigo-600 font-black text-xs text-center shadow-sm disabled:bg-gray-100 disabled:text-gray-400 outline-none" min="0.01" step="any" />
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px] print:min-w-full">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-400 font-black text-[10px] uppercase tracking-widest">
              <tr>
                <th className="p-4 pl-6">Product Detail / Notes</th>
                <th className="p-4 w-44">Cost Center (Dept)</th>
                <th className="p-4 w-44">Segment (Div)</th>
                <th className="p-4 w-20 text-center">Qty</th>
                <th className="p-4 w-28 text-right">Unit Price ({currency})</th>
                <th className="p-4 w-32 text-right pr-6">Line Total</th>
                <th className="p-4 w-10 no-print-el"></th>
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
                      <option value="QUICK_ADD_ROW_DEPT" className="text-indigo-600 font-bold bg-indigo-50 no-print-el">➕ Add New Department</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select value={line.divisionId} onChange={e => handleRowMetricChange(idx, 'divisionId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-xs text-gray-700 font-medium">
                      <option value="">Whole Strategy</option>
                      {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="QUICK_ADD_ROW_DIV" className="text-indigo-600 font-bold bg-indigo-50 no-print-el">➕ Add New Division</option>
                    </select>
                  </td>
                  <td className="p-3"><input type="number" value={line.qty} onChange={e => handleRowMetricChange(idx, 'qty', e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl text-center font-black" /></td>
                  <td className="p-3"><input type="number" value={line.rate} onChange={e => handleRowMetricChange(idx, 'rate', e.target.value)} className="w-full p-2 border border-gray-300 rounded-xl text-right font-mono" /></td>
                  <td className="p-3 text-right font-mono text-gray-900 pr-6 text-sm">
                    {line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center no-print-el">
                    <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-gray-300 hover:text-rose-500 transition-colors disabled:opacity-30"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
              
              {/* Summary Presentation Block Row */}
              <tr className="bg-slate-50/60 font-black text-sm border-t">
                <td colSpan={5} className="p-4 text-right uppercase tracking-wider text-slate-400 text-[10px]">Total Invoice Balance ({currency}):</td>
                <td className="p-4 text-right font-mono text-base text-gray-900 pr-6">{currency} {foreignTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="no-print-el"></td>
              </tr>
              {currency !== 'PKR' && (
                <tr className="bg-indigo-50/40 text-xs text-indigo-900 font-bold border-t">
                  <td colSpan={5} className="p-3 text-right uppercase text-[10px] tracking-wider text-indigo-400">Equivalent Base Balance:</td>
                  <td className="p-3 text-right font-mono pr-6">PKR {totalAmountBasePKR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="no-print-el"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50/50 border-t no-print-el">
          <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 transition-all shadow-sm">
            + ADD NEW ROW
          </button>
        </div>
      </div>

      <div className="bg-white p-5 border border-gray-200 rounded-2xl mb-6">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Narration / Internal Remarks</label>
        <textarea rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Invoice notes..." className="w-full border p-3 rounded-xl text-xs outline-none bg-white font-medium" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t no-print-el">
        <button onClick={onCancel} className="px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Discard Draft</button>
        <button onClick={handleSubmit} className="px-10 py-3 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black flex items-center gap-2 shadow-md transition-all">
          <Save size={16} /> Save Invoice
        </button>
      </div>

      {/* MODALS SECTION STAYS FULLY RESTORED */}
      {isCustModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print-el">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Customer</h3>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <input autoFocus type="text" value={newCustName} onChange={e => setNewCustName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="Legal customer name" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCustModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print-el">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Department</h3>
            <form onSubmit={handleQuickDeptSubmit} className="space-y-4">
              <input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="e.g. Operations" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 text-xs text-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print-el">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Division</h3>
            <form onSubmit={handleQuickDivSubmit} className="space-y-4">
              <input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="e.g. Retail Unit" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDivModalOpen(false)} className="px-4 py-2 text-xs text-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoice;