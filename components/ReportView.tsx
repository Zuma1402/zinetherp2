import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrialBalanceRow, FinancialSummary } from '../types';

interface ReportViewProps {
  trialBalance: TrialBalanceRow[];
  summary: FinancialSummary;
}

const ReportView: React.FC<ReportViewProps> = ({ trialBalance, summary }) => {
  const chartData = [
    { name: 'Income', amount: summary.totalIncome, color: '#10b981' },
    { name: 'Expense', amount: summary.totalExpenses, color: '#f59e0b' },
    { name: 'Assets', amount: summary.totalAssets, color: '#3b82f6' },
    { name: 'Liabilities', amount: summary.totalLiabilities, color: '#ef4444' },
    { name: 'Equity', amount: summary.totalEquity, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 uppercase font-semibold">Net Profit</p>
            <h3 className={`text-3xl font-bold mt-2 ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.netProfit.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
            </h3>
         </div>
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 uppercase font-semibold">Total Revenue</p>
            <h3 className="text-3xl font-bold mt-2 text-gray-800">
                {summary.totalIncome.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
            </h3>
         </div>
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 uppercase font-semibold">Total Expenses</p>
            <h3 className="text-3xl font-bold mt-2 text-gray-800">
                {summary.totalExpenses.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}
            </h3>
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