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
  Building2 
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

// Sales Components
import QuotationEntry from './components/sales/QuotationEntry';
import SalesOrderEntry from './components/sales/SalesOrderEntry';
import DeliveryNoteEntry from './components/sales/DeliveryNoteEntry';
import RecurringInvoiceManager from './components/sales/RecurringInvoiceManager';
import SalesRefundEntry from './components/sales/SalesRefundEntry';

// Purchase Components
import PurchaseOrderEntry from './components/purchase/PurchaseOrderEntry';
import GoodsReceivingEntry from './components/purchase/GoodsReceivingEntry';
import MakePaymentEntry from './components/purchase/MakePaymentEntry';
import PurchaseRefundEntry from './components/purchase/PurchaseRefundEntry';

import { Ledger, Voucher, User, Role, InventoryItem, StockTransaction, Unit, VoucherType } from './types';
import { calculateTrialBalance, calculateFinancialSummary } from './services/accountingService';
import { getCurrentUser, logout } from './services/authService';
import { getCompanySettings, activateSubscription, getDaysRemaining } from './services/settingsService';
import { CloudService } from './services/cloudService';
import { supabase } from './services/supabaseService'; 

type View = 
  | 'DASHBOARD'
  | 'CHART_OF_ACCOUNTS' 
  | 'JOURNAL_ENTRY' 
  | 'GENERAL_LEDGER'
  | 'INVENTORY'
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
  | 'SETTINGS';

const App: React.FC = () => {
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

  // New Multi-Company States
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');

  // Menu State
  const [salesMenuOpen, setSalesMenuOpen] = useState(false);
  const [purchaseMenuOpen, setPurchaseMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);

  // Helper to completely reload fresh state from Cloud DB on any update
  const reloadCloudData = async () => {
    try {
      const data = await CloudService.fetchAllData(activeCompanyId); 
      setLedgers(data.ledgers);
      setVouchers(data.vouchers);
      setInventoryItems(data.inventory);
      setUnits(data.units);
      setStockTransactions(data.transactions);
      if (data.ledgers.length > 0 && !selectedLedgerForView) {
        setSelectedLedgerForView(data.ledgers[0].id);
      }
    } catch (error) {
      console.error("Cloud reload failed", error);
      setSyncStatus('error');
    }
  };

  // New function to load companies mapped to user
  const fetchUserCompanies = async () => {
    try {
      const { data: mapping, error: mapErr } = await supabase
        .from('user_companies')
        .select('company_id, companies(id, name)');
      
      if (mapping && mapping.length > 0) {
        const formattedCompanies = mapping.map((m: any) => m.companies).filter(Boolean);
        setCompanies(formattedCompanies);
        if (formattedCompanies.length > 0) {
          // If activeCompanyId isn't set yet, pick the first one
          if (!activeCompanyId) {
            setActiveCompanyId(formattedCompanies[0].id);
            setCompanyName(formattedCompanies[0].name);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching multi-companies", err);
    }
  };

  // Initialize App
  useEffect(() => {
    const init = async () => {
        const session = getCurrentUser();
        if (session) setUser(session);
        
        const settings = getCompanySettings();
        if (settings.companyName && !activeCompanyId) setCompanyName(settings.companyName);
        setSubscriptionStatus(settings.subscriptionStatus);

        await fetchUserCompanies(); 
        await reloadCloudData();
        setIsLoading(false);
    };
    init();
  }, [activeCompanyId]); 

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const handleCloudOperation = async (operation: () => Promise<any>) => {
    setSyncStatus('syncing');
    try {
        await operation();
        await reloadCloudData(); 
        setSyncStatus('synced');
    } catch (e) {
        console.error("Operation Sync Failed:", e);
        setSyncStatus('error');
        alert("Database sync failed! Make sure database schemas are matched.");
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
    handleCloudOperation(() => CloudService.deleteUnit(id));
  };

  const trialBalance = useMemo(() => calculateTrialBalance(ledgers, vouchers), [ledgers, vouchers]);
  const financialSummary = useMemo(() => calculateFinancialSummary(trialBalance, ledgers), [trialBalance, ledgers]);
  const lowStockCount = useMemo(() => inventoryItems.filter(item => item.currentStock <= (item.minStockLevel || 0)).length, [inventoryItems]);

  if (isLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <div className="text-gray-600 font-medium animate-pulse">Connecting to Cloud Database...</div>
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
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-0.5
          ${nested ? 'pl-11' : ''}
          ${currentView === view 
            ? 'bg-indigo-50 text-indigo-700' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} />}
          {label}
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
            {badge}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <>
        {/* Dropdown Frame with Integrated ZinethERP Brand Identity */}
        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
            {/* 👑 BRAND LOGO SECTION COMPLIANT WITH image_48aa27.png */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-200">
                z
              </div>
              <div>
                <h2 className="font-extrabold text-gray-800 text-md tracking-tight leading-none">ZinethERP</h2>
              </div>
            </div>

            {/* DYNAMIC WORKSPACE SELECTOR BASED ON USER ROLE PROTECTION */}
            {user?.role === 'ADMIN' ? (
              <div className="relative flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 shadow-sm mb-2">
                <Building2 size={18} className="text-indigo-600 shrink-0" />
                <select 
                  value={activeCompanyId || 'default'} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'default' && companies.length > 0) {
                      const comp = companies.find(c => c.id === val);
                      if (comp) {
                        setActiveCompanyId(comp.id);
                        setCompanyName(comp.name);
                      }
                    }
                  }}
                  className="w-full bg-transparent text-sm font-black text-indigo-900 focus:outline-none cursor-pointer pr-6 border-none appearance-none font-sans"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                  {companies.length > 0 ? (
                    companies.map((comp) => (
                      <option key={comp.id} value={comp.id} className="bg-white text-gray-800 font-sans font-medium">
                        {comp.name}
                      </option>
                    ))
                  ) : (
                    <option value="default" className="bg-white text-gray-800 font-sans font-medium">
                      {companyName || 'Achievers account'}
                    </option>
                  )}
                </select>
                <ChevronDown size={14} className="text-indigo-500 absolute right-3 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 shadow-inner mb-2">
                🔒 {companies.find(c => c.id === activeCompanyId)?.name || companyName || 'Assigned Company'}
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded w-fit uppercase tracking-widest shadow-sm">
                {syncStatus === 'synced' && <><CheckCircle2 size={10} className="text-green-500"/> DB Connected</>}
                {syncStatus === 'syncing' && <><Loader2 size={10} className="animate-spin text-blue-500"/> Syncing...</>}
                {syncStatus === 'error' && <span className="text-rose-500">❌ DB Error</span>}
            </div>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
            <SidebarItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />

            <div className="pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase px-4 tracking-widest">Accounting</div>
            <SidebarItem view="CHART_OF_ACCOUNTS" icon={BookOpen} label="Chart of Accounts" />
            <SidebarItem view="JOURNAL_ENTRY" icon={FileText} label="Journal General" />
            <SidebarItem view="GENERAL_LEDGER" icon={ClipboardList} label="General Ledger" />
            
            <div className="pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase px-4 tracking-widest">Business</div>
            
            <div>
                <button onClick={() => setSalesMenuOpen(!salesMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-center gap-3"><ShoppingCart size={18} className="text-indigo-500" /> Sales</div>
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
                  <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-blue-500" /> Purchases</div>
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

            <SidebarItem view="INVENTORY" icon={Package} label="Inventory" badge={lowStockCount} />
            <SidebarItem view="EXPENSES" icon={Wallet} label="Expenses" />
            
            <div className="pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase px-4 tracking-widest">System</div>
            <div>
                <button onClick={() => setReportsMenuOpen(!reportsMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-center gap-3"><PieChart size={18} className="text-orange-500" /> Reports</div>
                  {reportsMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {reportsMenuOpen && (
                  <div className="space-y-0.5 mt-1 animate-in slide-in-from-top-2 duration-200">
                     <SidebarItem view="REPORT_PL" label="Profit & Loss" nested />
                     <SidebarItem view="REPORT_BS" label="Balance Sheet" nested />
                  </div>
                )}
            </div>
            <SidebarItem view="SETTINGS" icon={SettingsIcon} label="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-2 rounded-lg text-xs font-bold transition-colors uppercase tracking-widest">
              <LogOut size={14} /> Logout
            </button>
        </div>
    </>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
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

      {/* Main Structural Frame holding Header and Pages safely */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main Header Panel with elegant Clean UI Overhaul */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition md:hidden">
                  <Menu size={24} />
              </button>
              <h1 className="text-md font-bold text-slate-800 tracking-tight hidden md:block uppercase tracking-wider text-xs bg-slate-100 px-3 py-1 rounded-md text-slate-600">
                Accounting Hub Panel
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                Logged user: <span className="font-black text-indigo-900">{user?.username}</span>
              </span>
            </div>
        </header>

        {/* Inner Content Area holding view routing wrappers */}
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
                {currentView === 'INVENTORY' && (
                  <InventoryList items={inventoryItems} units={units} transactions={stockTransactions} onAddItem={handleAddItem} onUpdateItem={handleUpdateInventoryItem} onDeleteItem={handleDeleteInventoryItem} onManageUnits={() => setCurrentView('UNITS')} />
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
                {currentView === 'REPORT_PL' && (
                    <ProfitLossStatement vouchers={vouchers} ledgers={ledgers} companyName={companyName} />
                )}
                {currentView === 'REPORT_BS' && (
                    <BalanceSheet vouchers={vouchers} ledgers={ledgers} companyName={companyName} />
                )}
                {currentView === 'SETTINGS' && (
                  <Settings 
                    currentUser={user} 
                    onUpdateUser={setUser} 
                    onUpdateCompany={setCompanyName} 
                    onCompanyCreated={async () => {
                      // Trigger callback to re-pull user corporate mapped profiles
                      await fetchUserCompanies();
                    }}
                  />
                )}
            </div>
        </div>
      </main>

      <AIAssistant summary={financialSummary} trialBalance={trialBalance} />
    </div>
  );
};

export default App;