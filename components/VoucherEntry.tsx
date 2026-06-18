import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { Ledger, Voucher, VoucherType, VoucherEntry as IVoucherEntry, TrialBalanceRow } from '../types';
import { validateVoucher } from '../services/accountingService';

interface VoucherEntryProps {
  ledgers: Ledger[];
  trialBalance: TrialBalanceRow[];
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
}

const VoucherEntry: React.FC<VoucherEntryProps> = ({ ledgers, trialBalance, onSave, onCancel }) => {
  const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.JOURNAL);
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [number, setNumber] = useState(`VCH-${Math.floor(Math.random() * 10000)}`);
  const [narration, setNarration] = useState('');
  
  const [entries, setEntries] = useState<IVoucherEntry[]>([
    { ledgerId: '', debit: 0, credit: 0 },
    { ledgerId: '', debit: 0, credit: 0 },
  ]);

  const [totalDr, setTotalDr] = useState(0);
  const [totalCr, setTotalCr] = useState(0);

  useEffect(() => {
    const dr = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const cr = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    setTotalDr(dr); setTotalCr(cr);
  }, [entries]);

  const handleEntryChange = (index: number, field: keyof IVoucherEntry, value: string | number) => {
    const newEntries = [...entries];
    if (field === 'debit' || field === 'credit') {
        newEntries[index] = { ...newEntries[index], [field]: Number(value) };
        if (field === 'debit' && Number(value) > 0) newEntries[index].credit = 0;
        if (field === 'credit' && Number(value) > 0) newEntries[index].debit = 0;
    } else {
        newEntries[index] = { ...newEntries[index], [field]: value as string };
    }
    setEntries(newEntries);
  };

  const getLedgerBalanceString = (ledgerId: string) => {
    if (!ledgerId) return null;
    const row = trialBalance.find(r => r.ledgerId === ledgerId);
    if (!row) return 'Bal: 0.00';
    return `Bal: ${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  const addRow = () => setEntries([...entries, { ledgerId: '', debit: 0, credit: 0 }]);
  const removeRow = (index: number) => entries.length > 2 && setEntries(entries.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!validateVoucher(entries) || entries.some(e => !e.ledgerId)) {
      alert("Please ensure the voucher is balanced and all accounts are selected.");
      return;
    }
    onSave({ id: crypto.randomUUID(), date, number, type: voucherType, narration, entries });
  };

  const isBalanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">New Voucher
          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
             {isBalanced ? <span className="text-green-600 font-bold">Balanced</span> : <span className="text-red-500 font-bold">Unbalanced</span>}
          </span>
        </h2>
        <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button onClick={handleSave} disabled={!isBalanced} className={`px-4 py-2 rounded flex items-center gap-2 text-white font-medium ${isBalanced ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}><Save size={18} />Save Voucher</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Voucher Type</label>
          <select value={voucherType} onChange={(e) => setVoucherType(e.target.value as VoucherType)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900">
            {Object.values(VoucherType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Voucher #</label>
          <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 bg-white text-gray-900"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded bg-white text-gray-900"/>
        </div>
        <div className="md:col-span-1">
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Narration</label>
            <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Rent paid" className="w-full p-2 border rounded bg-white text-gray-900"/>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 w-10 text-gray-500">#</th>
              <th className="p-3 text-gray-500">Ledger Account</th>
              <th className="p-3 w-32 text-right text-gray-500">Debit</th>
              <th className="p-3 w-32 text-right text-gray-500">Credit</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-3 text-gray-400">{idx + 1}</td>
                <td className="p-2">
                  <select value={entry.ledgerId} onChange={(e) => handleEntryChange(idx, 'ledgerId', e.target.value)} className="w-full p-2 border rounded bg-white text-gray-900 focus:border-indigo-500 outline-none">
                    <option value="">Select Ledger...</option>
                    {ledgers.map(l => (<option key={l.id} value={l.id}>{l.name} ({l.group})</option>))}
                  </select>
                  {entry.ledgerId && <div className="text-[10px] text-gray-500 mt-1 pl-1 font-semibold">{getLedgerBalanceString(entry.ledgerId)}</div>}
                </td>
                <td className="p-2 align-top">
                  <input type="number" step="0.01" value={entry.debit || ''} onChange={(e) => handleEntryChange(idx, 'debit', e.target.value)} className="w-full p-2 border rounded text-right bg-white" placeholder="0.00" disabled={entry.credit > 0}/>
                </td>
                <td className="p-2 align-top">
                  <input type="number" step="0.01" value={entry.credit || ''} onChange={(e) => handleEntryChange(idx, 'credit', e.target.value)} className="w-full p-2 border rounded text-right bg-white" placeholder="0.00" disabled={entry.debit > 0}/>
                </td>
                <td className="p-2 text-center align-top pt-3">
                  <button onClick={() => removeRow(idx)} disabled={entries.length <= 2} className="text-red-400 hover:text-red-600 disabled:text-gray-100"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold text-gray-700">
            <tr>
              <td colSpan={2} className="p-3 text-right">Total</td>
              <td className="p-3 text-right text-indigo-700">{totalDr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="p-3 text-right text-indigo-700">{totalCr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <button onClick={addRow} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"><Plus size={16} /> Add Line Item</button>
        {!isBalanced && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle size={16} /><span>Difference: {Math.abs(totalDr - totalCr).toFixed(2)}</span></div>}
      </div>
    </div>
  );
};

export default VoucherEntry;