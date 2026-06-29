import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ShoppingCart, 
  ShoppingBag, 
  Package, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ArrowRight,
  Globe,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { FinancialSummary, Voucher, Ledger, InventoryItem, AccountType } from '../types';
import { calculateTrialBalance } from '../services/accountingService';

interface DashboardProps {
  summary: FinancialSummary;
  vouchers: Voucher[];
  ledgers: Ledger[];
  inventory: InventoryItem[];
  onNavigate: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ summary, vouchers, ledgers, inventory, onNavigate }) => {
  
  // ⭐ PRISTINE FOREX SIMULATOR ENGINE STATES (Additive Additions Only)
  const [exchangeFluctuation, setExchangeFluctuation] = useState<number>(0);

  const recentVouchers = useMemo(() => {
    return [...vouchers]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [vouchers]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.currentStock <= (item.minStockLevel || 0));
  }, [inventory]);

  // Calculate trial balance
  const trialBalance = useMemo(() => calculateTrialBalance(ledgers, vouchers), [ledgers, vouchers]);

  // Dynamic Net Profit Trend (current month vs previous month)
  const netProfitTrend = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-CA');
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString('en-CA');

    const calcProfit = (start: string, end: string) => {
      let income = 0, expense = 0;
      vouchers.filter(v => v.date >= start && v.date <= end).forEach(v => {
        v.entries.forEach(e => {
          const led = ledgers.find(l => l.id === e.ledgerId);
          if (led?.type === AccountType.INCOME) income += (e.credit - e.debit);
          if (led?.type === AccountType.EXPENSE) expense += (e.debit - e.credit);
        });
      });
      return income - expense;
    };

    const curr = calcProfit(currentMonthStart, currentMonthEnd);
    const prev = calcProfit(prevMonthStart, prevMonthEnd);
    return prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / Math.abs(prev)) * 100);
  }, [vouchers, ledgers]);

  // Dynamic Revenue Trend
  const revenueTrend = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-CA');
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString('en-CA');

    const calcIncome = (start: string, end: string) => {
      let income = 0;
      vouchers.filter(v => v.date >= start && v.date <= end).forEach(v => {
        v.entries.forEach(e => {
          const led = ledgers.find(l => l.id === e.ledgerId);
          if (led?.type === AccountType.INCOME) income += (e.credit - e.debit);
        });
      });
      return income;
    };

    const curr = calcIncome(currentMonthStart, currentMonthEnd);
    const prev = calcIncome(prevMonthStart, prevMonthEnd);
    return prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
  }, [vouchers, ledgers]);

  // Dynamic Expense Trend
  const expenseTrend = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-CA');
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString('en-CA');

    const calcExpense = (start: string, end: string) => {
      let expense = 0;
      vouchers.filter(v => v.date >= start && v.date <= end).forEach(v => {
        v.entries.forEach(e => {
          const led = ledgers.find(l => l.id === e.ledgerId);
          if (led?.type === AccountType.EXPENSE) expense += (e.debit - e.credit);
        });
      });
      return expense;
    };

    const curr = calcExpense(currentMonthStart, currentMonthEnd);
    const prev = calcExpense(prevMonthStart, prevMonthEnd);
    return prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
  }, [vouchers, ledgers]);

  // Calculate expense percentage of revenue
  const expensePercentage = useMemo(() => {
    return summary.totalIncome === 0 ? 0 : Math.round((summary.totalExpenses / summary.totalIncome) * 100);
  }, [summary]);

  // Chart Data: Monthly Revenue vs Expenses
  const monthlyData = useMemo(() => {
    const months: Record<string, { name: string, income: number, expense: number }> = {};
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toLocaleString('default', { month: 'short' });
    }).reverse();

    last6Months.forEach(m => months[m] = { name: m, income: 0, expense: 0 });

    vouchers.forEach(v => {
        const monthName = new Date(v.date).toLocaleString('default', { month: 'short' });
        if (months[monthName]) {
            v.entries.forEach(e => {
                const ledger = ledgers.find(l => l.id === e.ledgerId);
                if (ledger?.type === AccountType.INCOME) months[monthName].income += (e.credit - e.debit);
                if (ledger?.type === AccountType.EXPENSE) months[monthName].expense += (e.debit - e.credit);
            });
        }
    });

    return Object.values(months);
  }, [vouchers, ledgers]);

  // Liquidity (Cash + Bank)
  const liquidity = useMemo(() => {
    return ledgers
      .filter(l => l.group.includes('Cash') || l.group.includes('Bank'))
      .reduce((sum, l) => {
          return sum + l.openingBalance; 
      }, 0);
  }, [ledgers]);

  // ⭐ DYNAMIC FOREX SIMULATION CALCULATOR BLUEPRINT (Additive Additions)
  const forexCalculations = useMemo(() => {
    // Isolate foreign exposure items inside debtors/creditors groups
    const foreignReceivables = ledgers
      .filter(l => l.group.includes('Debtors') || l.group.includes('Receivable'))
      .reduce((sum, l) => sum + (l.openingBalance || 0), 0) * 0.25; // Assumption: 25% foreign pipeline index

    const foreignPayables = ledgers
      .filter(l => l.group.includes('Creditors') || l.group.includes('Payable') || l.group.includes('Suppliers'))
      .reduce((sum, l) => sum + (l.openingBalance || 0), 0) * 0.40; // Assumption: 40% material core import index

    const grossExposure = foreignReceivables - foreignPayables;
    const impactBuffer = (grossExposure * (exchangeFluctuation / 100));
    const simulatedProfit = summary.netProfit + impactBuffer;

    return {
      foreignReceivables,
      foreignPayables,
      impactBuffer,
      simulatedProfit
    };
  }, [ledgers, exchangeFluctuation, summary.netProfit]);

  const KpiCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden group transition-all hover:scale-[1.02]">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-500`}></div>
      <div className="relative z-10">
        <div className={`p-3 bg-${color}-100 text-${color}-600 rounded-2xl w-fit mb-4 md:mb-6 shadow-sm`}>
          <Icon size={24} />
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</div>
        <div className="flex items-end gap-3">
          <div className="text-2xl md:text-3xl font-black text-gray-900 font-mono tracking-tighter">
            {value.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-xs font-bold mb-1 ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
               {trend > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
               {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Business Insights</h1>
           <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-[0.3em]">Accounting Intelligence Hub</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 w-fit">
            <Clock size={16} className="text-indigo-600" />
            <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Live Sync Enabled</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard title="Net Profit" value={summary.netProfit} icon={TrendingUp} color="indigo" trend={netProfitTrend} />
        <KpiCard title="Operating Revenue" value={summary.totalIncome} icon={ShoppingCart} color="emerald" trend={revenueTrend} />
        <KpiCard title="Expenses % of Revenue" value={expensePercentage} icon={ShoppingBag} color="rose" trend={expenseTrend} />
        <KpiCard title="Cash & Bank" value={liquidity} icon={Wallet} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-2xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 md:mb-10 gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900">Performance Index</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Revenue vs Expenditure (Last 6 Months)</p>
            </div>
            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Expense</span>
                </div>
            </div>
          </div>
          
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }}
                    dy={15}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }}
                />
                <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                />
                <Bar dataKey="income" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={25} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar: Alerts & Activity */}
        <div className="space-y-6">
           {/* Inventory Alert */}
           <div className="bg-amber-900 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] text-white shadow-2xl shadow-amber-900/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-amber-800 rounded-xl">
                    <Package size={20} className="text-amber-200" />
                 </div>
                 <span className="text-xs font-black uppercase tracking-[0.2em]">Stock Sentinel</span>
              </div>
              <h4 className="text-3xl font-black mb-2 leading-none">{lowStockItems.length}</h4>
              <p className="text-amber-200/60 text-[10px] font-bold uppercase tracking-widest mb-6">Items Require Restock</p>
              
              <div className="space-y-3">
                 {lowStockItems.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs font-bold border-t border-amber-800 pt-3">
                        <span className="truncate pr-4">{item.name}</span>
                        <span className="text-amber-400 font-mono shrink-0">{item.currentStock} {item.unit}</span>
                    </div>
                 ))}
                 <button 
                    onClick={() => onNavigate('INVENTORY')}
                    className="w-full mt-4 py-3 bg-amber-800 hover:bg-amber-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                    Resolve Now <ArrowRight size={14}/>
                 </button>
              </div>
           </div>

           {/* Recent Activity Mini-Feed */}
           <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/30">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Journal Log</h4>
                <button onClick={() => onNavigate('JOURNAL_ENTRY')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800">View All</button>
              </div>
              <div className="space-y-5">
                 {recentVouchers.map(v => (
                    <div key={v.id} className="flex gap-4 items-start group cursor-pointer" onClick={() => onNavigate('JOURNAL_ENTRY')}>
                        <div className="w-1 h-8 bg-indigo-50 group-hover:bg-indigo-600 rounded-full transition-colors mt-1"></div>
                        <div className="overflow-hidden">
                            <div className="text-xs font-black text-gray-800">{v.number}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-tighter">{v.narration}</div>
                        </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Grid: Quick Actions & Extended Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
         <div className="bg-gray-900 p-8 md:p-10 rounded-2xl md:rounded-[3rem] text-white flex flex-col justify-between shadow-2xl shadow-gray-900/20">
            <div>
               <h4 className="text-xl font-black mb-2">Automate Billing</h4>
               <p className="text-gray-500 text-xs font-bold leading-relaxed mb-8">Setup recurring invoices for your long-term contracts and subscriptions.</p>
            </div>
            <button 
                onClick={() => onNavigate('RECURRING_INVOICE')}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all transform active:scale-95"
            >
                Start Recurring Model
            </button>
         </div>

         <div className="bg-white p-8 md:p-10 rounded-2xl md:rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/30 lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
               <h4 className="text-xl font-black text-gray-900">Financial Snapshot</h4>
               <button onClick={() => onNavigate('REPORT_PL')} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">Detailed Reports <ArrowRight size={14}/></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
               <div className="text-center p-6 bg-gray-50 rounded-2xl md:rounded-[2rem]">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assets</div>
                  <div className="text-lg md:text-xl font-black text-gray-900 font-mono">{summary.totalAssets.toLocaleString()}</div>
               </div>
               <div className="text-center p-6 bg-gray-50 rounded-2xl md:rounded-[2rem]">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Liabilities</div>
                  <div className="text-lg md:text-xl font-black text-gray-900 font-mono">{summary.totalLiabilities.toLocaleString()}</div>
               </div>
               <div className="text-center p-6 bg-gray-50 rounded-2xl md:rounded-[2rem]">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Equity</div>
                  <div className="text-lg md:text-xl font-black text-gray-900 font-mono">{summary.totalEquity.toLocaleString()}</div>
               </div>
            </div>
         </div>
      </div>

      {/* ⭐ 100% BRAND NEW ADDITIVE: PREDICTIVE FOREX RISK BUFFER MATRIX PANEL */}
      <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/40 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <Globe size={22} className="animate-spin-slow" />
            <h4 className="text-lg font-black tracking-tight text-gray-900">Predictive Forex Risk Buffer</h4>
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cross-Border Valuation Sensitivity Matrix</p>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Aapke current accounts ledger exposure ke mutabiq foreign liabilities (imports/procurement) ka shock index calculate ho raha hai. Slider ko tilt karke potential margin risk analyze karein:
          </p>
          
          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 tracking-widest">
              <span>EXCHANGE FLUCTUATION RISK</span>
              <span className={`font-mono text-xs ${exchangeFluctuation >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {exchangeFluctuation > 0 ? `+${exchangeFluctuation}` : exchangeFluctuation}%
              </span>
            </div>
            <input 
              type="range" 
              min="-15" 
              max="15" 
              step="0.5"
              value={exchangeFluctuation}
              onChange={e => setExchangeFluctuation(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
            />
            <div className="flex justify-between text-[9px] font-black text-gray-400">
              <span>-15% DEVALUATION</span>
              <button onClick={() => setExchangeFluctuation(0)} className="hover:text-indigo-600 text-indigo-500">RESET (BASE)</button>
              <span>+15% APPRECIATION</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Risk Alert Callouts */}
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 border rounded-2xl flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Foreign Asset Exposure</div>
                <div className="text-md font-black text-gray-800 font-mono mt-0.5">${forexCalculations.foreignReceivables.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
              </div>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-200">Receivables</span>
            </div>

            <div className="p-4 bg-gray-50 border rounded-2xl flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Foreign Debt Exposure</div>
                <div className="text-md font-black text-gray-800 font-mono mt-0.5">${forexCalculations.foreignPayables.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
              </div>
              <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-md border border-rose-200">Payables</span>
            </div>

            {/* Dynamic Real-time Condition Card Trigger */}
            {forexCalculations.impactBuffer !== 0 && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-200 ${forexCalculations.impactBuffer < 0 ? 'bg-rose-50/50 border-rose-100 text-rose-900' : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'}`}>
                <ShieldAlert size={18} className={`shrink-0 mt-0.5 ${forexCalculations.impactBuffer < 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider">Estimated Margin Buffer Impact</h5>
                  <p className="text-[11px] font-medium opacity-80 mt-0.5">
                    Currency rate fluctuation ki wajah se aapki ledger value par pratical buffer impact <span className="font-bold font-mono">{forexCalculations.impactBuffer.toLocaleString(undefined, {maximumFractionDigits:0})}</span> parh sakta hai.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Simulated Impact Gauge Meter Card */}
          <div className="p-6 bg-slate-900 text-white rounded-3xl md:rounded-[2rem] border border-slate-800 shadow-xl flex flex-col justify-between h-full min-h-[180px]">
            <div>
              <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                <Sliders size={12} className="text-indigo-400" /> Simulated Net Profit
              </div>
              <div className="text-3xl font-black font-mono tracking-tighter mt-2 text-indigo-300">
                {forexCalculations.simulatedProfit.toLocaleString(undefined, {minimumFractionDigits: 0})}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 mt-4 flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-400 font-medium">Standard Real Base:</span>
              <span className="font-mono text-slate-200">{summary.netProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;