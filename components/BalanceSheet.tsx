import React, { useState, useMemo, useEffect } from 'react';
import { Ledger, Voucher, AccountType } from '../types';
import { calculateTrialBalance } from '../services/accountingService';
import { Download, Calendar, Globe } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  vouchers: Voucher[];
  ledgers: Ledger[];
  companyName: string;
}

const BalanceSheet: React.FC<Props> = ({ vouchers, ledgers, companyName }) => {
  // Fix: Use Local Time for default date
  const [asOfDate, setAsOfDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  // 🧾 Multi-Currency Dynamic Toggle Configuration States
  const [baseCurrency, setBaseCurrency] = useState<string>('PKR');
  const [displayCurrency, setDisplayCurrency] = useState<string>('PKR');
  const [reportExchangeRate, setReportExchangeRate] = useState<number>(1);

  // Fetch active partition default metrics baseline configuration mapping
  useEffect(() => {
    const fetchActiveReportingCurrency = async () => {
      const activeCompanyId = localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
      if (activeCompanyId) {
        const { data } = await supabase.from('companies').select('base_currency').eq('id', activeCompanyId).maybeSingle();
        if (data && data.base_currency) {
          setBaseCurrency(data.base_currency);
          setDisplayCurrency(data.base_currency);
        }
      }
    };
    fetchActiveReportingCurrency();
  }, []);

  // Use current date for "As Of" calculation (EndDate = asOfDate, StartDate = undefined for full history of Assets/Liabs)
  const trialBalance = useMemo(() => 
    calculateTrialBalance(ledgers, vouchers, undefined, asOfDate), 
  [ledgers, vouchers, asOfDate]);

  // Calculate Net Profit for Retained Earnings (This needs the P&L calc for the same period)
  // Balance Sheet Retained Earnings = Income - Expense (All Time up to asOfDate)
  const incomeTotal = trialBalance
    .filter(r => ledgers.find(l => l.id === r.ledgerId)?.type === AccountType.INCOME)
    .reduce((sum, r) => sum + (r.balanceType === 'Cr' ? r.netBalance : -r.netBalance), 0);
    
  const expenseTotal = trialBalance
    .filter(r => ledgers.find(l => l.id === r.ledgerId)?.type === AccountType.EXPENSE)
    .reduce((sum, r) => sum + (r.balanceType === 'Dr' ? r.netBalance : -r.netBalance), 0);
    
  const netProfit = (incomeTotal - expenseTotal) * (displayCurrency !== baseCurrency ? reportExchangeRate : 1);

  // Group Assets with real-time scalar multiplier mapping hooks
  const assets = useMemo(() => {
    const assetRows = trialBalance.filter(row => {
      const l = ledgers.find(i => i.id === row.ledgerId);
      return l?.type === AccountType.ASSET;
    });
    return assetRows.map(r => ({
      ...r,
      convertedBalance: r.netBalance * (displayCurrency !== baseCurrency ? reportExchangeRate : 1)
    }));
  }, [trialBalance, ledgers, displayCurrency, baseCurrency, reportExchangeRate]);

  // Group Liabilities
  const liabilities = useMemo(() => {
    const liabRows = trialBalance.filter(row => {
      const l = ledgers.find(i => i.id === row.ledgerId);
      return l?.type === AccountType.LIABILITY;
    });
    return liabRows.map(r => ({
      ...r,
      convertedBalance: r.netBalance * (displayCurrency !== baseCurrency ? reportExchangeRate : 1)
    }));
  }, [trialBalance, ledgers, displayCurrency, baseCurrency, reportExchangeRate]);

  // Group Equity
  const equity = useMemo(() => {
    const eqRows = trialBalance.filter(row => {
      const l = ledgers.find(i => i.id === row.ledgerId);
      return l?.type === AccountType.EQUITY;
    });
    return eqRows.map(r => ({
      ...r,
      convertedBalance: r.netBalance * (displayCurrency !== baseCurrency ? reportExchangeRate : 1)
    }));
  }, [trialBalance, ledgers, displayCurrency, baseCurrency, reportExchangeRate]);

  const totalAssets = assets.reduce((sum, r) => sum + r.convertedBalance, 0);
  const totalLiabilities = liabilities.reduce((sum, r) => sum + r.convertedBalance, 0);
  const totalEquity = equity.reduce((sum, r) => sum + r.convertedBalance, 0);
  
  const totalLiabEquity = totalLiabilities + totalEquity + netProfit;

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(companyName, 14, 20);
    doc.setFontSize(14);
    doc.text(`Balance Sheet (${displayCurrency})`, 14, 28);
    doc.setFontSize(10);
    doc.text(`As on ${asOfDate} | Conversion Rate: ${displayCurrency !== baseCurrency ? `1 ${baseCurrency} = ${reportExchangeRate} ${displayCurrency}` : '1:1 Base Metric'}`, 14, 34);

    const verticalData = [
         [{ content: `ASSETS (${displayCurrency})`, styles: { fontStyle: 'bold', fillColor: [224, 231, 255] } }, ''],
         ...assets.map(a => [a.ledgerName, a.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })]),
         [{ content: 'Total Assets', styles: { fontStyle: 'bold' } }, totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })],
         ['', ''],
         [{ content: `LIABILITIES (${displayCurrency})`, styles: { fontStyle: 'bold', fillColor: [254, 226, 226] } }, ''],
         ...liabilities.map(l => [l.ledgerName, l.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })]),
         ['', ''],
         [{ content: `EQUITY (${displayCurrency})`, styles: { fontStyle: 'bold', fillColor: [253, 230, 138] } }, ''],
         ...equity.map(e => [e.ledgerName, e.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })]),
         ['Net Profit / (Loss) (Retained Earnings)', netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })],
         [{ content: 'Total Liabilities & Equity', styles: { fontStyle: 'bold' } }, totalLiabEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })],
    ];

    autoTable(doc, {
        startY: 40,
        body: verticalData,
        theme: 'plain',
    });

    doc.save(`Balance_Sheet_${displayCurrency}.pdf`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Balance Sheet</h2>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">As on:</span>
                  <input 
                      type="date" 
                      value={asOfDate} 
                      onChange={e => setAsOfDate(e.target.value)} 
                      className="border border-gray-300 rounded p-1 text-sm text-gray-900 bg-white" 
                  />
                </div>

                {/* 📊 Real-Time Multi-Currency Toggle Controller Selector element card layout container */}
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-900 shadow-inner">
                  <Globe size={14} className="text-indigo-600"/>
                  <span>Currency:</span>
                  <select value={displayCurrency} onChange={e => { const val = e.target.value; setDisplayCurrency(val); if(val === baseCurrency) setReportExchangeRate(1); }} className="bg-transparent font-black outline-none cursor-pointer">
                    <option value={baseCurrency}>{baseCurrency} (Base)</option>
                    {baseCurrency !== 'PKR' && <option value="PKR">PKR</option>}
                    {baseCurrency !== 'USD' && <option value="USD">USD ($)</option>}
                    {baseCurrency !== 'AED' && <option value="AED">AED</option>}
                    {baseCurrency !== 'GBP' && <option value="GBP">GBP (£)</option>}
                  </select>
                </div>

                {displayCurrency !== baseCurrency && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                    <span>Rate (1 {baseCurrency} = ):</span>
                    <input type="number" value={reportExchangeRate} onChange={e => setReportExchangeRate(parseFloat(e.target.value) || 1)} className="w-16 p-0.5 border border-indigo-200 bg-white rounded text-center text-indigo-700 outline-none font-mono" step="any" min="0.0001" />
                  </div>
                )}
            </div>
        </div>
        <button onClick={downloadPDF} className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded transition font-bold text-sm">
            <Download size={18} /> Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-sm">
        {/* Liabilities & Equity */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-indigo-600 pb-2 mb-4 uppercase">Liabilities & Equity ({displayCurrency})</h3>
            
            <div className="space-y-6">
                <div>
                    <h4 className="font-bold text-gray-600 mb-2">Capital & Equity</h4>
                    {equity.map(row => (
                        <div key={row.ledgerId} className="flex justify-between py-1 border-b border-gray-200 border-dashed">
                            <span>{row.ledgerName}</span>
                            <span>{row.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                    <div className="flex justify-between py-1 font-semibold text-indigo-700">
                        <span>Net Profit / (Loss)</span>
                        <span>{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-gray-600 mb-2">Liabilities</h4>
                    {liabilities.map(row => (
                        <div key={row.ledgerId} className="flex justify-between py-1 border-b border-gray-200 border-dashed">
                            <span>{row.ledgerName}</span>
                            <span>{row.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                    {liabilities.length === 0 && <div className="text-gray-400 italic text-xs">No liabilities</div>}
                </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-gray-300 flex justify-between items-center">
                <span className="font-bold text-lg">TOTAL</span>
                <span className="font-bold text-lg">{totalLiabEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
        </div>

        {/* Assets */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-indigo-600 pb-2 mb-4 uppercase">Assets ({displayCurrency})</h3>
            
            <div className="space-y-6">
                 {/* Current Assets */}
                 <div>
                    <h4 className="font-bold text-gray-600 mb-2">Current Assets</h4>
                    {assets.filter(a => ledgers.find(l => l.id === a.ledgerId)?.group.includes('Current') || ledgers.find(l => l.id === a.ledgerId)?.group.includes('Bank') || ledgers.find(l => l.id === a.ledgerId)?.group.includes('Cash') || ledgers.find(l => l.id === a.ledgerId)?.group.includes('Debtors')).map(row => (
                        <div key={row.ledgerId} className="flex justify-between py-1 border-b border-gray-200 border-dashed">
                            <span>{row.ledgerName}</span>
                            <span>{row.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                 </div>

                 {/* Fixed Assets */}
                 <div>
                    <h4 className="font-bold text-gray-600 mb-2">Fixed Assets</h4>
                    {assets.filter(a => ledgers.find(l => l.id === a.ledgerId)?.group.includes('Fixed')).map(row => (
                        <div key={row.ledgerId} className="flex justify-between py-1 border-b border-gray-200 border-dashed">
                            <span>{row.ledgerName}</span>
                            <span>{row.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                 </div>
                 
                 {/* Others */}
                  <div>
                    <h4 className="font-bold text-gray-600 mb-2">Other Assets</h4>
                    {assets.filter(a => 
                        !ledgers.find(l => l.id === a.ledgerId)?.group.includes('Fixed') && 
                        !ledgers.find(l => l.id === a.ledgerId)?.group.includes('Current') &&
                        !ledgers.find(l => l.id === a.ledgerId)?.group.includes('Bank') &&
                        !ledgers.find(l => l.id === a.ledgerId)?.group.includes('Cash') &&
                        !ledgers.find(l => l.id === a.ledgerId)?.group.includes('Debtors')
                    ).map(row => (
                        <div key={row.ledgerId} className="flex justify-between py-1 border-b border-gray-200 border-dashed">
                            <span>{row.ledgerName}</span>
                            <span>{row.convertedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                 </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-gray-300 flex justify-between items-center">
                <span className="font-bold text-lg">TOTAL</span>
                <span className="font-bold text-lg">{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default BalanceSheet;