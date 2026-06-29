import React, { useState } from 'react';
import { Upload, HelpCircle, CheckCircle2, FileSpreadsheet, Layers, Compass, Save } from 'lucide-react';
import { Ledger, Voucher, VoucherType } from '../types';

interface EcommerceReconciliationProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
}

const EcommerceReconciliation: React.FC<EcommerceReconciliationProps> = ({ ledgers, onSave }) => {
  const [platform, setPlatform] = useState<'STRIPE' | 'AMAZON'>('STRIPE');
  const [csvText, setCsvContent] = useState('');
  const [isParsed, setIsParsed] = useState(false);

  // Computed Voucher posting heads states
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [gatewayFees, setGatewayFees] = useState(0);
  const [refunds, setRefunds] = useState(0);
  const [netPayout, setNetPayout] = useState(0);

  const [bankLedgerId, setBankLedgerId] = useState('');
  const [debtorLedgerId, setDebtorLedgerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const bankAccounts = ledgers.filter(l => l.group.includes('Bank') || l.group.includes('Cash'));
  const debtorAccounts = ledgers.filter(l => l.group.includes('Debtors') || l.group.includes('Sales') || l.type === 'ASSET');

  const handleCsvParsingLogic = () => {
    if (!csvText.trim()) return;

    const rows = csvText.split('\n');
    let totalGross = 0;
    let totalFees = 0;
    let totalRefunds = 0;

    rows.forEach((row, idx) => {
      if (idx === 0 || !row.trim()) return; // Skip headers
      const columns = row.split(',');

      if (platform === 'STRIPE') {
        // Stripe Standard Columns: [Amount, Fee, Refund]
        const amt = parseFloat(columns[0]) || 0;
        const fee = parseFloat(columns[1]) || 0;
        const isRefund = columns[2]?.trim().toLowerCase() === 'true';

        if (isRefund) {
          totalRefunds += Math.abs(amt);
        } else {
          totalGross += amt;
          totalFees += Math.abs(fee);
        }
      } else {
        // Amazon Standard Columns: [Gross Sales, Marketplace Fee, Return Cost]
        totalGross += parseFloat(columns[0]) || 0;
        totalFees += Math.abs(parseFloat(columns[1]) || 0);
        totalRefunds += Math.abs(parseFloat(columns[2]) || 0);
      }
    });

    setGrossRevenue(totalGross);
    setGatewayFees(totalFees);
    setRefunds(totalRefunds);
    setNetPayout(totalGross - totalFees - totalRefunds);
    setIsParsed(true);
  };

  const handlePostSplitVoucher = () => {
    if (!bankLedgerId || !debtorLedgerId || netPayout <= 0) {
      alert("Please map target layout bank/debtor accounts properly.");
      return;
    }

    const voucherPayload: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `ECOM-${platform}-${Math.floor(Math.random() * 100000)}`,
      type: VoucherType.JOURNAL,
      narration: `Automated E-Commerce ${platform} Clearing Settlement Payout`,
      entries: [
        { ledgerId: bankLedgerId, debit: netPayout, credit: 0 }, // Net money landed in bank
        { ledgerId: 'e000ffee-1b2c-3d4e-5f6a-7b8c9d0e1f2a', debit: gatewayFees, credit: 0 }, // Fees head from SQL
        { ledgerId: 'f000eedd-2c3d-4e5f-6a7b-8c9d0e1f2a3b', debit: refunds, credit: 0 }, // Refunds head from SQL
        { ledgerId: debtorLedgerId, debit: 0, credit: grossRevenue } // Decrease receivable counter asset
      ]
    } as any;

    onSave(voucherPayload);
    setIsParsed(false);
    setCsvContent('');
    alert("Payout voucher entries posted into double-entry matrix system seamlessly!");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="text-indigo-600" /> One-Click E-Commerce Reconciliation
        </h2>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Automated Processing Matrix Gateways</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-gray-700">
        <div className="bg-white p-4 border rounded-xl space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Marketplace Node</label>
          <div className="flex gap-2">
            <button onClick={() => { setPlatform('STRIPE'); setIsParsed(false); }} className={`flex-1 py-2 rounded-xl border text-center font-black ${platform === 'STRIPE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700'}`}>Stripe API</button>
            <button onClick={() => { setPlatform('AMAZON'); setIsParsed(false); }} className={`flex-1 py-2 rounded-xl border text-center font-black ${platform === 'AMAZON' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-700'}`}>Amazon Seller</button>
          </div>
        </div>

        <div className="bg-white p-4 border rounded-xl space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Bank Account</label>
          <select value={bankLedgerId} onChange={e => setBankLedgerId(e.target.value)} className="w-full p-2 border rounded-xl bg-white outline-none">
            <option value="">Select Destination Bank Account</option>
            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="bg-white p-4 border rounded-xl space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Clearing Receivable Head</label>
          <select value={debtorLedgerId} onChange={e => setDebtorLedgerId(e.target.value)} className="w-full p-2 border rounded-xl bg-white outline-none">
            <option value="">Select Accounts Receivable / Sales</option>
            {debtorAccounts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white p-6 border rounded-2xl space-y-4">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Drop Statement CSV Raw String Logs</label>
        <textarea value={csvText} onChange={e => setCsvContent(e.target.value)} placeholder={platform === 'STRIPE' ? "Amount,Fee,IsRefund\n100,3.5,false\n200,4.2,false\n-50,0,true" : "GrossSales,MarketplaceFee,ReturnCost\n500,45,20\n1200,110,0"} rows={5} className="w-full border p-3 rounded-xl font-mono text-xs outline-none bg-gray-50/40 focus:bg-white focus:border-indigo-500" />
        <button onClick={handleCsvParsingLogic} disabled={!csvText.trim()} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md">Analyze & Parse Payouts</button>
      </div>

      {isParsed && (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-lg animate-in zoom-in-95">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700">Reconciliation Breakdown Calculations Matrix</span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">Balanced Summary</span>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
            <div className="p-4 bg-gray-50 rounded-xl"><div className="text-[10px] font-bold text-gray-400 mb-1">GROSS REVENUE</div><div className="text-md font-black text-gray-900">${grossRevenue.toLocaleString()}</div></div>
            <div className="p-4 bg-rose-50/50 rounded-xl"><div className="text-[10px] font-bold text-rose-500 mb-1">GATEWAY FEES</div><div className="text-md font-black text-rose-600">-${gatewayFees.toLocaleString()}</div></div>
            <div className="p-4 bg-amber-50/50 rounded-xl"><div className="text-[10px] font-bold text-amber-600 mb-1">RETURNS / REFUNDS</div><div className="text-md font-black text-amber-600">-${refunds.toLocaleString()}</div></div>
            <div className="p-4 bg-indigo-50 rounded-xl"><div className="text-[10px] font-bold text-indigo-600 mb-1">NET BANK PAYOUT</div><div className="text-md font-black text-indigo-700">${netPayout.toLocaleString()}</div></div>
          </div>
          <div className="p-4 bg-gray-50 border-t flex justify-between items-center gap-4">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 border rounded-xl text-xs font-bold outline-none bg-white" />
            <button onClick={handlePostSplitVoucher} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md"><Save size={14} /> Post Reconciled Split Voucher</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcommerceReconciliation;