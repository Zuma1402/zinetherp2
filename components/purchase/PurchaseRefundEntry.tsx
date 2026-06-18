import React, { useState } from 'react';
import { RotateCw, Save, Coins, ArrowDownLeft } from 'lucide-react';
import { Ledger, Voucher, VoucherType, AccountType, TrialBalanceRow } from '../../types';

interface Props {
  ledgers: Ledger[];
  trialBalance: TrialBalanceRow[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

const PurchaseRefundEntry: React.FC<Props> = ({ ledgers, trialBalance, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState('');
  const [depositLedgerId, setDepositLedgerId] = useState(''); // Cash or Bank
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  const vendors = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  const depositAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank'));

  const handleSubmit = () => {
    if (!vendorId || !depositLedgerId || amount <= 0) {
      alert("Please provide all details correctly.");
      return;
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `RFD-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.RECEIPT,
      narration: narration || `Refund received from Vendor`,
      entries: [
        { ledgerId: depositLedgerId, debit: amount, credit: 0 },
        { ledgerId: vendorId, debit: 0, credit: amount }
      ]
    };
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg shadow-sm"><ArrowDownLeft size={24} /></span>
        Purchase Refund
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Supplier (Returning Cash)</label>
          <select className="w-full p-3 border rounded-xl bg-white" value={vendorId} onChange={e => setVendorId(e.target.value)}>
             <option value="">Select Vendor...</option>
             {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Deposit Into</label>
          <select className="w-full p-3 border rounded-xl bg-white" value={depositLedgerId} onChange={e => setDepositLedgerId(e.target.value)}>
             <option value="">Select Cash/Bank...</option>
             {depositAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Refund Amount</label>
                <div className="relative">
                    <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-3 border rounded-xl pl-10 font-bold text-emerald-600" />
                    <Coins className="absolute left-3 top-4 text-gray-400" size={18} />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Date Received</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl bg-white" />
            </div>
        </div>

        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Remarks</label>
            <textarea className="w-full p-3 border rounded-xl bg-white" rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Reason for refund..."></textarea>
        </div>

        <div className="flex gap-3 pt-6">
          <button onClick={onCancel} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-50 hover:bg-gray-100 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex justify-center items-center gap-2 font-bold shadow-lg transition">
            <Save size={18} /> Save Refund
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRefundEntry;