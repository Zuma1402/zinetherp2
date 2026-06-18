import React, { useState } from 'react';
import { Save, Plus, Trash2, ClipboardCheck, Send } from 'lucide-react';
import { Ledger, InventoryItem, AccountType } from '../../types';

interface Props {
  ledgers: Ledger[];
  items: InventoryItem[];
  onSave: (po: any) => void;
  onCancel: () => void;
}

const PurchaseOrderEntry: React.FC<Props> = ({ ledgers, items, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNo, setPoNo] = useState(`PO-${Math.floor(Math.random() * 10000)}`);
  const [vendorId, setVendorId] = useState('');
  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1, rate: 0, amount: 0 }]);

  const vendors = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);

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
    line.amount = line.qty * line.rate;
    newLines[index] = line;
    setLineItems(newLines);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-6xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span className="bg-blue-600 text-white p-2 rounded-lg shadow-sm"><ClipboardCheck size={20} /></span>
          New Purchase Order
        </h2>
        <button className="px-4 py-2 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition font-bold text-sm flex items-center gap-2">
            <Send size={16} /> Send to Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Supplier / Vendor</label>
          <select className="w-full p-2.5 border rounded-xl bg-white text-gray-900 font-medium" value={vendorId} onChange={e => setVendorId(e.target.value)}>
             <option value="">Select Vendor...</option>
             {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">PO Number</label>
           <input type="text" value={poNo} readOnly className="w-full p-2.5 bg-white border rounded-xl font-mono font-bold text-blue-600" />
        </div>
        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Expected Delivery</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" />
        </div>
      </div>

      <div className="border rounded-2xl overflow-hidden mb-8 border-gray-200 shadow-sm">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th className="p-4 text-gray-500 font-bold uppercase text-[10px] tracking-widest">Item / Material</th>
                    <th className="p-4 w-24 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-center">Qty</th>
                    <th className="p-4 w-32 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-right">Negotiated Rate</th>
                    <th className="p-4 w-32 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-right">Total Est.</th>
                    <th className="p-4 w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {lineItems.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3">
                            <select className="w-full p-2 border rounded-lg bg-white" value={line.itemId} onChange={e => handleItemChange(idx, 'itemId', e.target.value)}>
                                <option value="">Select Product...</option>
                                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </td>
                        <td className="p-3"><input type="number" className="w-full p-2 border rounded-lg text-center" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
                        <td className="p-3"><input type="number" className="w-full p-2 border rounded-lg text-right" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                        <td className="p-3 text-right font-bold text-gray-700">{line.amount.toLocaleString()}</td>
                        <td className="p-3 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="p-3 bg-gray-50/50">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, amount: 0 }])} className="text-blue-600 text-xs font-bold flex items-center gap-2 hover:text-blue-800 uppercase tracking-widest transition"><Plus size={14}/> Add New Material</button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <div className="text-blue-700 text-xs font-bold uppercase tracking-widest italic">Note: Purchase orders are for internal tracking and do not affect ledger balances.</div>
          <div className="flex items-center gap-6">
              <span className="text-blue-900 font-bold uppercase text-xs tracking-widest">Total Value</span>
              <span className="text-2xl font-black text-blue-700 font-mono">{totalAmount.toLocaleString()}</span>
          </div>
      </div>

      <div className="flex justify-end gap-3 mt-10">
          <button onClick={onCancel} className="px-6 py-2.5 text-gray-500 font-bold text-sm">Discard</button>
          <button onClick={() => alert('Purchase Order Saved!')} className="px-10 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg flex items-center gap-2">
            <Save size={20} /> Save Order
          </button>
      </div>
    </div>
  );
};

export default PurchaseOrderEntry;