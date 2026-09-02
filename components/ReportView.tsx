import React, { useState, useMemo } from 'react';
import { TrialBalanceRow, FinancialSummary, Ledger, Voucher, InventoryItem, VoucherType } from '../types';
import { BookOpen, Wallet, ArrowLeftRight, ShoppingBag, Search, Printer, Calendar, ArrowDownLeft, ArrowUpRight, PackageCheck, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ReportViewProps {
  type?: 'TRIAL_BALANCE' | 'CASH_BANK' | 'STOCK_MOVEMENT' | 'SALES_TAX';
  trialBalance: TrialBalanceRow[];
  summary: FinancialSummary;
  ledgers?: Ledger[];
  vouchers?: Voucher[];
  inventory?: InventoryItem[];
}

const ReportView: React.FC<ReportViewProps> = ({ type = 'TRIAL_BALANCE', trialBalance, summary, ledgers = [], vouchers = [], inventory = [] }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCashBankLedger, setSelectedCashBankLedger] = useState('');
  
  // ⭐ Global Date Range Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ⭐ Item Stock Selector
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Helper to filter vouchers by selected date range
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      if (startDate && v.date < startDate) return false;
      if (endDate && v.date > endDate) return false;
      return true;
    });
  }, [vouchers, startDate, endDate]);

  // 1. Trial Balance Calculation (With Date Range)
  const extendedTrialData = useMemo(() => {
    return ledgers.map(ledger => {
      let debit = 0;
      let credit = 0;

      filteredVouchers.forEach(v => {
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
  }, [ledgers, filteredVouchers, searchTerm]);

  const trialTotals = useMemo(() => {
    return extendedTrialData.reduce((acc, row) => ({
      debit: acc.debit + row.debit,
      credit: acc.credit + row.credit
    }), { debit: 0, credit: 0 });
  }, [extendedTrialData]);

  // 2. Cash & Bank Accounts Filtering (With Date Range)
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
    filteredVouchers.forEach(v => {
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
  }, [selectedCashBankLedger, cashBankLedgers, filteredVouchers]);

  // 3. Item Stock Ledger Movement (With Date Range)
  const selectedItemObj = useMemo(() => {
    const targetId = selectedItemId || (inventory[0]?.id || '');
    return inventory.find(i => i.id === targetId) || inventory[0];
  }, [selectedItemId, inventory]);

  const itemLedgerHistory = useMemo(() => {
    if (!selectedItemObj) return { rows: [], totalIn: 0, totalOut: 0, currentBalance: 0 };

    const transactions: any[] = [];

    filteredVouchers.forEach(v => {
      if (v.items && Array.isArray(v.items)) {
        v.items.forEach((line: any) => {
          if (line.itemId === selectedItemObj.id || line.description === selectedItemObj.name) {
            const qty = Number(line.quantity || line.qty || 0);
            let inQty = 0;
            let outQty = 0;

            if (v.type === VoucherType.PURCHASE || v.type === VoucherType.CREDIT_NOTE) {
              inQty = qty;
            } else if (v.type === VoucherType.SALES || v.type === VoucherType.DEBIT_NOTE) {
              outQty = qty;
            }

            if (inQty > 0 || outQty > 0) {
              transactions.push({
                date: v.date,
                voucherNo: v.voucherNumber,
                type: v.type,
                partyName: v.partyName || 'Counter Transaction',
                narration: v.narration || line.description || '-',
                inQty,
                outQty,
                rate: line.unitPrice || line.rate || selectedItemObj.costPrice || 0
              });
            }
          }
        });
      }
    });

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBal = 0;
    let totalIn = 0;
    let totalOut = 0;

    const rowsWithBalance = transactions.map(tx => {
      runningBal += (tx.inQty - tx.outQty);
      totalIn += tx.inQty;
      totalOut += tx.outQty;
      return {
        ...tx,
        runningBalance: runningBal
      };
    });

    return {
      rows: rowsWithBalance,
      totalIn,
      totalOut,
      currentBalance: selectedItemObj.currentStock || runningBal
    };
  }, [selectedItemObj, filteredVouchers]);

  // 4. Sales & Tax Summary (With Date Range)
  const salesTaxData = useMemo(() => {
    const salesVouchers = filteredVouchers.filter(v => v.type === VoucherType.SALES);
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
  }, [filteredVouchers, searchTerm]);

  return (
    <div className="space-y-6 printable-report">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report, .printable-report * {
            visibility: visible;
          }
          .printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            {type === 'TRIAL_BALANCE' && <><BookOpen className="text-indigo-600" size={22} /> {t('trialBalance')}</>}
            {type === 'CASH_BANK' && <><Wallet className="text-emerald-600" size={22} /> {t('cashBankBook')}</>}
            {type === 'STOCK_MOVEMENT' && <><ArrowLeftRight className="text-orange-600" size={22} /> {t('stockInOutflow')}</>}
            {type === 'SALES_TAX' && <><ShoppingBag className="text-blue-600" size={22} /> {t('salesTaxReport')}</>}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">{t('auditSummaryDesc')}</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-indigo-700 shrink-0">
            <Printer size={14} /> {t('exportPrint')}
          </button>
        </div>
      </div>

      {/* ⭐ GLOBAL FILTERS BAR: DATE RANGE & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Calendar size={15} className="text-indigo-600"/> {t('dateRange')}
          </label>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs font-bold">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="bg-transparent outline-none text-xs font-bold text-gray-800" 
            />
            <span className="text-gray-400 font-normal">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="bg-transparent outline-none text-xs font-bold text-gray-800" 
            />
          </div>

          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }} 
              className="text-[11px] font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
              title="Reset Dates"
            >
              <X size={13}/> {t('clearDates')}
            </button>
          )}
        </div>

        {type !== 'STOCK_MOVEMENT' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder={t('search')} 
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl font-bold bg-gray-50 outline-none focus:border-indigo-500" 
            />
          </div>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-4 border-b pb-2">
        <h1 className="text-xl font-black text-black uppercase">ZinethERP Financial Reporting</h1>
        <p className="text-xs font-bold text-gray-600">
          Generated Report: {type.replace('_', ' ')} | Date Range: {startDate || 'Start'} to {endDate || 'Today'}
        </p>
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
            <tfoot className="bg-slate-900 text-white print:bg-gray-200 print:text-black font-black text-xs border-t">
              <tr>
                <td colSpan={2} className="p-4 pl-6 uppercase tracking-wider">Total {t('trialBalance')}</td>
                <td className="p-4 text-right text-emerald-400 print:text-black">Rs {trialTotals.debit.toLocaleString()}</td>
                <td className="p-4 text-right text-rose-400 print:text-black">Rs {trialTotals.credit.toLocaleString()}</td>
                <td className="p-4 text-right pr-6 text-indigo-300 print:text-black">Audited Node</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 2. CASH & BANK BOOK */}
      {type === 'CASH_BANK' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3 no-print">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{t('selectAccount')}</label>
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
                  <th className="p-3.5 pl-6">{t('date')}</th>
                  <th className="p-3.5">{t('voucherNo')}</th>
                  <th className="p-3.5">{t('description')}</th>
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
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">No transactions found for this account in selected period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ITEM STOCK LEDGER CARD */}
      {type === 'STOCK_MOVEMENT' && (
        <div className="space-y-5">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3 no-print">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <PackageCheck size={16} className="text-indigo-600"/> {t('selectItem')}
            </label>
            <select 
              value={selectedItemId || (selectedItemObj?.id || '')} 
              onChange={e => setSelectedItemId(e.target.value)}
              className="w-full md:w-72 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-indigo-500"
            >
              {inventory.map(item => (
                <option key={item.id} value={item.id}>📦 {item.name} ({item.sku || 'No SKU'})</option>
              ))}
            </select>
          </div>

          {selectedItemObj && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Inflow Qty (Aamad)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                  <ArrowDownLeft size={20} /> +{itemLedgerHistory.totalIn} <span className="text-xs text-gray-500 font-bold">{selectedItemObj.unit || 'Pcs'}</span>
                </h3>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Outflow Qty (Kharij)</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1 flex items-center gap-1.5">
                  <ArrowUpRight size={20} /> -{itemLedgerHistory.totalOut} <span className="text-xs text-gray-500 font-bold">{selectedItemObj.unit || 'Pcs'}</span>
                </h3>
              </div>

              <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-md border border-indigo-800">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Current Stock Available</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {selectedItemObj.currentStock} <span className="text-xs text-indigo-200 font-bold">{selectedItemObj.unit || 'Pcs'}</span>
                </h3>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Item Stock Ledger: <span className="text-indigo-600">{selectedItemObj?.name}</span>
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">SKU: {selectedItemObj?.sku || 'N/A'} | Cost Rate: Rs {selectedItemObj?.costPrice?.toLocaleString() || 0}</p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md uppercase">
                Sequential In/Out Ledger
              </span>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-gray-600 font-black uppercase tracking-wider border-b">
                <tr>
                  <th className="p-3.5 pl-6">{t('date')}</th>
                  <th className="p-3.5">{t('voucherNo')}</th>
                  <th className="p-3.5">Transaction Type</th>
                  <th className="p-3.5">Party / Narration</th>
                  <th className="p-3.5 text-right text-emerald-700">Inflow Qty (Aamad)</th>
                  <th className="p-3.5 text-right text-rose-700">Outflow Qty (Kharij)</th>
                  <th className="p-3.5 text-right pr-6 text-indigo-900">Running Stock Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
                {itemLedgerHistory.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="p-3.5 pl-6 text-gray-500 font-medium">{row.date}</td>
                    <td className="p-3.5 font-mono text-indigo-600">{row.voucherNo}</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                        row.inQty > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-800">
                      <div>{row.partyName}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{row.narration}</div>
                    </td>
                    <td className="p-3.5 text-right text-emerald-600 font-black">
                      {row.inQty > 0 ? `+${row.inQty} ${selectedItemObj?.unit || 'Pcs'}` : '-'}
                    </td>
                    <td className="p-3.5 text-right text-rose-600 font-black">
                      {row.outQty > 0 ? `-${row.outQty} ${selectedItemObj?.unit || 'Pcs'}` : '-'}
                    </td>
                    <td className="p-3.5 text-right pr-6 font-black text-indigo-950 bg-indigo-50/30">
                      {row.runningBalance} {selectedItemObj?.unit || 'Pcs'}
                    </td>
                  </tr>
                ))}
                {itemLedgerHistory.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                      No stock movement history recorded for "{selectedItemObj?.name}" in selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">No sales invoices recorded in selected date period.</td>
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