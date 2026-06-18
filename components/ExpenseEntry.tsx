import React, { useState, useEffect } from 'react';
import { Ledger, Voucher, VoucherType, AccountType, Department, Division } from '../types';
import { Save, Plus, X } from 'lucide-react';
import { supabase } from '../services/supabaseService';

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

  // ⭐ Granular Inline Row Dimensions States
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Modals popup triggers
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDimensions = async () => {
    try {
      const { data: depts } = await supabase.from('departments').select('*').order('name');
      const { data: divs } = await supabase.from('divisions').select('*').order('name');
      if (depts) setDepartments(depts);
      if (divs) setDivisions(divs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDimensions();
  }, []);

  const handleDeptSelectChange = (val: string) => {
    if (val === 'QUICK_ADD_DEPT') {
      setIsDeptModalOpen(true);
      setSelectedDept('');
    } else {
      setSelectedDept(val);
    }
  };

  const handleDivSelectChange = (val: string) => {
    if (val === 'QUICK_ADD_DIV') {
      setIsDivModalOpen(true);
      setSelectedDiv('');
    } else {
      setSelectedDiv(val);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setModalLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ id: newDeptName.trim().toLowerCase().replace(/\s+/g, '_'), name: newDeptName.trim() }])
        .select();
      if (error) throw error;
      await fetchDimensions();
      if (data && data[0]) setSelectedDept(data[0].id);
      setIsDeptModalOpen(false);
      setNewDeptName('');
    } catch (err) {
      alert('Error saving department');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    setModalLoading(true);
    try {
      const { data, error } = await supabase
        .from('divisions')
        .insert([{ id: newDivName.trim().toLowerCase().replace(/\s+/g, '_'), name: newDivName.trim() }])
        .select();
      if (error) throw error;
      await fetchDimensions();
      if (data && data[0]) setSelectedDiv(data[0].id);
      setIsDivModalOpen(false);
      setNewDivName('');
    } catch (err) {
      alert('Error saving division');
    } finally {
      setModalLoading(false);
    }
  };

  // Filter ledgers
  const expenseAccounts = ledgers.filter(l => l.type === AccountType.EXPENSE);
  const paymentAccounts = ledgers.filter(l => l.group.includes('Cash') || l.group.includes('Bank'));

  const handleSubmit = () => {
    if (!expenseLedgerId || !paymentLedgerId || amount <= 0) {
      alert("Please fill all details correctly.");
      return;
    }

    // Logic: Debit Expense, Credit Cash/Bank with exact matching dimensions variables mapping keys
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
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto border border-gray-200 mt-10 relative">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="bg-orange-100 text-orange-600 p-2 rounded">Record Expense</span>
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Expense Category</label>
            <select 
              className="w-full p-2 border rounded mt-1 text-xs font-bold text-gray-800"
              value={expenseLedgerId}
              onChange={e => setExpenseLedgerId(e.target.value)}
            >
              <option value="">Select Account</option>
              {expenseAccounts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* ⭐ Integrated Inline Columns Department right next to Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select value={selectedDept} onChange={e => handleDeptSelectChange(e.target.value)} className="w-full p-2 border rounded mt-1 text-xs font-bold text-gray-700 cursor-pointer">
              <option value="">HQ / Central</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              <option value="QUICK_ADD_DEPT" className="text-indigo-600 font-bold bg-indigo-5">➕ Add New Department</option>
            </select>
          </div>

          {/* ⭐ Integrated Inline Columns Division right next to Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Division</label>
            <select value={selectedDiv} onChange={e => handleDivSelectChange(e.target.value)} className="w-full p-2 border rounded mt-1 text-xs font-bold text-gray-700 cursor-pointer">
              <option value="">Enterprise Strategy</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              <option value="QUICK_ADD_DIV" className="text-indigo-600 font-bold bg-indigo-5">➕ Add New Division</option>
            </select>
          </div>
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

      {/* Modals Popup Structures Definitions */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">Add New Department</h3><button onClick={() => setIsDeptModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400"><X size={16}/></button></div>
            <form onSubmit={handleAddDepartment} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Department Name</label><input autoFocus type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="e.g., Marketing, HR" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700" disabled={modalLoading}>Cancel</button><button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold" disabled={modalLoading}>Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isDivModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">Add New Division</h3><button onClick={() => setIsDivModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400"><X size={16}/></button></div>
            <form onSubmit={handleAddDivision} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Division Name</label><input autoFocus type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} placeholder="e.g., Domestic Retail, Logistics Unit" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsDivModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700" disabled={modalLoading}>Cancel</button><button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold" disabled={modalLoading}>Save</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExpenseEntry;