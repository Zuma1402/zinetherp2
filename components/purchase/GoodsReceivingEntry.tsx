import React, { useState } from 'react';
import { PackageOpen, Plus, Trash2, Save, Package } from 'lucide-react';
import { Ledger, InventoryItem, AccountType, StockTransaction, Voucher, VoucherType } from '../../types';
import ItemAutocomplete from '../ItemAutocomplete';

interface Props {
  ledgers: Ledger[];
  items: InventoryItem[];
  onSave: (voucher: Voucher, stockUpdates: StockTransaction[]) => void;
  onCancel: () => void;
}

const GoodsReceivingEntry: React.FC<Props> = ({ ledgers, items, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [grnNo, setGrnNo] = useState(`GRN-${Math.floor(Math.random() * 10000)}`);
  const [vendorId, setVendorId] = useState('');
  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1 }]);

  const vendors = ledgers.filter(l => l.group.includes('Creditors') || l.type === AccountType.LIABILITY);

  const handleSave = () => {
    if (!vendorId || lineItems.some(l => !l.itemId)) {
        alert("Please select vendor and items.");
        return;
    }

    const voucherId = crypto.randomUUID();
    const stockUpdates: StockTransaction[] = lineItems.map(l => ({
        itemId: l.itemId,
        qty: Math.abs(l.qty), // Positive for Goods IN
        rate: items.find(i => i.id === l.itemId)?.costPrice || 0,
        voucherId: voucherId
    }));

    const voucher: Voucher = {
        id: voucherId,
        date,
        number: grnNo,
        type: VoucherType.PURCHASE,
        narration: `Inventory Received - GRN #${grnNo}`,
        entries: [] 
    };

    onSave(voucher, stockUpdates);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-6xl mx-auto border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span className="bg-emerald-600 text-white p-2 rounded-lg shadow-sm"><PackageOpen size={20} /></span>
          New Good Receiving Note
        </h2>
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
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">GRN Number</label>
           <input type="text" value={grnNo} readOnly className="w-full p-2.5 bg-white border rounded-xl font-mono font-bold text-emerald-600" />
        </div>
        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Receipt Date</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" />
        </div>
      </div>

      <div className="border rounded-2xl overflow-hidden mb-8 border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="p-4 text-gray-500 font-bold uppercase text-[10px] tracking-widest">Item Description</th>
                        <th className="p-4 w-24 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-center">Unit</th>
                        <th className="p-4 w-32 text-gray-500 font-bold uppercase text-[10px] tracking-widest text-center">Quantity In</th>
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
                                        placeholder="Search material..."
                                        priceType="costPrice"
                                    />
                                </td>
                                <td className="p-3 text-center">
                                    <span className="text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{item?.unit || '-'}</span>
                                </td>
                                <td className="p-3"><input type="number" className="w-full p-2 border rounded-lg text-center font-bold text-emerald-700" value={line.qty} onChange={e => {
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
            <button onClick={() => setLineItems([...lineItems, { itemId: '', qty: 1 }])} className="text-emerald-600 text-xs font-bold flex items-center gap-2 hover:text-emerald-800 uppercase tracking-widest transition"><Plus size={14}/> Add New Item</button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-10">
          <div className="flex items-center gap-3 text-emerald-700 font-bold uppercase text-[10px] tracking-widest">
              <Package size={20} /> Inventory will be increased immediately. Confirm item condition before saving.
          </div>
      </div>

      <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 text-gray-500 font-bold text-sm">Discard</button>
          <button onClick={handleSave} className="px-10 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold shadow-lg flex items-center gap-2">
            <Save size={20} /> Confirm Receipt
          </button>
      </div>
    </div>
  );
};

export default GoodsReceivingEntry;