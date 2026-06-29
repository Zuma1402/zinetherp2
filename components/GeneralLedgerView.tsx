import React, { useState, useMemo, useEffect } from 'react';
import { Ledger, Voucher, AccountType, Department, Division } from '../types';
import { Calendar, Info, TrendingUp, Clock, Layers, Compass, Download } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface GeneralLedgerViewProps {
  ledgers: Ledger[];
  vouchers: Voucher[];
  initialLedgerId?: string;
}

const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ ledgers, vouchers, initialLedgerId }) => {
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>(initialLedgerId || ledgers[0]?.id || '');
  
  const [filterDept, setFilterDept] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  useEffect(() => {
    if (initialLedgerId) setSelectedLedgerId(initialLedgerId);
  }, [initialLedgerId]);

  const loadDimensions = async () => {
    const { data: d } = await supabase.from('departments').select('*').order('name');
    const { data: v } = await supabase.from('divisions').select('*').order('name');
    if (d) setDepartments(d);
    if (v) setDivisions(v);
  };

  useEffect(() => {
    loadDimensions();
  }, [vouchers]);

  const [startDate, setStartDate] = useState(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const selectedLedger = ledgers.find(l => l.id === selectedLedgerId);

  const { transactionsWithRunningBalance, periodTotalDr, periodTotalCr, openingBalForPeriod } = useMemo(() => {
    if (!selectedLedgerId || !selectedLedger) return { transactionsWithRunningBalance: [], periodTotalDr: 0, periodTotalCr: 0, openingBalForPeriod: 0 };

    let historicalDr = 0;
    let historicalCr = 0;
    const isDrNature = [AccountType.ASSET, AccountType.EXPENSE].includes(selectedLedger.type);
    
    if (isDrNature) historicalDr += selectedLedger.openingBalance;
    else historicalCr += selectedLedger.openingBalance;

    let pDr = 0;
    let pCr = 0;

    const allRelevantVouchers = vouchers
      .filter(v => v.entries.some(e => {
        const matchesLedger = e.ledgerId === selectedLedgerId;
        const matchesDept = !filterDept || e.departmentId === filterDept;
        const matchesDiv = !filterDiv || e.divisionId === filterDiv;
        return matchesLedger && matchesDept && matchesDiv;
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    allRelevantVouchers.forEach(v => {
      if (v.date >= startDate && v.date <= endDate) {
        const entry = v.entries.find(e => e.ledgerId === selectedLedgerId);
        if (entry) {
          running += (entry.debit - entry.credit);
          list.push({ date: v.date, voucherNo: v.number, type: v.type, narration: v.narration, debit: entry.debit, credit: entry.credit, runningBalance: running });
          pDr += entry.debit;
          pCr += entry.credit;
        }
      }
    });
    
    return { transactionsWithRunningBalance: list, periodTotalDr: pDr, periodTotalCr: pCr, openingBalForPeriod: historicalNet };
  }, [selectedLedgerId, selectedLedger, vouchers, startDate, endDate, filterDept, filterDiv]);

  const handleExportLedgerToExcel = () => {
    if (!selectedLedger) return;

    let excelContent = `Date\tVoucher #\tParticulars / Narration Head\tDebit\tCredit\tRunning Balance\n`;
    const openType = openingBalForPeriod >= 0 ? 'Dr' : 'Cr';
    excelContent += `${startDate}\tOPENING\tBalance brought forward\t${openingBalForPeriod >= 0 ? Math.abs(openingBalForPeriod) : 0}\t${openingBalForPeriod < 0 ? Math.abs(openingBalForPeriod) : 0}\t${Math.abs(openingBalForPeriod)} ${openType}\n`;

    transactionsWithRunningBalance.forEach(tx => {
      const txType = tx.runningBalance >= 0 ? 'Dr' : 'Cr';
      excelContent += `${tx.date}\t${tx.voucherNo}\t${tx.narration || ''}\t${tx.debit}\t${tx.credit}\t${Math.abs(tx.runningBalance)} ${txType}\n`;
    });

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ledger_${selectedLedger.name.replace(/\s+/g, '_')}_Statement.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 bg-slate-50 p-6 rounded-2xl border border-gray-200/60">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tight">Ledger Analysis</h2>
           <p className="text-gray-500 font-medium text-xs uppercase tracking-widest mt-1">Integrated Chart of Account Balances</p>
        </div>
        <div className="flex gap-4 items-end flex-wrap flex-1 lg:justify-end text-xs font-bold text-gray-800">
             <div className="w-64">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Account</label>
                <select className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-900 font-bold outline-none" value={selectedLedgerId} onChange={e => setSelectedLedgerId(e.target.value)}>
                    {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
             </div>
             <div className="w-44">
                <label className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Layers size={12}/> Department</label>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-xs outline-none">
                  <option value="">All Cost Centers</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
             </div>
             <div className="w-44">
                <label className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Compass size={12}/> Division</label>
                <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-white text-xs outline-none">
                  <option value="">All Divisions</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
             </div>
             <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
                 <Calendar size={16} className="text-indigo-500 ml-1"/>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs outline-none bg-white text-gray-700" />
                 <span className="text-gray-300 px-1">-</span>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs outline-none bg-white text-gray-700" />
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border flex justify-between items-center">
              <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">COA Opening Balance</div><div className="text-xl font-mono font-black text-gray-900">{Math.abs(openingBalForPeriod).toLocaleString()} {openingBalForPeriod >= 0 ? 'Dr' : 'Cr'}</div></div>
              <div className="p-3 bg-gray-50 rounded-2xl text-gray-400"><Info size={20}/></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border flex justify-between items-center">
              <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Period Movement</div><div className={`text-xl font-mono font-black ${(periodTotalDr - periodTotalCr) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(periodTotalDr - periodTotalCr) >= 0 ? '+' : ''}{(periodTotalDr - periodTotalCr).toLocaleString()}</div></div>
              <div className={`p-3 rounded-2xl ${(periodTotalDr - periodTotalCr) >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}><TrendingUp size={20}/></div>
          </div>
          <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-2xl text-white flex justify-between items-center">
              <div><div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Closing Ledger Balance</div><div className="text-2xl font-mono font-black">{Math.abs(openingBalForPeriod + (periodTotalDr - periodTotalCr)).toLocaleString()} { (openingBalForPeriod + (periodTotalDr - periodTotalCr)) >= 0 ? 'Dr' : 'Cr'}</div></div>
              <div className="p-3 bg-white/20 rounded-2xl text-white"><Clock size={24}/></div>
          </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border overflow-hidden">
        <div className="p-8 bg-gray-50/50 border-b flex justify-between items-center">
          <div>
            <span className="font-black text-gray-900 block text-2xl tracking-tight">{selectedLedger?.name}</span>
            <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">{selectedLedger?.group}</span>
          </div>
          {/* ✅ Fixed Label: Clean Corporate Name */}
          <button onClick={handleExportLedgerToExcel} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all">
            <Download size={15} /> Download Excel
          </button>
        </div>
        <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-400 border-b font-black uppercase text-[10px] tracking-widest">
                <tr><th className="p-6">Date</th><th className="p-6">Voucher #</th><th className="p-6">Particulars</th><th className="p-6 text-right">Debit</th><th className="p-6 text-right">Credit</th><th className="p-6 text-right bg-gray-50/50">Running Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                <tr className="bg-indigo-50/20">
                    <td className="p-6 text-gray-400 font-mono italic">{startDate}</td><td className="p-6 font-black text-indigo-700 text-[10px]">OPENING</td><td className="p-6 text-gray-500 italic">Balance brought forward</td>
                    <td className="p-6 text-right font-mono font-bold text-gray-900">{openingBalForPeriod >= 0 ? Math.abs(openingBalForPeriod).toLocaleString() : '-'}</td><td className="p-6 text-right font-mono font-bold text-gray-900">{openingBalForPeriod < 0 ? Math.abs(openingBalForPeriod).toLocaleString() : '-'}</td>
                    <td className="p-6 text-right font-mono font-black text-indigo-800 bg-indigo-50/50">{Math.abs(openingBalForPeriod).toLocaleString()} {openingBalForPeriod >= 0 ? 'Dr' : 'Cr'}</td>
                </tr>
                {transactionsWithRunningBalance.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-6 text-gray-600 font-mono">{tx.date}</td><td className="p-6 font-black text-indigo-600 text-xs">{tx.voucherNo}</td><td className="p-6 text-gray-700">{tx.narration}</td>
                        <td className="p-6 text-right font-mono font-bold text-gray-900">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</td><td className="p-6 text-right font-mono font-bold text-gray-900">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</td>
                        <td className="p-6 text-right font-mono font-black text-indigo-900 bg-gray-50/30">{Math.abs(tx.runningBalance).toLocaleString()} {tx.runningBalance >= 0 ? 'Dr' : 'Cr'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeneralLedgerView;