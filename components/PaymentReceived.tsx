import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, AccountType } from '../types';
import { Save, Plus, X, Check } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface PaymentReceivedProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
  onAddLedger: (ledger: Ledger) => void;
}

const PaymentReceived: React.FC<PaymentReceivedProps> = ({ ledgers, onSave, onCancel, onAddLedger }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerLedgerId, setPayerLedgerId] = useState('');
  const [depositLedgerId, setDepositLedgerId] = useState(''); // Cash or Bank
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  // 🧾 Multi-Currency and Forex States
  const [baseCurrency, setBaseCurrency] = useState<string>('PKR');
  const [currency, setCurrency] = useState<string>('PKR');
  const [invoiceExchangeRate, setInvoiceExchangeRate] = useState<number>(1);
  const [paymentExchangeRate, setExchangeRate] = useState<number>(1);

  // Quick Add State
  const [isAddingPayer, setIsAddingPayer] = useState(false);
  const [newPayerName, setNewPayerName] = useState('');

  // Fetch company base currency dynamic setup room
  const fetchActiveCompanyCurrency = async () => {
    const activeCompanyId = localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
    if (activeCompanyId) {
      const { data } = await supabase.from('companies').select('base_currency').eq('id', activeCompanyId).maybeSingle();
      if (data && data.base_currency) {
        setBaseCurrency(data.base_currency);
        setCurrency(data.base_currency); // ⭐ Dynamic mapping synchronization fix
      }
    }
  };

  useEffect(() => {
    fetchActiveCompanyCurrency();
    
    // Listen to sidebar switching events dynamically without lag execution breaks
    const handleSwitch = () => fetchActiveCompanyCurrency();
    window.addEventListener('companySwitched', handleSwitch);
    return () => window.removeEventListener('companySwitched', handleSwitch);
  }, []);

  // Filter ledgers
  const payerAccounts = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET || l.type === AccountType.INCOME);
  const depositAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank') || l.type === AccountType.ASSET);

  const handleAddPayer = () => {
    if (!newPayerName) return;
    const newLedger: Ledger = {
        id: crypto.randomUUID(),
        name: newPayerName,
        type: AccountType.ASSET,
        group: 'Sundry Debtors',
        openingBalance: 0,
        currency: baseCurrency
    } as any;
    onAddLedger(newLedger);
    setPayerLedgerId(newLedger.id);
    setIsAddingPayer(false);
    setNewPayerName('');
  };

  const handleSubmit = () => {
    if (!payerLedgerId || !depositLedgerId || amount <= 0) {
      alert("Please fill all details correctly.");
      return;
    }

    const amountInBaseCurrency = amount * paymentExchangeRate; 
    const amountInInvoiceCurrency = amount * invoiceExchangeRate; 
    const forexDifference = amountInBaseCurrency - amountInInvoiceCurrency;

    const forexLedger = ledgers.find(l => l.name.toLowerCase().includes('exchange gain/loss')) || 
                        ledgers.find(l => l.name.toLowerCase().includes('forex')) || { id: 'FOREX-GAIN-LOSS-HEAD' };

    const voucherEntries: any[] = [];
    voucherEntries.push({ ledgerId: depositLedgerId, debit: amountInBaseCurrency, credit: 0 });
    voucherEntries.push({ ledgerId: payerLedgerId, debit: 0, credit: amountInInvoiceCurrency });

    if (forexDifference > 0) {
      voucherEntries.push({ ledgerId: forexLedger.id, debit: 0, credit: Math.abs(forexDifference) });
    } else if (forexDifference < 0) {
      voucherEntries.push({ ledgerId: forexLedger.id, debit: Math.abs(forexDifference), credit: 0 });
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `RCPT-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.RECEIPT,
      narration: narration || `Payment Received (${currency})`,
      entries: voucherEntries,
      currency,
      exchangeRate: paymentExchangeRate,
      foreignTotal: amount
    } as any;

    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-xl mx-auto border border-gray-200 mt-10">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="bg-green-100 text-green-600 p-2 rounded">Receive Payment</span>
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Received From (Customer)</label>
          {isAddingPayer ? (
             <div className="flex gap-2 mt-1">
                 <input 
                    autoFocus
                    type="text" 
                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="New Customer Name"
                    value={newPayerName}
                    onChange={e => setNewPayerName(e.target.value)}
                 />
                 <button onClick={handleAddPayer} className="bg-green-600 text-white p-2 rounded hover:bg-green-700"><Check size={18} /></button>
                 <button onClick={() => setIsAddingPayer(false)} className="bg-gray-200 text-gray-600 p-2 rounded hover:bg-gray-300"><X size={18} /></button>
             </div>
          ) : (
            <div className="flex gap-2 mt-1">
                <select 
                    className="flex-1 p-2 border rounded focus:ring-2 ring-green-200"
                    value={payerLedgerId}
                    onChange={e => setPayerLedgerId(e.target.value)}
                >
                    <option value="">Select Customer / Payer</option>
                    {payerAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button 
                    onClick={() => setIsAddingPayer(true)}
                    className="bg-gray-100 text-gray-600 p-2 rounded border border-gray-300 hover:bg-gray-200"
                >
                    <Plus size={20} />
                </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Deposit To (Cash/Bank)</label>
            <select 
              className="w-full p-2 border rounded mt-1 focus:ring-2 ring-green-200 font-bold"
              value={depositLedgerId}
              onChange={e => setDepositLedgerId(e.target.value)}
            >
              <option value="">Select Account</option>
              {depositAccounts.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} { (l as any).currency && (l as any).currency !== 'BASE' ? `(${ (l as any).currency })` : `(${baseCurrency})` }
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Currency</label>
            <select value={currency} onChange={e => { const selected = e.target.value; setCurrency(selected); if (selected === baseCurrency) { setExchangeRate(1); setInvoiceExchangeRate(1); } }} className="w-full p-2 border rounded mt-1 bg-gray-50 font-bold outline-none">
              <option value={baseCurrency}>{baseCurrency} (Base)</option>
              {baseCurrency !== 'PKR' && <option value="PKR">PKR</option>}
              {baseCurrency !== 'USD' && <option value="USD">USD ($)</option>}
              {baseCurrency !== 'AED' && <option value="AED">AED</option>}
            </select>
          </div>
        </div>

        {currency !== baseCurrency && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-[11px] font-black text-emerald-800 uppercase tracking-wider">1. Locked Invoice Rate</label>
              <input type="number" value={invoiceExchangeRate} onChange={e => setInvoiceExchangeRate(parseFloat(e.target.value) || 1)} className="w-full p-2 bg-white border border-emerald-200 rounded mt-1 font-mono text-center font-bold text-emerald-700 text-xs outline-none" step="any" min="0.001" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-emerald-800 uppercase tracking-wider">2. Current Payment Rate</label>
              <input type="number" value={paymentExchangeRate} onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)} className="w-full p-2 bg-white border border-emerald-200 rounded mt-1 font-mono text-center font-bold text-emerald-700 text-xs outline-none" step="any" min="0.001" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full p-2 border rounded mt-1 text-right font-black text-gray-800"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2 border rounded mt-1 font-bold"
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea 
                className="w-full p-2 border rounded mt-1 text-xs"
                rows={2}
                value={narration}
                onChange={e => setNarration(e.target.value)}
                placeholder="e.g. Invoice payment details..."
            ></textarea>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onCancel} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-bold">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex justify-center items-center gap-2 font-black shadow-sm">
            <Save size={18} /> Receive Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceived;