import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, X, Check, ShoppingBag, Search, RotateCcw, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Ledger, Voucher, VoucherType, InventoryItem, AccountType, StockTransaction, TrialBalanceRow } from '../types';

interface PurchaseReturnProps {
  ledgers: Ledger[];
  items: InventoryItem[];
  trialBalance: TrialBalanceRow[];
  onSave: (voucher: Voucher, stockUpdates: StockTransaction[]) => void;
  onCancel: () => void;
}

const ItemAutocomplete: React.FC<{ items: InventoryItem[], selectedId: string, onSelect: (id: string) => void }> = ({ items, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const item = items.find(i => i.id === selectedId);
    setSearchTerm(item ? item.name : '');
  }, [selectedId, items]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          className="w-full p-2.5 pl-9 border rounded-xl focus:ring-2 ring-rose-100 outline-none bg-white text-gray-900 text-sm font-medium"
          placeholder="Search items to return..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
        />
        <Search size={16} className="absolute left-3 top-3 text-gray-300" />
      </div>
      {isOpen && (searchTerm || filteredItems.length > 0) && (
        <ul className="absolute z-[100] w-full mt-1 bg-white border border-rose-50 rounded-xl shadow-2xl max-h-64 overflow-auto py-2">
          {filteredItems.map(item => (
            <li 
              key={item.id} 
              className="px-4 py-3 hover:bg-rose-50 cursor-pointer text-sm flex justify-between items-center border-b border-gray-50 last:border-0" 
              onClick={() => { onSelect(item.id); setIsOpen(false); }}
            >
              <div className="flex flex-col">
                <span className="font-bold text-gray-700">{item.name}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Avg Cost: {item.costPrice?.toLocaleString() || '0'}</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded ${item.currentStock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                Stock: {item.currentStock} {item.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PurchaseReturn: React.FC<PurchaseReturnProps> = ({ ledgers, items, trialBalance, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteNo, setNoteNo] = useState(`DN-${Math.floor(Math.random() * 10000)}`);
  const [supplierId, setSupplierId] = useState('');
  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }]);

  const suppliers = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);
  
  const findLedger = (name: string, type: AccountType) => {
    return ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()) && l.type === type);
  };

  const getVendorBalance = (id: string) => {
    const row = trialBalance.find(r => r.ledgerId === id);
    if (!row) return 'Bal: 0.00';
    return `Current Payable: ${row.netBalance.toLocaleString()} ${row.balanceType}`;
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newLines = [...lineItems];
    const line = { ...newLines[index] };
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      line.itemId = value;
      line.rate = item?.costPrice || 0;
    } else {
        (line as any)[field] = Number(value);
    }
    const base = line.qty * line.rate;
    line.taxAmount = (base * line.taxRate) / 100;
    line.amount = base + line.taxAmount;
    newLines[index] = line;
    setLineItems(newLines);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    const stockLedger = findLedger('Stock-in-Hand', AccountType.ASSET);
    if (!supplierId || !stockLedger || totalAmount <= 0) {
      alert("Please ensure a Supplier is selected and valid items are added. Integrated accounting requires 'Stock-in-Hand' ledger.");
      return;
    }

    const voucherId = crypto.randomUUID();
    const itemNames = lineItems.map(l => items.find(i => i.id === l.itemId)?.name).join(', ');

    // Perpetual Accounting for Purchase Return:
    // Debit Vendor (Reduce liability)
    // Credit Stock-in-Hand (Reduce asset)
    const voucher: Voucher = {
      id: voucherId,
      date,
      number: noteNo,
      type: VoucherType.DEBIT_NOTE,
      narration: `Purchase Return / Debit Note #${noteNo} to vendor. Items: ${itemNames}`,
      entries: [
        { ledgerId: supplierId, debit: totalAmount, credit: 0 },
        { ledgerId: stockLedger.id, debit: 0, credit: totalAmount }
      ]
    };

    const stockUpdates: StockTransaction[] = lineItems.map(line => ({
      itemId: line.itemId,
      qty: -Math.abs(line.qty), // Negative for inventory reduction
      rate: line.rate,
      voucherId: voucherId
    }));

    onSave(voucher, stockUpdates);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-6xl mx-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-12">
        <div>
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-4">
            <span className="bg-rose-600 text-white p-3.5 rounded-[1.5rem] shadow-xl shadow-rose-200"><RotateCcw size={28} /></span>
            Purchase Return
            </h2>
            <div className="mt-3 flex items-center gap-2 text-rose-600 font-bold text-[10px] uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-100 w-fit">
                <LinkIcon size={12} /> Debit Note / Inventory Reversal
            </div>
        </div>
        <div className="text-right">
             <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Document Status</div>
             <div className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-rose-100">Debit Note</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12 p-8 bg-rose-50/20 rounded-[2.5rem] border border-rose-50">
        <div className="lg:col-span-2">
            <label className="block text-[10px] font-black text-rose-900/40 uppercase tracking-[0.2em] mb-4 px-2">Vendor / Supplier (Original Source)</label>
            <div className="relative">
                <select className="w-full p-4 border-2 border-white rounded-[1.5rem] shadow-sm focus:ring-4 ring-rose-50 bg-white text-gray-900 font-black appearance-none cursor-pointer pr-10" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                    <option value="">-- Select Vendor to Debit --</option>
                    {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {supplierId && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest px-3">
                        <AlertCircle size={12}/> {getVendorBalance(supplierId)}
                    </div>
                )}
            </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="block text-[10px] font-black text-rose-900/40 uppercase tracking-[0.2em] mb-4">Debit Note #</label>
                <input type="text" value={noteNo} onChange={e => setNoteNo(e.target.value)} className="w-full p-4 border-2 border-white rounded-[1.5rem] bg-white text-rose-600 font-mono font-black text-center shadow-sm focus:ring-4 ring-rose-50 outline-none" />
            </div>
            <div>
                <label className="block text-[10px] font-black text-rose-900/40 uppercase tracking-[0.2em] mb-4">Return Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 border-2 border-white rounded-[1.5rem] bg-white font-bold text-gray-700 shadow-sm focus:ring-4 ring-rose-50 outline-none" />
            </div>
        </div>
      </div>

      <div className="border border-rose-50 rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl shadow-rose-900/5 bg-white">
        <table className="w-full text-left">
            <thead className="bg-rose-50/30 border-b border-rose-50">
                <tr>
                    <th className="p-6 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">Item to Return</th>
                    <th className="p-6 w-24 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-center">Qty</th>
                    <th className="p-6 w-40 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-right">Unit Cost</th>
                    <th className="p-6 w-24 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-center">Tax %</th>
                    <th className="p-6 w-40 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] text-right">Return Value</th>
                    <th className="p-6 w-12"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {lineItems.map((line, idx) => (
                    <tr key={idx} className="group hover:bg-rose-50/20 transition-all">
                        <td className="p-4"><ItemAutocomplete items={items} selectedId={line.itemId} onSelect={(id) => handleItemChange(idx, 'itemId', id)} /></td>
                        <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-rose-100 focus:border-rose-500 rounded-2xl text-center font-black transition-all bg-gray-50/50" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
                        <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-rose-100 focus:border-rose-500 rounded-2xl text-right font-mono font-bold transition-all bg-gray-50/50" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                        <td className="p-4"><input type="number" className="w-full p-3 border-2 border-transparent hover:border-rose-100 focus:border-rose-500 rounded-2xl text-center transition-all bg-gray-50/50" value={line.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)} /></td>
                        <td className="p-4 text-right">
                            <span className="text-base font-black text-rose-900 font-mono">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="p-4 text-center">
                            <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={22}/>
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="p-8 bg-rose-50/20">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }])} className="bg-white border-2 border-dashed border-rose-200 text-rose-600 px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:border-rose-500 hover:text-rose-700 transition-all flex items-center gap-3 shadow-sm shadow-rose-900/5">
                <Plus size={18}/> Add More Items
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex-1 bg-gray-50 p-8 rounded-[2rem] border border-gray-100 max-w-lg">
              <div className="flex items-center gap-3 text-rose-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
                  <Check size={18} /> Journal Impact Details
              </div>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  This transaction will create a <strong>Debit Note</strong>. The system will 
                  <strong> Debit your Vendor</strong> (reducing what you owe) and 
                  <strong> Credit Stock-in-Hand</strong> (reducing your asset value). Inventory counts 
                  for the selected items will decrease immediately.
              </p>
          </div>
          <div className="w-full lg:w-[450px] bg-gray-900 p-10 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(244,63,94,0.15)] flex justify-between items-center text-white relative overflow-hidden group">
              <div className="absolute inset-0 bg-rose-600 translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-10 pointer-events-none"></div>
              <div>
                  <span className="font-black uppercase text-[10px] tracking-[0.3em] opacity-40 block mb-2">Refundable Total</span>
                  <span className="text-sm font-bold opacity-60">Dr. Vendor / Cr. Stock</span>
              </div>
              <span className="text-4xl font-black font-mono tracking-tighter">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
      </div>

      <div className="flex justify-end gap-6 mt-16 border-t border-gray-50 pt-10">
          <button onClick={onCancel} className="px-10 py-4 text-gray-400 font-black text-sm uppercase tracking-widest hover:text-gray-700 transition-colors">Discard Return</button>
          <button onClick={handleSubmit} className="px-16 py-5 bg-rose-600 text-white rounded-[2rem] hover:bg-rose-700 transition-all font-black shadow-2xl shadow-rose-600/30 flex items-center gap-4 uppercase tracking-widest text-sm transform active:scale-95">
            <Save size={24} /> Post Debit Note
          </button>
      </div>
    </div>
  );
};

export default PurchaseReturn;