import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, AccountType, Department, Division } from '../types';
import { Save, X } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface ExpenseEntryProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
  onAddLedger?: (ledger: Ledger) => void; // Optional prop to support global Chart of Accounts update
}

const ExpenseEntry: React.FC<ExpenseEntryProps> = ({ ledgers, onSave, onCancel, onAddLedger }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseLedgerId, setExpenseLedgerId] = useState('');
  const [paymentLedgerId, setPaymentLedgerId] = useState('');
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Modals States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isExpenseAccModalOpen, setIsExpenseAccModalOpen] = useState(false); // ⭐ New Expense Account Modal State

  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [newExpenseAccName, setNewExpenseAccName] = useState(''); // ⭐ New Expense Account Input State

  // Local state copy to instantly show dynamically created categories without hard refresh
  const [localLedgers, setLocalLedgers] = useState<Ledger[]>(ledgers);

  useEffect(() => { 
    setLocalLedgers(ledgers); 
  }, [ledgers]);

  useEffect(() => { fetchDimensions(); }, []);

  const fetchDimensions = async () => {
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    const { data: divs } = await supabase.from('divisions').select('*').order('name');
    if (depts) setDepartments(depts);
    if (divs) setDivisions(divs);
  };

  const expenseAccounts = localLedgers.filter(l => l.type === AccountType.EXPENSE);
  const paymentAccounts = localLedgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank'));

  // ⭐ Handler for the new Expense Account select trigger
  const handleExpenseDropdownChange = (val: string) => {
    if (val === 'QUICK_ADD_EXPENSE_ACCOUNT') {
      setIsExpenseAccModalOpen(true);
      setExpenseLedgerId('');
    } else {
      setExpenseLedgerId(val);
    }
  };

  // ⭐ Submission for the dynamically created Expense Account
  const handleQuickExpenseAccSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseAccName.trim()) return;

    const newId = crypto.randomUUID();
    const newAccount: Ledger = {
      id: newId,
      name: newExpenseAccName.trim(),
      type: AccountType.EXPENSE,
      group: 'Operating Expenses',
      openingBalance: 0
    };

    // Push to cloud if database sync configuration exists
    try {
      await supabase.from('ledgers').insert([{
        id: newId,
        name: newAccount.name,
        type: newAccount.type,
        group_name: newAccount.group,
        opening_balance: 0
      }]);
    } catch (err) {
      console.warn("Database ledger schema bypass or remote sync missing:", err);
    }

    // Update parent architecture if handler exists, otherwise push inline locally
    if (onAddLedger) {
      onAddLedger(newAccount);
    } else {
      setLocalLedgers([...localLedgers, newAccount]);
    }

    setExpenseLedgerId(newId);
    setNewExpenseAccName('');
    setIsExpenseAccModalOpen(false);
  };

  const handleQuickDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    const id = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('departments').insert([{ id, name: newDeptName.trim() }]);
    await fetchDimensions();
    setSelectedDept(id);
    setIsDeptModalOpen(false);
    setNewDeptName('');
  };

  const handleQuickDivSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    const id = newDivName.trim().toLowerCase().replace(/\s+/g, '_');
    await supabase.from('divisions').insert([{ id, name: newDivName.trim() }]);
    await fetchDimensions();
    setSelectedDiv(id);
    setIsDivModalOpen(false);
    setNewDivName('');
  };

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
          {/* ⭐ Modified Expense Category Section with Dropdown Add Trigger */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Expense Category</label>
            <select 
              className="w-full p-2 border rounded-lg mt-1 text-xs font-bold text-gray-800 outline-none" 
              value={expenseLedgerId} 
              onChange={e => handleExpenseDropdownChange(e.target.value)}
            >
              <option value="">Select Account</option>
              {expenseAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              <option value="QUICK_ADD_EXPENSE_ACCOUNT" className="text-orange-600 font-bold bg-orange-50/50">➕ Add New Expense Account</option>
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

      {/* ⭐ Quick Add Expense Category Popup Modal Component */}
      {isExpenseAccModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Expense Account</h3>
            <form onSubmit={handleQuickExpenseAccSubmit} className="space-y-4">
              <input 
                autoFocus 
                type="text" 
                value={newExpenseAccName} 
                onChange={e => setNewExpenseAccName(e.target.value)} 
                className="w-full border p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-bold" 
                placeholder="e.g. Office Entertainment" 
                required 
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsExpenseAccModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
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

      {/* Division Modal */}
      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
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