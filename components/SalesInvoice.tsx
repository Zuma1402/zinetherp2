import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingCart, User, Link as LinkIcon, UserPlus, Layers, Compass } from 'lucide-react';
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

  // ⭐ Dimensional Tracking Header States
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }]);

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

    const fetchDimensions = async () => {
      try {
        const { data: depts } = await supabase.from('departments').select('*');
        const { data: divs } = await supabase.from('divisions').select('*');
        if (depts) setDepartments(depts);
        if (divs) setDivisions(divs);
      } catch (err) {
        console.error('Error fetching structural dimensions:', err);
      }
    };

    initializeInvoice();
    fetchDimensions();
  }, []);

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);
  
  const findLedger = (name: string, type: AccountType) => {
    return ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()) && l.type === type);
  };

  const getCustomerBalance = (id: string) => {
    const row = trialBalance.find(r => r.ledgerId === id);
    if (!row) return 'Bal: 0.00';
    return `O/S Balance: ${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  const handleAddCustomer = () => {
    if (!newCustomerName) return;
    const newId = crypto.randomUUID();
    onAddLedger({
        id: newId,
        name: newCustomerName,
        type: AccountType.ASSET,
        group: 'Sundry Debtors',
        openingBalance: 0
    });
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
      (line as any)[field] = Number(value);
    }
    const base = line.qty * line.rate;
    line.taxAmount = (base * line.taxRate) / 100;
    line.amount = base + line.taxAmount;
    newLines[index] = line;
    setLineItems(newLines);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalCost = lineItems.reduce((sum, line) => {
      const item = items.find(i => i.id === line.itemId);
      return sum + (line.qty * (item?.costPrice || 0));
  }, 0);

  const handleSubmit = () => {
    const salesLedger = findLedger('Sales', AccountType.INCOME);
    const cogsLedger = findLedger('Cost of Goods Sold', AccountType.EXPENSE);
    const stockLedger = findLedger('Stock-in-Hand', AccountType.ASSET);

    if (!customerId || !salesLedger || !cogsLedger || !stockLedger || totalAmount <= 0) {
      alert("Inventory Integration missing required ledgers (Sales Account, COGS, Stock-in-Hand). Please add them to your Chart of Accounts.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const itemDetails = lineItems.map(line => {
        const item = items.find(i => i.id === line.itemId);
        return `${line.qty} ${item?.name}`;
    }).join(', ');

    const voucher: Voucher = {
      id: voucherId,
      date,
      number: invoiceNo,
      type: VoucherType.SALES,
      narration: `Sales Inv #${invoiceNo}: ${itemDetails}`,
      entries: [
        { ledgerId: customerId, debit: totalAmount, credit: 0, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined },
        { ledgerId: salesLedger.id, debit: 0, credit: totalAmount, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined },
        { ledgerId: cogsLedger.id, debit: totalCost, credit: 0, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined },
        { ledgerId: stockLedger.id, debit: 0, credit: totalCost, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined }
      ]
    };

    const stockUpdates: StockTransaction[] = lineItems.map(line => ({
      itemId: line.itemId,
      qty: -Math.abs(line.qty),
      rate: line.rate,
      voucherId: voucherId
    }));

    onSave(voucher, stockUpdates);
    
    (async () => {
      try {
        const currentSettings = await getCompanySettings();
        await saveCompanySettings({ 
          ...currentSettings, 
          nextInvoiceNumber: (currentSettings.nextInvoiceNumber || 1) + 1 
        });
      } catch (error) {
        console.error('Error updating invoice number:', error);
      }
    })();
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 max-w-6xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
        <div className="text-right flex items-center md:block gap-4">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Status</div>
            <div className="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100 w-fit md:ml-auto">Drafting</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-4 p-6 md:p-8 bg-indigo-50/30 rounded-2xl md:rounded-[2rem] border border-indigo-100/50">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
              <label className="block text-xs font-black text-indigo-900/40 uppercase tracking-[0.15em]">Billed To (Customer)</label>
              {!isAddingCustomer && (
                <button onClick={() => setIsAddingCustomer(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all">
                    <UserPlus size={14} /> <span className="hidden sm:inline">Add New</span>
                </button>
              )}
          </div>
          
          {isAddingCustomer ? (
             <div className="flex flex-col sm:flex-row gap-2 animate-in zoom-in-95 duration-200">
                 <input autoFocus type="text" className="flex-1 p-3 border-2 border-indigo-200 rounded-2xl focus:ring-4 ring-indigo-50 outline-none bg-white text-gray-900 font-bold" placeholder="Legal Name..." value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomer()}/>
                 <div className="flex gap-2">
                    <button onClick={handleAddCustomer} className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 transition shadow-lg font-bold">Save</button>
                    <button onClick={() => setIsAddingCustomer(false)} className="flex-1 sm:flex-none bg-white text-gray-400 px-4 py-3 rounded-2xl hover:bg-gray-50 transition border border-gray-200 font-bold">X</button>
                 </div>
             </div>
          ) : (
            <div className="space-y-2">
                <select className="w-full p-4 border-2 border-white rounded-2xl shadow-sm focus:ring-4 ring-indigo-50 bg-white text-gray-900 font-bold appearance-none cursor-pointer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {customerId && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest px-2 animate-in slide-in-from-left-4">
                        <User size={12}/> {getCustomerBalance(customerId)}
                    </div>
                )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-black text-indigo-900/40 uppercase tracking-[0.15em] mb-4">Invoice #</label>
            <input type="text" value={invoiceNo} readOnly className="w-full p-4 bg-white/50 border border-indigo-100 rounded-2xl text-indigo-600 font-mono font-black text-center shadow-inner" />
          </div>
          <div>
            <label className="block text-xs font-black text-indigo-900/40 uppercase tracking-[0.15em] mb-4">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 border-2 border-white rounded-2xl bg-white text-gray-900 font-bold shadow-sm focus:ring-4 ring-indigo-50" />
          </div>
        </div>
      </div>

      {/* ⭐ Structural Dimension Mapping Filters Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-5 bg-slate-50 border border-gray-200/60 rounded-2xl">
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
            <Layers size={14} className="text-indigo-600"/> Allocation Cost Center (Department)
          </label>
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-sm outline-none focus:border-indigo-500">
            <option value="">Global / Unallocated (HQ)</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
            <Compass size={14} className="text-indigo-600"/> Profit Center / Segment (Division)
          </label>
          <select value={selectedDiv} onChange={e => setSelectedDiv(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-sm outline-none focus:border-indigo-500">
            <option value="">Whole Enterprise Strategy</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="border border-gray-100 rounded-2xl md:rounded-[2rem] overflow-hidden mb-8 md:mb-10 shadow-xl shadow-indigo-900/5">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
                <thead className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
                    <tr>
                        <th className="p-5 w-72 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">Product Detail</th>
                        <th className="p-5 w-24 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-center">Qty</th>
                        <th className="p-5 w-40 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-right">Unit Price</th>
                        <th className="p-5 w-24 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-center">Tax %</th>
                        <th className="p-5 w-40 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-right">Line Total</th>
                        <th className="p-5 w-12"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                    {lineItems.map((line, idx) => (
                        <tr key={idx} className="group hover:bg-indigo-50/30 transition-colors">
                            <td className="p-4">
                                <ItemAutocomplete 
                                    items={items} 
                                    selectedId={line.itemId} 
                                    onSelect={(id) => handleItemChange(idx, 'itemId', id)} 
                                    placeholder="Search product..."
                                    priceType="rate"
                                />
                            </td>
                            <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-indigo-100 focus:border-indigo-500 rounded-xl text-center font-black transition-all bg-gray-50/50" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
                            <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-indigo-100 focus:border-indigo-500 rounded-xl text-right font-mono font-bold transition-all bg-gray-50/50" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                            <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-indigo-100 focus:border-indigo-500 rounded-xl text-center transition-all bg-gray-50/50" value={line.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)} /></td>
                            <td className="p-4 text-right">
                                <span className="text-base font-black text-indigo-900 font-mono">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </td>
                            <td className="p-4 text-center">
                                <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-200 hover:text-rose-500 transition-colors">
                                    <Trash2 size={20}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-6 bg-gray-50/30 flex justify-start">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }])} className="bg-white border-2 border-dashed border-indigo-200 text-indigo-600 px-6 md:px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-700 transition-all flex items-center gap-3">
                <Plus size={18}/> Add New Row
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 md:gap-12 mt-8 md:mt-12">
          <div className="flex-1 text-gray-400 text-xs leading-relaxed max-w-md bg-gray-50 p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 w-full">
             <div className="font-black text-gray-500 uppercase mb-2 tracking-widest text-[9px]">Accounting Integration</div>
             Automatic Ledger Mapping: <strong>Dr. Customer</strong> & <strong>Cr. Sales</strong>. 
             Cost Tracking: <strong>Dr. COGS</strong> & <strong>Cr. Stock-in-Hand</strong>.
          </div>
          <div className="w-full lg:w-[400px] space-y-4">
              <div className="flex justify-between items-center px-4">
                  <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Subtotal</span>
                  <span className="font-mono font-bold text-gray-600">{(totalAmount * 0.8).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center px-4 border-b border-gray-100 pb-4">
                  <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Tax Component</span>
                  <span className="font-mono font-bold text-gray-600">{(totalAmount * 0.2).toLocaleString()}</span>
              </div>
              <div className="bg-indigo-600 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-2xl shadow-indigo-600/30 flex justify-between items-center text-white">
                  <span className="font-black uppercase text-xs tracking-[0.2em] opacity-70">Total</span>
                  <span className="text-2xl md:text-3xl font-black font-mono">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-12 md:mt-16 border-t border-gray-50 pt-8">
          <button onClick={onCancel} className="px-8 py-4 text-gray-400 font-black text-sm uppercase tracking-widest hover:text-gray-600 transition-colors order-2 sm:order-1">Discard Draft</button>
          <button onClick={handleSubmit} className="px-12 py-4 bg-gray-900 text-white rounded-2xl md:rounded-[2rem] hover:bg-black transition-all font-black shadow-2xl flex justify-center items-center gap-3 uppercase tracking-widest text-sm transform active:scale-95 order-1 sm:order-2">
            <Save size={20} /> Save & Finalize
          </button>
      </div>
    </div>
  );
};

export default SalesInvoice;