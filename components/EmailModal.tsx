import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle2, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import emailjs from '@emailjs/browser';

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
      // 1. Convert Invoice HTML to Base64 PDF Attachment
      const element = document.getElementById('printable-invoice');
      if (!element) throw new Error('Invoice element not found');

      const opt = {
        margin: 0.5,
        filename: `${documentNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      // Generate PDF data string
      const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');

      // 2. Direct Background Dispatch via EmailJS / Webhook
      // Replace with your EmailJS credentials or standard API endpoint
      const templateParams = {
        to_email: email,
        subject: `${documentTitle} #${documentNumber} - ${documentDetails.customerName}`,
        message: customMessage,
        content_attachment: pdfBase64
      };

      // Direct Silent Dispatch
      await emailjs.send(
        'YOUR_SERVICE_ID', // Replace with your Service ID
        'YOUR_TEMPLATE_ID', // Replace with your Template ID
        templateParams,
        'YOUR_PUBLIC_KEY'   // Replace with your Public Key
      );

      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Direct PDF dispatch error:', error);
      setIsSending(false);
      
      // Fallback: If EmailJS API is not configured, download PDF directly for fast manual attach
      alert('Email API keys required for direct background send. Downloading PDF now...');
      const element = document.getElementById('printable-invoice');
      if (element) {
        html2pdf().from(element).save(`${documentNumber}.pdf`);
      }
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
              1-Click Direct Email Dispatch
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {isSent ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-base font-black text-gray-900">Email Dispatched Successfully!</h4>
            <p className="text-xs text-gray-400 font-bold">Invoice PDF delivered directly to client inbox.</p>
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
                Email Message Body
              </label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium bg-gray-50 outline-none focus:border-indigo-500"
              />
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
                Send Direct Email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};