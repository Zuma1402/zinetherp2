import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrialBalanceRow, FinancialSummary, Department, Division, Ledger, Voucher, InventoryItem, VoucherType } from '../types';
import { supabase } from '../services/supabaseService';
import { Layers, Compass, BookOpen, Wallet, Package, ShoppingBag, Search, Download, BarChart2 } from 'lucide-react';

interface ReportViewProps {
  trialBalance: TrialBalanceRow[];
  summary: FinancialSummary;
  ledgers?: Ledger[];
  vouchers?: Voucher[];
  inventory?: InventoryItem[];
}

const ReportView: React.FC<ReportViewProps> = ({ trialBalance, summary, ledgers = [], vouchers = [], inventory = [] }) => {
  // ⭐ Segments Structural Hooks
  const [activeDept, setActiveDept] = useState('');
  const [activeDiv, setActiveDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  
  // ⭐ Active Report Tab Hook (Default: OVERVIEW)
  const [activeReportTab, setActiveReportTab] = useState<'OVERVIEW' | 'TRIAL_BALANCE' | 'CASH_BANK' | 'STOCK_SUMMARY' | 'SALES_TAX'>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCashBankLedger, setSelectedCashBankLedger] = useState('');
  
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

  // ⭐ 1. Nayi Report: Extended Trial Balance Calculations
  const extendedTrialData = useMemo(() => {
    return ledgers.map(ledger => {
      let debit = 0;
      let credit = 0;

      vouchers.forEach(v => {
        v.entries?.forEach(e => {
          if (e.ledgerId === ledger.id) {
            debit += e.debit || 0;
            credit += e.credit || 0;
          }
        });
      });

      const netBalance = (ledger.openingBalance || 0) + (debit - credit);

      return {
        id: ledger.id,
        name: ledger.name,
        group: ledger.group,
        type: ledger.type,
        opening: ledger.openingBalance || 0,
        debit,
        credit,
        netBalance
      };
    }).filter(row => 
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      row.group.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ledgers, vouchers, searchTerm]);

  const trialTotals = useMemo(() => {
    return extendedTrialData.reduce((acc, row) => ({
      debit: acc.debit + row.debit,
      credit: acc.credit + row.credit
    }), { debit: 0, credit: 0 });
  }, [extendedTrialData]);

  // ⭐ 2. Nayi Report: Cash & Bank Accounts Filtering
  const cashBankLedgers = useMemo(() => {
    return ledgers.filter(l => 
      l.type === 'ASSET' && (
        l.name.toLowerCase().includes('cash') || 
        l.name.toLowerCase().includes('bank') || 
        l.group.toLowerCase().includes('cash') || 
        l.group.toLowerCase().includes('bank')
      )
    );
  }, [ledgers]);

  const cashBankTransactions = useMemo(() => {
    const targetId = selectedCashBankLedger || (cashBankLedgers[0]?.id || '');
    if (!targetId) return [];

    const list: any[] = [];
    vouchers.forEach(v => {
      v.entries?.forEach(e => {
        if (e.ledgerId === targetId) {
          list.push({
            date: v.date,
            voucherNo: v.voucherNumber,
            type: v.type,
            narration: v.narration || e.description || '-',
            debit: e.debit || 0,
            credit: e.credit || 0
          });
        }
      });
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedCashBankLedger, cashBankLedgers, vouchers]);

  // ⭐ 3. Nayi Report: Sales & Tax Summary
  const salesTaxData = useMemo(() => {
    const salesVouchers = vouchers.filter(v => v.type === VoucherType.SALES);
    return salesVouchers.map(v => {
      const taxAmount = (v.totalAmount * (v.taxRate || 0)) / 100;
      return {
        id: v.id,
        date: v.date,
        voucherNo: v.voucherNumber,
        customerName: v.partyName || 'Cash Sale',
        subTotal: v.totalAmount,
        taxRate: v.taxRate || 0,
        taxAmount,
        grandTotal: v.totalAmount + taxAmount
      };
    }).filter(row => 
      row.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.voucherNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vouchers, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ⭐ 4 NAYI REPORTS KA SWITCHING NAVIGATION BAR */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveReportTab('OVERVIEW')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeReportTab === 'OVERVIEW'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart2 size={15} /> Overview & Trial
          </button>
          
          <button
            onClick={() => setActiveReportTab('TRIAL_BALANCE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeReportTab === 'TRIAL_BALANCE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BookOpen size={15} /> Trial Balance (آزمائشی میزان)
          </button>

          <button
            onClick={() => setActiveReportTab('CASH_BANK')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeReportTab === 'CASH_BANK'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Wallet size={15} /> Cash & Bank Book
          </button>

          <button
            onClick={() => setActiveReportTab('STOCK_SUMMARY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeReportTab === 'STOCK_SUMMARY'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package size={15} /> Stock Valuation
          </button>

          <button
            onClick={() => setActiveReportTab('SALES_TAX')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeReportTab === 'SALES_TAX'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ShoppingBag size={15} /> Sales & Tax Report
          </button>
        </div>

        {activeReportTab !== 'OVERVIEW' && (
          <button onClick={() => window.print()} className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-slate-800 shrink-0">
            <Download size={14} /> Export / Print
          </button>
        )}
      </div>

      {/* ⭐ REPORT TAB 1: MAIN FINANCIAL OVERVIEW & TRIAL BALANCE (PURANA AAPKA SETUP) */}
      {activeReportTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
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

          {/* Dynamic Segment P&L Statement Grid */}
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
      )}

      {/* ⭐ REPORT TAB 2: NAYI TRIAL BALANCE REPORT */}
      {activeReportTab === 'TRIAL_BALANCE' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden animate-in fade-in-50 duration-200">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search Trial Ledger..." 
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl font-bold bg-white outline-none" 
              />
            </div>
            <span className="text-xs font-bold text-gray-500">Live Double-Entry Verification</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-gray-600 font-black uppercase tracking-wider border-b">
              <tr>
                <th className="p-3.5 pl-6">Ledger / Account Name</th>
                <th className="p-3.5">Category Group</th>
                <th className="p-3.5 text-right">Debit Total</th>
                <th className="p-3.5 text-right">Credit Total</th>
                <th className="p-3.5 text-right pr-6">Net Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
              {extendedTrialData.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition">
                  <td className="p-3.5 pl-6 text-gray-900 font-extrabold">{row.name}</td>
                  <td className="p-3.5 text-gray-500 font-medium">{row.group}</td>
                  <td className="p-3.5 text-right text-emerald-600">{row.debit > 0 ? `Rs ${row.debit.toLocaleString()}` : '-'}</td>
                  <td className="p-3.5 text-right text-rose-600">{row.credit > 0 ? `Rs ${row.credit.toLocaleString()}` : '-'}</td>
                  <td className="p-3.5 text-right pr-6 font-black text-indigo-900">Rs {row.netBalance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black text-xs border-t">
              <tr>
                <td colSpan={2} className="p-4 pl-6 uppercase tracking-wider">Total Trial Balance Mizan</td>
                <td className="p-4 text-right text-emerald-400">Rs {trialTotals.debit.toLocaleString()}</td>
                <td className="p-4 text-right text-rose-400">Rs {trialTotals.credit.toLocaleString()}</td>
                <td className="p-4 text-right pr-6 text-indigo-300">Audited Node</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ⭐ REPORT TAB 3: NAYI CASH & BANK BOOK REPORT */}
      {activeReportTab === 'CASH_BANK' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Select Target Cash/Bank Account:</label>
            <select 
              value={selectedCashBankLedger} 
              onChange={e => setSelectedCashBankLedger(e.target.value)}
              className="p-2 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none min-w-[240px]"
            >
              {cashBankLedgers.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.group})</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b">
                <tr>
                  <th className="p-3.5 pl-6">Date</th>
                  <th className="p-3.5">Voucher #</th>
                  <th className="p-3.5">Particulars / Narration</th>
                  <th className="p-3.5 text-right">Inflow (Debit)</th>
                  <th className="p-3.5 text-right pr-6">Outflow (Credit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
                {cashBankTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="p-3.5 pl-6 text-gray-500">{tx.date}</td>
                    <td className="p-3.5 font-mono text-indigo-600">{tx.voucherNo}</td>
                    <td className="p-3.5 text-gray-800">{tx.narration}</td>
                    <td className="p-3.5 text-right text-emerald-600">{tx.debit > 0 ? `Rs ${tx.debit.toLocaleString()}` : '-'}</td>
                    <td className="p-3.5 text-right pr-6 text-rose-600">{tx.credit > 0 ? `Rs ${tx.credit.toLocaleString()}` : '-'}</td>
                  </tr>
                ))}
                {cashBankTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">No cash or bank transactions found for this account.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ⭐ REPORT TAB 4: NAYI STOCK VALUATION REPORT */}
      {activeReportTab === 'STOCK_SUMMARY' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden animate-in fade-in-50 duration-200">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Filter Inventory Item..." 
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl font-bold bg-white outline-none" 
              />
            </div>
            <span className="text-xs font-bold text-orange-600">Stock Valuation Engine</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="p-3.5 pl-6">Inventory Item Name</th>
                <th className="p-3.5 text-center">SKU / Code</th>
                <th className="p-3.5 text-right">Current Stock Qty</th>
                <th className="p-3.5 text-right">Cost Price</th>
                <th className="p-3.5 text-right pr-6">Total Stock Asset Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
              {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                const totalValue = item.currentStock * item.costPrice;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="p-3.5 pl-6 text-gray-900 font-extrabold">{item.name}</td>
                    <td className="p-3.5 text-center text-gray-400 font-mono">{item.sku || 'N/A'}</td>
                    <td className="p-3.5 text-right font-black text-indigo-700">{item.currentStock} {item.unit || 'Pcs'}</td>
                    <td className="p-3.5 text-right text-gray-600">Rs {item.costPrice.toLocaleString()}</td>
                    <td className="p-3.5 text-right pr-6 font-black text-emerald-600">Rs {totalValue.toLocaleString()}</td>
                  </tr>
                );
              })}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 italic">No inventory stock items available in the system.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ⭐ REPORT TAB 5: NAYI SALES & TAX REPORT */}
      {activeReportTab === 'SALES_TAX' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden animate-in fade-in-50 duration-200">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Filter Customer / Invoice..." 
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl font-bold bg-white outline-none" 
              />
            </div>
            <span className="text-xs font-bold text-blue-600">Sales Tax Audit Summary</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="p-3.5 pl-6">Invoice Date</th>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer / Party Name</th>
                <th className="p-3.5 text-right">Net Amount</th>
                <th className="p-3.5 text-right">Tax Rate (%)</th>
                <th className="p-3.5 text-right">Tax Collected</th>
                <th className="p-3.5 text-right pr-6">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
              {salesTaxData.map((s, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition">
                  <td className="p-3.5 pl-6 text-gray-500">{s.date}</td>
                  <td className="p-3.5 font-mono text-indigo-600">{s.voucherNo}</td>
                  <td className="p-3.5 text-gray-900">{s.customerName}</td>
                  <td className="p-3.5 text-right">Rs {s.subTotal.toLocaleString()}</td>
                  <td className="p-3.5 text-right text-orange-600">{s.taxRate}%</td>
                  <td className="p-3.5 text-right text-rose-600">Rs {s.taxAmount.toLocaleString()}</td>
                  <td className="p-3.5 text-right pr-6 font-black text-emerald-600">Rs {s.grandTotal.toLocaleString()}</td>
                </tr>
              ))}
              {salesTaxData.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">No sales invoices or tax transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default ReportView;