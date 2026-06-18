import React, { useState } from 'react';
import { Voucher, VoucherType, Ledger } from '../types';
import { Plus, Search, Calendar, ArrowLeft, Trash2 } from 'lucide-react';

interface TransactionManagerProps {
  title: string;
  type: VoucherType | 'ALL'; // 'ALL' for General Ledger view or similar
  vouchers: Voucher[];
  ledgers: Ledger[]; // For displaying names
  onSave: (data: any, secondaryData?: any) => void;
  onDelete?: (id: string) => void;
  FormComponent: React.FC<any>;
  formProps: any;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ 
  title, 
  type, 
  vouchers, 
  ledgers,
  onSave, 
  onDelete,
  FormComponent, 
  formProps 
}) => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  
  // Filters - Using en-CA for YYYY-MM-DD format in Local Time
  const [startDate, setStartDate] = useState(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [search, setSearch] = useState('');

  // Filter Vouchers
  const filteredVouchers = vouchers
    .filter(v => {
      const voucherType = v?.type ? String(v.type).toUpperCase() : '';
      const filterType = type === 'ALL' ? '' : String(type).toUpperCase();
      if (filterType && voucherType !== filterType) return false;

      if (v.date < startDate || v.date > endDate) return false;

      if (search) {
        const num = v.number ? String(v.number).toLowerCase() : '';
        const narr = v.narration ? String(v.narration).toLowerCase() : '';
        if (!num.includes(search.toLowerCase()) && !narr.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getLedgerName = (id: string) => ledgers.find(l => l.id === id)?.name || 'Unknown';

  // Calculate Total Value of filtered list (simplified: sum of first debit entry usually matches total)
  const totalValue = filteredVouchers.reduce((sum, v) => {
      // Find the main amount. For Sales/Purchase, it's usually the first Debit or Credit.
      // We'll sum all debits for display purposes.
      const voucherTotal = v.entries.reduce((s, e) => s + e.debit, 0);
      return sum + voucherTotal;
  }, 0);

  const handleDelete = (id: string, number: string) => {
    if (!onDelete) return;
    if (confirm(`Are you sure you want to delete ${title} ${number}? This action cannot be undone.`)) {
      onDelete(id);
    }
  };

  if (view === 'FORM') {
    return (
      <div>
        <button onClick={() => setView('LIST')} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={18} /> Back to {title} List
        </button>
        <FormComponent 
          {...formProps} 
          onSave={(data: any, sec: any) => {
            onSave(data, sec);
            setView('LIST');
          }} 
          onCancel={() => setView('LIST')} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500 text-sm">Manage and track your {title.toLowerCase()}</p>
        </div>
        <button 
          onClick={() => setView('FORM')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Search by Voucher # or Narration" 
                    className="w-full pl-9 p-2 border border-gray-300 rounded focus:ring-2 ring-indigo-200 outline-none bg-white text-gray-900"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
        </div>
        <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date</label>
             <input 
                type="date" 
                className="p-2 border border-gray-300 rounded outline-none bg-white text-gray-900" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
             />
        </div>
        <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date</label>
             <input 
                type="date" 
                className="p-2 border border-gray-300 rounded outline-none bg-white text-gray-900" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
             />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Voucher #</th>
                        <th className="p-4">Description</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4 text-center w-20">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredVouchers.map(v => {
                        const amount = v.entries.reduce((s, e) => s + e.debit, 0); // Total Debit
                        return (
                            <tr key={v.id} className="hover:bg-gray-50 group">
                                <td className="p-4 text-gray-600 whitespace-nowrap">{v.date}</td>
                                <td className="p-4 font-medium text-indigo-600">{v.number}</td>
                                <td className="p-4 text-gray-700 max-w-md truncate">{v.narration}</td>
                                <td className="p-4 text-right font-semibold text-gray-900">{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="p-4 text-center">
                                    {onDelete && (
                                      <button 
                                        onClick={() => handleDelete(v.id, v.number)}
                                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Delete Transaction"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {filteredVouchers.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No transactions found in this period.</td></tr>
                    )}
                </tbody>
                {filteredVouchers.length > 0 && (
                     <tfoot className="bg-gray-50 font-bold text-gray-800">
                        <tr>
                            <td colSpan={3} className="p-4 text-right">Total Period Value</td>
                            <td className="p-4 text-right">{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td></td>
                        </tr>
                     </tfoot>
                )}
            </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionManager;