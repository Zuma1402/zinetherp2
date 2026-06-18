import React, { useState } from 'react';
import { Ledger, Voucher, VoucherType, AccountType } from '../types';
import { Save, Plus, X, Check } from 'lucide-react';

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

  // Quick Add State
  const [isAddingPayer, setIsAddingPayer] = useState(false);
  const [newPayerName, setNewPayerName] = useState('');

  // Filter ledgers
  // Payers can be Debtors (Assets) or Income accounts, but mostly Debtors for "Customer Payment"
  const payerAccounts = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET || l.type === AccountType.INCOME);
  const depositAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank') || l.group.includes('Assets'));

  const handleAddPayer = () => {
    if (!newPayerName) return;
    const newLedger: Ledger = {
        id: crypto.randomUUID(),
        name: newPayerName,
        type: AccountType.ASSET,
        group: 'Sundry Debtors',
        openingBalance: 0
    };
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

    // Logic: Debit Cash/Bank (Asset increases), Credit Customer (Asset decreases/Income increases)
    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `RCPT-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.RECEIPT,
      narration: narration || 'Payment Received',
      entries: [
        { ledgerId: depositLedgerId, debit: amount, credit: 0 },
        { ledgerId: payerLedgerId, debit: 0, credit: amount }
      ]
    };
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
                    title="Add New Customer"
                >
                    <Plus size={20} />
                </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Deposit To (Cash/Bank)</label>
          <select 
            className="w-full p-2 border rounded mt-1 focus:ring-2 ring-green-200"
            value={depositLedgerId}
            onChange={e => setDepositLedgerId(e.target.value)}
          >
            <option value="">Select Account</option>
            {depositAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full p-2 border rounded mt-1 text-right font-bold text-gray-700"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2 border rounded mt-1"
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea 
                className="w-full p-2 border rounded mt-1"
                rows={2}
                value={narration}
                onChange={e => setNarration(e.target.value)}
                placeholder="e.g. Invoice #1001 payment"
            ></textarea>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onCancel} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex justify-center items-center gap-2">
            <Save size={18} /> Receive Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceived;