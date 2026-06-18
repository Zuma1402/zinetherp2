import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingBag, UserPlus, Factory, Link as LinkIcon, Check, X, FolderPlus } from 'lucide-react';
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
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Dimensions
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Popups Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // ⭐ Line row structures tracking array
  const [lineItems, setLineItems] = useState([
    { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }
  ]);

  const fetchStructures = async () => {
    try {
      const { data: d } = await supabase.from('departments').select('*').order('name');
      const { data: v } = await supabase.from('divisions').select('*').order('name');
      if (d) setDepartments(d);
      if (v) setDivisions(v);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStructures();
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
      await fetchStructures();
      setIsDeptModalOpen(false);
      setNewDeptName('');
    } catch (err) {
      console.error(err);
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
      await fetchStructures();
      setIsDivModalOpen(false);
      setNewDivName('');
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const suppliers = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  const findLedger = (name: string, type: AccountType) => ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()) && l.type === type);

  const getVendorBalance = (id: string) => {
    const row = trialBalance.find(r => r.ledgerId === id);
    if (!row) return 'Bal: 0.00';
    return `O/S Payable: ${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  const handleAddSupplier = () => {
    if (!newSupplierName) return;
    const newId = crypto.randomUUID();
    onAddLedger({ id: newId, name: newSupplierName, type: AccountType.LIABILITY, group: 'Sundry Creditors', openingBalance: 0 });
    setSupplierId(newId);
    setIsAddingSupplier(false);
    setNewSupplierName('');
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newLines = [...lineItems];
    const line = { ...newLines[index] };
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      line.itemId = value;
      line.rate = item?.costPrice || 0;
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
    const stockLedger = findLedger('Stock-in-Hand', AccountType.ASSET);
    if (!supplierId || !stockLedger || totalAmount <= 0) {
      alert("Inventory Integration required ledger missing.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const finalEntries: any[] = [];

    // Supplier credit posting lines allocation
    finalEntries.push({
      ledgerId: supplierId,
      debit: 0,
      credit: totalAmount,
      departmentId: lineItems[0]?.departmentId || undefined,
      divisionId: lineItems[0]?.divisionId || undefined
    });

    lineItems.forEach(line => {
      finalEntries.push({
        ledgerId: stockLedger.id,
        debit: line.amount,
        credit: 0,
        departmentId: line.departmentId || undefined,
        divisionId: line.divisionId || undefined
      });
    });

    const voucher: Voucher = { id: voucherId, date, number: invoiceNo, type: VoucherType.PURCHASE, narration: `Purchase from Vendor #${invoiceNo}`, entries: finalEntries };
    const stockUpdates: StockTransaction[] = lineItems.map(line => ({ itemId: line.itemId, qty: Number(line.qty), rate: Number(line.rate), voucherId: voucherId }));

    onSave(voucher, stockUpdates);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-7xl mx-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-500 relative">
      <div className="flex justify-between items-center mb-12">
        <div>
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-4">
            <span className="bg-blue-600 text-white p-3.5 rounded-[1.5rem] shadow-xl shadow-blue-200"><ShoppingBag size={28} /></span>
            New Purchase Bill
            </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-8 p-8 bg-blue-50/20 rounded-[2.5rem] border border-blue-50">
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] mb-4">Supplier / Vendor Source</label>
          {isAddingSupplier ? (
             <div className="flex gap-2 animate-in slide-in-from-right-4">
                 <input autoFocus type="text" className="flex-1 p-4 border-2 border-blue-100 rounded-2xl bg-white text-gray-900 font-bold" placeholder="Legal Vendor Name" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSupplier()}/>
                 <button onClick={handleAddSupplier} className="bg-blue-600 text-white px-8 rounded-2xl font-black">Add</button>
                 <button onClick={() => setIsAddingSupplier(false)} className="bg-white text-gray-400 px-6 rounded-2xl border font-bold">X</button>
             </div>
          ) : (
            <select className="w-full p-4 border rounded-[1.5rem] bg-white text-gray-900 font-black shadow-sm" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">-- Choose Supplier from Registry --</option>
                {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-6">
            <div><label className="block text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] mb-4">Vendor Bill #</label><input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full p-4 border rounded-[1.5rem] bg-white text-blue-600 font-mono text-center font-black" /></div>
            <div><label className="block text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] mb-4">Post Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 border rounded-[1.5rem] bg-white font-bold text-gray-700" /></div>
        </div>
      </div>

      {/* ⭐ Table with granular inline dimension columns mapping right next to procurement items */}
      <div className="border rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl bg-white">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
                <thead className="bg-blue-50/30 border-b border-blue-50 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">
                    <tr>
                        <th className="p-6">Procured Item</th>
                        <th className="p-6 w-44"><div className="flex items-center gap-1">Department <FolderPlus size={14} className="text-blue-600 cursor-pointer" onClick={() => setIsDeptModalOpen(true)}/></div></th>
                        <th className="p-6 w-44"><div className="flex items-center gap-1">Division <FolderPlus size={14} className="text-blue-600 cursor-pointer" onClick={() => setIsDivModalOpen(true)}/></div></th>
                        <th className="p-6 w-24 text-center">Qty</th>
                        <th className="p-6 w-40 text-right">Cost Rate</th>
                        <th className="p-6 w-24 text-center">Tax %</th>
                        <th className="p-6 w-40 text-right">Ext. Price</th>
                        <th className="p-6 w-12"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                    {lineItems.map((line, idx) => (
                        <tr key={idx} className="group hover:bg-blue-50/20 transition-all">
                            <td className="p-4">
                                <ItemAutocomplete items={items} selectedId={line.itemId} onSelect={(id) => handleItemChange(idx, 'itemId', id)} placeholder="Search materials..." priceType="costPrice" />
                            </td>
                            <td className="p-4">
                              <select value={line.departmentId} onChange={e => handleItemChange(idx, 'departmentId', e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-bold text-gray-700 outline-none">
                                <option value="">Corporate / Central</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                            </td>
                            <td className="p-4">
                              <select value={line.divisionId} onChange={e => handleItemChange(idx, 'divisionId', e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-bold text-gray-700 outline-none">
                                <option value="">Enterprise Base</option>
                                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                            </td>
                            <td className="p-4"><input type="number" className="w-full p-3 border rounded-2xl text-center font-black bg-gray-50/50" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
                            <td className="p-4"><input type="number" className="w-full p-3 border rounded-2xl text-right font-mono font-bold bg-gray-50/50" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                            <td className="p-4"><input type="number" className="w-full p-3 border rounded-2xl text-center bg-gray-50/50" value={line.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)} /></td>
                            <td className="p-4 text-right"><span className="text-base font-black text-blue-900 font-mono">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                            <td className="p-4 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-200 hover:text-rose-500"><Trash2 size={20}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-8 bg-blue-50/20">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }])} className="bg-white border-2 border-dashed border-blue-200 text-blue-600 px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:border-blue-500 flex items-center gap-3">
                <Plus size={14}/> New Purchase Entry
            </button>
        </div>
      </div>

      <div className="flex justify-end items-center gap-10">
          <div className="w-full lg:w-[450px] bg-gray-900 p-10 rounded-[3rem] text-white flex justify-between items-center shadow-xl">
              <div><span className="font-black uppercase text-[10px] tracking-[0.3em] opacity-40 block mb-2">Total Liability</span><span className="text-xs opacity-60">Dr. Stock / Cr. Vendor</span></div>
              <span className="text-4xl font-black font-mono tracking-tighter">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
      </div>

      <div className="flex justify-end gap-6 mt-16 border-t pt-10">
          <button onClick={onCancel} className="px-10 py-4 text-gray-400 font-black text-sm uppercase tracking-widest">Abort Post</button>
          <button onClick={handleSubmit} className="px-16 py-5 bg-blue-600 text-white rounded-[2rem] hover:bg-blue-700 font-black shadow-2xl flex items-center gap-4 uppercase tracking-widest text-sm">
            <Save size={24} /> Record & Sync Inventory
          </button>
      </div>

      {/* Modals structures definitions */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">Add New Department</h3><button onClick={() => setIsDeptModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400"><X size={16}/></button></div>
            <form onSubmit={handleAddDepartment} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Department Name</label><input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="e.g., Accounts, Production" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700" disabled={modalLoading}>Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold" disabled={modalLoading}>Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">Add New Division</h3><button onClick={() => setIsDivModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400"><X size={16}/></button></div>
            <form onSubmit={handleAddDivision} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Division Name</label><input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} placeholder="e.g., Corporate Clients, Retail" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsDivModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700" disabled={modalLoading}>Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold" disabled={modalLoading}>Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoice;