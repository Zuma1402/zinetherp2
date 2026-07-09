import React, { useState, useMemo } from 'react';
import { Ledger, Voucher, VoucherType } from '../types';
import { Calendar, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface AgingReportsProps {
  ledgers: Ledger[];
  vouchers: Voucher[];
}

export const AgingReports: React.FC<AgingReportsProps> = ({ ledgers, vouchers }) => {
  const [reportType, setReportType] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');

  const agingData = useMemo(() => {
    const today = new Date();
    
    const partyBalances = ledgers.map(party => {
      let totalInvoiced = 0;
      let totalCleared = 0;
      
      const buckets = {
        current: 0, // 0-30 days
        thirtyToSixty: 0, // 31-60 days
        sixtyToNinety: 0, // 61-90 days
        ninetyPlus: 0, // 90+ days
      };

      // Filter vouchers for this specific ledger
      const partyVouchers = vouchers.filter(v => 
        v.entries.some(e => e.ledgerId === party.id)
      );

      partyVouchers.forEach(vime => {
        const entry = vime.entries.find(e => e.ledgerId === party.id);
        if (!entry) return;

        const invoiceDate = new Date(vime.date);
        const diffTime = Math.abs(today.getTime() - invoiceDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (reportType === 'CUSTOMER') {
          if (vime.type === VoucherType.SALES) {
            totalInvoiced += entry.debit || 0;
            
            if (diffDays <= 30) buckets.current += (entry.debit || 0);
            else if (diffDays <= 60) buckets.thirtyToSixty += (entry.debit || 0);
            else if (diffDays <= 90) buckets.sixtyToNinety += (entry.debit || 0);
            else buckets.ninetyPlus += (entry.debit || 0);
          }
          if (vime.type === VoucherType.RECEIPT) {
            totalCleared += entry.credit || 0;
          }
        } else {
          if (vime.type === VoucherType.PURCHASE) {
            totalInvoiced += entry.credit || 0;

            if (diffDays <= 30) buckets.current += (entry.credit || 0);
            else if (diffDays <= 60) buckets.thirtyToSixty += (entry.credit || 0);
            else if (diffDays <= 90) buckets.sixtyToNinety += (entry.credit || 0);
            else buckets.ninetyPlus += (entry.credit || 0);
          }
          if (vime.type === VoucherType.PAYMENT) {
            totalCleared += entry.debit || 0;
          }
        }
      });

      const totalOutstanding = totalInvoiced - totalCleared;

      let remainingPayment = totalCleared;
      const adjustedBuckets = { ...buckets };

      ['ninetyPlus', 'sixtyToNinety', 'thirtyToSixty', 'current'].forEach((b) => {
        const key = b as keyof typeof buckets;
        if (remainingPayment >= adjustedBuckets[key]) {
          remainingPayment -= adjustedBuckets[key];
          adjustedBuckets[key] = 0;
        } else {
          adjustedBuckets[key] -= remainingPayment;
          remainingPayment = 0;
        }
      });

      return {
        id: party.id,
        name: party.name,
        totalInvoiced,
        totalCleared,
        totalOutstanding: totalOutstanding > 0 ? totalOutstanding : 0,
        buckets: totalOutstanding > 0 ? adjustedBuckets : { current: 0, thirtyToSixty: 0, sixtyToNinety: 0, ninetyPlus: 0 }
      };
    }).filter(p => p.totalInvoiced > 0);

    return partyBalances;
  }, [ledgers, vouchers, reportType]);

  // Grand Totals
  const totals = useMemo(() => {
    return agingData.reduce((acc, curr) => ({
      outstanding: acc.outstanding + curr.totalOutstanding,
      b1: acc.b1 + curr.buckets.current,
      b2: acc.b2 + curr.buckets.thirtyToSixty,
      b3: acc.b3 + curr.buckets.sixtyToNinety,
      b4: acc.b4 + curr.buckets.ninetyPlus,
    }), { outstanding: 0, b1: 0, b2: 0, b3: 0, b4: 0 });
  }, [agingData]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      {/* Header Tabs */}
      <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Aging Analysis Dashboard</h2>
          <p className="text-xs font-medium text-gray-500 mt-1">Track outstanding timelines and credit history intervals</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit border border-gray-200 shadow-inner">
          <button
            onClick={() => setReportType('CUSTOMER')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${reportType === 'CUSTOMER' ? 'bg-white text-indigo-700 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowUpRight size={14} /> Accounts Receivable (Customers)
          </button>
          <button
            onClick={() => setReportType('VENDOR')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${reportType === 'VENDOR' ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowDownLeft size={14} /> Accounts Payable (Vendors)
          </button>
        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-5 border-b border-gray-100 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-slate-50/20">
        <div className="p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Outstanding</div>
          <div className={`text-xl font-black mt-1 ${reportType === 'CUSTOMER' ? 'text-indigo-600' : 'text-blue-600'}`}>Rs. {totals.outstanding.toLocaleString()}</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">0 - 30 Days (Current)</div>
          <div className="text-xl font-extrabold text-green-600 mt-1">Rs. {totals.b1.toLocaleString()}</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">31 - 60 Days</div>
          <div className="text-xl font-extrabold text-amber-500 mt-1">Rs. {totals.b2.toLocaleString()}</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">61 - 90 Days</div>
          <div className="text-xl font-extrabold text-orange-500 mt-1">Rs. {totals.b3.toLocaleString()}</div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">90+ Days (Critical)</div>
          <div className="text-xl font-black text-rose-600 mt-1">Rs. {totals.b4.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Grid Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-gray-500 text-[11px] font-bold uppercase border-b border-gray-100 tracking-wider">
              <th className="p-4 pl-6">Party / Account Name</th>
              <th className="p-4 text-right">Total Billed</th>
              <th className="p-4 text-right">Total Paid</th>
              <th className="p-4 text-right bg-slate-100/50 text-gray-800">Outstanding</th>
              <th className="p-4 text-right text-green-700">0-30 Days</th>
              <th className="p-4 text-right text-amber-700">31-60 Days</th>
              <th className="p-4 text-right text-orange-700">61-90 Days</th>
              <th className="p-4 text-right text-rose-700">90+ Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
            {agingData.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400 font-semibold animate-pulse">
                  No layout telemetry found for this bracket cycle. Create invoices to build data matrix points!
                </td>
              </tr>
            ) : (
              agingData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-gray-900">{row.name}</td>
                  <td className="p-4 text-right text-gray-500">Rs. {row.totalInvoiced.toLocaleString()}</td>
                  <td className="p-4 text-right text-gray-500">Rs. {row.totalCleared.toLocaleString()}</td>
                  <td className="p-4 text-right font-black bg-slate-50 text-slate-900">Rs. {row.totalOutstanding.toLocaleString()}</td>
                  <td className={`p-4 text-right font-bold ${row.buckets.current > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                    {row.buckets.current > 0 ? `Rs. ${row.buckets.current.toLocaleString()}` : '—'}
                  </td>
                  <td className={`p-4 text-right font-bold ${row.buckets.thirtyToSixty > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                    {row.buckets.thirtyToSixty > 0 ? `Rs. ${row.buckets.thirtyToSixty.toLocaleString()}` : '—'}
                  </td>
                  <td className={`p-4 text-right font-bold ${row.buckets.sixtyToNinety > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                    {row.buckets.sixtyToNinety > 0 ? `Rs. ${row.buckets.sixtyToNinety.toLocaleString()}` : '—'}
                  </td>
                  <td className={`p-4 text-right font-black ${row.buckets.ninetyPlus > 0 ? 'text-rose-600' : 'text-gray-300'}`}>
                    {row.buckets.ninetyPlus > 0 ? `Rs. ${row.buckets.ninetyPlus.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};