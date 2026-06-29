import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, FileSpreadsheet, Save, Plus, X } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import { Ledger, Voucher, VoucherType } from '../types';

interface EcommerceReconciliationProps {
  ledgers: Ledger[];
  onSave: (voucher: Voucher) => void;
}

const EcommerceReconciliation: React.FC<EcommerceReconciliationProps> = ({ ledgers, onSave }) => {
  const [platform, setPlatform] = useState<string>('STRIPE');
  const [platformsList, setPlatformsList] = useState<{ id: string; name: string }[]>([]);
  const [csvText, setCsvContent] = useState('');
  const [isParsed, setIsParsed] = useState(false);

  // Modal State for Adding New Platform
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');

  // Computed Voucher Posting States
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [gatewayFees, setGatewayFees] = useState(0);
  const [refunds, setRefunds] = useState(0);
  const [netPayout, setNetPayout] = useState(0);

  const [bankLedgerId, setBankLedgerId] = useState('');
  const [debtorLedgerId, setDebtorLedgerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const bankAccounts = ledgers.filter(l => l.group.includes('Bank') || l.group.includes('Cash'));
  const debtorAccounts = ledgers.filter(l => l.group.includes('Debtors') || l.group.includes('Sales') || l.type === 'ASSET');

  const fetchPlatforms = async () => {
    const { data } = await supabase.from('ecommerce_platforms').select('id, name').order('name');
    if (data) setPlatformsList(data);
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const handleAddPlatformSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatformName.trim()) return;

    const id = newPlatformName.trim().toUpperCase().replace(/\s+/g, '_');
    const targetCompanyId = localStorage.getItem('supabase_active_company_id') || '';

    await supabase.from('ecommerce_platforms').insert([
      { id, name: newPlatformName.trim(), company_id: targetCompanyId || null }
    ]);

    await fetchPlatforms();
    setPlatform(id);
    setIsModalOpen(false);
    setNewPlatformName('');
  };

  const handleCsvParsingLogic = () => {
    if (!csvText.trim()) return;

    const rows = csvText.split('\n');
    let totalGross = 0;
    let totalFees = 0;
    let totalRefunds = 0;

    rows.forEach((row, idx) => {
      if (idx === 0 || !row.trim()) return;
      const columns = row.split(',');

      // Flexible parser fallback logic across dynamic columns
      const amt = parseFloat(columns[0]) || 0;
      const fee = parseFloat(columns[1]) || 0;
      const refOrCost = parseFloat(columns[2]) || 0;

      if (platform === 'STRIPE') {
        if (columns[2]?.trim().toLowerCase() === 'true') {
          totalRefunds += Math.abs(amt);
        } else {
          totalGross += amt;
          totalFees += Math.abs(fee);
        }
      } else {
        totalGross += amt;
        totalFees += Math.abs(fee);
        totalRefunds += Math.abs(refOrCost);
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
      alert("Please map target bank and receivable accounts properly.");
      return;
    }

    const voucherPayload: Voucher = {
      id: crypto.randomUUID(),
      date,
      number: `ECOM-${platform}-${Math.floor(Math.random() * 100000)}`,
      type: VoucherType.JOURNAL,
      narration: `Automated E-Commerce Settlement Payout Grid Allocation`,
      entries: [
        { ledgerId: bankLedgerId, debit: netPayout, credit: 0 },
        { ledgerId: 'e000ffee-1b2c-3d4e-5f6a-7b8c9d0e1f2a', debit: gatewayFees, credit: 0 },
        { ledgerId: 'f000eedd-2c3d-4e5f-6a7b-8c9d0e1f2a3b', debit: refunds, credit: 0 },
        { ledgerId: debtorLedgerId, debit: 0, credit: grossRevenue }
      ]
    } as any;

    onSave(voucherPayload);
    setIsParsed(false);
    setCsvContent('');
    alert("Reconciliation posted successfully!");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2 animate-in fade-in duration-300 relative">
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="text-indigo-600" /> One-Click E-Commerce Reconciliation
        </h2>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Automated Processing Matrix Gateways</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-gray-700">
        {/* ✅ Standard Web Compatible Dropdown Engine with Safe Trigger Mechanics */}
        <div className="bg-white p-4 border rounded-xl space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Marketplace Node</label>
          <select 
            value={platform} 
            onChange={e => {
              if (e.target.value === 'QUICK_ADD_ECOM_PLATFORM') {
                setIsModalOpen(true);
              } else {
                setPlatform(e.target.value);
              }
            }} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl font-bold outline-none cursor-pointer hover:bg-gray-100/70 transition-colors"
          >
            {platformsList.map(p => (
              <option key={p.id} value={p.id} className="text-gray-900 font-semibold bg-white">
                {p.name}
              </option>
            ))}
            <option disabled className="text-gray-300 bg-white">────────────────────</option>
            <option value="QUICK_ADD_ECOM_PLATFORM" className="text-indigo-600 font-extrabold bg-indigo-50/50">
              + Add Custom Platform
            </option>
          </select>
        </div>

        <div className="bg-white p-4 border rounded-xl space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Bank Account</label>
          <select value={bankLedgerId} onChange={e => setBankLedgerId(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none">
            <option value="">Select Destination Bank Account</option>
            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="bg-white p-4 border rounded-xl space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Clearing Receivable Head</label>
          <select value={debtorLedgerId} onChange={e => setDebtorLedgerId(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none">
            <option value="">Select Accounts Receivable / Sales</option>
            {debtorAccounts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white p-6 border rounded-2xl space-y-4">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Drop Statement CSV Raw String Logs</label>
        <textarea value={csvText} onChange={e => setCsvContent(e.target.value)} placeholder="Amount,Fee,IsRefund\n100,3.5,false\n200,4.2,false" rows={5} className="w-full border p-3 rounded-xl font-mono text-xs outline-none bg-gray-50/40 focus:bg-white focus:border-indigo-500" />
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

      {/* ✅ Add New Platform Modal Dialog Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Add E-Commerce Platform</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddPlatformSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Platform Name</label>
                <input 
                  autoFocus 
                  type="text" 
                  value={newPlatformName} 
                  onChange={e => setNewPlatformName(e.target.value)} 
                  className="w-full border p-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" 
                  placeholder="e.g. Shopify Store, Daraz, eBay" 
                  required 
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider">Save Platform</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcommerceReconciliation;