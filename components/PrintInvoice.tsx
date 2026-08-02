import React, { useState } from 'react';
import { Printer, Download, X, Mail } from 'lucide-react';
import { Voucher, Ledger } from '../types';
import { EmailModal } from './EmailModal';

interface PrintInvoiceProps {
  voucher: Voucher;
  ledgers: Ledger[];
  companyName: string;
  onClose: () => void;
}

export const PrintInvoice: React.FC<PrintInvoiceProps> = ({
  voucher,
  ledgers,
  companyName,
  onClose
}) => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const getLedgerName = (id: string) => {
    return ledgers.find(l => l.id === id)?.name || id;
  };

  const totalDebit = voucher.entries?.reduce((acc, curr) => acc + (curr.debit || 0), 0) || 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
        {/* Control Action Header - Hidden during print */}
        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 border border-gray-100 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100 print:hidden">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs">PDF</span>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                Document Print Preview [{voucher.number || voucher.id}]
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* ⭐ INJECTED EMAIL DISPATCH BUTTON */}
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                <Mail size={14} /> Send Email
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Paper Canvas Zone */}
          <div id="printable-invoice" className="p-8 my-4 bg-white text-gray-900 border border-gray-200/80 rounded-2xl print:border-none print:shadow-none print:p-0">
            
            {/* Header Info */}
            <div className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">{companyName}</h1>
                <p className="text-xs font-bold text-gray-500 mt-1">OFFICIAL ACCOUNTING & AUDIT VOUCHER</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-gray-900 text-white font-mono font-black text-xs rounded-md uppercase tracking-wider">
                  {voucher.type || 'JOURNAL'}
                </span>
                <h3 className="text-sm font-mono font-black text-indigo-600 mt-2">{voucher.number || 'VCH-AUTO'}</h3>
                <p className="text-[11px] font-bold text-gray-400 font-mono mt-0.5">Date: {voucher.date}</p>
              </div>
            </div>

            {/* Context Details */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl text-xs font-medium border border-slate-100">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Billing Currency</span>
                <span className="font-bold text-gray-800">{voucher.currency || 'PKR'} (Rate: {voucher.exchangeRate || 1})</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Narration / Memo</span>
                <span className="font-medium text-gray-700 italic">{voucher.narration || 'N/A'}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left text-xs border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Account Title / Ledger</th>
                  <th className="py-2.5 px-2 text-right">Debit ({voucher.currency || 'PKR'})</th>
                  <th className="py-2.5 px-2 text-right">Credit ({voucher.currency || 'PKR'})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {voucher.entries?.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-2 font-mono text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-2 font-bold text-gray-800">{getLedgerName(entry.ledgerId)}</td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-gray-900">
                      {entry.debit ? entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-gray-900">
                      {entry.credit ? entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-900 font-mono font-black text-xs">
                  <td colSpan={2} className="py-3 px-2 font-sans font-black text-right uppercase text-[10px] tracking-widest">Total Transaction Value:</td>
                  <td className="py-3 px-2 text-right text-indigo-700">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-2 text-right text-indigo-700">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>

            {/* Signatures & Stamp Node */}
            <div className="pt-12 grid grid-cols-3 gap-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <div>
                <div className="border-b border-gray-300 mb-1 h-8"></div>
                <span>Prepared By</span>
              </div>
              <div>
                <div className="border-b border-gray-300 mb-1 h-8"></div>
                <span>Checked By</span>
              </div>
              <div>
                <div className="border-b border-gray-300 mb-1 h-8"></div>
                <span>Authorized Stamp</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ⭐ INJECTED EMAIL MODAL */}
      {isEmailModalOpen && (
        <EmailModal
          documentTitle={`${voucher.type || 'JOURNAL'} Voucher`}
          documentNumber={voucher.number || voucher.id}
          documentDetails={{
            customerName: companyName,
            amount: totalDebit,
            date: voucher.date,
            currency: voucher.currency || 'PKR'
          }}
          onClose={() => setIsEmailModalOpen(false)}
        />
      )}
    </>
  );
};