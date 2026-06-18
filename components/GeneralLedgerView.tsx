import React, { useState, useMemo, useEffect } from 'react';
import { Ledger, Voucher, AccountType } from '../types';
import { Calendar, Info, TrendingUp, TrendingDown, Clock, ArrowRight } from 'lucide-react';

interface GeneralLedgerViewProps {
  ledgers: Ledger[];
  vouchers: Voucher[];
  initialLedgerId?: string;
}

const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ ledgers, vouchers, initialLedgerId }) => {
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>(initialLedgerId || ledgers[0]?.id || '');
  
  useEffect(() => {
    if (initialLedgerId) setSelectedLedgerId(initialLedgerId);
  }, [initialLedgerId]);

  const [startDate, setStartDate] = useState(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const selectedLedger = ledgers.find(l => l.id === selectedLedgerId);

  // Logic: 
  // 1. Calculate transactions in selected period
  // 2. Calculate balance PRIOR to start date (Historical Opening + Transactions before startDate)
  // 3. Generate rows with running balance
  const { transactionsWithRunningBalance, periodTotalDr, periodTotalCr, openingBalForPeriod } = useMemo(() => {
    if (!selectedLedgerId || !selectedLedger) return { transactionsWithRunningBalance: [], periodTotalDr: 0, periodTotalCr: 0, openingBalForPeriod: 0 };

    let historicalDr = 0;
    let historicalCr = 0;

    const isDrNature = [AccountType.ASSET, AccountType.EXPENSE].includes(selectedLedger.type);
    
    if (isDrNature) historicalDr += selectedLedger.openingBalance;
    else historicalCr += selectedLedger.openingBalance;

    let pDr = 0;
    let pCr = 0;

    // Filter and sort all vouchers for this ledger
    const allRelevantVouchers = vouchers
      .filter(v => v.entries.some(e => e.ledgerId === selectedLedgerId))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Opening Balance for the period
    allRelevantVouchers.forEach(v => {
      if (v.date < startDate) {
        const entry = v.entries.find(e => e.ledgerId === selectedLedgerId);
        if (entry) {
          historicalDr += entry.debit;
          historicalCr += entry.credit;
        }
      }
    });

    const historicalNet = historicalDr - historicalCr;
    let running = historicalNet;
    const list: any[] = [];

    // Process current period vouchers
    allRelevantVouchers.forEach(v => {
      if (v.date >= startDate && v.date <= endDate) {
        const entry = v.entries.find(e => e.ledgerId === selectedLedgerId);
        if (entry) {
          running += (entry.debit - entry.credit);
          list.push({
            date: v.date,
            voucherNo: v.number,
            type: v.type,
            narration: v.narration,
            debit: entry.debit,
            credit: entry.credit,
            runningBalance: running
          });
          pDr += entry.debit;
          pCr += entry.credit;
        }
      }
    });
    
    return { 
        transactionsWithRunningBalance: list, 
        periodTotalDr: pDr, 
        periodTotalCr: pCr,
        openingBalForPeriod: historicalNet
    };
  }, [selectedLedgerId, selectedLedger, vouchers, startDate, endDate]);

  const netClosing = openingBalForPeriod + (periodTotalDr - periodTotalCr);
  const closingType = netClosing >= 0 ? 'Dr' : 'Cr';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tight">Ledger Analysis</h2>
           <p className="text-gray-500 font-medium text-xs uppercase tracking-widest mt-1">Integrated Chart of Account Balances</p>
        </div>
        <div className="flex gap-4 items-end flex-wrap">
             <div className="w-72">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Account</label>
                <select className="w-full p-3.5 border-2 border-white rounded-2xl shadow-sm bg-white text-gray-900 font-bold focus:ring-4 ring-indigo-50 outline-none appearance-none cursor-pointer" value={selectedLedgerId} onChange={e => setSelectedLedgerId(e.target.value)}>
                    {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
             </div>
             <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border-2 border-white shadow-sm ring-indigo-50">
                 <Calendar size={18} className="text-indigo-500 ml-1"/>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm font-bold outline-none bg-white text-gray-700" />
                 <span className="text-gray-300 font-bold px-1">-</span>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm font-bold outline-none bg-white text-gray-700" />
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 flex justify-between items-center">
              <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">COA Opening Balance</div>
                  <div className="text-xl font-mono font-black text-gray-900">
                    {Math.abs(openingBalForPeriod).toLocaleString()} {openingBalForPeriod >= 0 ? 'Dr' : 'Cr'}
                  </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl text-gray-400"><Info size={20}/></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 flex justify-between items-center">
              <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Period Movement</div>
                  <div className={`text-xl font-mono font-black ${(periodTotalDr - periodTotalCr) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(periodTotalDr - periodTotalCr) >= 0 ? '+' : ''}{(periodTotalDr - periodTotalCr).toLocaleString()}
                  </div>
              </div>
              <div className={`p-3 rounded-2xl ${(periodTotalDr - periodTotalCr) >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                {(periodTotalDr - periodTotalCr) >= 0 ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
              </div>
          </div>
          <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-2xl shadow-indigo-200 flex justify-between items-center text-white">
              <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Closing Ledger Balance</div>
                  <div className="text-2xl font-mono font-black">
                    {Math.abs(netClosing).toLocaleString()} {closingType}
                  </div>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl text-white"><Clock size={24}/></div>
          </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-8 bg-gray-50/50 border-b flex justify-between items-center">
           <div>
               <span className="font-black text-gray-900 block text-2xl tracking-tight">{selectedLedger?.name}</span>
               <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">{selectedLedger?.group}</span>
           </div>
        </div>
        <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-400 border-b">
                <tr>
                    <th className="p-6 font-black uppercase text-[10px] tracking-widest">Date</th>
                    <th className="p-6 font-black uppercase text-[10px] tracking-widest">Voucher #</th>
                    <th className="p-6 font-black uppercase text-[10px] tracking-widest">Particulars</th>
                    <th className="p-6 text-right font-black uppercase text-[10px] tracking-widest">Debit</th>
                    <th className="p-6 text-right font-black uppercase text-[10px] tracking-widest">Credit</th>
                    <th className="p-6 text-right font-black uppercase text-[10px] tracking-widest bg-gray-50/50">Running Balance</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                <tr className="bg-indigo-50/20">
                    <td className="p-6 text-gray-400 font-mono italic">{startDate}</td>
                    <td className="p-6 font-black text-indigo-700 uppercase tracking-tighter text-[10px]">OPENING</td>
                    <td className="p-6 text-gray-500 font-bold italic">Balance brought forward from previous periods</td>
                    <td className="p-6 text-right font-mono font-bold text-gray-900">{openingBalForPeriod >= 0 ? Math.abs(openingBalForPeriod).toLocaleString() : '-'}</td>
                    <td className="p-6 text-right font-mono font-bold text-gray-900">{openingBalForPeriod < 0 ? Math.abs(openingBalForPeriod).toLocaleString() : '-'}</td>
                    <td className="p-6 text-right font-mono font-black text-indigo-800 bg-indigo-50/50">
                        {Math.abs(openingBalForPeriod).toLocaleString()} {openingBalForPeriod >= 0 ? 'Dr' : 'Cr'}
                    </td>
                </tr>

                {transactionsWithRunningBalance.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 group transition-colors">
                        <td className="p-6 text-gray-600 font-mono">{tx.date}</td>
                        <td className="p-6 font-black text-indigo-600 tracking-tighter uppercase text-xs">{tx.voucherNo}</td>
                        <td className="p-6 text-gray-700 font-medium">{tx.narration}</td>
                        <td className="p-6 text-right font-mono font-bold text-gray-900">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</td>
                        <td className="p-6 text-right font-mono font-bold text-gray-900">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</td>
                        <td className="p-6 text-right font-mono font-black text-indigo-900 bg-gray-50/30">
                            {Math.abs(tx.runningBalance).toLocaleString()} {tx.runningBalance >= 0 ? 'Dr' : 'Cr'}
                        </td>
                    </tr>
                ))}
                {transactionsWithRunningBalance.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs">
                           No transactions found in selected period.
                        </td>
                    </tr>
                )}
            </tbody>
            <tfoot className="bg-gray-900 text-white font-bold border-t">
                <tr>
                    <td colSpan={3} className="p-8 text-right text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Period Totals</td>
                    <td className="p-8 text-right font-mono text-xl">{periodTotalDr.toLocaleString()}</td>
                    <td className="p-8 text-right font-mono text-xl">{periodTotalCr.toLocaleString()}</td>
                    <td className="p-8 text-right font-mono text-xl bg-black/20">
                        {Math.abs(netClosing).toLocaleString()} {closingType}
                    </td>
                </tr>
            </tfoot>
        </table>
      </div>
    </div>
  );
};

export default GeneralLedgerView;