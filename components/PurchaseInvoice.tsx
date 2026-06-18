import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingBag, UserPlus, Factory, Link as LinkIcon, Check, Layers, Compass, X } from 'lucide-react';
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

  // ⭐ Structural Dimensions Hooks
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // ⭐ Quick Add Popups States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }]);

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

  const handleDeptSelectChange = (val: string) => {
    if (val === 'QUICK_ADD_DEPT') {
      setIsDeptModalOpen(true);
      setSelectedDept('');
    } else {
      setSelectedDept(val);
    }
  };

  const handleDivSelectChange = (val: string) => {
    if (val === 'QUICK_ADD_DIV') {
      setIsDivModalOpen(true);
      setSelectedDiv('');
    } else {
      setSelectedDiv(val);
    }
  };

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
      if (data && data[0]) setSelectedDept(data[0].id);
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
      if (data && data[0]) setSelectedDiv(data[0].id);
      setIsDivModalOpen(false);
      setNewDivName('');
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const suppliers = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  
  const findLedger = (name: string, type: AccountType) => {
    return ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()) && l.type === type);
  };

  const getVendorBalance = (id: string) => {
    const row = trialBalance.find(r => r.ledgerId === id);
    if (!row) return 'Bal: 0.00';
    return `O/S Payable: ${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  const handleAddSupplier = () => {
    if (!newSupplierName) return;
    const newId = crypto.randomUUID();
    onAddLedger({
        id: newId,
        name: newSupplierName,
        type: AccountType.LIABILITY,
        group: 'Sundry Creditors',
        openingBalance: 0
    });
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
        (line as any)[field] = Number(value);
    }
    const base = line.qty * line.rate;
    line.taxAmount = (base * line.taxRate) / 100;
    line.amount = base + line.taxAmount;
    newLines[index] = line;
    setLineItems(newLines);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    const stockLedger = findLedger('Stock-in-Hand', AccountType.ASSET);
    if (!supplierId || !stockLedger || totalAmount <= 0) {
      alert("Inventory Integration missing required ledger: Stock-in-Hand. Please add it to your Chart of Accounts.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const voucher: Voucher = {
      id: voucherId,
      date,
      number: invoiceNo,
      type: VoucherType.PURCHASE,
      narration: `Purchase from Vendor #${invoiceNo}`,
      entries: [
        { ledgerId: stockLedger.id, debit: totalAmount, credit: 0, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined },
        { ledgerId: supplierId, debit: 0, credit: totalAmount, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined }
      ]
    };

    const stockUpdates: StockTransaction[] = lineItems.map(line => ({
      itemId: line.itemId,
      qty: line.qty,
      rate: line.rate,
      voucherId: voucherId
    }));

    onSave(voucher, stockUpdates);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-500 relative">
      <div className="flex justify-between items-center mb-12">
        <div>
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-4">
            <span className="bg-blue-600 text-white p-3.5 rounded-[1.5rem] shadow-xl shadow-blue-200"><ShoppingBag size={28} /></span>
            New Purchase Bill
            </h2>
            <div className="mt-3 flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-fit">
                <LinkIcon size={12} /> Perpetual Inventory Integration Active
            </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <Factory size={16} className="text-blue-600" />
            <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Procurement Module</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-4 p-8 bg-blue-50/20 rounded-[2.5rem] border border-blue-50">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4 px-2">
            <label className="block text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em]">Supplier / Vendor Source</label>
            {!isAddingSupplier && (
                <button onClick={() => setIsAddingSupplier(true)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1 transition-colors">
                    <UserPlus size={14}/> Add New Vendor
                </button>
            )}
          </div>
          
          {isAddingSupplier ? (
             <div className="flex gap-2 animate-in slide-in-from-right-4">
                 <input autoFocus type="text" className="flex-1 p-4 border-2 border-blue-100 rounded-2xl focus:ring-4 ring-blue-50 outline-none bg-white text-gray-900 font-bold" placeholder="Legal Vendor/Factory Name" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSupplier()}/>
                 <button onClick={handleAddSupplier} className="bg-blue-600 text-white px-8 rounded-2xl hover:bg-blue-700 transition shadow-lg font-black uppercase tracking-widest text-xs">Add</button>
                 <button onClick={() => setIsAddingSupplier(false)} className="bg-white text-gray-400 px-6 rounded-2xl hover:bg-gray-50 transition border border-gray-100 font-bold">X</button>
             </div>
          ) : (
            <div className="relative">
                <select className="w-full p-4 border-2 border-white rounded-[1.5rem] shadow-sm focus:ring-4 ring-blue-50 bg-white text-gray-900 font-black appearance-none cursor-pointer pr-10" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                    <option value="">-- Choose Supplier from Registry --</option>
                    {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {supplierId && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest px-3">
                        <Check size={12}/> {getVendorBalance(supplierId)}
                    </div>
                )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="block text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] mb-4">Vendor Bill #</label>
                <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full p-4 border-2 border-white rounded-[1.5rem] bg-white text-blue-600 font-mono font-black text-center shadow-sm focus:ring-4 ring-blue-50 outline-none" />
            </div>
            <div>
                <label className="block text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] mb-4">Post Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 border-2 border-white rounded-[1.5rem] bg-white font-bold text-gray-700 shadow-sm focus:ring-4 ring-blue-50 outline-none" />
            </div>
        </div>
      </div>

      {/* ⭐ Dynamic Procurement Cost Segment Fields with Quick add injection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-5 bg-slate-50 border border-gray-200/60 rounded-2xl">
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
            <Layers size={14} className="text-blue-600"/> Charge Cost Center (Department)
          </label>
          <select value={selectedDept} onChange={e => handleDeptSelectChange(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-sm outline-none focus:border-blue-500 cursor-pointer">
            <option value="">Global / Unallocated Corporate</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            <option value="QUICK_ADD_DEPT" className="text-blue-600 font-bold bg-blue-50">➕ Add New Department</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
            <Compass size={14} className="text-blue-600"/> Target Segment Division (Dimension)
          </label>
          <select value={selectedDiv} onChange={e => handleDivSelectChange(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-sm outline-none focus:border-blue-500 cursor-pointer">
            <option value="">Whole Enterprise Base</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            <option value="QUICK_ADD_DIV" className="text-blue-600 font-bold bg-blue-50">➕ Add New Division</option>
          </select>
        </div>
      </div>

      {/* Line items table */}
      <div className="border border-blue-50 rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl shadow-blue-900/5 bg-white">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
                <thead className="bg-blue-50/30 border-b border-blue-50">
                    <tr>
                        <th className="p-6 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">Procured Item</th>
                        <th className="p-6 w-24 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-center">Qty</th>
                        <th className="p-6 w-40 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-right">Cost Rate</th>
                        <th className="p-6 w-24 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-center">Tax %</th>
                        <th className="p-6 w-40 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-right">Ext. Price</th>
                        <th className="p-6 w-12"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {lineItems.map((line, idx) => (
                        <tr key={idx} className="group hover:bg-blue-50/20 transition-all">
                            <td className="p-4">
                                <ItemAutocomplete 
                                    items={items} 
                                    selectedId={line.itemId} 
                                    onSelect={(id) => handleItemChange(idx, 'itemId', id)} 
                                    placeholder="Search materials..."
                                    priceType="costPrice"
                                />
                            </td>
                            <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 rounded-2xl text-center font-black transition-all bg-gray-50/50" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
                            <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 rounded-2xl text-right font-mono font-bold transition-all bg-gray-50/50" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                            <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 rounded-2xl text-center transition-all bg-gray-50/50" value={line.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)} /></td>
                            <td className="p-4 text-right">
                                <span className="text-base font-black text-blue-900 font-mono">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </td>
                            <td className="p-4 text-center">
                                <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-200 hover:text-rose-500 transition-colors">
                                    <Trash2 size={22}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-8 bg-blue-50/20">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }])} className="bg-white border-2 border-dashed border-blue-200 text-blue-600 px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:border-blue-500 hover:text-blue-700 transition-all flex items-center gap-3 shadow-sm shadow-blue-900/5">
                <Plus size={18}/> New Purchase Entry
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-end items-center gap-10">
          <div className="w-full lg:w-[450px] bg-gray-900 p-10 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] flex justify-between items-center text-white relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-600 translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-10 pointer-events-none"></div>
              <div>
                  <span className="font-black uppercase text-[10px] tracking-[0.3em] opacity-40 block mb-2">Total Liability</span>
                  <span className="text-sm font-bold opacity-60">Dr. Stock-in-Hand / Cr. Vendor</span>
              </div>
              <span className="text-4xl font-black font-mono tracking-tighter">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>