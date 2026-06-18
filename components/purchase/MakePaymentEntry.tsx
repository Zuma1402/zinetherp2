import React, { useState } from 'react';
import { Wallet, Save, Coins, Check } from 'lucide-react';
import { Ledger, Voucher, VoucherType, AccountType, TrialBalanceRow } from '../../types';

interface Props {
  ledgers: Ledger[];
  trialBalance: TrialBalanceRow[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

const MakePaymentEntry: React.FC<Props> = ({ ledgers, trialBalance, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState('');
  const [sourceLedgerId, setSourceLedgerId] = useState(''); // Cash or Bank
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  const vendors = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  const sourceAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank'));

  const getVendorBalance = (id: string) => {
    const row = trialBalance.find(r => r.ledgerId === id);
    if (!row) return 'O/S: 0.00';
    return `O/S Balance: ${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  const handleSubmit = () => {
    if (!vendorId || !sourceLedgerId || amount <= 0) {
      alert("Please enter vendor, source account and valid amount.");
      return;
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `PAY-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.PAYMENT,
      narration: narration || `Payment to Vendor`,
      entries: [
        { ledgerId: vendorId, debit: amount, credit: 0 },
        { ledgerId: sourceLedgerId, debit: 0, credit: amount }
      ]
    };
    onSave(voucher);
    alert("Payment recorded successfully!");
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <span className="bg-blue-100 text-blue-600 p-2 rounded-lg shadow-sm"><Wallet size={24} /></span>
        Make Vendor Payment
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Supplier / Vendor</label>
          <select className="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100 font-medium" value={vendorId} onChange={e => setVendorId(e.target.value)}>
             <option value="">Select Vendor...</option>
             {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {vendorId && <div className="text-[10px] font-bold text-blue-600 uppercase mt-1.5 px-1">{getVendorBalance(vendorId)}</div>}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Paid From (Source)</label>
          <select className="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100" value={sourceLedgerId} onChange={e => setSourceLedgerId(e.target.value)}>
             <option value="">Select Cash/Bank Account...</option>
             {sourceAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Amount to Pay</label>
                <div className="relative">
                    <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-3 border rounded-xl pl-10 font-black text-gray-800 text-lg" placeholder="0.00" />
                    <Coins className="absolute left-3 top-4 text-gray-400" size={20} />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Payment Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl bg-white text-gray-700" />
            </div>
        </div>

        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Narration / Reference</label>
            <textarea className="w-full p-3 border rounded-xl bg-white" rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g. Paid for INV-0042 via Cheque"></textarea>
        </div>

        <div className="flex gap-3 pt-6">
          <button onClick={onCancel} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-50 hover:bg-gray-100 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 font-bold shadow-lg transition">
            <Check size={20} /> Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default MakePaymentEntry;