import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, AccountType, Department, Division } from '../types';
import { Save, X } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface ExpenseEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

const ExpenseEntry: React.FC<ExpenseEntryProps> = ({ ledgers, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseLedgerId, setExpenseLedgerId] = useState('');
  const [paymentLedgerId, setPaymentLedgerId] = useState('');
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');

  useEffect(() => { fetchDimensions(); }, []);

  const fetchDimensions = async () => {
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    const { data: divs } = await supabase.from('divisions').select('*').order('name');
    if (depts) setDepartments(depts);
    if (divs) setDivisions(divs);
  };

  const expenseAccounts = ledgers.filter(l => l.type === AccountType.EXPENSE);
  const paymentAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank'));

  const handleSubmit = () => {
    if (!expenseLedgerId || !paymentLedgerId || amount <= 0) {
      alert("Please fill all details correctly.");
      return;
    }

    const voucher: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `EXP-${Math.floor(Math.random() * 10000)}`,
      type: VoucherType.PAYMENT,
      narration: narration || 'Expense Recorded',
      entries: [
        { ledgerId: expenseLedgerId, debit: amount, credit: 0, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined },
        { ledgerId: paymentLedgerId, debit: 0, credit: amount, departmentId: selectedDept || undefined, divisionId: selectedDiv || undefined }
      ]
    };
    onSave(voucher);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto border border-gray-100 mt-6 relative">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-sm font-bold">Record Expense</span>
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Expense Category</label>
            <select className="w-full p-2 border rounded-lg mt-1 text-xs font-bold text-gray-800" value={expenseLedgerId} onChange={e => setExpenseLedgerId(e.target.value)}>
              <option value="">Select Account</option>
              {expenseAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</label>
            <select value={selectedDept} onChange={e => e.target.value === 'QUICK_ADD_DEPT' ? setIsDeptModalOpen(true) : setSelectedDept(e.target.value)} className="w-full p-2 border rounded-lg mt-1 text-xs font-bold text-gray-700">
              <option value="">HQ / Central</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              <option value="QUICK_ADD_DEPT" className="text-orange-600 font-bold">➕ Add New</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Division</label>
            <select value={selectedDiv} onChange={e => e.target.value === 'QUICK_ADD_DIV' ? setIsDivModalOpen(true) : setSelectedDiv(e.target.value)} className="w-full p-2 border rounded-lg mt-1 text-xs font-bold text-gray-700">
              <option value="">Enterprise Strategy</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              <option value="QUICK_ADD_DIV" className="text-orange-600 font-bold">➕ Add New</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid From</label>
          <select className="w-full p-2 border rounded-lg mt-1 text-sm" value={paymentLedgerId} onChange={e => setPaymentLedgerId(e.target.value)}>
            <option value="">Select Payment Mode (Cash/Bank)</option>
            {paymentAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1 text-right font-bold text-gray-700" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-lg mt-1 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
          <textarea className="w-full p-2 border rounded-lg mt-1 text-sm" rows={2} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Paid office rent..."></textarea>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg text-sm">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-orange-600 text-white font-semibold rounded-lg text-sm hover:bg-orange-700">Record Expense</button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseEntry;