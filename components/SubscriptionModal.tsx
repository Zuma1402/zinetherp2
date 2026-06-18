import React, { useState } from 'react';
import { CheckCircle2, X, Star, ShieldCheck, Zap, CreditCard, Lock, Loader2, ArrowLeft, Download, FileCheck } from 'lucide-react';
import jsPDF from 'jspdf';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  isExpired: boolean;
  daysLeft: number;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSubscribe, isExpired, daysLeft }) => {
  const [step, setStep] = useState<'PLAN' | 'PAYMENT' | 'SUCCESS'>('PLAN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txnId, setTxnId] = useState('');
  
  // Payment Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate API call to Payment Gateway (Stripe/Razorpay)
    setTimeout(() => {
        setIsProcessing(false);
        setTxnId(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
        setStep('SUCCESS');
    }, 2000);
  };

  const handleDownloadReceipt = () => {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Payment Receipt", 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Transaction ID: ${txnId}`, 20, 40);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
      doc.text(`Amount Paid: PKR 25,000`, 20, 60);
      doc.text(`Status: Success`, 20, 70);
      doc.text(`Plan: Annual Pro License`, 20, 80);
      doc.save('Receipt.pdf');
  };

  const handleFinish = () => {
      onSubscribe();
      onClose();
  };

  const formatCardNumber = (val: string) => {
    return val.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 19);
  };

  const formatExpiry = (val: string) => {
    return val.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row relative animate-in fade-in zoom-in duration-200 min-h-[500px]">
        
        {/* Close Button (Only if not expired and not processing) */}
        {!isExpired && !isProcessing && step !== 'SUCCESS' && (
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <X size={24} />
            </button>
        )}

        {/* Left Side: Status & Branding */}
        <div className="md:w-2/5 bg-indigo-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-purple-600 rounded-full blur-3xl opacity-30"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-indigo-800/50 border border-indigo-700 rounded-full px-3 py-1 text-xs font-semibold mb-6">
               <Star size={12} className="text-yellow-400 fill-yellow-400" />
               PRO EDITION
            </div>
            
            <h2 className="text-3xl font-bold mb-2">
                {step === 'SUCCESS' ? "Payment Success" : (isExpired ? "Trial Expired" : "Upgrade Plan")}
            </h2>
            <p className="text-indigo-200 mb-6">
                {step === 'SUCCESS' 
                    ? "Thank you for subscribing! Your account has been fully activated."
                    : step === 'PAYMENT' 
                        ? "Complete your secure payment to unlock full access immediately."
                        : (isExpired 
                            ? "Your 5-day free trial has ended. Activate subscription to continue." 
                            : `You have ${daysLeft} days remaining. Upgrade now for uninterrupted access.`
                          )
                }
            </p>

            {isExpired && step === 'PLAN' && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-200 text-sm font-semibold flex items-center gap-2">
                        <X size={16} /> Data saving is locked.
                    </p>
                </div>
            )}
          </div>

          {step !== 'SUCCESS' && (
              <div className="relative z-10 space-y-4">
                 <div className="border-t border-indigo-700/50 pt-4">
                     <div className="flex justify-between items-center text-sm mb-1">
                         <span className="text-indigo-300">Total Due:</span>
                         <span className="text-2xl font-bold">PKR 25,000</span>
                     </div>
                     <div className="text-xs text-indigo-400">Annual License (Recurring)</div>
                 </div>
              </div>
          )}
        </div>

        {/* Right Side: Content Switching */}
        <div className="md:w-3/5 p-8 bg-gray-50 flex flex-col justify-center relative">
            
            {step === 'PLAN' && (
                <div className="animate-in slide-in-from-right duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Select your plan</h3>
                    
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        <div className="border-2 border-indigo-600 bg-white rounded-xl p-6 relative shadow-lg transform hover:scale-[1.02] transition-transform cursor-pointer ring-2 ring-indigo-100">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                Recommended
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <span className="font-bold text-gray-800 text-lg block">Annual License</span>
                                    <span className="text-gray-500 text-xs">Billed yearly</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-indigo-600">Rs 25,000</span>
                                </div>
                            </div>
                            <ul className="space-y-3 mb-6">
                                <li className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Unlimited Vouchers & Invoices</li>
                                <li className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> AI Financial Insights</li>
                                <li className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Cloud Backup & Sync</li>
                            </ul>
                            <button 
                                onClick={() => setStep('PAYMENT')}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex justify-center items-center gap-2"
                            >
                                <Zap size={18} className="fill-white" />
                                Proceed to Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'PAYMENT' && (
                <div className="animate-in slide-in-from-right duration-300 h-full flex flex-col">
                    <button 
                        onClick={() => setStep('PLAN')}
                        className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-medium"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div className="mt-8 flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Lock size={20} className="text-green-600"/> Secure Payment
                        </h3>

                        <form onSubmit={handlePaymentSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Card Number</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required
                                        value={cardNumber}
                                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                        placeholder="0000 0000 0000 0000"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-gray-900 placeholder-gray-400"
                                        maxLength={19}
                                    />
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Expiry Date</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={expiry}
                                        onChange={e => setExpiry(formatExpiry(e.target.value))}
                                        placeholder="MM/YY"
                                        className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-gray-900 placeholder-gray-400 text-center"
                                        maxLength={5}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">CVC / CVV</label>
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            required
                                            value={cvc}
                                            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            placeholder="123"
                                            className="w-full pl-3 pr-10 py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-gray-900 placeholder-gray-400 text-center"
                                            maxLength={4}
                                        />
                                        <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cardholder Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Ali Khan"
                                    className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder-gray-400"
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 rounded-lg shadow-md transition-all flex justify-center items-center gap-2 mt-4"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" /> Processing...
                                    </>
                                ) : (
                                    <>
                                        Pay PKR 25,000
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="text-center mt-6 flex justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                        {/* Dummy Card Icons */}
                        <div className="h-6 w-10 bg-blue-800 rounded"></div>
                        <div className="h-6 w-10 bg-red-600 rounded"></div>
                        <div className="h-6 w-10 bg-blue-500 rounded"></div>
                    </div>
                </div>
            )}

            {step === 'SUCCESS' && (
                <div className="animate-in zoom-in duration-300 h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={48} className="text-green-600" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                    <p className="text-gray-500 mb-8 max-w-xs mx-auto">
                        Your transaction has been processed and your Pro license is now active.
                    </p>

                    <div className="bg-gray-50 p-4 rounded-lg w-full mb-8 text-sm">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500">Transaction ID:</span>
                            <span className="font-mono font-bold text-gray-800">{txnId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Amount Paid:</span>
                            <span className="font-bold text-gray-800">PKR 25,000</span>
                        </div>
                    </div>

                    <div className="space-y-3 w-full">
                        <button 
                            onClick={handleDownloadReceipt}
                            className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition-all flex justify-center items-center gap-2"
                        >
                            <Download size={18} /> Download Receipt
                        </button>
                        
                        <button 
                            onClick={handleFinish}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex justify-center items-center gap-2"
                        >
                            <FileCheck size={18} /> Continue to App
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;