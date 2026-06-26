import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingCart, Link as LinkIcon, Printer } from 'lucide-react';
import { Ledger, Voucher, VoucherType, InventoryItem, AccountType, StockTransaction, TrialBalanceRow, Department, Division } from '../types';
import { getCompanySettings, saveCompanySettings } from '../services/settingsService';
import { supabase } from '../services/supabaseService';

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
  const [baseCurrency, setBaseCurrency] = useState<string>('PKR');
  const [currency, setCurrency] = useState<string>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(items);

  // ⚙️ Dynamic Mapped Accounts Local Configuration State Hooks
  const [mappedSalesId, setMappedSalesLedgerId] = useState('');
  const [mappedCogsId, setMappedCogsLedgerId] = useState('');
  const [mappedStockId, setMappedStockLedgerId] = useState('');
  
  // Active Tenant Context Information Mappings
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [activeCompanyId, setActiveCompanyId] = useState('');

  // 📊 Tax Selection Selection Framework States
  const [taxOptions, setTaxOptions] = useState<{name: string, rate: number}[]>([]);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState(0);
  const [activeTaxRowIdx, setActiveTaxRowIdx] = useState<number | null>(null);

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [newCustName, setNewCustName] = useState('');
  
  // New Product Modal States
  const [newProductName, setNewProductName] = useState('');
  const [newProductCost, setNewProductCost] = useState(0);
  const [newProductRate, setNewProductRate] = useState(0);

  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  const [lineItems, setLineItems] = useState([
    { itemId: '', qty: 1, rate: 0, taxType: '', taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }
  ]);

  const fetchTaxes = async () => {
    try {
      const { data, error } = await supabase.from('company_taxes').select('*').order('name');
      if (data && !error && data.length > 0) {
        setTaxOptions(data);
      } else {
        setTaxOptions([
          { name: 'GST', rate: 18 },
          { name: 'ST', rate: 15 },
          { name: 'IT', rate: 10 },
          { name: 'VAT', rate: 5 }
        ]);
      }
    } catch (e) {
      setTaxOptions([
        { name: 'GST', rate: 18 },
        { name: 'ST', rate: 15 },
        { name: 'IT', rate: 10 },
        { name: 'VAT', rate: 5 }
      ]);
    }
  };

  const fetchLookups = async () => {
    const targetId = 
      localStorage.getItem('supabase_active_company_id') || 
      localStorage.getItem('active_company_id') || 
      localStorage.getItem('company_id') || '';
      
    setActiveCompanyId(targetId);

    const { data: d } = await supabase.from('departments').select('*').order('name');
    const { data: v } = await supabase.from('divisions').select('*').order('name');
    const { data: i } = await supabase.from('inventory_items').select('*').order('name');
    if (d) setDepartments(d);
    if (v) setDivisions(v);
    if (i) setInventoryItems(i);

    if (targetId && targetId !== '') {
      try {
        const { data: activeCompanyData } = await supabase
          .from('companies')
          .select('name, email, base_currency')
          .eq('id', targetId)
          .maybeSingle();

        if (activeCompanyData) {
          setCompanyName(activeCompanyData.name);
          setCompanyEmail(activeCompanyData.email || `${activeCompanyData.name.toLowerCase().replace(/\s+/g, '')}@zinetherp.app`);
          
          if (activeCompanyData.base_currency) {
            setBaseCurrency(activeCompanyData.base_currency);
            setCurrency(activeCompanyData.base_currency); // ⭐ Explicit override link fixed!
            setExchangeRate(1);
          }
        }
      } catch (err) {
        console.error("Branding database reactive tracking read error:", err);
      }
    }
  };

  // Synchronize on initialization mount context lifecycle loops
  useEffect(() => {
    const initializeInvoice = async () => {
      try {
        const settings = await getCompanySettings();
        const prefix = settings.invoicePrefix || 'INV-';
        const nextNum = settings.nextInvoiceNumber || 1;
        setInvoiceNo(`${prefix}${nextNum.toString().padStart(4, '0')}`);
        setTaxId(settings.taxId || '');

        const targetId = 
          localStorage.getItem('supabase_active_company_id') || 
          localStorage.getItem('active_company_id') || 
          localStorage.getItem('company_id') || '';

        if (targetId) {
          const { data: mapRecord } = await supabase
            .from('company_settings')
            .select('*')
            .eq('company_id', targetId)
            .maybeSingle();

          if (mapRecord) {
            setMappedSalesLedgerId(mapRecord.default_sales_ledger || '');
            setMappedCogsLedgerId(mapRecord.default_purchase_ledger || '');
            setMappedStockLedgerId(mapRecord.default_stock_ledger || '');
          }
        }
      } catch (error) {
        console.error("Context initialization error:", error);
        setInvoiceNo('INV-0001');
      }
    };

    initializeInvoice();
    fetchLookups();
    fetchTaxes();

    // Listen to sidebar switching events dynamically
    const handleSwitch = () => fetchLookups();
    window.addEventListener('companySwitched', handleSwitch);
    return () => window.removeEventListener('companySwitched', handleSwitch);
  }, [customerId, ledgers.length, date]);

  useEffect(() => { if (items) setInventoryItems(items); }, [items]);

  const handleRowMetricChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    
    if (value === 'QUICK_ADD_ROW_PRODUCT') {
      setActiveRowIndex(index);
      setIsProductModalOpen(true);
      return;
    }
    if (value === 'QUICK_ADD_ROW_DEPT') {
      setActiveRowIndex(index);
      setIsDeptModalOpen(true);
      return;
    }
    if (value === 'QUICK_ADD_ROW_DIV') {
      setActiveRowIndex(index);
      setIsDivModalOpen(true);
      return;
    }

    if (field === 'itemId') {
      const target = inventoryItems.find(i => i.id === value);
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

  const handleQuickProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || activeRowIndex === null) return;
    
    const newId = crypto.randomUUID();
    const newRecord = {
      id: newId,
      name: newProductName.trim(),
      cost_price: newProductCost,
      rate: newProductRate,
      current_stock: 0,
      company_id: activeCompanyId || undefined
    };

    await supabase.from('inventory_items').insert([newRecord]);
    await fetchLookups();
    
    const updated = [...lineItems];
    updated[activeRowIndex].itemId = newId;
    updated[activeRowIndex].rate = newProductRate;
    
    const base = (Number(updated[activeRowIndex].qty) || 0) * newProductRate;
    updated[activeRowIndex].taxAmount = (base * (Number(updated[activeRowIndex].taxRate) || 0)) / 100;
    updated[activeRowIndex].amount = base + updated[activeRowIndex].taxAmount;
    
    setLineItems(updated);
    setIsProductModalOpen(false);
    setNewProductName('');
    setNewProductCost(0);
    setNewProductRate(0);
  };

  const handleQuickDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || activeRowIndex === null) return;
    const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('departments').insert([{ id, name: newDeptName.trim(), company_id: activeCompanyId || undefined }]);
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
    await supabase.from('divisions').insert([{ id, name: newDivName.trim(), company_id: activeCompanyId || undefined }]);
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
  const totalAmountBasePKR = foreignTotalAmount * exchangeRate;

  const handleSubmit = () => {
    const salesLedger = ledgers.find(l => l.id === mappedSalesId) || ledgers.find(l => l.name.toLowerCase().includes('sales') && l.type === AccountType.INCOME);
    const cogsLedger = ledgers.find(l => l.name.toLowerCase().includes('cost of goods') && l.type === AccountType.EXPENSE);
    const stockLedger = ledgers.find(l => l.id === mappedStockId) || ledgers.find(l => l.name.toLowerCase().includes('stock') && l.type === AccountType.ASSET);

    if (!customerId || !salesLedger || foreignTotalAmount <= 0) {
      alert("Please fill all details correctly and map your default configurations.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const finalEntries: any[] = [
      { ledgerId: customerId, debit: totalAmountBasePKR, credit: 0, departmentId: lineItems[0]?.departmentId || undefined, divisionId: lineItems[0]?.divisionId || undefined }
    ];

    lineItems.forEach(line => {
      const lineAmountBase = line.amount * exchangeRate;
      finalEntries.push({ ledgerId: salesLedger.id, debit: 0, credit: lineAmountBase, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      if (cogsLedger && stockLedger) {
        const item = inventoryItems.find(i => i.id === line.itemId);
        const cost = line.qty * (item?.costPrice || 0);
        finalEntries.push({ ledgerId: cogsLedger.id, debit: cost, credit: 0, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
        finalEntries.push({ ledgerId: stockLedger.id, debit: 0, credit: cost, departmentId: line.departmentId || undefined, divisionId: line.divisionId || undefined });
      }
    });

    onSave({
      id: voucherId, date, number: invoiceNo, type: VoucherType.SALES,
      narration: narration || `Sales Inv #${invoiceNo} (${currency} ${foreignTotalAmount.toLocaleString()} @ ${exchangeRate})`,
      entries: finalEntries, currency, exchangeRate, foreignTotal: foreignTotalAmount
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

  const activeCustomerObj = ledgers.find(l => l.id === customerId);

  return (
    <div className="max-w-7xl mx-auto">
      
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0mm !important;
          }
          body {
            padding: 15mm !important;
            background-color: #ffffff !important;
          }
        }
      `}</style>
      
      <div className="print:hidden bg-gray-50/50 p-2 md:p-6 rounded-2xl space-y-6 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200/70 shadow-xs">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
            <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs"><ShoppingCart size={18} /></span>
            Create Sales Invoice
          </h2>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button onClick={() => window.print()} className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl flex items-center gap-2 border border-slate-200 transition-all shadow-xs" >
              <Printer size={14} /> Export / Print
            </button>
            <span className="text-[10px] bg-green-50 text-green-600 px-3 py-1.5 rounded-full font-black uppercase tracking-widest border border-green-100 flex items-center gap-1"><LinkIcon size={10}/>Live Sync</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white p-5 border border-gray-200/70 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Billed To Customer</label>
              <select value={customerId} onChange={e => e.target.value === 'QUICK_ADD_CUST' ? setIsCustModalOpen(true) : setCustomerId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 shadow-xs outline-none transition-all">
                <option value="">Select Customer Registry...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="QUICK_ADD_CUST" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Customer</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Invoice Number</label>
              <input type="text" value={invoiceNo} readOnly className="w-full p-2.5 bg-slate-100/80 border border-gray-200 rounded-xl text-indigo-600 font-mono font-black text-xs text-center outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Issue Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border border-gray-200 focus:border-indigo-500 rounded-xl bg-gray-50 text-xs text-gray-800 font-bold outline-none shadow-xs transition-all" />
            </div>
          </div>

          <div className="bg-white p-5 border border-gray-200/70 rounded-2xl shadow-xs grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Currency</label>
              <select value={currency} onChange={e => { const selected = e.target.value; setCurrency(selected); if (selected === baseCurrency) setExchangeRate(1); }} className="w-full p-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 rounded-xl text-xs font-black text-gray-800 shadow-xs outline-none transition-all">
                <option value={baseCurrency}>{baseCurrency} (Base)</option>
                {baseCurrency !== 'PKR' && <option value="PKR">PKR</option>}
                {baseCurrency !== 'USD' && <option value="USD">USD ($)</option>}
                {baseCurrency !== 'AED' && <option value="AED">AED (AED)</option>}
                {baseCurrency !== 'GBP' && <option value="GBP">GBP (£)</option>}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Exchange Rate (1 {currency} = ? {baseCurrency})</label>
              <input type="number" value={exchangeRate} disabled={currency === baseCurrency} onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)} className={`w-full p-2.5 border rounded-xl font-black text-xs text-center outline-none transition-all shadow-xs ${currency === baseCurrency ? 'bg-slate-100 text-slate-400 border-gray-200' : 'bg-white border-indigo-200 text-indigo-600 ring-2 ring-indigo-50/50'}`} min="0.01" step="any" />
            </div>
          </div>
        </div>

        {/* High-Density Table Display */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden w-full">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[1350px]">
              <thead className="bg-gray-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-gray-200">
                <tr>
                  <th className="p-4 w-[22%] pl-6">Product Detail / Master Ledger</th>
                  <th className="p-4 w-[12%]">Cost Center (Dept)</th>
                  <th className="p-4 w-[12%]">Segment (Div)</th>
                  <th className="p-4 w-[6%] text-center">Qty</th>
                  <th className="p-4 w-[6%] text-center">Cur</th>
                  <th className="p-4 w-[10%] text-right">Price</th>
                  <th className="p-4 w-[12%]">Tax Type</th>
                  <th className="p-4 w-[6%] text-center">Tax %</th>
                  <th className="p-4 w-[10%] text-right">Tax Amt</th>
                  <th className="p-4 w-[11%] text-right pr-6">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                {lineItems.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-6">
                      <select value={line.itemId} onChange={e => handleRowMetricChange(idx, 'itemId', e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-800 shadow-xs focus:border-indigo-500" >
                        <option value="">-- Select Product From Master --</option>
                        {inventoryItems.map(item => ( <option key={item.id} value={item.id}>{item.name} (Stock: {item.currentStock})</option> ))}
                        <option value="QUICK_ADD_ROW_PRODUCT" className="text-indigo-600 font-black bg-indigo-50">➕ Add New Product Listing</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <select value={line.departmentId} onChange={e => handleRowMetricChange(idx, 'departmentId', e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500">
                        <option value="">Global / Unallocated</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        <option value="QUICK_ADD_ROW_DEPT" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Department</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <select value={line.divisionId} onChange={e => handleRowMetricChange(idx, 'divisionId', e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500">
                        <option value="">Whole Strategy</option>
                        {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        <option value="QUICK_ADD_ROW_DIV" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Division</option>
                      </select>
                    </td>
                    <td className="p-3"><input type="number" value={line.qty} onChange={e => handleRowMetricChange(idx, 'qty', e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-center font-black" /></td>
                    <td className="p-3 text-center"><span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-black uppercase tracking-wider">{currency}</span></td>
                    <td className="p-3"><input type="number" value={line.rate} onChange={e => handleRowMetricChange(idx, 'rate', e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-right font-mono font-bold" /></td>
                    
                    <td className="p-3">
                      <select value={line.taxType || ''} onChange={e => {
                        const val = e.target.value;
                        if (val === 'QUICK_ADD_CUSTOM_TAX') {
                          setActiveTaxRowIdx(idx);
                          setIsTaxModalOpen(true);
                          return;
                        }
                        const selectedTax = taxOptions.find(t => t.name === val);
                        const updated = [...lineItems];
                        updated[idx].taxType = val;
                        updated[idx].taxRate = selectedTax ? selectedTax.rate : 0;
                        const base = (Number(updated[idx].qty) || 0) * (Number(updated[idx].rate) || 0);
                        updated[idx].taxAmount = (base * updated[idx].taxRate) / 100;
                        updated[idx].amount = base + updated[idx].taxAmount;
                        setLineItems(updated);
                      }} className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold">
                        <option value="">-- No Tax --</option>
                        {taxOptions.map((tax, tIdx) => ( <option key={tIdx} value={tax.name}>{tax.name}</option> ))}
                        <option value="QUICK_ADD_CUSTOM_TAX" className="text-indigo-600 font-black bg-indigo-50">➕ Add Custom Tax</option>
                      </select>
                    </td>

                    <td className="p-3"><input type="number" value={line.taxRate} onChange={e => handleRowMetricChange(idx, 'taxRate', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-200 rounded-xl text-center font-mono" /></td>
                    
                    <td className="p-3">
                      <input type="text" readOnly value={line.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} className="w-full p-2 bg-slate-50 border border-gray-100 rounded-xl text-right font-mono text-gray-500 outline-none" />
                    </td>

                    <td className="p-3 text-right font-mono text-gray-900 pr-6 text-xs flex items-center justify-end gap-3 h-[52px]">
                      <span>{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-gray-300 hover:text-rose-500 transition-colors disabled:opacity-30"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/50 font-black text-xs border-t">
                  <td colSpan={8} className="p-4 text-right uppercase tracking-wider text-slate-400 text-[10px]">Grand Total ({currency}):</td>
                  <td colSpan={2} className="p-4 text-right font-mono text-sm text-gray-900 pr-6">{currency} {foreignTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                {currency !== baseCurrency && (
                  <tr className="bg-indigo-50/30 text-xs text-indigo-900 font-bold">
                    <td colSpan={8} className="p-3 text-right uppercase text-[10px] tracking-wider text-indigo-400">Equivalent Base Total:</td>
                    <td colSpan={2} className="p-3 text-right font-mono pr-6">{baseCurrency} {totalAmountBasePKR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50/50 border-t border-gray-100">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxType: '', taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 transition-all shadow-xs">
              + Add New Entry Row
            </button>
          </div>
        </div>

        {/* Narration Memo */}
        <div className="bg-white p-5 border border-gray-200/70 rounded-2xl shadow-xs">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Narration / Remarks Context</label>
          <textarea rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Internal ledger accounting comments..." className="w-full border border-gray-200 p-3 rounded-xl text-xs outline-none bg-gray-50/50 focus:bg-white focus:border-indigo-500 font-medium transition-all" />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Discard Draft</button>
          <button onClick={handleSubmit} className="px-10 py-3 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black flex items-center gap-2 shadow-md transition-all">
            <Save size={15} /> Post Invoice Ledger
          </button>
        </div>
      </div>

      {/* 📄 2. PRINT BLOCK */}
      <div className="hidden print:block printable-invoice-canvas bg-white p-2 space-y-6 text-black font-sans" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
        
        {/* Brand Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-gray-900" style={{ fontSize: '28px', fontWeight: '900' }}>
              {companyName || "ZinethERP Entity"}
            </h1>
            <p className="text-xs text-gray-600 font-bold mt-1 tracking-wider uppercase">Official Transaction Document Ledger</p>
          </div>
          <div className="text-right">
            <span className="bg-black text-white px-4 py-1 rounded text-xs font-black tracking-widest uppercase">
              Commercial Invoice
            </span>
            <h4 className="text-md font-mono font-black text-gray-950 mt-3" style={{ fontSize: '16px' }}>
              #{invoiceNo || "INV-0001"}
            </h4>
            <p className="text-[11px] text-gray-600 font-bold mt-0.5">Date: {date}</p>
          </div>
        </div>

        {/* Client Metadata Address Box */}
        <div className="grid grid-cols-2 gap-8 text-xs border-b border-gray-200 pb-6 pt-2">
          <div>
            <h5 className="font-black text-gray-400 uppercase text-[9px] tracking-widest mb-1.5">Billed To / Customer Node:</h5>
            <p className="text-gray-950 font-black text-sm" style={{ fontSize: '14px', fontWeight: '800' }}>
              {activeCustomerObj ? activeCustomerObj.name : "Walking Trade / Cash Client"}
            </p>
            {currency && <p className="text-gray-600 font-bold mt-1.5">Trading Currency: <span className="font-mono text-gray-900 font-black">{currency}</span></p>}
          </div>
          <div className="text-right">
            <h5 className="font-black text-gray-400 uppercase text-[9px] tracking-widest mb-1.5">Issued From Workspace:</h5>
            <p className="text-gray-900 font-black text-sm uppercase" style={{ fontSize: '14px', fontWeight: '900' }}>
              {companyName || "ZinethERP"}
            </p>
            <p className="text-gray-700 font-bold mt-0.5 font-sans">
              {companyEmail || "billing@zinetherp.com"}
            </p>
            {taxId && <p className="text-gray-500 font-bold mt-0.5">Tax Registration / GST: <span className="font-mono text-gray-900">{taxId}</span></p>}
          </div>
        </div>

        {/* Clean Line Items Valuation Table */}
        <div className="w-full pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-400 text-gray-700 font-black uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-3 pl-4">Product Detail / Master Ledger Description</th>
                <th className="p-3 text-center w-16">Qty</th>
                <th className="p-3 text-right w-28">Unit Rate</th>
                <th className="p-3 text-center w-24">Tax Link</th>
                <th className="p-3 text-right w-24">Tax Amt</th>
                <th className="p-3 text-right pr-4 w-32">Extended Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 text-gray-900 font-bold">
              {lineItems.length > 0 && lineItems[0].itemId !== '' ? (
                lineItems.map((item, idx) => {
                  const targetProd = inventoryItems.find(i => i.id === item.itemId);
                  return (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="p-3 pl-4 text-gray-900 font-extrabold">{targetProd ? targetProd.name : "Stock Inventory Item"}</td>
                      <td className="p-3 text-center font-mono">{item.qty}</td>
                      <td className="p-3 text-right font-mono">{item.rate?.toLocaleString()}</td>
                      <td className="p-3 text-center text-gray-500 text-[11px] font-black uppercase">{item.taxType || 'No Tax'} ({item.taxRate}%)</td>
                      <td className="p-3 text-right font-mono text-gray-600">{item.taxAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right font-mono text-gray-900 pr-4">{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 pl-4 text-gray-400 italic text-center font-medium">
                    No active materials mapped inside this snapshot transaction slip
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Metrics Summary Ledger Row */}
        <div className="flex justify-between items-end pt-6 border-t-2 border-gray-400">
          <div className="text-[10px] text-gray-500 max-w-sm font-medium leading-relaxed">
            <p className="font-black text-gray-700 uppercase tracking-wider mb-1" style={{ fontSize: '9px' }}>Terms & Regulatory Statements:</p>
            Computer-generated structural ledger document token entry. Auto-balanced and processed dynamically across partitioned corporate network modules. Standard ledger base index values.
          </div>
          
          <div className="w-72 space-y-2 text-xs text-right">
            <div className="flex justify-between text-gray-600 font-bold">
              <span>Sub Total Balance:</span>
              <span className="font-mono text-gray-900 font-black">{foreignTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {exchangeRate && exchangeRate !== 1 && (
              <div className="flex justify-between text-gray-500 font-medium text-[11px]">
                <span>Exchange Multiplier:</span>
                <span className="font-mono font-bold">x {exchangeRate}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-900 font-black text-sm pt-2 border-t-2 border-black">
              <span className="uppercase tracking-wider">Net Amount Due:</span>
              <span className="font-mono text-base text-black" style={{ fontSize: '16px', fontWeight: '900' }}>
                {currency} {foreignTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Sign Ledger Line */}
        <div className="pt-20 flex justify-between items-center text-xs">
          <div className="text-gray-400 font-mono text-[10px]">
            System Node Hash ID: {activeCompanyId?.substring(0,8)}
          </div>
          <div className="border-t-2 border-black pt-2 w-52 text-center text-[10px] font-black tracking-widest text-gray-900 uppercase">
            Authorized Controller Stamp
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Create Custom Tax Matrix</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newTaxName.trim() || activeTaxRowIdx === null) return;
              const cleanLabel = newTaxName.trim().toUpperCase();
              const newRecord = { name: cleanLabel, rate: Number(newTaxRate) || 0, company_id: activeCompanyId || undefined };
              await supabase.from('company_taxes').insert([newRecord]);
              await fetchTaxes();
              const updated = [...lineItems];
              updated[activeTaxRowIdx].taxType = cleanLabel;
              updated[activeTaxRowIdx].taxRate = Number(newTaxRate) || 0;
              const base = (Number(updated[activeTaxRowIdx].qty) || 0) * (Number(updated[activeTaxRowIdx].rate) || 0);
              updated[activeTaxRowIdx].taxAmount = (base * Number(newTaxRate)) / 100;
              updated[activeTaxRowIdx].amount = base + updated[activeTaxRowIdx].taxAmount;
              setLineItems(updated);
              setIsTaxModalOpen(false);
              setNewTaxName('');
              setNewTaxRate(0);
            }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax Code</label>
                <input autoFocus type="text" value={newTaxName} onChange={e => setNewTaxName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold" placeholder="e.g. FED, KST" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax Evaluation Rate (%)</label>
                <input type="number" value={newTaxRate} onChange={e => setNewTaxRate(parseFloat(e.target.value) || 0)} className="w-full border p-2.5 rounded-xl text-xs font-mono font-bold" min="0" max="100" step="any" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsTaxModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Add Tax Matrix</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Quick Add Product Listing</h3>
            <form onSubmit={handleQuickProductSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Product Title</label>
                <input autoFocus type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold" placeholder="e.g. MacBook Pro M4" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cost Price ({currency})</label>
                  <input type="number" value={newProductCost} onChange={e => setNewProductCost(parseFloat(e.target.value) || 0)} className="w-full border p-2.5 rounded-xl text-xs font-mono" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sales Rate ({currency})</label>
                  <input type="number" value={newProductRate} onChange={e => setNewProductRate(parseFloat(e.target.value) || 0)} className="w-full border p-2.5 rounded-xl text-xs font-mono" required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCustModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
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