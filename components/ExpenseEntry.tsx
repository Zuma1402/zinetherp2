import React, { useState } from 'react';
import { Ledger, Voucher, VoucherType, AccountType } from '../types';
import { Save } from 'lucide-react';

interface ExpenseEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

const ExpenseEntry: React.FC<ExpenseEntryProps> = ({ ledgers, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseLedgerId, setExpenseLedgerId] = useState('');
  const [paymentLedgerId, setPaymentLedgerId] = useState(''); // Cash or Bank
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  // Filter ledgers
  const expenseAccounts = ledgers.filter(l => l.type === AccountType.EXPENSE);
  const paymentAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank'));

  const handleSubmit = () => {
    if (!expenseLedgerId || !paymentLedgerId || amount <= 0) {
      alert("Please fill all details correctly.");
      return;
    }

    // Logic: Debit Expense, Credit Cash/Bank
    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `EXP-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.PAYMENT,
      narration: narration || 'Expense Recorded',
      entries: [
        { ledgerId: expenseLedgerId, debit: amount, credit: 0 },
        { ledgerId: paymentLedgerId, debit: 0, credit: amount }
      ]
    };
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-xl mx-auto border border-gray-200 mt-10">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="bg-orange-100 text-orange-600 p-2 rounded">Record Expense</span>
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Expense Category</label>
          <select 
            className="w-full p-2 border rounded mt-1 focus:ring-2 ring-orange-200"
            value={expenseLedgerId}
            onChange={e => setExpenseLedgerId(e.target.value)}
          >
            <option value="">Select Expense Account (e.g., Rent, Electricity)</option>
            {expenseAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Paid From</label>
          <select 
            className="w-full p-2 border rounded mt-1 focus:ring-2 ring-orange-200"
            value={paymentLedgerId}
            onChange={e => setPaymentLedgerId(e.target.value)}
          >
            <option value="">Select Payment Mode (Cash/Bank)</option>
            {paymentAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
                placeholder="e.g. Paid office rent for March"
            ></textarea>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onCancel} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex justify-center items-center gap-2">
            <Save size={18} /> Record Expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseEntry;