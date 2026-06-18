import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingCart, User, Link as LinkIcon, UserPlus, X, FolderPlus } from 'lucide-react';
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
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  // Master Lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Popups Modals States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // ⭐ Row Level Dimensional Structure
  const [lineItems, setLineItems] = useState([
    { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }
  ]);

  const fetchDimensions = async () => {
    try {
      const { data: depts } = await supabase.from('departments').select('*').order('name');
      const { data: divs } = await supabase.from('divisions').select('*').order('name');
      if (depts) setDepartments(depts);
      if (divs) setDivisions(divs);
    } catch (err) {
      console.error('Error fetching structural dimensions:', err);
    }
  };

  useEffect(() => {
    const initializeInvoice = async () => {
      try {
        const settings = await getCompanySettings();
        const prefix = settings.invoicePrefix || 'INV-';
        const nextNum = settings.nextInvoiceNumber || 1;
        setInvoiceNo(`${prefix}${nextNum.toString().padStart(4, '0')}`);
      } catch (error) {
        console.error('Error loading invoice settings:', error);
        setInvoiceNo('INV-0001');
      }
    };
    initializeInvoice();
    fetchDimensions();
  }, []);

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setModalLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ id: newDeptName.trim().toLowerCase().replace(/\s+/g, '_'), name: newDeptName.trim() }])
        .select();
      if (error) throw error;
      await fetchDimensions();
      setIsDeptModalOpen(false);
      setNewDeptName('');
    } catch (err) {
      alert('Error saving department');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    setModalLoading(true);
    try {
      const { data, error } = await supabase
        .from('divisions')
        .insert([{ id: newDivName.trim().toLowerCase().replace(/\s+/g, '_'), name: newDivName.trim() }])
        .select();
      if (error) throw error;
      await fetchDimensions();
      setIsDivModalOpen(false);
      setNewDivName('');
    } catch (err) {
      alert('Error saving division');
    } finally {
      setModalLoading(false);
    }
  };

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);
  const findLedger = (name: string, type: AccountType) => ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()) && l.type === type);

  const getCustomerBalance = (id: string) => {
    const row = trialBalance.find(r => r.ledgerId === id);
    if (!row) return 'Bal: 0.00';
    return `O/S Balance: ${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  const handleAddCustomer = () => {
    if (!newCustomerName) return;
    const newId = crypto.randomUUID();
    onAddLedger({ id: newId, name: newCustomerName, type: AccountType.ASSET, group: 'Sundry Debtors', openingBalance: 0 });
    setCustomerId(newId);
    setIsAddingCustomer(false);
    setNewCustomerName('');
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newLines = [...lineItems];
    const line = { ...newLines[index] };
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      line.itemId = value;
      line.rate = item ? item.rate : 0;
    } else {
      (line as any)[field] = value;
    }
    const base = Number(line.qty) * Number(line.rate);
    line.taxAmount = (base * Number(line.taxRate)) / 100;
    line.amount = base + line.taxAmount;
    newLines[index] = line;
    setLineItems(newLines);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    const salesLedger = findLedger('Sales', AccountType.INCOME);
    const cogsLedger = findLedger('Cost of Goods Sold', AccountType.EXPENSE);
    const stockLedger = findLedger('Stock-in-Hand', AccountType.ASSET);

    if (!customerId || !salesLedger || !cogsLedger || !stockLedger || totalAmount <= 0) {
      alert("Required ledgers missing.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const finalEntries: any[] = [];

    // Customer Posting
    finalEntries.push({ 
      ledgerId: customerId, 
      debit: totalAmount, 
      credit: 0,
      departmentId: lineItems[0]?.departmentId || undefined,
      divisionId: lineItems[0]?.divisionId || undefined
    });

    // Splitting line distributions cleanly
    lineItems.forEach(line => {
      const item = items.find(i => i.id === line.itemId);
      const lineCost = Number(line.qty) * (item?.costPrice || 0);

      finalEntries.push({ ledgerId: salesLedger.id, debit: 0, credit: line.amount, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      finalEntries.push({ ledgerId: cogsLedger.id, debit: lineCost, credit: 0, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      finalEntries.push({ ledgerId: stockLedger.id, debit: 0, credit: lineCost, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
    });

    const voucher: Voucher = { id: voucherId, date, number: invoiceNo, type: VoucherType.SALES, narration: `Sales Inv #${invoiceNo}`, entries: finalEntries };
    const stockUpdates: StockTransaction[] = lineItems.map(line => ({ itemId: line.itemId, qty: -Math.abs(Number(line.qty)), rate: Number(line.rate), voucherId: voucherId }));

    onSave(voucher, stockUpdates);
    
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
    <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 max-w-7xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 md:mb-10 gap-6">
        <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-4">
            <span className="bg-indigo-600 text-white p-2 md:p-3 rounded-2xl shadow-indigo-200 shadow-xl"><ShoppingCart size={24} /></span>
            Create Sales Invoice
            </h2>
            <div className="mt-3 flex items-center gap-2 text-green-600 font-bold text-[10px] uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100 w-fit">
                <LinkIcon size={12} /> Perpetual Integration Active
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8 p-6 md:p-8 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
        <div className="lg:col-span-2">
          <label className="block text-xs font-black text-indigo-900/40 uppercase tracking-[0.15em] mb-2">Billed To (Customer)</label>
          {isAddingCustomer ? (
             <div className="flex gap-2 animate-in zoom-in-95 duration-200">
                 <input autoFocus type="text" className="flex-1 p-3 border-2 border-indigo-200 rounded-2xl text-gray-900 font-bold outline-none" placeholder="Legal Name..." value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomer()}/>
                 <button onClick={handleAddCustomer} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold">Save</button>
                 <button onClick={() => setIsAddingCustomer(false)} className="bg-white text-gray-400 px-4 py-3 rounded-2xl border">X</button>
             </div>
          ) : (
            <select className="w-full p-4 border rounded-2xl bg-white text-gray-900 font-bold shadow-sm" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">-- Choose Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-black text-indigo-900/40 uppercase tracking-[0.15em] mb-2">Invoice #</label><input type="text" value={invoiceNo} readOnly className="w-full p-4 bg-white border rounded-2xl text-indigo-600 font-mono text-center font-black" /></div>
          <div><label className="block text-xs font-black text-indigo-900/40 uppercase tracking-[0.15em] mb-2">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 border rounded-2xl bg-white text-gray-900 font-bold" /></div>
        </div>
      </div>

      {/* ⭐ Granular Matrix Table Columns */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden mb-8 shadow-xl bg-white">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
                <thead className="bg-gray-50 border-b text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">
                    <tr>
                        <th className="p-4 w-56">Product Detail</th>
                        <th className="p-4 w-40"><div className="flex items-center gap-1">Department <FolderPlus size={14} className="text-indigo-600 cursor-pointer" onClick={() => setIsDeptModalOpen(true)}/></div></th>
                        <th className="p-4 w-40"><div className="flex items-center gap-1">Division <FolderPlus size={14} className="text-indigo-600 cursor-pointer" onClick={() => setIsDivModalOpen(true)}/></div></th>
                        <th className="p-4 w-16 text-center">Qty</th>
                        <th className="p-4 w-28 text-right">Unit Price</th>
                        <th className="p-4 w-16 text-center">Tax %</th>
                        <th className="p-4 w-32 text-right">Line Total</th>
                        <th className="p-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white text-sm font-medium">
                    {lineItems.map((line, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="p-2">
                                <ItemAutocomplete items={items} selectedId={line.itemId} onSelect={(id) => handleItemChange(idx, 'itemId', id)} placeholder="Search product..." priceType="rate" />
                            </td>
                            <td className="p-2">
                              <select value={line.departmentId} onChange={e => handleItemChange(idx, 'departmentId', e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none">
                                <option value="">HQ / Central</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                            </td>
                            <td className="p-2">
                              <select value={line.divisionId} onChange={e => handleItemChange(idx, 'divisionId', e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none">
                                <option value="">Enterprise Strategy</option>
                                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                            </td>
                            <td className="p-2"><input type="number" className="w-full p-2 border rounded-lg text-center font-black bg-gray-50/50" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
                            <td className="p-2"><input type="number" className="w-full p-2 border rounded-lg text-right font-mono font-bold bg-gray-50/50" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                            <td className="p-2"><input type="number" className="w-full p-2 border rounded-lg text-center bg-gray-50/50" value={line.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)} /></td>
                            <td className="p-2 text-right"><span className="text-sm font-black text-indigo-900 font-mono">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                            <td className="p-2 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-rose-500"><Trash2 size={16}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-4 bg-gray-50/30 flex justify-start">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }])} className="bg-white border border-dashed border-indigo-200 text-indigo-600 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:border-indigo-500 flex items-center gap-2">
                <Plus size={14}/> Add New Row
            </button>
        </div>
      </div>

      {/* Footer totals box */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mt-8">
          <div className="flex-1 text-gray-400 text-xs max-w-md bg-gray-50 p-6 rounded-2xl border w-full leading-relaxed">
             <div className="font-black text-gray-500 uppercase mb-2 tracking-widest text-[9px]">Granular Analytical Rows Tagging</div>
             Each product transaction item maps directly to dedicated segment dimensions fields inside accounting ledgers.
          </div>
          <div className="w-full lg:w-[400px] space-y-4 font-bold text-gray-600 text-sm">
              <div className="flex justify-between px-4"><span>Subtotal</span><span className="font-mono">{(totalAmount * 0.8).toLocaleString()}</span></div>
              <div className="flex justify-between px-4 border-b pb-4"><span>Tax Component</span><span className="font-mono">{(totalAmount * 0.2).toLocaleString()}</span></div>
              <div className="bg-indigo-600 p-6 rounded-2xl flex justify-between items-center text-white"><span className="font-black uppercase text-xs tracking-wider opacity-70">Total Invoice Amount</span><span className="text-xl font-black font-mono">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-12 border-t pt-6">
          <button onClick={onCancel} className="px-8 py-3 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-600">Discard Draft</button>
          <button onClick={handleSubmit} className="px-10 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-black font-black shadow-xl flex justify-center items-center gap-2 uppercase tracking-widest text-xs transform active:scale-95">
            <Save size={16} /> Save & Finalize Invoice
          </button>
      </div>

      {/* Modals structures definitions */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">Add New Department</h3><button onClick={() => setIsDeptModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400"><X size={16}/></button></div>
            <form onSubmit={handleAddDepartment} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Department Name</label><input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="e.g., Sales, Operations" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700" disabled={modalLoading}>Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold" disabled={modalLoading}>Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">Add New Division</h3><button onClick={() => setIsDivModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400"><X size={16}/></button></div>
            <form onSubmit={handleAddDivision} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Division Name</label><input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} placeholder="e.g., Overseas Segment, Exports" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsDivModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700" disabled={modalLoading}>Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold" disabled={modalLoading}>Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoice;