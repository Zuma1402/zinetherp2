import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'roman_ur' | 'ur' | 'ar' | 'zh' | 'fr' | 'es';

interface Translations {
  [key: string]: { [key: string]: string };
}

const translations: Translations = {
  en: {
    dashboard: 'Dashboard',
    accounting: 'Accounting',
    chartOfAccounts: 'Chart of Accounts',
    journalEntry: 'Journal General',
    generalLedger: 'General Ledger',
    bankReconciliation: 'Bank Reconciliation',
    business: 'Business',
    sales: 'Sales',
    purchases: 'Purchases',
    inventory: 'Inventory',
    warehouses: 'Warehouses',
    expenses: 'Expenses',
    eCommercePayouts: 'E-Commerce Payouts',
    reports: 'Reports',
    system: 'System',
    settings: 'Settings',
    logout: 'Logout',
  },
  fr: {
    dashboard: 'Tableau de bord',
    accounting: 'Comptabilité',
    chartOfAccounts: 'Plan comptable',
    journalEntry: 'Journal Général',
    generalLedger: 'Grand Livre',
    bankReconciliation: 'Rapprochement Bancaire',
    business: 'Entreprise',
    sales: 'Ventes',
    purchases: 'Achats',
    inventory: 'Inventaire',
    warehouses: 'Entrepôts',
    expenses: 'Dépenses',
    eCommercePayouts: 'Paiements E-Commerce',
    reports: 'Rapports',
    system: 'Système',
    settings: 'Paramètres',
    logout: 'Déconnexion',
  },
  ur: {
    dashboard: 'ڈیش بورڈ',
    accounting: 'اکاؤنٹنگ',
    chartOfAccounts: 'کھاتوں کا خاکہ',
    journalEntry: 'روزنامچہ جریدہ',
    generalLedger: 'جنرل لیجر',
    bankReconciliation: 'بینک مطابقت',
    business: 'کاروبار',
    sales: 'فروخت',
    purchases: 'خریداری',
    inventory: 'انوینٹری',
    warehouses: 'گودام',
    expenses: 'اخراجات',
    eCommercePayouts: 'ای کامرس ادائیگی',
    reports: 'رپورٹس',
    system: 'سسٹم',
    settings: 'سیٹنگز',
    logout: 'لاگ آؤٹ',
  },
  roman_ur: {
    dashboard: 'Dashboard',
    accounting: 'Accounting',
    chartOfAccounts: 'Khataon Ka Khaka',
    journalEntry: 'Roznamcha General',
    generalLedger: 'General Ledger',
    bankReconciliation: 'Bank Reconciliation',
    business: 'Karobar',
    sales: 'Farokht (Sales)',
    purchases: 'Kharidari (Purchases)',
    inventory: 'Inventory Stock',
    warehouses: 'Godam (Warehouses)',
    expenses: 'Ikhrajat (Expenses)',
    eCommercePayouts: 'E-Commerce Payouts',
    reports: 'Reports',
    system: 'System',
    settings: 'Settings',
    logout: 'Logout',
  },
  ar: {
    dashboard: 'لوحة القيادة',
    accounting: 'المحاسبة',
    chartOfAccounts: 'شجرة الحسابات',
    journalEntry: 'دفتر اليومية',
    generalLedger: 'الدفتر العام',
    bankReconciliation: 'التسوية Банكية',
    business: 'الأعمال',
    sales: 'المبيعات',
    purchases: 'المشتريات',
    inventory: 'المخزون',
    warehouses: 'المستودعات',
    expenses: 'المصروفات',
    eCommercePayouts: 'مدفوعات التجارة الإلكترونية',
    reports: 'التقارير',
    system: 'النظام',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
  },
  zh: {
    dashboard: '仪表板',
    accounting: '会计',
    chartOfAccounts: '科目表',
    journalEntry: '普通日记账',
    generalLedger: '总分类账',
    bankReconciliation: '银行调节表',
    business: '业务',
    sales: '销售',
    purchases: '采购',
    inventory: '库存',
    warehouses: '仓库',
    expenses: '费用',
    eCommercePayouts: '电商结算',
    reports: '报告',
    system: '系统',
    settings: '设置',
    logout: '退出登录',
  },
  es: {
    dashboard: 'Panel de Control',
    accounting: 'Contabilidad',
    chartOfAccounts: 'Plan de Cuentas',
    journalEntry: 'Diario General',
    generalLedger: 'Libro Mayor',
    bankReconciliation: 'Conciliación Bancaria',
    business: 'Negocio',
    sales: 'Ventas',
    purchases: 'Compras',
    inventory: 'Inventario',
    warehouses: 'Almacenes',
    expenses: 'Gastos',
    eCommercePayouts: 'Pagos E-Commerce',
    reports: 'Informes',
    system: 'Sistema',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('preferred_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);
  };

  // Safe translation helper with English fallback if key/language missing
  const t = (key: string): string => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    if (translations['en'] && translations['en'][key]) {
      return translations['en'][key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};