import React, { useState, useMemo } from 'react';
import { Ledger, Voucher, AccountType } from '../types';
import { calculateTrialBalance } from '../services/accountingService';
import { Download, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  vouchers: Voucher[];
  ledgers: Ledger[];
  companyName: string;
}

const ProfitLossStatement: React.FC<Props> = ({ vouchers, ledgers, companyName }) => {
  // Date State - Default to current month (Local Time)
  const [startDate, setStartDate] = useState(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  // Calculate Data based on filters
  const trialBalance = useMemo(() => 
    calculateTrialBalance(ledgers, vouchers, startDate, endDate), 
  [ledgers, vouchers, startDate, endDate]);

  // Filter Rows - Only show accounts with activity (balance > 0)
  const incomeRows = trialBalance.filter(row => {
    const ledger = ledgers.find(l => l.id === row.ledgerId);
    return ledger?.type === AccountType.INCOME && row.netBalance > 0;
  });

  const expenseRows = trialBalance.filter(row => {
    const ledger = ledgers.find(l => l.id === row.ledgerId);
    return ledger?.type === AccountType.EXPENSE && row.netBalance > 0;
  });

  // Calculate Totals
  const totalRevenue = incomeRows.reduce((sum, row) => sum + (row.balanceType === 'Cr' ? row.netBalance : -row.netBalance), 0);
  const totalExpense = expenseRows.reduce((sum, row) => sum + (row.balanceType === 'Dr' ? row.netBalance : -row.netBalance), 0);
  const netProfit = totalRevenue - totalExpense;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Profit & Loss Statement", 14, 28);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 34);
    
    doc.setTextColor(0);
    
    const tableData = [
         // REVENUE HEADER
         [{ content: 'REVENUE', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: '', styles: { fillColor: [240, 240, 240] } }],
         ...incomeRows.map(r => [r.ledgerName, r.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })]),
         [{ content: 'Total Revenue', styles: { fontStyle: 'bold', halign: 'right' } }, { content: totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', lineWidth: { top: 0.1 } } }],
         
         // SPACER
         ['', ''],

         // EXPENSE HEADER
         [{ content: 'EXPENSES', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: '', styles: { fillColor: [240, 240, 240] } }],
         ...expenseRows.map(r => [r.ledgerName, r.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })]),
         [{ content: 'Total Operating Expense', styles: { fontStyle: 'bold', halign: 'right' } }, { content: totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', lineWidth: { top: 0.1 } } }],
         
         // SPACER
         ['', ''],

         // PROFIT
         [{ content: `NET PROFIT`, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], fontSize: 11 } }, 
          { content: netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [230, 230, 230], halign: 'right', fontSize: 11, textColor: netProfit >= 0 ? [0, 100, 0] : [200, 0, 0] } }]
    ];

    autoTable(doc, {
        startY: 45,
        head: [],
        body: tableData,
        theme: 'plain',
        columnStyles: {
            0: { cellWidth: 140 },
            1: { cellWidth: 40, halign: 'right' }
        },
        styles: {
            fontSize: 10,
            cellPadding: 3,
        }
    });

    doc.save('Profit_Loss_Statement.pdf');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2">
      {/* Top Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
         <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Financial Reports</h2>
            <p className="text-gray-500 text-sm mt-1">Detailed Profit & Loss Statement</p>
         </div>
         
         <div className="flex gap-4 items-end flex-wrap">
             {/* Standard Date Filter (Matching Ledger/Journal Style) */}
             <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
                 <CalendarIcon size={18} className="text-gray-500 ml-1"/>
                 <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="text-sm outline-none text-gray-700 font-medium bg-white cursor-pointer" 
                    title="Start Date"
                 />
                 <span className="text-gray-400 font-medium">-</span>
                 <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="text-sm outline-none text-gray-700 font-medium bg-white cursor-pointer" 
                    title="End Date"
                 />
             </div>

             <button 
                onClick={downloadPDF} 
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm transition-all"
             >
                <Download size={18} /> Export PDF
             </button>
         </div>
      </div>

      {/* Main Report Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 min-h-[600px] flex flex-col overflow-hidden">
        
        {/* Report Header */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start gap-4">
             <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{companyName}</h1>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Statement of Profit & Loss</div>
             </div>
             
             <div className="bg-white border border-gray-200 rounded-lg px-5 py-3 shadow-sm flex items-center gap-3">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
                    <CalendarIcon size={18} />
                 </div>
                 <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Reporting Period</div>
                    <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        {formatDate(startDate)} 
                        <ArrowRight size={14} className="text-gray-400"/>
                        {formatDate(endDate)}
                    </div>
                 </div>
             </div>
        </div>

        {/* Report Content */}
        <div className="p-10 flex-1 font-sans">
            
            {/* REVENUE */}
            <div className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">Revenue</h3>
                    <div className="flex-1 h-px bg-gray-100"></div>
                </div>
                
                <div className="space-y-4 pl-2">
                    {incomeRows.map(row => (
                        <div key={row.ledgerId} className="flex justify-between items-end group">
                            <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{row.ledgerName}</span>
                            <div className="flex-1 mx-4 border-b border-gray-200 border-dotted mb-1"></div>
                            <span className="font-mono text-gray-800 font-semibold">{row.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                    {incomeRows.length === 0 && (
                        <div className="text-gray-400 italic text-sm py-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            No revenue recorded in this period
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <div className="w-full md:w-1/2 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total Revenue</span>
                        <span className="text-lg font-bold text-gray-900 font-mono">{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* EXPENSES */}
            <div className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-xs font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">Expenses</h3>
                    <div className="flex-1 h-px bg-gray-100"></div>
                </div>

                <div className="space-y-4 pl-2">
                    {expenseRows.map(row => (
                        <div key={row.ledgerId} className="flex justify-between items-end group">
                            <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{row.ledgerName}</span>
                            <div className="flex-1 mx-4 border-b border-gray-200 border-dotted mb-1"></div>
                            <span className="font-mono text-gray-800 font-semibold">{row.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                    {expenseRows.length === 0 && (
                        <div className="text-gray-400 italic text-sm py-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            No expenses recorded in this period
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <div className="w-full md:w-1/2 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total Expenses</span>
                        <span className="text-lg font-bold text-gray-900 font-mono">{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* NET PROFIT */}
            <div className="mt-12 pt-8 border-t-2 border-gray-100">
                <div className="flex justify-end">
                     <div className={`p-8 rounded-2xl w-full md:w-2/3 lg:w-1/2 flex justify-between items-center shadow-sm border
                        ${netProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}
                     `}>
                         <div>
                             <h4 className={`text-sm font-bold uppercase tracking-wider mb-2
                                ${netProfit >= 0 ? 'text-green-800' : 'text-red-800'}
                             `}>Net Profit / (Loss)</h4>
                             <p className={`text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                for {companyName}
                             </p>
                         </div>
                         <span className={`text-4xl font-bold font-mono tracking-tight
                            ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}
                         `}>
                            {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </span>
                     </div>
                </div>
            </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
            <p className="text-xs text-gray-400 font-medium">Generated on {new Date().toLocaleDateString()} via ZinethERP</p>
        </div>

      </div>
    </div>
  );
};

export default ProfitLossStatement;