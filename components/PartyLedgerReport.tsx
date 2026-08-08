import React, { useState, useMemo } from 'react';
import { Ledger, Voucher } from '../types';
import { UserCheck, Calendar, Search, Printer, Share2, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PartyLedgerReportProps {
  ledgers: Ledger[];
  vouchers: Voucher[];
}

export const PartyLedgerReport: React.FC<PartyLedgerReportProps> = ({ ledgers, vouchers }) => {
  const { t } = useLanguage();
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [printMode, setPrintMode] = useState<'A4' | 'THERMAL'>('A4');

  const partyLedgers = useMemo(() => {
    return ledgers.filter(l => 
      l.group.toLowerCase().includes('debtor') ||
      l.group.toLowerCase().includes('creditor') ||
      l.group.toLowerCase().includes('customer') ||
      l.group.toLowerCase().includes('supplier') ||
      l.group.toLowerCase().includes('payable') ||
      l.group.toLowerCase().includes('receivable')
    );
  }, [ledgers]);

  const selectedParty = useMemo(() => {
    return partyLedgers.find(p => p.id === selectedPartyId) || partyLedgers[0];
  }, [partyLedgers, selectedPartyId]);

  const partyStatement = useMemo(() => {
    if (!selectedParty) return { rows: [], openingBalance: 0, totalBilled: 0, totalPaid: 0, closingBalance: 0 };

    let running = selectedParty.openingBalance || 0;
    const opening = running;
    let totalBilled = 0;
    let totalPaid = 0;

    const filteredVouchers = vouchers
      .filter(v => {
        if (startDate && v.date < startDate) return false;
        if (endDate && v.date > endDate) return false;
        return v.entries?.some(e => e.ledgerId === selectedParty.id) || v.partyName === selectedParty.name;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const rows = filteredVouchers.map(v => {
      const entry = v.entries?.find(e => e.ledgerId === selectedParty.id);
      const debit = entry?.debit || (v.type === 'SALES' ? v.totalAmount : 0);
      const credit = entry?.credit || (v.type === 'RECEIPT' || v.type === 'PAYMENT' ? v.totalAmount : 0);

      totalBilled += debit;
      totalPaid += credit;
      running += (debit - credit);

      return {
        date: v.date,
        voucherNo: v.voucherNumber,
        type: v.type,
        narration: v.narration || entry?.description || '-',
        debit,
        credit,
        runningBalance: running
      };
    }).filter(r => 
      r.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.narration.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
      rows,
      openingBalance: opening,
      totalBilled,
      totalPaid,
      closingBalance: running
    };
  }, [selectedParty, vouchers, startDate, endDate, searchTerm]);

  const handleWhatsAppShare = () => {
    if (!selectedParty) return;

    const partyName = selectedParty.name;
    const totalBilled = partyStatement.totalBilled.toLocaleString();
    const totalPaid = partyStatement.totalPaid.toLocaleString();
    const closing = Math.abs(partyStatement.closingBalance).toLocaleString();
    const balanceType = partyStatement.closingBalance >= 0 ? 'Dr (Receivable)' : 'Cr (Payable)';

    const message = `*Statement of Account: ${partyName}*\n` +
      `-----------------------------------\n` +
      `Period: ${startDate || 'Start'} to ${endDate || 'Today'}\n` +
      `*Opening Balance:* Rs ${partyStatement.openingBalance.toLocaleString()}\n` +
      `*Total Invoices / Billed:* Rs ${totalBilled}\n` +
      `*Total Payments / Received:* Rs ${totalPaid}\n` +
      `-----------------------------------\n` +
      `*Net Balance Due:* Rs ${closing} ${balanceType}\n\n` +
      `Generated via ZinethERP`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6 printable-party-report">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-party-report, .printable-party-report * { visibility: visible; }
          .printable-party-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          ${printMode === 'THERMAL' ? `
            .printable-party-report { width: 80mm !important; font-size: 10px !important; }
            table { width: 100% !important; font-size: 9px !important; }
            th, td { padding: 4px 2px !important; }
          ` : ''}
        }
      `}</style>

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="text-indigo-600" size={22} /> Party Wise Ledger Statement
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Detailed customer and supplier account balance statements</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={handleWhatsAppShare}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <Share2 size={14} /> Share via WhatsApp
          </button>
          
          <button 
            onClick={() => { setPrintMode('A4'); setTimeout(() => window.print(), 200); }} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={14} /> Print A4
          </button>

          <button 
            onClick={() => { setPrintMode('THERMAL'); setTimeout(() => window.print(), 200); }} 
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <FileText size={14} /> Thermal Receipt
          </button>
        </div>
      </div>

      {/* Selector & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider shrink-0">Select Party:</label>
            <select
              value={selectedPartyId || selectedParty?.id || ''}
              onChange={e => setSelectedPartyId(e.target.value)}
              className="p-2 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none w-full md:w-64"
            >
              {partyLedgers.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.group})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1.5 text-xs font-bold w-full md:w-auto">
            <Calendar size={14} className="text-indigo-600" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-xs font-bold" />
            <span className="text-gray-400 font-normal">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-xs font-bold" />
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Search voucher or narration..." 
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl font-bold bg-gray-50 outline-none" 
          />
        </div>
      </div>

      {/* KPI Cards */}
      {selectedParty && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Opening Balance</span>
            <h3 className="text-xl font-black text-gray-900 mt-1">Rs {selectedParty.openingBalance?.toLocaleString() || 0}</h3>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Invoices / Billed</span>
            <h3 className="text-xl font-black text-indigo-600 mt-1 flex items-center gap-1">
              <ArrowUpRight size={18}/> Rs {partyStatement.totalBilled.toLocaleString()}
            </h3>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Payments / Paid</span>
            <h3 className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1">
              <ArrowDownLeft size={18}/> Rs {partyStatement.totalPaid.toLocaleString()}
            </h3>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800">
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Net Closing Balance</span>
            <h3 className="text-xl font-black text-emerald-400 mt-1">
              Rs {Math.abs(partyStatement.closingBalance).toLocaleString()} <span className="text-xs text-indigo-200">{partyStatement.closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
            </h3>
          </div>
        </div>
      )}

      {/* Printable Statement Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase">Statement Account: <span className="text-indigo-600">{selectedParty?.name}</span></h3>
            <p className="text-[10px] text-gray-400 font-bold">Group: {selectedParty?.group} | Period: {startDate || 'Start'} to {endDate || 'Today'}</p>
          </div>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-gray-600 font-black uppercase tracking-wider border-b">
            <tr>
              <th className="p-3.5 pl-6">Date</th>
              <th className="p-3.5">Voucher #</th>
              <th className="p-3.5">Particulars / Description</th>
              <th className="p-3.5 text-right text-indigo-700">Debit (Billed)</th>
              <th className="p-3.5 text-right text-emerald-700">Credit (Paid)</th>
              <th className="p-3.5 text-right pr-6 text-slate-900">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
            <tr className="bg-indigo-50/30">
              <td className="p-3.5 pl-6 text-gray-500 font-mono">{startDate || 'OPENING'}</td>
              <td className="p-3.5 font-mono text-indigo-600">OPENING</td>
              <td className="p-3.5 text-gray-500 italic">Balance Brought Forward</td>
              <td className="p-3.5 text-right">-</td>
              <td className="p-3.5 text-right">-</td>
              <td className="p-3.5 text-right pr-6 font-black text-indigo-900">
                Rs {partyStatement.openingBalance.toLocaleString()}
              </td>
            </tr>

            {partyStatement.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition">
                <td className="p-3.5 pl-6 text-gray-500 font-medium">{row.date}</td>
                <td className="p-3.5 font-mono text-indigo-600">{row.voucherNo}</td>
                <td className="p-3.5 text-gray-800">{row.narration}</td>
                <td className="p-3.5 text-right text-indigo-600">
                  {row.debit > 0 ? `Rs ${row.debit.toLocaleString()}` : '-'}
                </td>
                <td className="p-3.5 text-right text-emerald-600">
                  {row.credit > 0 ? `Rs ${row.credit.toLocaleString()}` : '-'}
                </td>
                <td className="p-3.5 text-right pr-6 font-black text-slate-950 bg-gray-50/50">
                  Rs {Math.abs(row.runningBalance).toLocaleString()} {row.runningBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            ))}

            {partyStatement.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 italic">No transactions found for this party in selected period.</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-black text-xs border-t">
            <tr>
              <td colSpan={3} className="p-4 pl-6 uppercase">Total Statement Summary</td>
              <td className="p-4 text-right text-indigo-300">Rs {partyStatement.totalBilled.toLocaleString()}</td>
              <td className="p-4 text-right text-emerald-300">Rs {partyStatement.totalPaid.toLocaleString()}</td>
              <td className="p-4 text-right pr-6 text-emerald-400">
                Rs {Math.abs(partyStatement.closingBalance).toLocaleString()} {partyStatement.closingBalance >= 0 ? 'Dr' : 'Cr'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PartyLedgerReport;