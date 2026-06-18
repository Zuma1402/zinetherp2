import React, { useState } from 'react';
import { Ledger, Voucher, VoucherType, InventoryItem, AccountType, StockTransaction } from '../types';
import { Save, Plus, Trash2, RotateCcw } from 'lucide-react';
import ItemAutocomplete from './ItemAutocomplete';

interface SalesReturnProps {
  ledgers: Ledger[];
  items: InventoryItem[];
  onSave: (voucher: Voucher, stockUpdates: StockTransaction[]) => void;
  onCancel: () => void;
}

const SalesReturn: React.FC<SalesReturnProps> = ({ ledgers, items, onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteNo, setNoteNo] = useState(`CN-${Math.floor(Math.random() * 10000)}`);
  const [customerId, setCustomerId] = useState('');
  const [returnLedgerId, setReturnLedgerId] = useState('');
  
  const [lineItems, setLineItems] = useState([{ itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }]);

  const customers = ledgers.filter(l => l.group.includes('Debtors') || l.type === AccountType.ASSET);
  const returnAccounts = ledgers.filter(l => l.type === AccountType.INCOME || l.type === AccountType.EXPENSE || l.name.includes('Return'));

  const handleItemChange = (index: number, field: string, value: any) => {
    const newLines = [...lineItems];
    const line = { ...newLines[index] };
    const val = Number(value);

    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      line.itemId = value;
      line.rate = item ? item.rate : 0;
      
      const base = line.qty * line.rate;
      line.taxAmount = (base * line.taxRate) / 100;
      line.amount = base + line.taxAmount;
    } else if (field === 'qty') {
      line.qty = val;
      const base = line.qty * line.rate;
      line.taxAmount = (base * line.taxRate) / 100;
      line.amount = base + line.taxAmount;
    } else if (field === 'rate') {
      line.rate = val;
      const base = line.qty * line.rate;
      line.taxAmount = (base * line.taxRate) / 100;
      line.amount = base + line.taxAmount;
    } else if (field === 'taxRate') {
      line.taxRate = val;
      const base = line.qty * line.rate;
      line.taxAmount = (base * line.taxRate) / 100;
      line.amount = base + line.taxAmount;
    } else if (field === 'taxAmount') {
      line.taxAmount = val;
      const base = line.qty * line.rate;
      line.amount = base + line.taxAmount;
      if (base > 0) line.taxRate = Number(((line.taxAmount / base) * 100).toFixed(2));
    } else if (field === 'amount') {
      line.amount = val;
      if (line.qty > 0) {
        const taxMultiplier = 1 + (line.taxRate / 100);
        line.rate = val / (line.qty * taxMultiplier);
        const base = line.qty * line.rate;
        line.taxAmount = val - base;
      }
    }

    newLines[index] = line;
    setLineItems(newLines);
  };

  const addLine = () => setLineItems([...lineItems, { itemId: '', qty: 1, rate: 0, taxRate: 0, taxAmount: 0, amount: 0 }]);
  const removeLine = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const subTotal = totalAmount - totalTax;

  const handleSubmit = () => {
    if (!customerId || !returnLedgerId || totalAmount <= 0) {
      alert("Please select customer, return account and add items.");
      return;
    }

    const voucherId = crypto.randomUUID();

    const itemDetails = lineItems.map(line => {
        const item = items.find(i => i.id === line.itemId);
        return `${line.qty} ${item?.unit || 'pcs'} ${item?.name}`;
    }).join(', ');
    const narration = `Sales Return / Credit Note #${noteNo} - ${itemDetails}`;

    const voucher: Voucher = {
      id: voucherId,
      date,
      number: noteNo,
      type: VoucherType.CREDIT_NOTE,
      narration: narration,
      entries: [
        { ledgerId: returnLedgerId, debit: totalAmount, credit: 0 },
        { ledgerId: customerId, debit: 0, credit: totalAmount }
      ]
    };

    const stockUpdates: StockTransaction[] = lineItems.map(line => ({
      itemId: line.itemId,
      qty: Math.abs(line.qty),
      rate: line.rate,
      voucherId: voucherId
    }));

    onSave(voucher, stockUpdates);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-5xl mx-auto border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="bg-indigo-100 text-indigo-600 p-2 rounded flex items-center gap-2">
            <RotateCcw size={20} /> Sales Return (Credit Note)
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <div className="flex gap-2 mt-1">
                <select 
                    className="flex-1 p-2 border rounded focus:ring-2 ring-indigo-200"
                    value={customerId} 
                    onChange={e => setCustomerId(e.target.value)}
                >
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700">Return Ledger</label>
           <select 
            className="w-full p-2 border rounded mt-1"
            value={returnLedgerId}
            onChange={e => setReturnLedgerId(e.target.value)}
           >
             <option value="">Select Return Account</option>
             {returnAccounts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded mt-1" />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[900px]">
                <thead className="bg-gray-50 border-b">
                    <tr>
                    <th className="p-3">Item Details</th>
                    <th className="p-3 w-16">Unit</th>
                    <th className="p-3 w-20">Qty</th>
                    <th className="p-3 w-24">Rate</th>
                    <th className="p-3 w-20">Tax %</th>
                    <th className="p-3 w-24 text-right">Tax Amt</th>
                    <th className="p-3 w-28 text-right">Total</th>
                    <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    {lineItems.map((line, idx) => {
                    const item = items.find(i => i.id === line.itemId);
                    return (
                    <tr key={idx} className="border-b last:border-0">
                        <td className="p-2 align-top">
                            <ItemAutocomplete 
                                items={items} 
                                selectedId={line.itemId} 
                                onSelect={(id) => handleItemChange(idx, 'itemId', id)} 
                                placeholder="Search item..."
                            />
                        </td>
                        <td className="p-2 align-top">
                            <div className="text-[10px] text-gray-500 font-medium mb-1">Unit</div>
                            <div className="p-2 text-sm bg-gray-50 rounded border border-transparent">
                            {item ? item.unit : '-'}
                            </div>
                        </td>
                        <td className="p-2 align-top">
                        <div className="text-[10px] text-gray-500 font-medium mb-1">Qty</div>
                        <input type="number" min="1" className="w-full p-2 border rounded" value={line.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                        </td>
                        <td className="p-2 align-top">
                        <div className="text-[10px] text-gray-500 font-medium mb-1">Rate</div>
                        <input type="number" min="0" className="w-full p-2 border rounded" value={line.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} />
                        </td>
                        <td className="p-2 align-top">
                        <div className="text-[10px] text-gray-500 font-medium mb-1">Tax %</div>
                        <input type="number" min="0" max="100" className="w-full p-2 border rounded" value={line.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)} placeholder="0" />
                        </td>
                        <td className="p-2 align-top">
                        <div className="text-[10px] text-gray-500 font-medium mb-1 text-right">Tax Amt</div>
                        <input type="number" min="0" className="w-full p-2 border rounded text-right" value={line.taxAmount} onChange={e => handleItemChange(idx, 'taxAmount', e.target.value)} />
                        </td>
                        <td className="p-2 align-top">
                        <div className="text-[10px] text-gray-500 font-medium mb-1 text-right">Total</div>
                        <input type="number" min="0" className="w-full p-2 border rounded text-right font-medium" value={line.amount} onChange={e => handleItemChange(idx, 'amount', e.target.value)} />
                        </td>
                        <td className="p-2 align-bottom pb-3">
                        <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16}/></button>
                        </td>
                    </tr>
                    );
                    })}
                </tbody>
            </table>
        </div>
        <div className="p-2 bg-gray-50 border-t">
            <button onClick={addLine} className="flex items-center gap-1 text-indigo-600 text-sm font-medium"><Plus size={16}/> Add Item</button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 border-t pt-4">
        <div className="flex justify-between w-64 text-sm">
            <span className="text-gray-500">Sub Total:</span>
            <span>{subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between w-64 text-sm">
            <span className="text-gray-500">Total Tax:</span>
            <span>{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between w-64 text-xl font-bold text-gray-800 border-t pt-2">
            <span>Grand Total:</span>
            <span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2">
            <Save size={18} /> Save Return
          </button>
      </div>
    </div>
  );
};

export default SalesReturn;