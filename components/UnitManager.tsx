import React, { useState } from 'react';
import { Unit } from '../types';
import { Plus, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';

interface UnitManagerProps {
  units: Unit[];
  onAddUnit: (unit: Unit) => void;
  onDeleteUnit: (id: string) => void;
  onBack: () => void;
}

const UnitManager: React.FC<UnitManagerProps> = ({ units, onAddUnit, onDeleteUnit, onBack }) => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [isCompound, setIsCompound] = useState(false);
  const [baseUnitId, setBaseUnitId] = useState('');
  const [factor, setFactor] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !symbol) return;
    if (isCompound && (!baseUnitId || factor <= 0)) {
        alert("Please select a valid base unit and factor greater than 0");
        return;
    }

    const newUnit: Unit = {
      id: crypto.randomUUID(),
      name,
      symbol,
      baseUnitId: isCompound ? baseUnitId : undefined,
      factor: isCompound ? Number(factor) : 1,
    };

    onAddUnit(newUnit);
    setName('');
    setSymbol('');
    setIsCompound(false);
    setBaseUnitId('');
    setFactor(1);
  };

  const getBaseUnitSymbol = (id: string | undefined) => {
    return units.find(u => u.id === id)?.symbol || 'unknown';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition">
             <ArrowLeft size={20} className="text-gray-600"/>
        </button>
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Unit of Measure</h2>
           <p className="text-gray-500 text-sm">Define units and conversion factors (e.g. 1 Box = 12 pcs)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-fit">
            <h3 className="font-semibold text-lg mb-4 text-gray-700">Add New Unit</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
                    <input 
                        required 
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="e.g. Box" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                    <input 
                        required 
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                        value={symbol} 
                        onChange={e => setSymbol(e.target.value)} 
                        placeholder="e.g. box" 
                    />
                </div>
                
                <div className="flex items-center gap-2 py-2">
                    <input 
                        type="checkbox" 
                        id="compound" 
                        checked={isCompound} 
                        onChange={e => setIsCompound(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="compound" className="text-sm text-gray-700">Is this a compound unit?</label>
                </div>

                {isCompound && (
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Conversion</label>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <span>1 {symbol || '...'} =</span>
                                <input 
                                    type="number" 
                                    className="w-20 p-1 border rounded text-center" 
                                    value={factor} 
                                    onChange={e => setFactor(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Base Unit</label>
                             <select 
                                className="w-full p-2 border rounded bg-white"
                                value={baseUnitId}
                                onChange={e => setBaseUnitId(e.target.value)}
                             >
                                <option value="">Select Base Unit</option>
                                {units.filter(u => !u.baseUnitId).map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                                ))}
                             </select>
                        </div>
                    </div>
                )}

                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 flex justify-center items-center gap-2">
                    <Plus size={18} /> Add Unit
                </button>
            </form>
        </div>

        {/* List */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4 text-center">Symbol</th>
                        <th className="p-4">Conversion</th>
                        <th className="p-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {units.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 group">
                            <td className="p-4 font-medium text-gray-900">{u.name}</td>
                            <td className="p-4 text-center text-gray-600">{u.symbol}</td>
                            <td className="p-4 text-gray-600">
                                {u.baseUnitId ? (
                                    <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit text-xs font-medium">
                                        <RefreshCw size={12} />
                                        1 {u.symbol} = {u.factor} {getBaseUnitSymbol(u.baseUnitId)}
                                    </div>
                                ) : (
                                    <span className="text-gray-400 text-xs italic">Base Unit</span>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => onDeleteUnit(u.id)}
                                    className="text-gray-400 hover:text-red-600 transition"
                                    title="Delete Unit"
                                    // Prevent deleting if it is a base unit for others (simple check)
                                    disabled={units.some(sub => sub.baseUnitId === u.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {units.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">No units defined.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default UnitManager;