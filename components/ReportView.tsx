import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrialBalanceRow, FinancialSummary, Department, Division, Ledger, Voucher, InventoryItem, VoucherType } from '../types';
import { supabase } from '../services/supabaseService';
import { Layers, Compass, BookOpen, Wallet, Package, ShoppingBag, Search, Download, BarChart2 } from 'lucide-react';

interface ReportViewProps {
  type?: 'TRIAL_BALANCE' | 'CASH_BANK' | 'STOCK_SUMMARY' | 'SALES_TAX';
  trialBalance: TrialBalanceRow[];
  summary: FinancialSummary;
  ledgers?: Ledger[];
  vouchers?: Voucher[];
  inventory?: InventoryItem[];
}

const ReportView: React.FC<ReportViewProps> = ({ type = 'TRIAL_BALANCE', trialBalance, summary, ledgers = [], vouchers = [], inventory = [] }) => {
  // ⭐ Segments Structural Hooks
  const [activeDept, setActiveDept] = useState('');
  const [activeDiv, setActiveDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  
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

  // ⭐ 1. Extended Trial Balance Calculations
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

  // ⭐ 2. Cash & Bank Accounts Filtering
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

  // ⭐ 3. Sales & Tax Summary
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
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            {type === 'TRIAL_BALANCE' && <><BookOpen className="text-indigo-600" size={22} /> Trial Balance (آزمائشی میزان)</>}
            {type === 'CASH_BANK' && <><Wallet className="text-emerald-600" size={22} /> Cash & Bank Book</>}
            {type === 'STOCK_SUMMARY' && <><Package className="text-orange-600" size={22} /> Stock Summary & Valuation</>}
            {type === 'SALES_TAX' && <><ShoppingBag className="text-blue-600" size={22} /> Sales & Tax Summary Report</>}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Real-time dynamic audit summary generated from live transactions</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Filter search..." 
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl font-bold bg-gray-50 outline-none focus:border-indigo-500" 
            />
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-slate-800 shrink-0">
            <Download size={14} /> Export / Print
          </button>
        </div>
      </div>

      {/* 1. TRIAL BALANCE */}
      {type === 'TRIAL_BALANCE' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
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

      {/* 2. CASH & BANK BOOK */}
      {type === 'CASH_BANK' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Select Cash/Bank Account:</label>
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
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">No transactions found for this account.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. STOCK SUMMARY */}
      {type === 'STOCK_SUMMARY' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="p-3.5 pl-6">Inventory Item Name</th>
                <th className="p-3.5 text-center">SKU / Code</th>
                <th className="p-3.5 text-right">Current Stock Qty</th>
                <th className="p-3.5 text-right">Cost Price</th>
                <th className="p-3.5 text-right pr-6">Total Asset Value</th>
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
                  <td colSpan={5} className="p-8 text-center text-gray-400 italic">No inventory stock items available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. SALES & TAX REPORT */}
      {type === 'SALES_TAX' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
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
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">No sales invoices recorded yet.</td>
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