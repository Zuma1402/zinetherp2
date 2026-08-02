import React, { useState } from 'react';
import { Printer, X, Mail } from 'lucide-react';
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

  // Extract Customer Name (Debtor Ledger)
  const customerEntry = voucher.entries?.find(e => e.debit > 0);
  const customerName = customerEntry ? getLedgerName(customerEntry.ledgerId) : 'Walking / Cash Customer';

  const totalDebit = voucher.entries?.reduce((acc, curr) => acc + (curr.debit || 0), 0) || 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
        {/* Main Modal Container */}
        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 border border-gray-100 my-auto animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
          
          {/* Top Control Bar */}
          <div className="flex flex-wrap justify-between items-center pb-4 border-b border-gray-100 print:hidden gap-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs">PDF</span>
              <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider">
                Invoice Preview [{voucher.number || voucher.id}]
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                <Mail size={14} /> <span className="hidden sm:inline">Send Email</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                <Printer size={14} /> <span className="hidden sm:inline">Print / PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Clean Document Canvas */}
          <div id="printable-invoice" className="p-4 sm:p-8 my-2 bg-white text-gray-900 border border-gray-200/80 rounded-2xl overflow-y-auto print:border-none print:shadow-none print:p-0">
            
            {/* Brand Header */}
            <div className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 uppercase">{companyName}</h1>
                <p className="text-xs font-bold text-gray-500 mt-1">COMMERCIAL SALES INVOICE</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-gray-900 text-white font-mono font-black text-xs rounded-md uppercase tracking-wider">
                  {voucher.type || 'SALES'}
                </span>
                <h3 className="text-base font-mono font-black text-indigo-600 mt-2">{voucher.number || 'INV-0001'}</h3>
                <p className="text-[11px] font-bold text-gray-400 font-mono mt-0.5">Date: {voucher.date}</p>
              </div>
            </div>

            {/* Customer Details Box (Billing Currency Removed) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl text-xs font-medium border border-slate-100">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Billed To Customer:</span>
                <span className="font-black text-gray-900 text-sm block">{customerName}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Narration / Memo:</span>
                <span className="font-medium text-gray-700 italic block">{voucher.narration || 'Sales Invoice Transaction'}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Description / Account Title</th>
                    <th className="py-2.5 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {voucher.entries?.filter(e => e.credit > 0).map((entry, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-2 font-mono text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-2 font-bold text-gray-800">{getLedgerName(entry.ledgerId)}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-gray-900">
                        {entry.credit ? entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-900 font-mono font-black text-xs">
                    <td colSpan={2} className="py-3 px-2 font-sans font-black text-right uppercase text-[10px] tracking-widest">Net Total Payable:</td>
                    <td className="py-3 px-2 text-right text-indigo-700 font-extrabold text-sm">
                      {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Stamps and Signatures */}
            <div className="pt-8 sm:pt-12 grid grid-cols-3 gap-4 sm:gap-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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

      {/* EMAIL DISPATCH MODAL */}
      {isEmailModalOpen && (
        <EmailModal
          documentTitle={`Sales Invoice`}
          documentNumber={voucher.number || voucher.id}
          documentDetails={{
            customerName: customerName,
            amount: totalDebit,
            date: voucher.date,
            currency: 'PKR'
          }}
          onClose={() => setIsEmailModalOpen(false)}
        />
      )}
    </>
  );
};