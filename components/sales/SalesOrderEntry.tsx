import React, { useState } from 'react';
import { Save, Plus, Trash2, ClipboardList, CheckCircle } from 'lucide-react';
import { Ledger, InventoryItem, AccountType } from '../../types';
import ItemAutocomplete from '../ItemAutocomplete';

interface SalesOrderProps {
  ledgers: Ledger[];
  items: InventoryItem[];
  onSave: (order: any) => void;
  onCancel: () => void;
}

const SalesOrderEntry: React.FC<SalesOrderProps> = ({ ledgers, items, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNo, setOrderNo] = useState(`SO-${Math.floor(Math.random() * 10000)}`);
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1, rate: 0, amount: 0 }]);

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newLines = [...lineItems];
    const line = { ...newLines[index] };
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      line.itemId = value;
      line.rate = item ? item.rate : 0;
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
          <span className="bg-blue-600 text-white p-2 rounded-lg shadow-sm"><ClipboardList size={20} /></span>
          Confirm Sales Order
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Customer Name</label>
          <select className="w-full p-2.5 border rounded-xl bg-white text-gray-900 font-medium" value={customerId} onChange={e => setCustomerId(e.target.value)}>
             <option value="">Choose Customer...</option>
             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Order ID</label>
           <input type="text" value={orderNo} readOnly className="w-full p-2.5 bg-white border rounded-xl font-mono font-bold text-blue-600" />
        </div>
        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Order Date</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" />
        </div>
      </div>

      <div className="border rounded-2xl overflow-hidden mb-8 border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="p-4 text-gray-500 font-bold uppercase text-[10px] tracking-widest">Product</th>
                        <th className="p-4 w-24 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-center">Qty</th>
                        <th className="p-4 w-32 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-right">Unit Rate</th>
                        <th className="p-4 w-32 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-right">Line Total</th>
                        <th className="p-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {lineItems.map((line, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3">
                                <ItemAutocomplete 
                                    items={items} 
                                    selectedId={line.itemId} 
                                    onSelect={(id) => handleItemChange(idx, 'itemId', id)} 
                                    placeholder="Search item..."
                                />
                            </td>
                            <td className="p-3"><input type="number" className="w-full p-2 border rounded-lg text-center" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
                            <td className="p-3"><input type="number" className="w-full p-2 border rounded-lg text-right" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                            <td className="p-3 text-right font-bold text-gray-700">{line.amount.toLocaleString()}</td>
                            <td className="p-3 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-3 bg-gray-50/50">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, amount: 0 }])} className="text-blue-600 text-xs font-bold flex items-center gap-2 hover:text-blue-800 uppercase tracking-widest"><Plus size={14}/> Add Item</button>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-10">
          <button onClick={onCancel} className="px-6 py-2.5 text-gray-500 font-bold text-sm">Discard</button>
          <button onClick={() => alert('Order Confirmed!')} className="px-10 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg flex items-center gap-2 uppercase tracking-tighter">
            <CheckCircle size={20} /> Confirm Order
          </button>
      </div>
    </div>
  );
};

export default SalesOrderEntry;