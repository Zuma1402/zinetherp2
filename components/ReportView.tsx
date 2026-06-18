import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrialBalanceRow, FinancialSummary, Department, Division } from '../types';
import { supabase } from '../services/supabaseService';
import { Layers, Compass } from 'lucide-react';

interface ReportViewProps {
  trialBalance: TrialBalanceRow[];
  summary: FinancialSummary;
}

const ReportView: React.FC<ReportViewProps> = ({ trialBalance, summary }) => {
  // ⭐ Segments Structural Hooks
  const [activeDept, setActiveDept] = useState('');
  const [activeDiv, setActiveDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  
  // Dynamic filtered states computed locally
  const [computedSummary, setComputedSummary] = useState<FinancialSummary>(summary);

  useEffect(() => {
    const loadDimensions = async () => {
      const { data: d } = await supabase.from('departments').select('*');
      const { data: v } = await supabase.from('divisions').select('*');
      if (d) setDepartments(d);
      if (v) setDivisions(v);
    };
    loadDimensions();
  }, []);

  // Recalculate dimensional breakdown based on selected tags
  useEffect(() => {
    if (!activeDept && !activeDiv) {
      setComputedSummary(summary);
      return;
    }

    const runSegmentedPL = async () => {
      try {
        let query = supabase.from('journal_entries').select('debit, credit, ledgers(type)');
        
        if (activeDept) query = query.eq('department_id', activeDept);
        if (activeDiv) query = query.eq('division_id', activeDiv);

        const { data: lines } = await query;
        
        let inc = 0;
        let exp = 0;

        if (lines) {
          lines.forEach((l: any) => {
            const type = l.ledgers?.type;
            if (type === 'INCOME') inc += (l.credit - l.debit);
            if (type === 'EXPENSE') exp += (l.debit - l.credit);
          });
        }

        setComputedSummary({
          ...summary,
          totalIncome: inc,
          totalExpenses: exp,
          netProfit: inc - exp
        });
      } catch (err) {
        console.error('Error computing segmented statement metrics', err);
      }
    };

    runSegmentedPL();
  }, [activeDept, activeDiv, summary]);

  const chartData = [
    { name: 'Income', amount: computedSummary.totalIncome, color: '#10b981' },
    { name: 'Expense', amount: computedSummary.totalExpenses, color: '#f59e0b' },
    { name: 'Assets', amount: summary.totalAssets, color: '#3b82f6' },
    { name: 'Liabilities', amount: summary.totalLiabilities, color: '#ef4444' },
    { name: 'Equity', amount: summary.totalEquity, color: '#8b5cf6' },
  ];

  // Helper labels for Segment text
  const selectedDeptLabel = departments.find(d => d.id === activeDept)?.name || 'All Departments';
  const selectedDivLabel = divisions.find(v => v.id === activeDiv)?.name || 'All Divisions';

  return (
    <div className="space-y-6">
      {/* Dimensional Breakdown Management Segment Filters Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
        <span className="text-xs font-black text-gray-500 uppercase tracking-wider block">Segmented P&L Analytical Filters:</span>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-gray-200 flex-1 md:flex-none">
            <Layers size={14} className="text-indigo-600"/>
            <select value={activeDept} onChange={e => setActiveDept(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-gray-800">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-gray-200 flex-1 md:flex-none">
            <Compass size={14} className="text-indigo-600"/>
            <select value={activeDiv} onChange={e => setActiveDiv(e.target.value)} className="bg-transparent text-xs font-bold outline-none text-gray-800">
              <option value="">All Divisions</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 uppercase font-semibold">Net Profit {(activeDept || activeDiv) && '(Segmented)'}</p>
            <h3 className={`text-3xl font-bold mt-2 ${computedSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {computedSummary.netProfit.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
            </h3>
         </div>
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 uppercase font-semibold">Total Revenue {(activeDept || activeDiv) && '(Segmented)'}</p>
            <h3 className="text-3xl font-bold mt-2 text-gray-800">
                {computedSummary.totalIncome.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
            </h3>
         </div>
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 uppercase font-semibold">Total Expenses {(activeDept || activeDiv) && '(Segmented)'}</p>
            <h3 className="text-3xl font-bold mt-2 text-gray-800">
                {computedSummary.totalExpenses.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
            </h3>
         </div>
      </div>

      {/* ⭐ NEW ADDITION: Dynamic Segment P&L Statement Grid */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="border-b pb-4 mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Dimensional Profit & Loss Breakdown</h3>
            <p className="text-xs text-gray-400 font-medium">Segment View: <span className="text-indigo-600 font-bold">{selectedDeptLabel}</span> / <span className="text-indigo-600 font-bold">{selectedDivLabel}</span></p>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">Accounting Standard</span>
        </div>
        
        <div className="space-y-3 text-xs">
          <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg font-black text-gray-700">
            <span>Operating Revenue (Sales Invoices / Income)</span>
            <span className="font-mono text-green-600">+{computedSummary.totalIncome.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</span>
          </div>
          <div className="flex justify-between p-2.5 bg-gray-50/50 rounded-lg font-bold text-gray-600 pl-6">
            <span>Less: Cost of Goods Sold & Direct Procurement Bills</span>
            <span className="font-mono text-amber-600">-{computedSummary.totalExpenses.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</span>
          </div>
          <div className="border-t border-dashed my-2"></div>
          <div className="flex justify-between p-3 bg-indigo-50/50 text-indigo-900 rounded-xl font-black text-sm">
            <span>Net Segment Profit / (Loss)</span>
            <span className={`font-mono ${computedSummary.netProfit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
              {computedSummary.netProfit.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Chart */}
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Financial Overview</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* Trial Balance Table */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Trial Balance</h3>
            </div>
            <div className="overflow-auto flex-1 max-h-[400px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                        <tr>
                            <th className="p-3">Ledger</th>
                            <th className="p-3 text-right">Debit</th>
                            <th className="p-3 text-right">Credit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {trialBalance.map(row => (
                            <tr key={row.ledgerId} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-700">{row.ledgerName}</td>
                                <td className="p-3 text-right text-gray-600">
                                    {row.balanceType === 'Dr' ? row.netBalance.toLocaleString() : '-'}
                                </td>
                                <td className="p-3 text-right text-gray-600">
                                    {row.balanceType === 'Cr' ? row.netBalance.toLocaleString() : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold text-gray-800 sticky bottom-0">
                        <tr>
                            <td className="p-3 text-right">Total</td>
                            <td className="p-3 text-right">
                                {trialBalance.reduce((sum, r) => sum + (r.balanceType === 'Dr' ? r.netBalance : 0), 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                                {trialBalance.reduce((sum, r) => sum + (r.balanceType === 'Cr' ? r.netBalance : 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ReportView;