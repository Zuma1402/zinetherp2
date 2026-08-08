import React, { useState, useMemo } from 'react';
import { InventoryItem, Voucher, VoucherType } from '../../types';
import { ShoppingBag, Calendar, Search, Printer, ArrowUpDown, Award, TrendingUp, DollarSign } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ProductProfitabilityReportProps {
  inventory: InventoryItem[];
  vouchers: Voucher[];
}

export const ProductProfitabilityReport: React.FC<ProductProfitabilityReportProps> = ({ inventory, vouchers }) => {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'PROFIT' | 'QTY' | 'REVENUE'>('PROFIT');

  // Profitability Calculation Engine
  const profitabilityData = useMemo(() => {
    const itemMap = new Map<string, {
      id: string;
      name: string;
      sku: string;
      unit: string;
      costPrice: number;
      qtySold: number;
      totalRevenue: number;
    }>();

    // Initialize inventory items
    inventory.forEach(item => {
      itemMap.set(item.id, {
        id: item.id,
        name: item.name,
        sku: item.sku || 'N/A',
        unit: item.unit || 'Pcs',
        costPrice: item.costPrice || 0,
        qtySold: 0,
        totalRevenue: 0
      });
    });

    // Parse sales vouchers
    vouchers.forEach(v => {
      if (startDate && v.date < startDate) return;
      if (endDate && v.date > endDate) return;

      if (v.items && Array.isArray(v.items)) {
        v.items.forEach((line: any) => {
          const qty = Number(line.quantity || line.qty || 0);
          const rate = Number(line.unitPrice || line.rate || 0);
          const lineTotal = qty * rate;

          const targetId = line.itemId || inventory.find(i => i.name === line.description)?.id;

          if (targetId && itemMap.has(targetId)) {
            const current = itemMap.get(targetId)!;

            if (v.type === VoucherType.SALES) {
              current.qtySold += qty;
              current.totalRevenue += lineTotal;
            } else if (v.type === VoucherType.CREDIT_NOTE) {
              current.qtySold -= qty;
              current.totalRevenue -= lineTotal;
            }
          }
        });
      }
    });

    // Calculate final metrics (COGS, Net Profit, Margin %)
    const result = Array.from(itemMap.values()).map(item => {
      const avgSellingPrice = item.qtySold > 0 ? item.totalRevenue / item.qtySold : 0;
      const totalCost = item.qtySold * item.costPrice;
      const netProfit = item.totalRevenue - totalCost;
      const profitMarginPct = item.totalRevenue > 0 ? (netProfit / item.totalRevenue) * 100 : 0;

      return {
        ...item,
        avgSellingPrice,
        totalCost,
        netProfit,
        profitMarginPct
      };
    }).filter(row => 
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'PROFIT') return b.netProfit - a.netProfit;
      if (sortBy === 'QTY') return b.qtySold - a.qtySold;
      if (sortBy === 'REVENUE') return b.totalRevenue - a.totalRevenue;
      return 0;
    });
  }, [inventory, vouchers, startDate, endDate, searchTerm, sortBy]);

  // Overall Report KPI Summaries
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    profitabilityData.forEach(row => {
      totalQty += row.qtySold;
      totalRevenue += row.totalRevenue;
      totalCost += row.totalCost;
      totalProfit += row.netProfit;
    });

    const avgMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const topItem = profitabilityData[0];

    return { totalQty, totalRevenue, totalCost, totalProfit, avgMarginPct, topItem };
  }, [profitabilityData]);

  return (
    <div className="space-y-6 printable-margin-report">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-margin-report, .printable-margin-report * { visibility: visible; }
          .printable-margin-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" size={22} /> Product Wise Profitability & Margin Analysis
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Item sales performance, purchase cost vs selling price, and net profit margins</p>
        </div>

        <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm">
          <Printer size={14} /> Print / Export PDF
        </button>
      </div>

      {/* Filters & Sorting */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1.5 text-xs font-bold">
            <Calendar size={14} className="text-indigo-600" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-xs font-bold" />
            <span className="text-gray-400 font-normal">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-xs font-bold" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-gray-600 uppercase flex items-center gap-1"><ArrowUpDown size={13}/> Sort By:</label>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="p-2 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none"
            >
              <option value="PROFIT">Highest Profit (PKR)</option>
              <option value="QTY">Highest Sales Volume (Qty)</option>
              <option value="REVENUE">Highest Revenue (Gross)</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Search item or SKU..." 
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl font-bold bg-gray-50 outline-none" 
          />
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Award size={14} className="text-amber-500" /> Top Selling Product
          </span>
          <h3 className="text-md font-black text-gray-900 mt-1 truncate">{totals.topItem?.name || 'N/A'}</h3>
          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{totals.topItem?.qtySold || 0} {totals.topItem?.unit || 'Pcs'} Sold</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Gross Revenue</span>
          <h3 className="text-xl font-black text-indigo-600 mt-1">Rs {totals.totalRevenue.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Net Profit</span>
          <h3 className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp size={18} /> Rs {totals.totalProfit.toLocaleString()}
          </h3>
        </div>

        <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-md border border-indigo-800">
          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Average Profit Margin %</span>
          <h3 className="text-xl font-black text-emerald-400 mt-1">{totals.avgMarginPct.toFixed(1)}%</h3>
        </div>
      </div>

      {/* Profitability Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-gray-600 font-black uppercase tracking-wider border-b">
            <tr>
              <th className="p-3.5 pl-6">Product Description / SKU</th>
              <th className="p-3.5 text-right">Qty Sold</th>
              <th className="p-3.5 text-right">Avg Selling Price</th>
              <th className="p-3.5 text-right">Purchase Rate (Cost)</th>
              <th className="p-3.5 text-right">Total Revenue</th>
              <th className="p-3.5 text-right text-emerald-700">Net Profit (PKR)</th>
              <th className="p-3.5 text-right pr-6 text-indigo-900">Profit Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
            {profitabilityData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition">
                <td className="p-3.5 pl-6 text-gray-900 font-extrabold">
                  <div>{row.name}</div>
                  <div className="text-[10px] text-gray-400 font-medium">SKU: {row.sku}</div>
                </td>
                <td className="p-3.5 text-right text-gray-700 font-mono">{row.qtySold} {row.unit}</td>
                <td className="p-3.5 text-right text-gray-600">Rs {row.avgSellingPrice.toLocaleString(undefined, {maximumFractionDigits: 1})}</td>
                <td className="p-3.5 text-right text-gray-500">Rs {row.costPrice.toLocaleString()}</td>
                <td className="p-3.5 text-right text-gray-900 font-black">Rs {row.totalRevenue.toLocaleString()}</td>
                <td className={`p-3.5 text-right font-black ${row.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Rs {row.netProfit.toLocaleString()}
                </td>
                <td className="p-3.5 text-right pr-6 font-black">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    row.profitMarginPct >= 20 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    row.profitMarginPct > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {row.profitMarginPct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}

            {profitabilityData.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 italic">No sales or item margin records found in selected period.</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-black text-xs border-t">
            <tr>
              <td className="p-4 pl-6 uppercase">Total Margin Summary</td>
              <td className="p-4 text-right text-gray-300">{totals.totalQty} Pcs</td>
              <td colSpan={2} className="p-4 text-right text-gray-400">Total Product Portfolio</td>
              <td className="p-4 text-right text-indigo-300">Rs {totals.totalRevenue.toLocaleString()}</td>
              <td className="p-4 text-right text-emerald-400">Rs {totals.totalProfit.toLocaleString()}</td>
              <td className="p-4 text-right pr-6 text-emerald-300">{totals.avgMarginPct.toFixed(1)}% Avg</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ProductProfitabilityReport;