import React, { useState } from 'react';
import { Undo2, Save, Coins } from 'lucide-react';
import { Ledger, Voucher, VoucherType, AccountType, TrialBalanceRow } from '../../types';

interface SalesRefundProps {
  ledgers: Ledger[];
  trialBalance: TrialBalanceRow[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

const SalesRefundEntry: React.FC<SalesRefundProps> = ({ ledgers, trialBalance, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [paymentLedgerId, setPaymentLedgerId] = useState(''); // Cash or Bank
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);
  const paymentAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank'));

  const handleSubmit = () => {
    if (!customerId || !paymentLedgerId || amount <= 0) {
      alert("Please fill all details.");
      return;
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `REF-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.PAYMENT,
      narration: narration || `Refund to Customer`,
      entries: [
        { ledgerId: customerId, debit: amount, credit: 0 },
        { ledgerId: paymentLedgerId, debit: 0, credit: amount }
      ]
    };
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <span className="bg-rose-100 text-rose-600 p-2 rounded-lg shadow-sm"><Undo2 size={24} /></span>
        Issue Sales Refund
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Customer to Refund</label>
          <select className="w-full p-2.5 border rounded-xl bg-white focus:ring-2 ring-rose-100" value={customerId} onChange={e => setCustomerId(e.target.value)}>
             <option value="">Select Customer...</option>
             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Refund Method (Source)</label>
          <select className="w-full p-2.5 border rounded-xl bg-white" value={paymentLedgerId} onChange={e => setPaymentLedgerId(e.target.value)}>
             <option value="">Select Cash/Bank...</option>
             {paymentAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Amount to Refund</label>
                <div className="relative">
                    <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-2.5 border rounded-xl pl-8 font-bold text-rose-600" />
                    <Coins className="absolute left-2.5 top-3.5 text-gray-400" size={16} />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" />
            </div>
        </div>

        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Reason / Notes</label>
            <textarea className="w-full p-2.5 border rounded-xl bg-white" rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g. Returned faulty goods"></textarea>
        </div>

        <div className="flex gap-3 pt-6">
          <button onClick={onCancel} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 flex justify-center items-center gap-2 font-bold shadow-lg transition">
            <Save size={18} /> Issue Refund
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesRefundEntry;