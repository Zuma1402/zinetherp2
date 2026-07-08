import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, Department, Division } from '../types';
import { Save, Plus, Trash2, Loader2, ClipboardPaste, Download, X } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import { ForensicTimeline } from './ForensicTimeline'; // ⭐ REGISTERED NEW AUDIT TRAIL TIMELINE ELEMENT PANEL

interface GeneralVoucherEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

interface RowEntry {
  ledgerId: string;
  debit: number;
  credit: number;
  departmentId: string;
  divisionId: string;
}

const GeneralVoucherEntry: React.FC<GeneralVoucherEntryProps> = ({ ledgers, onSave, onCancel }) => {
  const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.JOURNAL);
  const [voucherNo, setVoucherNo] = useState('VCH-AUTO');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');

  const [baseCurrency, setBaseCurrency] = useState<string>('PKR');
  const [currency, setCurrency] = useState<string>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isRateFetching, setIsRateFetching] = useState<boolean>(false);

  // ⭐ NEW ACTIVE LISTENER MULTI-CURRENCY POOL STATES
  const [customCurrencies, setCustomCurrencies] = useState<{code: string; symbol: string; rate: number}[]>([]);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState(1);
  
  const [clipboardData, setClipboardData] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  const [entries, setEntries] = useState<RowEntry[]>([
    { ledgerId: '', debit: 0, credit: 0, departmentId: '', divisionId: '' },
    { ledgerId: '', debit: 0, credit: 0, departmentId: '', divisionId: '' }
  ]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState('');

  // Local state refresh controller link for forensic updates
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const syncLiveExchangeRate = async (targetCurrency: string, base: string) => {
    if (targetCurrency === base) {
      setExchangeRate(1);
      return;
    }

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
      console.error(err);
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

  const syncVoucherBaseCurrency = async () => {
    const activeCompanyId = localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
    setActiveCompanyId(activeCompanyId);
    if (activeCompanyId) {
      try {
        fetchCurrenciesFromCluster(activeCompanyId);
        const { data } = await supabase.from('companies').select('base_currency').eq('id', activeCompanyId).maybeSingle();
        if (data && data.base_currency) {
          setBaseCurrency(data.base_currency);
          setCurrency(data.base_currency);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => { 
    const initData = async () => {
      const { data: d } = await supabase.from('departments').select('*').order('name');
      const { data: v } = await supabase.from('divisions').select('*').order('name');
      if (d) setDepartments(d);
      if (v) setDivisions(v);
      await syncVoucherBaseCurrency();
    };
    initData();
  }, []);

  useEffect(() => {
    syncLiveExchangeRate(currency, baseCurrency);
  }, [currency, baseCurrency]);

  const handleExcelPasteLogic = () => {
    if (!clipboardData.trim()) return;

    const rows = clipboardData.split('\n');
    const parsedEntries: RowEntry[] = [];

    rows.forEach(row => {
      if (!row.trim()) return;
      const cells = row.split('\t');
      
      const accountNameInput = cells[0]?.trim() || '';
      const debitValue = parseFloat(cells[1]?.replace(/,/g, '')) || 0;
      const creditValue = parseFloat(cells[2]?.replace(/,/g, '')) || 0;

      const matchedLedger = ledgers.find(l => 
        l.name.toLowerCase() === accountNameInput.toLowerCase() ||
        l.name.toLowerCase().includes(accountNameInput.toLowerCase())
      );

      parsedEntries.push({
        ledgerId: matchedLedger ? matchedLedger.id : '',
        debit: debitValue,
        credit: creditValue,
        departmentId: '',
        divisionId: ''
      });
    });

    if (parsedEntries.length > 0) {
      setEntries(parsedEntries);
      setShowPasteBox(false);
      setClipboardData('');
    }
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
    await syncVoucherBaseCurrency();
  };

  const exportVoucherTemplateToExcel = () => {
    let excelContent = `Account Name\tDebit (${currency})\tCredit (${currency})\tCost Center\tSegment\n`;
    
    entries.forEach((e) => {
      const accountName = ledgers.find(l => l.id === e.ledgerId)?.name || 'Select Account';
      const deptName = departments.find(d => d.id === e.departmentId)?.name || '';
      const divName = divisions.find(d => d.id === e.divisionId)?.name || '';
      excelContent += `${accountName}\t${e.debit}\t${e.credit}\t${deptName}\t${divName}\n`;
    });

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Voucher_${voucherNo}_Template.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateRow = (index: number, key: keyof RowEntry, value: any) => {
    const next = [...entries];
    if (key === 'departmentId' && value === 'QUICK_ADD_ROW_DEPT') { setActiveRowIndex(index); setIsDeptModalOpen(true); return; }
    if (key === 'divisionId' && value === 'QUICK_ADD_ROW_DIV') { setActiveRowIndex(index); setIsDivModalOpen(true); return; }
    
    if (key === 'debit' || key === 'credit') {
      next[index][key] = value === '' ? 0 : Number(value);
    } else {
      next[index][key] = value;
    }
    setEntries(next);
  };

  const addLineItem = () => {
    setEntries([...entries, { ledgerId: '', debit: 0, credit: 0, departmentId: '', divisionId: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleQuickDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || activeRowIndex === null) return;
    const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('departments').insert([{ id, name: newDeptName.trim() }]);
    const { data: d } = await supabase.from('departments').select('*').order('name');
    if (d) setDepartments(d);
    const next = [...entries]; next[activeRowIndex].departmentId = id; setEntries(next);
    setIsDeptModalOpen(false); setNewDeptName('');
  };

  const handleQuickDivSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim() || activeRowIndex === null) return;
    const id = newDivName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('divisions').insert([{ id, name: newDivName.trim() }]);
    const { data: v } = await supabase.from('divisions').select('*').order('name');
    if (v) setDivisions(v);
    const next = [...entries]; next[activeRowIndex].divisionId = id; setEntries(next);
    setIsDivModalOpen(false); setNewDivName('');
  };

  const totalDebitForeign = entries.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalCreditForeign = entries.reduce((acc, curr) => acc + (curr.credit || 0), 0);
  const difference = Math.abs(totalDebitForeign - totalCreditForeign);
  const isBalanced = totalDebitForeign === totalCreditForeign && totalDebitForeign > 0;

  const handleSubmit = () => {
    if (!isBalanced) { alert("Voucher is unbalanced."); return; }
    const generatedVchId = crypto.randomUUID();
    onSave({
      id: generatedVchId, date,
      number: voucherNo === 'VCH-AUTO' ? `VCH-${Math.floor(Math.random() * 100000)}` : voucherNo,
      type: voucherType, narration: narration || `Journal Post (${currency})`,
      entries: entries.map(e => ({
        ledgerId: e.ledgerId, debit: e.debit * exchangeRate, credit: e.credit * exchangeRate,
        departmentId: e.departmentId || undefined, divisionId: e.divisionId || undefined
      })),
      currency, exchangeRate, foreignTotal: totalDebitForeign
    } as any);
    
    // Auto-update timeline stream values smoothly
    setAuditRefreshKey(prev => prev + 1);
  };

  // Safe validation fallback parameter mapping key
  const activeVoucherLogId = voucherNo !== 'VCH-AUTO' ? voucherNo : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto p-2">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
        {/* Fixed Header Control Block layout structure */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">New Voucher</h2>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>
          
          {/* Always visible custom functional button sets */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
            <button onClick={() => setShowPasteBox(!showPasteBox)} className="flex items-center gap-2 px-3 py-2 border rounded-xl font-bold text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 transition-all shadow-xs">
              <ClipboardPaste size={14} /> Paste from Excel
            </button>
            <button onClick={exportVoucherTemplateToExcel} className="flex items-center gap-2 px-3 py-2 border rounded-xl font-bold text-xs bg-slate-50 text-slate-700 border-gray-200 hover:bg-slate-100 transition-all">
              <Download size={14} /> Download Grid Template
            </button>
            <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={!isBalanced} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${isBalanced ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}><Save size={16} /> Save Voucher</button>
          </div>
        </div>

        {showPasteBox && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 mb-6 animate-in slide-in-from-top duration-300">
            <h4 className="text-xs font-black text-orange-900 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              🚀 Direct Excel Data Clipboard Engine
            </h4>
            <p className="text-[11px] text-orange-700 font-bold mb-3">
              Excel sheet se columns copy karein: **[Account Title | Debit | Credit]** aur neeche paste kar dein:
            </p>
            <textarea value={clipboardData} onChange={e => setClipboardData(e.target.value)} placeholder="Excel rows ko yahan Direct Paste (Ctrl + V) maren..." rows={4} className="w-full border border-orange-200 rounded-xl p-3 text-xs font-mono outline-none bg-white focus:ring-2 ring-orange-200 text-gray-800" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowPasteBox(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500">Cancel</button>
              <button onClick={handleExcelPasteLogic} disabled={!clipboardData.trim()} className="px-4 py-1.5 bg-orange-600 text-white font-black text-xs rounded-xl shadow-xs">Inject Excel Rows</button>
            </div>
          </div>
        )}

        {/* CONTROLS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs font-bold text-gray-700">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Voucher Type</label>
            <select value={voucherType} onChange={e => setVoucherType(e.target.value as VoucherType)} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-900 font-bold outline-none" >
              <option value="JOURNAL">JOURNAL</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="RECEIPT">RECEIPT</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Voucher #</label>
            <input type="text" value={voucherNo} disabled className="w-full p-3 border border-gray-100 rounded-xl bg-gray-50/50 text-gray-500 font-mono font-bold outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-xs text-gray-800 font-bold outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Currency</label>
            <select value={currency} onChange={e => { if (e.target.value === 'QUICK_ADD_CURRENCY') { setIsCurrencyModalOpen(true); } else { setCurrency(e.target.value); if (e.target.value === baseCurrency) setExchangeRate(1); } }} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-900 font-bold outline-none" >
              <option value={baseCurrency}>{baseCurrency} (Base)</option>
              {baseCurrency !== 'PKR' && <option value="PKR">PKR</option>}
              {baseCurrency !== 'USD' && <option value="USD">USD ($)</option>}
              {baseCurrency !== 'AED' && <option value="AED">AED (Dirham)</option>}
              {customCurrencies.filter(c => c.code !== 'PKR' && c.code !== 'USD' && c.code !== 'AED' && c.code !== baseCurrency).map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
              <option disabled>────────────────────</option>
              <option value="QUICK_ADD_CURRENCY" className="text-indigo-600 font-black bg-indigo-50">+ Add Custom Currency</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              Rate (1 {currency} = ? {baseCurrency})
              {isRateFetching && <Loader2 size={10} className="animate-spin text-indigo-600" />}
            </label>
            <input type="number" value={exchangeRate} disabled={currency===baseCurrency || isRateFetching} onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-indigo-600 font-black text-center text-xs outline-none disabled:bg-gray-50" min="0.01" step="any" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Voucher Narration</label>
          <input type="text" placeholder="e.g. Adjustment entry notes..." value={narration} onChange={e => setNarration(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/70 text-gray-400 border-b font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4 min-w-[240px]">Ledger Account</th>
                <th className="p-4 w-44">Cost Center (Dept)</th>
                <th className="p-4 w-44">Segment (Div)</th>
                <th className="p-4 w-36 text-right">Debit ({currency})</th>
                <th className="p-4 w-36 text-right">Credit ({currency})</th>
                <th className="p-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 text-center text-gray-400 font-mono text-xs">{idx + 1}</td>
                  <td className="p-3">
                    <select value={item.ledgerId} onChange={e => updateRow(idx, 'ledgerId', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold outline-none" >
                      <option value="">Select Ledger...</option>
                      {ledgers.map(l => ( <option key={l.id} value={l.id}>{l.name} ({l.group})</option> ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select value={item.departmentId} onChange={e => updateRow(idx, 'departmentId', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs outline-none" >
                      <option value="">Choose Dept...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="QUICK_ADD_ROW_DEPT" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Dept</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select value={item.divisionId} onChange={e => updateRow(idx, 'divisionId', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-xs outline-none" >
                      <option value="">Choose Div...</option>
                      {divisions.map(div => <option key={div.id} value={div.id}>{div.name}</option>)}
                      <option value="QUICK_ADD_ROW_DIV" className="text-indigo-600 font-bold bg-indigo-50">➕ Add New Div</option>
                    </select>
                  </td>
                  <td className="p-3"><input type="number" placeholder="0.00" value={item.debit || ''} onChange={e => updateRow(idx, 'debit', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl text-right font-mono font-bold text-xs outline-none" /></td>
                  <td className="p-3"><input type="number" placeholder="0.00" value={item.credit || ''} onChange={e => updateRow(idx, 'credit', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl text-right font-mono font-bold text-xs outline-none" /></td>
                  <td className="p-3 text-center">
                    <button onClick={() => removeLineItem(idx)} disabled={entries.length <= 2} className={`p-2 rounded-lg transition-colors ${entries.length <= 2 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-rose-50 hover:text-rose-500'}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-50/50 font-mono font-black text-xs text-slate-700">
                <td colSpan={4} className="p-5 text-right font-sans uppercase tracking-widest text-gray-400 text-[10px]">Total</td>
                <td className="p-5 text-right text-indigo-700 text-sm border-t">{totalDebitForeign.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-5 text-right text-indigo-700 text-sm border-t">{totalCreditForeign.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
              {currency !== baseCurrency && (
                <tr className="bg-indigo-50/30 text-indigo-900 font-bold text-xs font-mono">
                  <td colSpan={4} className="p-3 text-right font-sans text-[10px] text-indigo-400 uppercase tracking-wider">Base Matrix Equivalent ({baseCurrency}):</td>
                  <td className="p-3 text-right border-t text-indigo-600">{(totalDebitForeign * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right border-t text-indigo-600">{(totalCreditForeign * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-5 bg-gray-50/40 border-t flex justify-between items-center text-xs">
          <button onClick={addLineItem} className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-indigo-300 text-indigo-600 bg-indigo-50/30 rounded-xl font-bold hover:bg-indigo-50 shadow-sm" ><Plus size={14} /> Add Line Item</button>
          {difference > 0 && ( <span className="font-mono font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">Difference: {difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> )}
        </div>
      </div>

      {/* ⭐ LIVE AUDIT SENTINEL TIMELINE INJECTION HOOK SPLIT */}
      {activeVoucherLogId && (
        <div className="mt-6">
          <ForensicTimeline recordId={activeVoucherLogId} refreshTrigger={auditRefreshKey} />
        </div>
      )}

      {/* QUICK ADD CURRENCY MODAL */}
      {isCurrencyModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
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
                <input type="number" step="any" value={newCurrencyRate} onChange={e => setNewCurrencyRate(parseFloat(e.target.value) || 1)} className="w-full border p-2.5 rounded-xl text-xs font-mono font-bold text-indigo-600" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCurrencyModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md">Add Currency</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Add Department</h3>
            <form onSubmit={handleQuickDeptSubmit} className="space-y-4">
              <input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none" placeholder="e.g. Marketing" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Add Division</h3>
            <form onSubmit={handleQuickDivSubmit} className="space-y-4">
              <input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs outline-none" placeholder="e.g. Northern Region" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsDivModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralVoucherEntry;