import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  PieChart, 
  Settings as SettingsIcon,
  LogOut,
  FileText,
  Package,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Wallet,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Menu,
  X,
  Building2,
  Radio,
  Landmark,
  Warehouse as WarehouseIcon
} from 'lucide-react';

import LedgerList from './components/LedgerList';
import VoucherEntry from './components/VoucherEntry';
import ProfitLossStatement from './components/ProfitLossStatement';
import BalanceSheet from './components/BalanceSheet';
import AIAssistant from './components/AIAssistant';
import Login from './components/Login';
import Settings from './components/Settings';
import SalesInvoice from './components/SalesInvoice';
import SalesReturn from './components/SalesReturn';
import PurchaseInvoice from './components/PurchaseInvoice';
import PurchaseReturn from './components/PurchaseReturn';
import ExpenseEntry from './components/ExpenseEntry';
import PaymentReceived from './components/PaymentReceived';
import InventoryList from './components/InventoryList';
import GeneralLedgerView from './components/GeneralLedgerView';
import UnitManager from './components/UnitManager';
import TransactionManager from './components/TransactionManager';
import Dashboard from './components/Dashboard';

import QuotationEntry from './components/sales/QuotationEntry';
import SalesOrderEntry from './components/sales/SalesOrderEntry';
import DeliveryNoteEntry from './components/sales/DeliveryNoteEntry';
import RecurringInvoiceManager from './components/sales/RecurringInvoiceManager';
import SalesRefundEntry from './components/sales/SalesRefundEntry';

import PurchaseOrderEntry from './components/purchase/PurchaseOrderEntry';
import GoodsReceivingEntry from './components/purchase/GoodsReceivingEntry';
import MakePaymentEntry from './components/purchase/MakePaymentEntry';
import PurchaseRefundEntry from './components/purchase/PurchaseRefundEntry';

import { AgingReports } from './components/AgingReports';
import EcommerceReconciliation from './components/EcommerceReconciliation';
import { BankReconciliation } from './components/BankReconciliation';
import { WarehouseManager } from './components/WarehouseManager';

// ⭐ IMPORT REPORT VIEW ENGINE
import ReportView from './components/ReportView';

import { Ledger, Voucher, User, Role, InventoryItem, StockTransaction, Unit, VoucherType } from './types';
import { calculateTrialBalance, calculateFinancialSummary } from './services/accountingService';
import { getCurrentUser, logout } from './services/authService';
import { getCompanySettings, saveCompanySettings } from './services/settingsService';
import { CloudService } from './services/cloudService';
import { supabase } from './services/supabaseService'; 
import { LanguageProvider, useLanguage } from './context/LanguageContext';

import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

type View = 
  | 'DASHBOARD'
  | 'CHART_OF_ACCOUNTS' 
  | 'JOURNAL_ENTRY' 
  | 'GENERAL_LEDGER'
  | 'BANK_RECONCILIATION'
  | 'INVENTORY'
  | 'WAREHOUSES'
  | 'UNITS'
  | 'QUOTATION'
  | 'SALES_ORDER'
  | 'DELIVERY'
  | 'INVOICE'
  | 'RECURRING_INVOICE'
  | 'SALES_RETURN'
  | 'PAYMENT_RECEIVED'
  | 'SALES_REFUND'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIVING'
  | 'PURCHASE'
  | 'PURCHASE_RETURN'
  | 'MAKE_PAYMENT'
  | 'PURCHASE_REFUND'
  | 'EXPENSES'
  | 'REPORT_PL'
  | 'REPORT_BS'
  | 'REPORT_AGING' 
  | 'REPORT_TRIAL'
  | 'REPORT_CASH'
  | 'REPORT_STOCK'
  | 'REPORT_SALES'
  | 'ECOM_RECONCILIATION'
  | 'SETTINGS';

const AppContent: React.FC = () => {
  const { t, language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data State
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  
  const [companyName, setCompanyName] = useState('ZinethERP');
  const [selectedLedgerForView, setSelectedLedgerForView] = useState<string>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'TRIAL' | 'ACTIVE' | 'EXPIRED'>('TRIAL');

  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(
    localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || ''
  );

  const [activeModules, setActiveModules] = useState<string[]>(['core_accounting']);

  const [salesMenuOpen, setSalesMenuOpen] = useState(false);
  const [purchaseMenuOpen, setPurchaseMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);

  const reloadCloudData = async (targetCompanyId: string) => {
    if (!targetCompanyId) return;
    setSyncStatus('syncing');
    try {
      const data = await CloudService.fetchAllData(targetCompanyId); 
      setLedgers(data.ledgers);
      setVouchers(data.vouchers);
      setInventoryItems(data.inventory);
      setUnits(data.units);
      setStockTransactions(data.transactions);
      if (data.ledgers.length > 0) {
        setSelectedLedgerForView(data.ledgers[0].id);
      } else {
        setSelectedLedgerForView('');
      }

      const { data: currentComp } = await supabase
        .from('companies')
        .select('enabled_modules')
        .eq('id', targetCompanyId)
        .maybeSingle();

      if (currentComp && currentComp.enabled_modules) {
        setActiveModules(currentComp.enabled_modules);
      } else {
        setActiveModules(['core_accounting']);
      }

      setSyncStatus('synced');
    } catch (error) {
      console.error("Cloud reload failed", error);
      setSyncStatus('error');
    }
  };

  const fetchUserCompanies = async (currentUserSession: User) => {
    try {
      let finalUniqueList: any[] = [];
      
      const { data: allComps } = await supabase.from('companies').select('id, name, base_currency');
      const { data: userCompJunction } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', currentUserSession.id);

      const boundCompanyId = currentUserSession.company_id || (userCompJunction && userCompJunction[0]?.company_id) || '';

      if (currentUserSession.role === 'ADMIN' && !boundCompanyId) {
        if (allComps) {
          const uniqueCompaniesMap = new Map();
          allComps.forEach((c: any) => uniqueCompaniesMap.set(c.name.trim().toLowerCase(), c));
          finalUniqueList = Array.from(uniqueCompaniesMap.values());
        }
      } else if (boundCompanyId) {
        if (allComps) {
          finalUniqueList = allComps.filter((c: any) => c.id === boundCompanyId);
        }
      }

      setCompanies(finalUniqueList);

      if (finalUniqueList.length > 0) {
        const storedId = boundCompanyId || localStorage.getItem('supabase_active_company_id') || finalUniqueList[0].id;
        const matchedComp = finalUniqueList.find(c => c.id === storedId) || finalUniqueList[0];
        
        setActiveCompanyId(matchedComp.id);
        setCompanyName(matchedComp.name);
        localStorage.setItem('supabase_active_company_id', matchedComp.id);
        localStorage.setItem('active_company_id', matchedComp.id);
        return matchedComp.id;
      }
      return '';
    } catch (err) {
      console.error("Error fetching multi-companies", err);
      return '';
    }
  };

  useEffect(() => {
    const init = async () => {
        const session = getCurrentUser();
        if (!session) {
          setIsLoading(false);
          return;
        }
        setUser(session);
        
        const settings = await getCompanySettings();
        setSubscriptionStatus(settings.subscriptionStatus);

        const effectiveId = await fetchUserCompanies(session); 
        await reloadCloudData(effectiveId);
        setIsLoading(false);
    };
    init();

    const handleWorkspaceSwitch = (e: any) => {
      if (e.detail && e.detail.id) {
        reloadCloudData(e.detail.id);
      }
    };
    window.addEventListener('companySwitched', handleWorkspaceSwitch);
    return () => window.removeEventListener('companySwitched', handleWorkspaceSwitch);
  }, []); 

  useEffect(() => {
    if (activeCompanyId && !isLoading) {
      reloadCloudData(activeCompanyId);
    }
  }, [activeCompanyId]);

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsLoading(true);
    const effectiveId = await fetchUserCompanies(loggedInUser);
    await reloadCloudData(effectiveId);
    setIsLoading(false);
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    localStorage.removeItem('supabase_active_company_id');
    localStorage.removeItem('active_company_id');
    setLedgers([]);
    setVouchers([]);
    setInventoryItems([]);
  };

  const handleCloudOperation = async (operation: () => Promise<any>) => {
    if (user?.role === 'VIEWER') {
      alert("Security Enforcement Matrix: Your read-only profile cannot commit database mutations!");
      return;
    }

    setSyncStatus('syncing');
    try {
        await operation();
        await reloadCloudData(activeCompanyId); 
        setSyncStatus('synced');
    } catch (e) {
        console.error("Operation Sync Failed:", e);
        setSyncStatus('error');
        alert("Database sync failed!");
    }
  };

  const handleSaveVoucher = (newVoucher: Voucher) => {
    const customPayload = { ...newVoucher, company_id: activeCompanyId };
    handleCloudOperation(() => CloudService.saveVoucher(customPayload));
  };

  const handleDeleteVoucher = (id: string) => {
    handleCloudOperation(async () => {
        await CloudService.deleteVoucher(id);
        await CloudService.deleteStockTransactionsByVoucher(id);
    });
  };

  const handleAddLedger = (newLedger: Ledger) => {
    const customPayload = { ...newLedger, company_id: activeCompanyId };
    handleCloudOperation(() => CloudService.saveLedger(customPayload));
  };

  const handleDeleteLedger = (id: string) => {
    handleCloudOperation(async () => {
        await CloudService.deleteLedger(id);
    });
  };

  const handleViewLedgerHistory = (ledgerId: string) => {
    setSelectedLedgerForView(ledgerId);
    setCurrentView('GENERAL_LEDGER');
    setIsMobileMenuOpen(false);
  };

  const handleSaveInvoiceWithStock = (newVoucher: Voucher, stockUpdates: StockTransaction[]) => {
    handleCloudOperation(async () => {
        const voucherWithCompany = { ...newVoucher, company_id: activeCompanyId };
        await CloudService.saveVoucher(voucherWithCompany);
        if (stockUpdates && stockUpdates.length > 0) {
            const stockWithCompany = stockUpdates.map(t => ({ ...t, company_id: activeCompanyId }));
            await CloudService.saveStockTransactions(stockWithCompany);
            const updatedInventoryMap = inventoryItems.map(item => {
                const transaction = stockUpdates.find(t => t.itemId === item.id);
                if (transaction) {
                    return {
                        ...item,
                        currentStock: item.currentStock + transaction.qty,
                        costPrice: transaction.qty > 0 ? transaction.rate : item.costPrice,
                        company_id: activeCompanyId
                    };
                }
                return item;
            });
            await CloudService.updateStockLevels(updatedInventoryMap);
        }
    });
  };

  const handleAddItem = (item: InventoryItem) => {
      const customPayload = { ...item, company_id: activeCompanyId };
      handleCloudOperation(() => CloudService.saveInventoryItem(customPayload));
  };

  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    const customPayload = { ...updatedItem, company_id: activeCompanyId };
    handleCloudOperation(() => CloudService.saveInventoryItem(customPayload, true));
  };

  const handleDeleteInventoryItem = (id: string) => {
    handleCloudOperation(() => CloudService.deleteInventoryItem(id));
  };

  const handleAddUnit = (unit: Unit) => {
    handleCloudOperation(() => CloudService.saveUnit(unit));
  };

  const handleDeleteUnit = (id: string) => {
    handleCloudOperation(async () => {
        await CloudService.deleteUnit(id);
    });
  };

  const trialBalance = useMemo(() => calculateTrialBalance(ledgers, vouchers), [ledgers, vouchers]);
  const financialSummary = useMemo(() => calculateFinancialSummary(trialBalance, ledgers), [trialBalance, ledgers]);
  const lowStockCount = useMemo(() => inventoryItems.filter(item => item.currentStock <= (item.minStockLevel || 0)).length, [inventoryItems]);

  if (isLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <div className="text-gray-600 font-medium animate-pulse">Connecting to Partitioned Infrastructure Cloud Database...</div>
          </div>
      );
  }

  const SidebarItem = ({ view, icon: Icon, label, nested = false, badge }: { view: View; icon?: React.ElementType; label: string, nested?: boolean, badge?: number }) => {
    return (
      <button
        onClick={() => {
            setCurrentView(view);
            setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold transition-colors rounded-xl mb-0.5 whitespace-nowrap
          ${nested ? 'pl-10' : ''}
          ${currentView === view 
            ? 'bg-indigo-50 text-indigo-700 font-extrabold shadow-2xs' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && <Icon size={18} className="shrink-0" />}
          <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-2xs shrink-0">
            {badge}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <>
        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-200">
                z
              </div>
              <div>
                <h2 className="font-extrabold text-gray-800 text-md tracking-tight leading-none">ZinethERP</h2>
              </div>
            </div>

            <div className="relative flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 shadow-sm mb-2">
              <Building2 size={18} className="text-indigo-600 shrink-0" />
              <select 
                value={activeCompanyId || 'default'} 
                disabled={companies.length <= 1}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val !== 'default') {
                    const comp = companies.find(c => c.id === val);
                    if (comp) {
                      setActiveCompanyId(comp.id);
                      setCompanyName(comp.name);
                      localStorage.setItem('supabase_active_company_id', comp.id);
                      localStorage.setItem('active_company_id', comp.id);
                      window.dispatchEvent(new CustomEvent('companySwitched', { detail: { id: comp.id, name: comp.name } }));
                    }
                  }
                }}
                className="w-full bg-transparent text-sm font-black text-indigo-900 focus:outline-none cursor-pointer pr-6 border-none appearance-none font-sans disabled:cursor-default"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                {companies.length > 0 ? (
                  companies.map((comp) => (
                    <option key={comp.id} value={comp.id} className="bg-white text-gray-800 font-sans font-bold">
                      {comp.name}
                    </option>
                  ))
                ) : (
                  <option value="default" className="bg-white text-gray-800 font-sans font-medium">
                    {companyName}
                  </option>
                )}
              </select>
              {companies.length > 1 && <ChevronDown size={14} className="text-indigo-500 absolute right-3 pointer-events-none" />}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded w-fit uppercase tracking-widest shadow-sm">
                {syncStatus === 'synced' && <><CheckCircle2 size={10} className="text-green-500"/> DB Connected</>}
                {syncStatus === 'syncing' && <><Loader2 size={10} className="animate-spin text-blue-500"/> Syncing...</>}
                {syncStatus === 'error' && <span className="text-rose-500">❌ DB Error</span>}
            </div>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
            <SidebarItem view="DASHBOARD" icon={LayoutDashboard} label={t('dashboard')} />

            <div className="pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase px-4 tracking-widest">{t('accounting')}</div>
            <SidebarItem view="CHART_OF_ACCOUNTS" icon={BookOpen} label={t('chartOfAccounts')} />
            <SidebarItem view="JOURNAL_ENTRY" icon={FileText} label={t('journalEntry')} />
            <SidebarItem view="GENERAL_LEDGER" icon={ClipboardList} label={t('generalLedger')} />
            
            {activeModules.includes('bank_reconciliation') && (
              <SidebarItem view="BANK_RECONCILIATION" icon={Landmark} label={t('bankReconciliation')} />
            )}
            
            <div className="pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase px-4 tracking-widest">{t('business')}</div>
            
            <div>
                <button onClick={() => setSalesMenuOpen(!salesMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-center gap-3"><ShoppingCart size={18} className="text-indigo-500" /> {t('sales')}</div>
                  {salesMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {salesMenuOpen && (
                  <div className="space-y-0.5 mt-1 animate-in slide-in-from-top-2 duration-200">
                     <SidebarItem view="QUOTATION" label="Quotation" nested />
                     <SidebarItem view="SALES_ORDER" label="Order" nested />
                     <SidebarItem view="DELIVERY" label="Delivery" nested />
                     <SidebarItem view="INVOICE" label="Invoice" nested />
                     <SidebarItem view="RECURRING_INVOICE" label="Recurring Invoice" nested />
                     <SidebarItem view="SALES_RETURN" label="Return" nested />
                     <SidebarItem view="PAYMENT_RECEIVED" label="Receive Payment" nested />
                     <SidebarItem view="SALES_REFUND" label="Refund" nested />
                  </div>
                )}
            </div>

            <div>
                <button onClick={() => setPurchaseMenuOpen(!purchaseMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-blue-500" /> {t('purchases')}</div>
                  {purchaseMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {purchaseMenuOpen && (
                  <div className="space-y-0.5 mt-1 animate-in slide-in-from-top-2 duration-200">
                     <SidebarItem view="PURCHASE_ORDER" label="Order" nested />
                     <SidebarItem view="GOODS_RECEIVING" label="Good Receiving" nested />
                     <SidebarItem view="PURCHASE" label="Invoice" nested />
                     <SidebarItem view="PURCHASE_RETURN" label="Return" nested />
                     <SidebarItem view="MAKE_PAYMENT" label="Make Payment" nested />
                     <SidebarItem view="PURCHASE_REFUND" label="Refund" nested />
                  </div>
                )}
            </div>

            <SidebarItem view="INVENTORY" icon={Package} label={t('inventory')} badge={lowStockCount} />
            
            {activeModules.includes('multi_warehouse') && (
              <SidebarItem view="WAREHOUSES" icon={WarehouseIcon} label={t('warehouses')} />
            )}

            <SidebarItem view="EXPENSES" icon={Wallet} label={t('expenses')} />
            
            {activeModules.includes('ecommerce_reconciliation') && (
              <SidebarItem view="ECOM_RECONCILIATION" icon={Radio} label={t('eCommercePayouts')} />
            )}

            <div className="pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase px-4 tracking-widest">{t('system')}</div>
            <div>
                <button onClick={() => setReportsMenuOpen(!reportsMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-center gap-3"><PieChart size={18} className="text-orange-500" /> {t('reports')}</div>
                  {reportsMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {reportsMenuOpen && (
                  <div className="space-y-0.5 mt-1 animate-in slide-in-from-top-2 duration-200">
                     <SidebarItem view="REPORT_PL" label="Profit & Loss" nested />
                     <SidebarItem view="REPORT_BS" label="Balance Sheet" nested />
                     <SidebarItem view="REPORT_AGING" label="Aging Analysis" nested /> 
                     <SidebarItem view="REPORT_TRIAL" label="Trial Balance" nested />
                     <SidebarItem view="REPORT_CASH" label="Cash & Bank Book" nested />
                     <SidebarItem view="REPORT_STOCK" label="Stock In & Outflow" nested />
                     <SidebarItem view="REPORT_SALES" label="Sales & Tax Report" nested />
                  </div>
                )}
            </div>
            {user?.role === 'ADMIN' && <SidebarItem view="SETTINGS" icon={SettingsIcon} label={t('settings')} />}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-2 rounded-lg text-xs font-bold transition-colors uppercase tracking-widest">
              <LogOut size={14} /> {t('logout')}
            </button>
        </div>
    </>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative" dir={language === 'ur' || language === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <SidebarContent />
      </aside>

      <div className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)} />
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col md:hidden transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600">
            <X size={24} />
        </button>
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition md:hidden">
                  <Menu size={24} />
              </button>
              <h1 className="text-md font-bold text-slate-800 tracking-tight hidden md:block uppercase text-xs bg-slate-100 px-3 py-1 rounded-md text-slate-600 tracking-wider">
                Accounting Hub Panel
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full border border-indigo-100 shadow-sm uppercase tracking-wider">
                Role: <span className="font-black text-indigo-950">{user?.role}</span> (@{user?.username})
              </span>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {currentView === 'DASHBOARD' && (
                    <Dashboard summary={financialSummary} vouchers={vouchers} ledgers={ledgers} inventory={inventoryItems} onNavigate={setCurrentView} />
                )}
                {currentView === 'CHART_OF_ACCOUNTS' && (
                    <LedgerList ledgers={ledgers} vouchers={vouchers} onAddLedger={handleAddLedger} onDeleteLedger={handleDeleteLedger} onViewLedger={handleViewLedgerHistory} trialBalance={trialBalance} />
                )}
                {currentView === 'JOURNAL_ENTRY' && (
                    <TransactionManager title="Journal Entries" type={VoucherType.JOURNAL} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveVoucher} onDelete={handleDeleteVoucher} FormComponent={VoucherEntry} formProps={{ ledgers, trialBalance }} />
                )}
                {currentView === 'GENERAL_LEDGER' && (
                  <GeneralLedgerView ledgers={ledgers} vouchers={vouchers} initialLedgerId={selectedLedgerForView} />
                )}

                {currentView === 'BANK_RECONCILIATION' && activeModules.includes('bank_reconciliation') && (
                  <BankReconciliation ledgers={ledgers} vouchers={vouchers} onSaveVoucher={handleSaveVoucher} />
                )}

                {currentView === 'INVENTORY' && (
                  <InventoryList items={inventoryItems} units={units} transactions={stockTransactions} onAddItem={handleAddItem} onUpdateItem={handleUpdateInventoryItem} onDeleteItem={handleDeleteInventoryItem} onManageUnits={() => setCurrentView('UNITS')} />
                )}

                {currentView === 'WAREHOUSES' && activeModules.includes('multi_warehouse') && (
                  <WarehouseManager />
                )}

                {currentView === 'UNITS' && (
                  <UnitManager units={units} onAddUnit={handleAddUnit} onDeleteUnit={handleDeleteUnit} onBack={() => setCurrentView('INVENTORY')} />
                )}
                {currentView === 'QUOTATION' && (
                   <TransactionManager title="Sales Quotations" type="QUOTATION" vouchers={[]} ledgers={ledgers} onSave={() => {}} FormComponent={QuotationEntry} formProps={{ ledgers, items: inventoryItems }} />
                )}
                {currentView === 'SALES_ORDER' && (
                   <TransactionManager title="Sales Orders" type="ORDER" vouchers={[]} ledgers={ledgers} onSave={() => {}} FormComponent={SalesOrderEntry} formProps={{ ledgers, items: inventoryItems }} />
                )}
                {currentView === 'DELIVERY' && (
                   <TransactionManager title="Delivery Notes" type="DELIVERY" vouchers={[]} ledgers={ledgers} onSave={handleSaveInvoiceWithStock} FormComponent={DeliveryNoteEntry} formProps={{ ledgers, items: inventoryItems }} />
                )}
                {currentView === 'INVOICE' && (
                  <TransactionManager title="Sales Invoices" type={VoucherType.SALES} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveInvoiceWithStock} onDelete={handleDeleteVoucher} FormComponent={SalesInvoice} formProps={{ ledgers, items: inventoryItems, onAddLedger: handleAddLedger, trialBalance }} />
                )}
                {currentView === 'RECURRING_INVOICE' && (
                   <RecurringInvoiceManager ledgers={ledgers} items={inventoryItems} />
                )}
                {currentView === 'SALES_RETURN' && (
                  <TransactionManager title="Sales Returns" type={VoucherType.CREDIT_NOTE} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveInvoiceWithStock} onDelete={handleDeleteVoucher} FormComponent={SalesReturn} formProps={{ ledgers, items: inventoryItems, trialBalance }} />
                )}
                {currentView === 'PAYMENT_RECEIVED' && (
                  <TransactionManager title="Payments Received" type={VoucherType.RECEIPT} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveVoucher} onDelete={handleDeleteVoucher} FormComponent={PaymentReceived} formProps={{ ledgers, onAddLedger: handleAddLedger, trialBalance }} />
                )}
                {currentView === 'SALES_REFUND' && (
                  <TransactionManager title="Sales Refunds" type={VoucherType.PAYMENT} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveVoucher} onDelete={handleDeleteVoucher} FormComponent={SalesRefundEntry} formProps={{ ledgers, trialBalance }} />
                )}
                {currentView === 'PURCHASE_ORDER' && (
                   <TransactionManager title="Purchase Orders" type="PURCHASE_ORDER" vouchers={[]} ledgers={ledgers} onSave={() => {}} FormComponent={PurchaseOrderEntry} formProps={{ ledgers, items: inventoryItems }} />
                )}
                {currentView === 'GOODS_RECEIVING' && (
                   <TransactionManager title="Goods Receiving Notes" type="GRN" vouchers={[]} ledgers={ledgers} onSave={handleSaveInvoiceWithStock} FormComponent={GoodsReceivingEntry} formProps={{ ledgers, items: inventoryItems }} />
                )}
                {currentView === 'PURCHASE' && (
                  <TransactionManager title="Purchase Bills" type={VoucherType.PURCHASE} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveInvoiceWithStock} onDelete={handleDeleteVoucher} FormComponent={PurchaseInvoice} formProps={{ ledgers, items: inventoryItems, onAddLedger: handleAddLedger, trialBalance }} />
                )}
                
                {currentView === 'PURCHASE_RETURN' && (
                  <TransactionManager title="Purchase Returns" type={VoucherType.DEBIT_NOTE} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveInvoiceWithStock} onDelete={handleDeleteVoucher} FormComponent={PurchaseReturn} formProps={{ ledgers, items: inventoryItems, trialBalance }} />
                )}
                
                {currentView === 'MAKE_PAYMENT' && (
                  <TransactionManager title="Payments to Vendors" type={VoucherType.PAYMENT} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveVoucher} onDelete={handleDeleteVoucher} FormComponent={MakePaymentEntry} formProps={{ ledgers, trialBalance }} />
                )}
                {currentView === 'PURCHASE_REFUND' && (
                  <TransactionManager title="Purchase Refunds" type={VoucherType.RECEIPT} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveVoucher} onDelete={handleDeleteVoucher} FormComponent={PurchaseRefundEntry} formProps={{ ledgers, trialBalance }} />
                )}
                {currentView === 'EXPENSES' && (
                  <TransactionManager title="Expenses" type={VoucherType.PAYMENT} vouchers={vouchers} ledgers={ledgers} onSave={handleSaveVoucher} onDelete={handleDeleteVoucher} FormComponent={ExpenseEntry} formProps={{ ledgers, trialBalance }} />
                )}
                
                {currentView === 'ECOM_RECONCILIATION' && activeModules.includes('ecommerce_reconciliation') && (
                  <EcommerceReconciliation ledgers={ledgers} onSave={handleSaveVoucher} />
                )}

                {/* REPORTS */}
                {currentView === 'REPORT_PL' && (
                    <ProfitLossStatement 
                      vouchers={vouchers} 
                      ledgers={ledgers} 
                      companyName={companyName} 
                      onViewLedger={handleViewLedgerHistory} 
                    />
                )}
                {currentView === 'REPORT_BS' && (
                    <BalanceSheet 
                      vouchers={vouchers} 
                      ledgers={ledgers} 
                      companyName={companyName} 
                      onViewLedger={handleViewLedgerHistory} 
                    />
                )}
                {currentView === 'REPORT_AGING' && ( 
                    <AgingReports ledgers={ledgers} vouchers={vouchers} />
                )}

                {/* ⭐ ROUTING DIRECTLY TO ReportView WITH EXACT MATCHING TYPES */}
                {currentView === 'REPORT_TRIAL' && (
                  <ReportView type="TRIAL_BALANCE" trialBalance={trialBalance} summary={financialSummary} ledgers={ledgers} vouchers={vouchers} inventory={inventoryItems} />
                )}
                {currentView === 'REPORT_CASH' && (
                  <ReportView type="CASH_BANK" trialBalance={trialBalance} summary={financialSummary} ledgers={ledgers} vouchers={vouchers} inventory={inventoryItems} />
                )}
                {currentView === 'REPORT_STOCK' && (
                  <ReportView type="STOCK_MOVEMENT" trialBalance={trialBalance} summary={financialSummary} ledgers={ledgers} vouchers={vouchers} inventory={inventoryItems} />
                )}
                {currentView === 'REPORT_SALES' && (
                  <ReportView type="SALES_TAX" trialBalance={trialBalance} summary={financialSummary} ledgers={ledgers} vouchers={vouchers} inventory={inventoryItems} />
                )}

                {currentView === 'SETTINGS' && user?.role === 'ADMIN' && (
                  <Settings 
                    currentUser={user} 
                    onUpdateUser={setUser} 
                    onUpdateCompany={setCompanyName} 
                    onCompanyCreated={async () => {
                      await fetchUserCompanies(user!);
                    }}
                  />
                )}
            </div>
        </div>
      </main>

      <AIAssistant summary={financialSummary} trialBalance={trialBalance} />
      <SpeedInsights />
      <Analytics />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;