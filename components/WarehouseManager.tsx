import React, { useState, useEffect } from 'react';
import { Warehouse as WarehouseIcon, Plus, Building2, PackageCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import { Warehouse } from '../types';

export const WarehouseManager: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockBatches, setStockBatches] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const activeCompanyId =
    localStorage.getItem('supabase_active_company_id') ||
    localStorage.getItem('active_company_id') ||
    localStorage.getItem('company_id') || '';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: whData } = await supabase.from('warehouses').select('*').order('name');
      const { data: batchData } = await supabase.from('inventory_batches').select('*, inventory_items(name), warehouses(name)').order('expiry_date', { ascending: true });
      
      if (whData) setWarehouses(whData);
      if (batchData) setStockBatches(batchData);
    } catch (err) {
      console.error('Error fetching warehouse data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newWh: Warehouse = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code: code.trim().toUpperCase() || name.substring(0, 3).toUpperCase(),
      location: location.trim(),
      company_id: activeCompanyId || undefined
    };

    // ⭐ INSTANT LOCAL STATE UPDATE (Guarantees immediate entry display on screen)
    setWarehouses(prev => [newWh, ...prev]);

    // Save to Database
    try {
      const { error } = await supabase.from('warehouses').insert([newWh]);
      if (error) {
        console.error("Database insert warning:", error);
      }
    } catch (error) {
      console.error("Cloud insert error:", error);
    }

    setName('');
    setCode('');
    setLocation('');
    fetchData();
  };

  // Helper for expiry warning highlight
  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const exp = new Date(dateStr).getTime();
    const today = new Date().getTime();
    const diffDays = (exp - today) / (1000 * 3600 * 24);
    return diffDays <= 30; // 30 days buffer
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-2 rounded-xl"><WarehouseIcon size={18} /></span>
            Multi-Warehouse & Batch / Expiry Master
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Manage physical godowns, stock allocations & expiry monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form: Create Warehouse */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5 border-b pb-3">
            <Plus size={14} /> Add New Warehouse / Godown
          </h3>
          <form onSubmit={handleCreateWarehouse} className="space-y-3">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Warehouse Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Main Godown, Outlet 1"
                className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Code / Identifier</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. WH-01"
                className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Location / City</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Site Area, Karachi"
                className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all">
              Save Warehouse
            </button>
          </form>
        </div>

        {/* Warehouse List & Batch Status Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Warehouse Nodes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {warehouses.map(wh => (
              <div key={wh.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3">
                <span className="p-3 bg-slate-100 text-slate-700 rounded-xl"><Building2 size={20} /></span>
                <div>
                  <h4 className="text-sm font-black text-gray-900">{wh.name}</h4>
                  <p className="text-[10px] font-bold text-indigo-600 font-mono">CODE: {wh.code || 'MAIN'}</p>
                  <p className="text-[11px] font-medium text-gray-500">{wh.location || 'Primary Location'}</p>
                </div>
              </div>
            ))}
            {warehouses.length === 0 && (
              <div className="col-span-2 p-8 bg-white border border-dashed rounded-2xl text-center text-xs font-bold text-gray-400">
                No warehouses registered. Create your first warehouse using the form.
              </div>
            )}
          </div>

          {/* Batch Expiry Live Monitor Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <PackageCheck size={16} /> Batch / Expiry Tracking Monitor
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest border-b">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3 font-mono">Batch #</th>
                    <th className="p-3 text-center">Expiry Date</th>
                    <th className="p-3 text-right">Qty in Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
                  {stockBatches.length > 0 ? (
                    stockBatches.map((b, idx) => {
                      const expiring = isExpiringSoon(b.expiry_date);
                      return (
                        <tr key={idx} className={expiring ? 'bg-rose-50/50' : ''}>
                          <td className="p-3 text-gray-900 font-extrabold">{b.inventory_items?.name || 'Item'}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{b.warehouses?.name || 'Default'}</span></td>
                          <td className="p-3 font-mono text-indigo-600">{b.batch_number || 'B-DEFAULT'}</td>
                          <td className="p-3 text-center font-mono">
                            {b.expiry_date ? (
                              <span className={`px-2 py-1 rounded text-[10px] font-black ${expiring ? 'bg-rose-100 text-rose-700 flex items-center justify-center gap-1' : 'bg-slate-100 text-slate-700'}`}>
                                {expiring && <AlertTriangle size={10} />} {b.expiry_date}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-gray-900">{b.quantity || 0}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400 font-medium italic">
                        No active batch entries recorded yet. Create transactions with batch numbers to monitor expiry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};