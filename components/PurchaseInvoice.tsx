import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ShoppingBag, Printer, Loader2, Globe, X } from 'lucide-react';
import { Ledger, Voucher, VoucherType, InventoryItem, AccountType, StockTransaction, Department, Division } from '../types';
import { supabase } from '../services/supabaseService';
import { getCompanySettings } from '../services/settingsService';

interface PurchaseInvoiceProps {
  ledgers: Ledger[];
  items: InventoryItem[];
  onSave: (voucher: Voucher, stockUpdates: StockTransaction[]) => void;
  onCancel: () => void;
}

const PurchaseInvoice: React.FC<PurchaseInvoiceProps> = ({ ledgers, items, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`PUR-${Math.floor(Math.random() * 10000)}`);
  const [supplierId, setSupplierId] = useState('');
  const [narration, setNarration] = useState('');

  // 🧾 Multi-Currency State Core Variables
  const [baseCurrency, setBaseCurrency] = useState<string>('PKR');
  const [currency, setCurrency] = useState<string>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isRateFetching, setIsRateFetching] = useState<boolean>(false);

  // ⭐ NEW ACTIVE LISTENER MULTI-CURRENCY POOL STATES
  const [customCurrencies, setCustomCurrencies] = useState<{code: string, symbol: string, rate: number}[]>([]);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState(1);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(items);
  
  // 📊 Tax Configuration Matrices
  const [taxOptions, setTaxOptions] = useState<{name: string, rate: number}[]>([]);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState(0);
  const [activeTaxRowIdx, setActiveTaxRowIdx] = useState<number | null>(null);

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isVendModalOpen, setIsVendModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [newVendName, setNewVendName] = useState('');

  // Product Add Options States
  const [newProductName, setNewProductName] = useState('');
  const [newProductCost, setNewProductCost] = useState(0);
  const [newProductRate, setNewProductRate] = useState(0);

  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState('');

  const [lineItems, setLineItems] = useState([
    { itemId: '', qty: 1, rate: 0, taxType: '', taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }
  ]);

  // ⭐ Automated dynamic forex calculation fetch hook
  const syncLiveExchangeRate = async (targetCurrency: string, base: string) => {
    if (!targetCurrency || !base || targetCurrency === base) {
      setExchangeRate(1);
      return;
    }
    
    // Check if it exists in local custom injected states array pool first
    const customMatch = customCurrencies.find(c => c.code === targetCurrency);
    if (customMatch) {
      setExchangeRate(customMatch.rate);
      return;
    }

    setIsRateFetching(true);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${targetCurrency}`);
      const data = await res.json();
      if (data && data.rates && data.rates[base]) {
        setExchangeRate(parseFloat(data.rates[base].toFixed(4)));
      }
    } catch (err) {
      console.error("Forex background fetch failed: ", err);
    } finally {
      setIsRateFetching(false);
    }
  };

  const fetchCurrenciesFromCluster = async (targetId: string) => {
    if (!targetId) return;
    try {
      const { data } = await supabase.from('company_currencies').select('code, symbol, exchange_rate').eq('company_id', targetId);
      if (data) setCustomCurrencies(data.map(d => ({ code: d.code, symbol: d.symbol, rate: Number(d.exchange_rate) })));
    } catch (e) { console.error(e); }
  };

  const fetchTaxes = async () => {
    try {
      const { data, error } = await supabase.from('company_taxes').select('*').order('name');
      if (data && !error && data.length > 0) {
        setTaxOptions(data);
      } else {
        setTaxOptions([
          { name: 'GST', rate: 18 }, { name: 'ST', rate: 15 }, { name: 'IT', rate: 10 }, { name: 'VAT', rate: 5 }
        ]);
      }
    } catch (e) {
      setTaxOptions([
        { name: 'GST', rate: 18 }, { name: 'ST', rate: 15 }, { name: 'IT', rate: 10 }, { name: 'VAT', rate: 5 }
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

    if (targetId) {
      fetchCurrenciesFromCluster(targetId);
      const { data: companyData } = await supabase
        .from('companies')
        .select('base_currency')
        .eq('id', targetId)
        .maybeSingle();

      if (companyData && companyData.base_currency) {
        setBaseCurrency(companyData.base_currency);
        setCurrency(companyData.base_currency); 
        setExchangeRate(1);
      }
    }
  };

  useEffect(() => { 
    fetchLookups(); 
    fetchTaxes();
  }, [supplierId]);

  // ⭐ Watcher engine to fetch live metrics without breaking user loops
  useEffect(() => {
    syncLiveExchangeRate(currency, baseCurrency);
  }, [currency, baseCurrency, customCurrencies.length]);

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
      const item = inventoryItems.find(i => i.id === value);
      updated[index].itemId = value;
      updated[index].rate = item?.costPrice || 0;
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
      current_stock: 0
    };

    await supabase.from('inventory_items').insert([newRecord]);
    await fetchLookups();
    
    const updated = [...lineItems];
    updated[activeRowIndex].itemId = newId;
    updated[activeRowIndex].rate = newProductCost;
    
    const base = (Number(updated[activeRowIndex].qty) || 0) * newProductCost;
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

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendName.trim()) return;
    setSupplierId(crypto.randomUUID());
    setIsVendModalOpen(false);
  };

  const handleQuickCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurrencyCode.trim() || !activeCompanyId) return;

    const formattedCode = newCurrencyCode.trim().toUpperCase();
    const cleanSymbol = newCurrencySymbol.trim() || formattedCode;

    setCustomCurrencies(prev => [...prev, { code: formattedCode, symbol: cleanSymbol, rate: newCurrencyRate }]);
    setCurrency(formattedCode);
    setExchangeRate(newCurrencyRate);

    await supabase.from('company_currencies').upsert({
      company_id: activeCompanyId,
      code: formattedCode,
      symbol: cleanSymbol,
      exchange_rate: newCurrencyRate
    }, { onConflict: 'company_id,code' });

    setIsCurrencyModalOpen(false);
    setNewCurrencyCode('');
    setNewCurrencySymbol('');
    setNewCurrencyRate(1);
    await fetchLookups();
  };

  const suppliers = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  const foreignTotalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalAmountBasePKR = foreignTotalAmount * exchangeRate;

  const handleSubmit = () => {
    const stockLedger = ledgers.find(l => l.name.toLowerCase().includes('stock') && l.type === AccountType.ASSET);
    if (!supplierId || !stockLedger || foreignTotalAmount <= 0) {
      alert("Please fill all details completely.");
      return;
    }
    onSave({
      id: crypto.randomUUID(), date, number: invoiceNo, type: VoucherType.PURCHASE, narration,
      entries: [{ ledgerId: supplierId, debit: 0, credit: totalAmountBasePKR, currency, exchangeRate, foreignTotal: foreignTotalAmount } as any]
    }, lineItems.map(line => ({ itemId: line.itemId, qty: line.qty, rate: line.rate * exchangeRate, voucherId: '' })));
  };

  return (
    <div className="bg-gray-50/50 p-2 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in dynamic-layouts relative">
      <style>{`
        @media print {
          body * { visibility: hidden; background: white !important; }
          .dynamic-layouts, .dynamic-layouts * { visibility: visible; }
          .dynamic-layouts { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .no-print-el { display: none !important; }
        }
      `}</style>

      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200/70 shadow-xs">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
          <span className="bg-blue-600 text-white p-2 rounded-xl shadow-xs"><ShoppingBag size={18} /></span>
          New Purchase Bill
        </h2>
        <div className="flex flex-wrap items-center gap-2.5 no-print-el w-full sm:w-auto justify-end">
          <button onClick={() => window.print()} className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center gap-2 border border-slate-200 transition-all shadow-xs" >
            <Printer size={14} /> Export / Print
          </button>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-black uppercase tracking-widest border border-blue-100">Procurement</span>
        </div>
      </div>

      {/* Split Meta Layout Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white p-5 border border-gray-200/70 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1.5">Supplier / Vendor Source</label>
            <select value={supplierId} onChange={e => e.target.value === 'QUICK_ADD_VEND' ? setIsVendModalOpen(true) : setSupplierId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-blue-100 rounded-xl text-xs font-black text-gray-900 shadow-xs outline-none">
              <option value="">Select Supplier Registry...</option>
              {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="QUICK_ADD_VEND" className="text-blue-600 font-bold bg-blue-50 no-print-el">➕ Add New Vendor</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1.5">Vendor Bill #</label>
            <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full p-2.5 border border-blue-100 rounded-xl bg-white text-blue-600 font-mono font-black text-xs text-center shadow-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1.5">Post Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border border-blue-100 rounded-xl bg-white font-bold text-xs shadow-xs" />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200/70 rounded-2xl shadow-xs grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Billing Currency</label>
            <select value={currency} onChange={e => { if (e.target.value === 'QUICK_ADD_CURRENCY') { setIsCurrencyModalOpen(true); } else { setCurrency(e.target.value); if (e.target.value === baseCurrency) setExchangeRate(1); } }} className="w-full p-2.5 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl text-xs font-black text-gray-800 shadow-xs outline-none transition-all">
              <option value={baseCurrency}>{baseCurrency} (Base)</option>
              {baseCurrency !== 'PKR' && <option value="PKR">PKR</option>}
              {baseCurrency !== 'USD' && <option value="USD">USD ($)</option>}
              {baseCurrency !== 'AED' && <option value="AED">AED (AED)</option>}
              {baseCurrency !== 'GBP' && <option value="GBP">GBP (£)</option>}
              {customCurrencies.filter(c => c.code !== 'PKR' && c.code !== 'USD' && c.code !== 'AED' && c.code !== 'GBP' && c.code !== baseCurrency).map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
              <option disabled>────────────────────</option>
              <option value="QUICK_ADD_CURRENCY" className="text-blue-600 font-extrabold bg-blue-50">+ Add Custom Currency</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              Exchange Rate (1 {currency} = ? {baseCurrency})
              {isRateFetching && <Loader2 size={10} className="animate-spin text-blue-600" />}
            </label>
            <input type="number" value={exchangeRate} disabled={currency === baseCurrency || isRateFetching} onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)} className={`w-full p-2.5 border rounded-xl font-black text-xs text-center outline-none transition-all shadow-xs ${currency === baseCurrency ? 'bg-slate-100 text-slate-400 border-gray-200' : 'bg-white border-blue-200 text-blue-600 ring-2 ring-blue-50/50'}`} min="0.01" step="any" />
          </div>
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden w-full">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full text-left border-collapse table-fixed min-w-[1350px]">
            <thead className="bg-blue-50/30 border-b text-gray-400 font-black text-[10px] uppercase tracking-widest">
              <tr>
                <th className="p-5 pl-6 w-[22%]">Procured Item / Notes</th>
                <th className="p-5 w-36">Cost Center (Dept)</th>
                <th className="p-5 w-36">Segment (Div)</th>
                <th className="p-5 w-16 text-center">Qty</th>
                <th className="p-5 w-16 text-center">Cur</th>
                <th className="p-5 w-[10%] text-right">Cost Rate</th>
                <th className="p-5 w-40">Tax Type</th>
                <th className="p-5 w-16 text-center">Tax %</th>
                <th className="p-5 w-[10%] text-right">Tax Amt</th>
                <th className="p-5 w-28 text-right pr-6">Ext. Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
              {lineItems.map((line, idx) => (
                <tr key={idx} className="hover:bg-blue-50/10 transition-colors">
                  <td className="p-4 pl-6">
                    <select value={line.itemId} onChange={e => handleRowMetricChange(idx, 'itemId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-800 shadow-xs focus:border-blue-500 transition-all" >
                      <option value="">-- Select Material / Asset From Master --</option>
                      {inventoryItems.map(item => ( <option key={item.id} value={item.id}>{item.name} (Stock: {item.currentStock})</option> ))}
                      <option value="QUICK_ADD_ROW_PRODUCT" className="text-blue-600 font-black bg-blue-50 no-print-el">➕ Add New Product Listing</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <select value={line.departmentId} onChange={e => handleRowMetricChange(idx, 'departmentId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none">
                      <option value="">Global / Unallocated</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="QUICK_ADD_ROW_DEPT" className="text-blue-600 font-bold bg-blue-50 no-print-el">➕ Add New Department</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <select value={line.divisionId} onChange={e => handleRowMetricChange(idx, 'divisionId', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none">
                      <option value="">Whole Strategy</option>
                      {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="QUICK_ADD_ROW_DIV" className="text-indigo-600 font-bold bg-indigo-50 no-print-el">➕ Add New Division</option>
                    </select>
                  </td>
                  <td className="p-4"><input type="number" value={line.qty} onChange={e => handleRowMetricChange(idx, 'qty', e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-center font-black" /></td>
                  <td className="p-4 text-center"><span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-black uppercase tracking-wider">{currency}</span></td>
                  <td className="p-4"><input type="number" value={line.rate} onChange={e => handleRowMetricChange(idx, 'rate', e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-right font-mono" /></td>
                  
                  <td className="p-4">
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
                    }} className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500">
                      <option value="">-- No Tax --</option>
                      {taxOptions.map((tax, tIdx) => ( <option key={tIdx} value={tax.name}>{tax.name}</option> ))}
                      <option value="QUICK_ADD_CUSTOM_TAX" className="text-blue-600 font-black bg-blue-50">➕ Add Custom Tax</option>
                    </select>
                  </td>

                  <td className="p-4"><input type="number" value={line.taxRate} onChange={e => handleRowMetricChange(idx, 'taxRate', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-200 rounded-xl text-center font-mono" /></td>

                  <td className="p-4">
                    <input type="text" readOnly value={line.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} className="w-full p-2 bg-slate-50 border border-gray-100 rounded-xl text-right font-mono text-gray-500 outline-none" />
                  </td>

                  <td className="p-4 text-right pr-6 font-mono text-sm text-blue-900 flex items-center justify-end gap-3 h-[60px]">
                    <span>{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-gray-300 hover:text-rose-500 no-print-el"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50/10 font-black text-sm text-gray-900 border-t">
                <td colSpan={8} className="p-5 text-right uppercase tracking-wider text-slate-400 text-[10px]">Total Bill Value ({currency}):</td>
                <td colSpan={2} className="p-5 text-right font-mono text-base pr-6">{currency} {foreignTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              {currency !== baseCurrency && (
                <tr className="bg-blue-50/40 text-xs text-blue-900 font-bold">
                  <td colSpan={8} className="p-3 text-right uppercase text-[10px] tracking-wider text-blue-400">Equivalent Base Value:</td>
                  <td colSpan={2} className="p-3 text-right font-mono pr-6">{baseCurrency} {totalAmountBasePKR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-blue-50/20 border-t no-print-el">
          <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxType: '', taxRate: 0, taxAmount: 0, amount: 0, departmentId: '', divisionId: '' }])} className="text-xs font-bold text-blue-600 border border-dashed border-blue-200 px-5 py-2 rounded-xl bg-white hover:bg-blue-50 transition-all shadow-sm">
            + NEW PURCHASE ENTRY
          </button>
        </div>
      </div>

      {/* Narration Memo */}
      <div className="bg-white p-5 border border-gray-200 rounded-2xl mb-6 shadow-xs">
        <label className="block text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-2">Narration / Vendor Memo Notes</label>
        <textarea rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Purchase notes..." className="w-full border p-3 rounded-xl text-xs outline-none bg-white font-medium" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t no-print-el">
        <button onClick={onCancel} className="px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-700">Abort Post</button>
        <button onClick={handleSubmit} className="px-12 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-md">
          <Save size={16} /> Record Purchase Bill
        </button>
      </div>

      {/* CUSTOM TAX MODAL */}
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
                <input autoFocus type="text" value={newTaxName} onChange={e => setNewTaxName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold" placeholder="e.g. FED, KST" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax Evaluation Rate (%)</label>
                <input type="number" value={newTaxRate} onChange={e => setNewTaxRate(parseFloat(e.target.value) || 0)} className="w-full border p-2.5 rounded-xl text-xs font-mono font-bold" min="0" max="100" step="any" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsTaxModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Add Tax Matrix</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print-el">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Quick Add Product Listing</h3>
            <form onSubmit={handleQuickProductSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Product Title</label>
                <input autoFocus type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold" placeholder="e.g. Raw Material Pack" required />
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
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CURRENCY MODAL */}
      {isCurrencyModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print-el">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
              <span>💸</span> Add Custom Currency Node
            </h3>
            <form onSubmit={handleQuickCurrencySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Currency Code (ISO)</label>
                <input autoFocus type="text" maxLength={3} value={newCurrencyCode} onChange={e => setNewCurrencyCode(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs font-black outline-none focus:border-blue-500 uppercase tracking-widest" placeholder="e.g. EUR, SAR" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Symbol</label>
                <input type="text" value={newCurrencySymbol} onChange={e => setNewCurrencySymbol(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-bold" placeholder="e.g. €, ر.س" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Exchange Rate (Relative to {baseCurrency})</label>
                <input type="number" step="any" value={newCurrencyRate} onChange={e => setNewCurrencyRate(parseFloat(e.target.value) || 1)} className="w-full border p-2.5 rounded-xl text-xs font-mono font-bold text-blue-600" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCurrencyModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Add Currency</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isVendModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print-el">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Vendor</h3>
            <form onSubmit={handleAddVendorSubmit} className="space-y-4"><input autoFocus type="text" value={newVendName} onChange={e => setNewVendName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none" placeholder="Vendor name" required /><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsVendModalOpen(false)} className="px-4 py-2 text-xs">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs">Save</button></div></form>
          </div>
        </div>
      )}

      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print-el"><div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl"><h3 className="text-xs font-bold mb-2">Add Department</h3><form onSubmit={handleQuickDeptSubmit} className="space-y-2"><input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded text-xs" required /><button type="submit" className="w-full bg-blue-600 text-white p-2 rounded text-xs">Save</button></form></div></div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print-el"><div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl"><h3 className="text-xs font-bold mb-2">Add Division</h3><form onSubmit={handleQuickDivSubmit} className="space-y-2"><input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded text-xs" required /><button type="submit" className="w-full bg-blue-600 text-white p-2 rounded text-xs">Save</button></form></div></div>
      )}
    </div>
  );
};

export default PurchaseInvoice;