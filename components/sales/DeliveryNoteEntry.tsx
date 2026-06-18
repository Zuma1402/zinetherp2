import React, { useState } from 'react';
import { Truck, Plus, Trash2, Package } from 'lucide-react';
import { Ledger, InventoryItem, AccountType, StockTransaction, Voucher, VoucherType } from '../../types';
import ItemAutocomplete from '../ItemAutocomplete';

interface DeliveryNoteProps {
  ledgers: Ledger[];
  items: InventoryItem[];
  onSave: (voucher: Voucher, stockUpdates: StockTransaction[]) => void;
  onCancel: () => void;
}

const DeliveryNoteEntry: React.FC<DeliveryNoteProps> = ({ ledgers, items, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dcNo, setDcNo] = useState(`DC-${Math.floor(Math.random() * 10000)}`);
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1 }]);

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);

  const handleSave = () => {
    if (!customerId || lineItems.some(l => !l.itemId)) {
        alert("Please select customer and items.");
        return;
    }

    const voucherId = crypto.randomUUID();
    const stockUpdates: StockTransaction[] = lineItems.map(l => ({
        itemId: l.itemId,
        qty: -Math.abs(l.qty),
        rate: items.find(i => i.id === l.itemId)?.rate || 0,
        voucherId: voucherId
    }));

    const voucher: Voucher = {
        id: voucherId,
        date,
        number: dcNo,
        type: VoucherType.SALES, 
        narration: `Goods Delivered - DC #${dcNo}`,
        entries: [] 
    };

    onSave(voucher, stockUpdates);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-6xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span className="bg-green-600 text-white p-2 rounded-lg shadow-sm"><Truck size={20} /></span>
          New Delivery Challan
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Deliver To</label>
          <select className="w-full p-2.5 border rounded-xl bg-white text-gray-900 font-medium" value={customerId} onChange={e => setCustomerId(e.target.value)}>
             <option value="">Select Recipient...</option>
             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">DC Number</label>
           <input type="text" value={dcNo} readOnly className="w-full p-2.5 bg-white border rounded-xl font-mono font-bold text-green-600" />
        </div>
        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Delivery Date</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" />
        </div>
      </div>

      <div className="border rounded-2xl overflow-hidden mb-8 border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="p-4 text-gray-500 font-bold uppercase text-[10px] tracking-widest">Item Description</th>
                        <th className="p-4 w-24 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-center">In Stock</th>
                        <th className="p-4 w-32 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-center">Quantity Out</th>
                        <th className="p-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {lineItems.map((line, idx) => {
                        const item = items.find(i => i.id === line.itemId);
                        return (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3">
                                    <ItemAutocomplete 
                                        items={items} 
                                        selectedId={line.itemId} 
                                        onSelect={(id) => {
                                            const newLines = [...lineItems];
                                            newLines[idx].itemId = id;
                                            setLineItems(newLines);
                                        }} 
                                        placeholder="Search product..."
                                    />
                                </td>
                                <td className="p-3 text-center">
                                    <span className="text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">{item?.currentStock || 0} {item?.unit}</span>
                                </td>
                                <td className="p-3"><input type="number" className="w-full p-2 border rounded-lg text-center font-bold text-green-700" value={line.qty} onChange={e => {
                                    const newLines = [...lineItems];
                                    newLines[idx].qty = Number(e.target.value);
                                    setLineItems(newLines);
                                }} /></td>
                                <td className="p-3 text-center"><button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <div className="p-3 bg-gray-50/50">
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1 }])} className="text-green-600 text-xs font-bold flex items-center gap-2 hover:text-green-800 uppercase tracking-widest"><Plus size={14}/> Add Line Item</button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-green-50 p-6 rounded-2xl border border-green-100 mb-10">
          <div className="flex items-center gap-3 text-green-700 font-bold uppercase text-[10px] tracking-widest">
              <Package size={20} /> Stock levels will be reduced immediately upon saving.
          </div>
      </div>

      <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 text-gray-500 font-bold text-sm">Discard</button>
          <button onClick={handleSave} className="px-10 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold shadow-lg flex items-center gap-2">
            <Truck size={20} /> Dispatch Goods
          </button>
      </div>
    </div>
  );
};

export default DeliveryNoteEntry;