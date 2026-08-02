import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle2, Loader2, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface EmailModalProps {
  recipientEmail?: string;
  documentTitle: string;
  documentNumber: string;
  documentDetails: {
    customerName: string;
    amount: number;
    date: string;
    currency?: string;
  };
  onClose: () => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  recipientEmail = '',
  documentTitle,
  documentNumber,
  documentDetails,
  onClose
}) => {
  const [email, setEmail] = useState(recipientEmail);
  const [customMessage, setCustomMessage] = useState(
    `Dear ${documentDetails.customerName},\n\nPlease find attached details for ${documentTitle} #${documentNumber}.\n\nTotal Amount: ${documentDetails.currency || 'PKR'} ${documentDetails.amount.toLocaleString()}\nDate: ${documentDetails.date}\n\nThank you for doing business with us.`
  );
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return alert('Please enter a valid email address.');

    setIsSending(true);

    try {
      // 1. Silent PDF Generation & Download
      const element = document.getElementById('printable-invoice');
      if (element) {
        const opt = {
          margin: 0.5,
          filename: `${documentNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
      }

      // 2. Open Gmail Web Compose with pre-filled text
      const subject = `${documentTitle} #${documentNumber} - ${documentDetails.customerName}`;
      const body = `${customMessage}\n\n--- Document Summary ---\nInvoice #: ${documentNumber}\nDate: ${documentDetails.date}\nNet Payable: ${documentDetails.currency || 'PKR'} ${documentDetails.amount.toLocaleString()}\n\n[Invoice PDF (${documentNumber}.pdf) has been saved to your downloads folder. Please attach it to complete send.]`;

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        email
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      window.open(gmailUrl, '_blank');

      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Email action failed', error);
      setIsSending(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs">
              <Mail size={16} />
            </span>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Send Invoice via Gmail
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {isSent ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-base font-black text-gray-900">PDF Downloaded & Gmail Ready!</h4>
            <p className="text-xs text-gray-400 font-bold">Attach the downloaded PDF in your Gmail compose tab.</p>
          </div>
        ) : (
          <form onSubmit={handleSendEmail} className="space-y-4 mt-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Customer Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Email Content
              </label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium bg-gray-50 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-[11px] font-bold text-indigo-900 space-y-1">
              <div className="flex items-center gap-1.5">
                <Download size={14} className="text-indigo-600" />
                <span>PDF will download & Gmail compose window will open automatically.</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 uppercase tracking-wider"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Download & Compose Email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};