import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, AccountType, Department, Division } from '../types';
import { Save, X, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import { ForensicTimeline } from './ForensicTimeline'; // ⭐ REGISTERED AUDIT SENTINEL TIMELINE

interface ExpenseEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
  onAddLedger?: (ledger: Ledger) => void;
  initialData?: Voucher | null; // ⭐ INJECTED DRILL-DOWN PROPS
  initialSnapshot?: Voucher | null;
}

const ExpenseEntry: React.FC<ExpenseEntryProps> = ({ ledgers, onSave, onCancel, onAddLedger, initialData, initialSnapshot }) => {
  const recordSnapshot = initialData || initialSnapshot || null;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseLedgerId, setExpenseLedgerId] = useState('');
  const [paymentLedgerId, setPaymentLedgerId] = useState('');
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  // 🧾 MULTI-CURRENCY EXTRA STATE VARIABLES
  const [baseCurrency, setBaseCurrency] = useState<string>('PKR');
  const [currency, setCurrency] = useState<string>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isRateFetching, setIsRateFetching] = useState<boolean>(false);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Modals States
  const [isExpenseAccModalOpen, setIsExpenseAccModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);

  const [newExpenseAccName, setNewExpenseAccName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');

  const [localLedgers, setLocalLedgers] = useState<Ledger[]>(ledgers);

  // 🚀 ⭐ RE-HYDRATION HOOK ENGINE FOR HISTORICAL DISBURSEMENT SLIPS
  useEffect(() => {
    if (recordSnapshot) {
      setDate(recordSnapshot.date || new Date().toISOString().split('T')[0]);
      setNarration(recordSnapshot.narration || '');
      if (recordSnapshot.currency) setCurrency(recordSnapshot.currency);
      if (recordSnapshot.exchangeRate) setExchangeRate(recordSnapshot.exchangeRate);
      if (recordSnapshot.foreignTotal) setAmount(recordSnapshot.foreignTotal);

      // Extract respective balance registers splits references
      const debitorRow = recordSnapshot.entries.find((e: any) => e.debit > 0);
      const creditorRow = recordSnapshot.entries.find((e: any) => e.credit > 0);

      if (debitorRow) {
        setExpenseLedgerId(debitorRow.ledgerId);
        setSelectedDept(debitorRow.departmentId || '');
        setSelectedDiv(debitorRow.divisionId || '');
      }
      if (creditorRow) setPaymentLedgerId(creditorRow.ledgerId);
    }
  }, [recordSnapshot]);

  // ⭐ Real-Time Automated Forex Exchange Sync Engine
  const syncLiveExchangeRate = async (targetCurrency: string, base: string) => {
    if (targetCurrency === base) {
      setExchangeRate(1);
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
      console.error("Forex API fallback standard node trigger log:", err);
    } finally {
      setIsRateFetching(false);
    }
  };

  const fetchActiveCompanyContext = async () => {
    const activeCompanyId = localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
    if (activeCompanyId) {
      const { data } = await supabase.from('companies').select('base_currency').eq('id', activeCompanyId).maybeSingle();
      if (data && data.base_currency) {
        setBaseCurrency(data.base_currency);
        if (!recordSnapshot) setCurrency(data.base_currency);
      }
    }
  };

  useEffect(() => {
    setLocalLedgers(ledgers);
  }, [ledgers]);

  useEffect(() => {
    const initLookups = async () => {
      await fetchActiveCompanyContext();
      const { data: depts } = await supabase.from('departments').select('*').order('name');
      const { data: divs } = await supabase.from('divisions').select('*').order('name');
      if (depts) setDepartments(depts);
      if (divs) setDivisions(divs);
    };
    initLookups();
  }, [recordSnapshot]);

  // ⭐ Watcher to fetch rates dynamically when user switches currencies
  useEffect(() => {
    if (!recordSnapshot) {
      syncLiveExchangeRate(currency, baseCurrency);
    }
  }, [currency, baseCurrency]);

  const expenseAccounts = localLedgers.filter(l => l.type === AccountType.EXPENSE);
  const paymentAccounts = localLedgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank') || l.id.includes('cash') || l.id.includes('bank'));

  const handleExpenseDropdownChange = (val: string) => {
    if (val === 'QUICK_ADD_EXPENSE_ACCOUNT') {
      setIsExpenseAccModalOpen(true);
      setExpenseLedgerId('');
    } else {
      setExpenseLedgerId(val);
    }
  };

  const handleQuickExpenseAccSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseAccName.trim()) return;
    const newId = crypto.randomUUID();
    const newAccount: Ledger = { id: newId, name: newExpenseAccName.trim(), type: AccountType.EXPENSE, group: 'Operating Expenses', openingBalance: 0 };
    try {
      await supabase.from('ledgers').insert([{ id: newId, name: newAccount.name, type: newAccount.type, group_name: newAccount.group, opening_balance: 0 }]);
    } catch (err) { console.warn(err); }

    if (onAddLedger) onAddLedger(newAccount);
    else setLocalLedgers([...localLedgers, newAccount]);

    setExpenseLedgerId(newId);
    setNewExpenseAccName('');
    setIsExpenseAccModalOpen(false);
  };

  const handleQuickDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('departments').insert([{ id, name: newDeptName.trim() }]);
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    if (depts) setDepartments(depts);
    setSelectedDept(id);
    setIsDeptModalOpen(false);
    setNewDeptName(''); // ✅ FIXED TYPO COMPONENT CONTEXT
  };

  const handleQuickDivSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    const id = newDivName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('divisions').insert([{ id, name: newDivName.trim() }]);
    const { data: divs } = await supabase.from('divisions').select('*').order('name');
    if (divs) setDivisions(divs);
    setSelectedDiv(id);
    setIsDivModalOpen(false);
    setNewDivName('');
  };

  const amountBasePKR = (amount || 0) * exchangeRate;

  const handleSubmit = () => {
    if (!expenseLedgerId || !paymentLedgerId || amount <= 0) {
      alert("Please fill all details correctly.");
      return;
    }
    const voucher: Voucher = {
      id: recordSnapshot ? recordSnapshot.id : crypto.randomUUID(),
      date,
      number: recordSnapshot ? recordSnapshot.number : `EXP-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.PAYMENT,
      narration: narration || `Expense Recorded (${currency})`,
      entries: [
        { ledgerId: expenseLedgerId, debit: amountBasePKR, credit: 0, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined },
        { ledgerId: paymentLedgerId, debit: 0, credit: amountBasePKR, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined }
      ],
      currency,
      exchangeRate,
      foreignTotal: amount
    } as any;
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-3xl mx-auto border border-gray-100 mt-6 relative animate-in fade-in">
      <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
        <span className="bg-orange-500 text-white px-3 py-1.5 rounded-xl text-sm font-black uppercase tracking-wider">
          {recordSnapshot ? `Modify Expense Entry [${recordSnapshot.number}]` : 'Record Expense'}
        </span>
      </h2>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expense Category</label>
            <select className="w-full p-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 rounded-xl text-xs font-bold text-gray-800 outline-none" value={expenseLedgerId} onChange={e => handleExpenseDropdownChange(e.target.value)}>
              <option value="">Select Account</option>
              {expenseAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              <option value="QUICK_ADD_EXPENSE_ACCOUNT" className="text-orange-600 font-black bg-orange-50/70">➕ Add New Expense Account</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
            <select value={selectedDept} onChange={e => e.target.value === 'QUICK_ADD_DEPT' ? setIsDeptModalOpen(true) : setSelectedDept(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 rounded-xl text-xs font-bold text-gray-800 outline-none">
              <option value="">HQ / Central</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              <option value="QUICK_ADD_DEPT" className="text-orange-600 font-bold bg-orange-50/50">➕ Add New</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Division</label>
            <select value={selectedDiv} onChange={e => e.target.value === 'QUICK_ADD_DIV' ? setIsDivModalOpen(true) : setSelectedDiv(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 focus:border-orange-500 rounded-xl text-xs font-bold text-gray-800 outline-none">
              <option value="">Enterprise Strategy</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              <option value="QUICK_ADD_DIV" className="text-orange-600 font-bold bg-orange-50/50">➕ Add New</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Paid From (Cash/Bank Asset)</label>
          <select className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-orange-500 rounded-xl text-xs font-bold text-gray-800 outline-none" value={paymentLedgerId} onChange={e => setPaymentLedgerId(e.target.value)}>
            <option value="">Select Payment Mode (Cash/Bank)</option>
            {paymentAccounts.map(l => <option key={l.id} value={l.id}>{l.name} ({l.group})</option>)}
          </select>
        </div>

        <div className="bg-slate-50 border border-gray-200/60 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 shadow-inner">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expense Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 focus:border-orange-500 rounded-xl text-xs font-black text-gray-800 outline-none">
              <option value={baseCurrency}>{baseCurrency} (Base)</option>
              {baseCurrency !== 'PKR' && <option value="PKR">PKR</option>}
              {baseCurrency !== 'USD' && <option value="USD">USD ($)</option>}
              {baseCurrency !== 'AED' && <option value="AED">AED</option>}
              {baseCurrency !== 'GBP' && <option value="GBP">GBP (£)</option>}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              {currency === baseCurrency ? 'Exchange Rate Fixed' : `Exchange Rate (1 ${currency} = ? ${baseCurrency})`}
              {isRateFetching && <Loader2 size={10} className="animate-spin text-orange-600" />}
            </label>
            <input type="number" value={exchangeRate} disabled={currency === baseCurrency || isRateFetching} onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)} className={`w-full p-2.5 border rounded-xl font-black text-xs text-center outline-none shadow-sm ${currency === baseCurrency ? 'bg-gray-100/70 border-gray-200 text-gray-400' : 'bg-white border-orange-200 text-orange-600 ring-2 ring-orange-50/50'}`} min="0.01" step="any" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Amount ({currency})</label>
            <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full p-2.5 border border-gray-200 focus:border-orange-500 rounded-xl bg-white font-mono font-black text-xs text-right outline-none" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border border-gray-200 focus:border-orange-500 rounded-xl bg-white text-xs font-bold outline-none" />
          </div>
        </div>

        {currency !== baseCurrency && amount > 0 && (
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-center justify-between text-xs text-orange-800 font-bold animate-in zoom-in-95">
            <div className="flex items-center gap-1.5">
              <span>{currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <ArrowRight size={12} className="text-orange-400" />
              <span>Base Ledger Entry Value:</span>
            </div>
            <span className="font-mono font-black">{baseCurrency} {amountBasePKR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes / Internal Remarks</label>
          <textarea className="w-full border border-gray-200 p-3 rounded-xl text-xs outline-none bg-gray-50/50 focus:bg-white focus:border-orange-500 font-medium transition-all" rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Paid office rent, servers subscription billing reference..."></textarea>
        </div>

        {/* ⭐ LIVE AUDIT SENTINEL TIMELINE */}
        {recordSnapshot && (
          <div className="mt-6 print:hidden">
            <ForensicTimeline recordId={recordSnapshot.id} />
          </div>
        )}

        <div className="flex gap-3 pt-2 no-print-el">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 text-gray-400 font-bold uppercase tracking-widest rounded-xl text-xs hover:text-gray-600">Cancel</button>
          <button type="button" onClick={handleSubmit} className="flex-1 py-2.5 bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl text-xs shadow-md hover:bg-orange-700">{recordSnapshot ? 'Update Expense' : 'Record Expense'}</button>
        </div>
      </div>

      {/* QUICK ADD MODALS UNTOUCHED */}
      {isExpenseAccModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Expense Account</h3>
            <form onSubmit={handleQuickExpenseAccSubmit} className="space-y-4">
              <input autoFocus type="text" value={newExpenseAccName} onChange={e => setNewExpenseAccName(e.target.value)} className="w-full p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-bold" placeholder="e.g. Office Entertainment" required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsExpenseAccModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold mb-2">Add Department</h3>
            <form onSubmit={handleQuickDeptSubmit} className="space-y-3">
              <input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border p-2 rounded text-xs outline-none" required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsDeptModalOpen(false)} className="text-xs text-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-orange-600 text-white rounded text-xs font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold mb-2">Add Division</h3>
            <form onSubmit={handleQuickDivSubmit} className="space-y-3">
              <input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} className="w-full border p-2 rounded text-xs outline-none" required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsDivModalOpen(false)} className="text-xs text-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-orange-600 text-white rounded text-xs font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseEntry;