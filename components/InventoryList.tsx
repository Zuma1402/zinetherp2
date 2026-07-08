import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, Unit, StockTransaction, ValuationMethod } from '../types';
import { Plus, Package, Pencil, Trash2, X, Save, Settings, AlertTriangle, Calculator, History, RotateCcw, Calendar, Filter } from 'lucide-react';
import { calculateStockValue } from '../services/inventoryService';
import { getCompanySettings, saveCompanySettings } from '../services/settingsService';

interface InventoryListProps {
  items: InventoryItem[];
  units: Unit[];
  transactions?: StockTransaction[];
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onManageUnits: () => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ 
    items, 
    units, 
    transactions = [], 
    onAddItem, 
    onUpdateItem, 
    onDeleteItem, 
    onManageUnits 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<string | null>(null);
  const [valuationMethod, setValuationMethod] = useState<ValuationMethod>('FIFO');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Date Filter for Valuation/History
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getCompanySettings();
        if (settings.stockValuationMethod) {
            setValuationMethod(settings.stockValuationMethod);
        }
      } catch (error) {
        console.error('Error loading inventory settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleMethodChange = async (method: ValuationMethod) => {
    try {
      setValuationMethod(method);
      const settings = await getCompanySettings();
      await saveCompanySettings({ ...settings, stockValuationMethod: method });
    } catch (error) {
      console.error('Error updating valuation method:', error);
    }
  };

  // Form State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState(units[0]?.symbol || 'pcs');
  const [rate, setRate] = useState(0);
  const [openingStock, setOpeningStock] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(0);

  const resetForm = () => {
    setName('');
    setUnit(units[0]?.symbol || 'pcs');
    setRate(0);
    setOpeningStock(0);
    setMinStockLevel(0);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditClick = (item: InventoryItem) => {
    setName(item.name);
    setUnit(item.unit);
    setRate(item.rate);
    setOpeningStock(item.currentStock);
    setMinStockLevel(item.minStockLevel || 0);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      onDeleteItem(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      const originalItem = items.find(i => i.id === editingId);
      if (originalItem) {
          onUpdateItem({
            ...originalItem,
            name,
            unit,
            rate: Number(rate),
            minStockLevel: Number(minStockLevel),
          });
      }
    } else {
      onAddItem({
        id: crypto.randomUUID(),
        name,
        unit,
        rate: Number(rate),
        currentStock: Number(openingStock),
        minStockLevel: Number(minStockLevel),
        costPrice: 0 
      });
    }
    resetForm();
  };

  const filteredTransactions = transactions.filter(t => {
      return true; 
  });

  const displayedItems = useMemo(() => {
    if (!showLowStockOnly) return items;
    return items.filter(item => item.currentStock <= (item.minStockLevel || 0));
  }, [items, showLowStockOnly]);

  const totalStockValue = items.reduce((sum, item) => {
      const val = calculateStockValue(item, filteredTransactions, valuationMethod);
      return sum + val;
  }, 0);

  const lowStockItems = items.filter(item => item.currentStock <= (item.minStockLevel || 0));

  const itemTransactions = selectedHistoryItem 
    ? transactions.filter(t => t.itemId === selectedHistoryItem).reverse() 
    : [];

  const historyItemName = items.find(i => i.id === selectedHistoryItem)?.name;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
           <p className="text-gray-500 text-sm">Stock list and valuation</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
             
             {/* Low Stock Filter Toggle */}
             <button 
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-bold uppercase tracking-widest
                    ${showLowStockOnly 
                        ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-inner' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}
                `}
             >
                <Filter size={14} />
                {showLowStockOnly ? 'Showing Alerts Only' : 'Filter Alerts'}
                {lowStockItems.length > 0 && !showLowStockOnly && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                        {lowStockItems.length}
                    </span>
                )}
             </button>

             {/* Date Filter */}
             <div className="relative flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 cursor-pointer group">
                <Calendar size={16} className="text-gray-400"/>
                <span className="text-xs text-gray-500 font-medium">As of:</span>
                <span className="text-sm font-bold text-gray-700 font-mono">{asOfDate}</span>
                <input 
                    type="date" 
                    value={asOfDate} 
                    onChange={e => setAsOfDate(e.target.value)} 
                    onClick={(e) => {
                        try { e.currentTarget.showPicker(); } catch(err) {}
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Select Valuation Date"
                />
             </div>

             <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
                <Calculator size={16} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase">Method:</span>
                <select 
                    value={valuationMethod} 
                    onChange={(e) => handleMethodChange(e.target.value as ValuationMethod)}
                    className="text-sm font-bold text-indigo-700 bg-transparent outline-none cursor-pointer"
                >
                    <option value="FIFO">FIFO</option>
                    <option value="LIFO">LIFO</option>
                    <option value="AVCO">Avg Cost</option>
                </select>
             </div>

             <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hidden sm:block">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Value</p>
                <p className="text-lg font-bold text-indigo-600">{totalStockValue.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</p>
             </div>
             
            <button 
                onClick={onManageUnits}
                className="bg-white text-gray-700 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
            >
                <Settings size={18} /> Units
            </button>

            <button 
                onClick={() => { resetForm(); setShowForm(!showForm); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
                {showForm ? <X size={18} /> : <Plus size={18} />}
                {showForm ? 'Cancel' : 'New Item'}
            </button>
        </div>
      </div>

      {lowStockItems.length > 0 && !showLowStockOnly && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertTriangle className="text-rose-500 shrink-0" size={20} />
              <div className="flex-1">
                  <h4 className="font-bold text-rose-800">Critical Stock Alerts</h4>
                  <p className="text-sm text-rose-700">
                      {lowStockItems.length} items are at or below their minimum stock levels.
                  </p>
              </div>
              <button 
                onClick={() => setShowLowStockOnly(true)}
                className="text-xs font-black text-rose-600 uppercase tracking-widest bg-rose-100 px-3 py-1.5 rounded-lg hover:bg-rose-200"
              >
                Review Items
              </button>
          </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-indigo-100 relative animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-800 mb-6 uppercase tracking-widest">{editingId ? 'Modify Record' : 'Add to Master'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Item Name</label>
                    <input required className="w-full p-2.5 border rounded-xl bg-white text-gray-900 font-bold" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wireless Mouse" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Unit</label>
                    <select className="w-full p-2.5 border rounded-xl bg-white font-bold" value={unit} onChange={e => setUnit(e.target.value)}>
                        {units.map(u => (
                            <option key={u.id} value={u.symbol}>
                                {u.name} ({u.symbol})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Selling Rate (PKR)</label>
                    <input type="number" className="w-full p-2.5 border rounded-xl font-mono font-bold" value={rate} onChange={e => setRate(Number(e.target.value))} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Alert Threshold</label>
                    <input type="number" className="w-full p-2.5 border border-rose-100 rounded-xl font-mono font-bold text-rose-600 bg-rose-50/20" value={minStockLevel} onChange={e => setMinStockLevel(Number(e.target.value))} placeholder="0" />
                </div>
                {!editingId && (
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Opening Stock</label>
                        <input type="number" className="w-full p-2.5 border rounded-xl font-mono font-bold" value={openingStock} onChange={e => setOpeningStock(Number(e.target.value))} />
                    </div>
                )}
                <div className={`flex justify-end ${editingId ? 'md:col-span-4' : 'md:col-span-3'}`}>
                    <button type="submit" className="bg-gray-900 text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black uppercase text-xs tracking-widest shadow-lg transform active:scale-95 transition-all">
                        <Save size={18} />
                        {editingId ? 'Update Record' : 'Save Item'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {selectedHistoryItem && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="font-black text-gray-900 uppercase tracking-widest">Transaction Audit</h3>
                      <p className="text-xs font-bold text-indigo-600">{historyItemName}</p>
                    </div>
                    <button onClick={() => setSelectedHistoryItem(null)} className="text-gray-400 hover:text-gray-700 bg-white p-2 rounded-xl shadow-sm border border-gray-100 transition-colors"><X size={20}/></button>
                </div>
                <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="p-4">Nature</th>
                                <th className="p-4 text-right">Qty Movement</th>
                                <th className="p-4 text-right">Valuation Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {itemTransactions.map((t, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 group">
                                    <td className="p-4">
                                        {t.qty > 0 ? (
                                            <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> INBOUND
                                            </span>
                                        ) : (
                                            <span className="text-rose-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                                              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> OUTBOUND
                                            </span>
                                        )}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${t.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {t.qty > 0 ? '+' : ''}{t.qty}
                                    </td>
                                    <td className="p-4 text-right text-gray-600 font-mono">
                                        {t.rate.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {itemTransactions.length === 0 && (
                                <tr><td colSpan={3} className="p-12 text-center text-gray-400 font-bold italic">No physical records found for this SKU.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <tr>
                    <th className="p-6">Physical Inventory</th>
                    <th className="p-6 text-center">UoM</th>
                    <th className="p-6 text-right">Unit MRP</th>
                    <th className="p-6 text-center">Availability</th>
                    <th className="p-6 text-right">Asset Value</th>
                    <th className="p-6 text-right w-32">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {displayedItems.map(item => {
                    const isLowStock = item.currentStock <= (item.minStockLevel || 0);
                    const calculatedValue = calculateStockValue(item, filteredTransactions, valuationMethod);
                    
                    return (
                        <tr key={item.id} className={`hover:bg-indigo-50/10 group transition-all duration-200 ${isLowStock ? 'bg-rose-50/30' : ''}`}>
                            <td className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl shadow-sm ${isLowStock ? 'bg-rose-100 text-rose-600' : 'bg-gray-50 text-gray-400'}`}>
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <div className="font-black text-gray-900 leading-none mb-1">{item.name}</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                          SKU: {item.id.slice(0, 8)}
                                          {isLowStock && <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase font-black">Low Stock</span>}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5 text-center">
                                <span className="bg-white border border-gray-100 text-gray-500 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{item.unit}</span>
                            </td>
                            <td className="p-5 text-right font-mono font-bold text-gray-700">{item.rate.toLocaleString()}</td>
                            <td className="p-5 text-center">
                                 <div className="inline-flex flex-col items-center">
                                     <span className={`px-4 py-1 rounded-full text-xs font-black font-mono shadow-sm border ${
                                         isLowStock 
                                            ? 'bg-rose-500 text-white border-rose-400' 
                                            : item.currentStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                                     }`}>
                                        {item.currentStock}
                                     </span>
                                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Min: {item.minStockLevel || 0}</span>
                                 </div>
                            </td>
                            <td className="p-5 text-right font-mono font-black text-indigo-700">
                                {calculatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-5 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                    <button 
                                        onClick={() => setSelectedHistoryItem(item.id)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" 
                                        title="Physical Ledger"
                                    >
                                        <History size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleEditClick(item)}
                                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" 
                                        title="Edit SKU"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteClick(item.id)}
                                        className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" 
                                        title="De-list SKU"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                {displayedItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                          <Package size={48} className="text-gray-300" />
                          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            {showLowStockOnly ? 'No physical stock alerts' : 'Inventory master empty'}
                          </p>
                        </div>
                    </td>
                  </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryList;