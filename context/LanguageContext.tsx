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
    aiAssistant: 'AI Assistant',
    settingsPanel: 'Settings Panel',
    userProfileNode: 'User Profile Node',
    fullSignatureName: 'Full Signature Name',
    accessAuthKey: 'Access Authorization Key',
    updateProfile: 'Update Profile',
    interfaceLanguage: 'Interface Language',
    selectLanguageDesc: 'Select preferred operational system language:',
    askAiPlaceholder: 'Ask AI financial questions or request accounting insights...',
    clearChat: 'Clear Chat',
    aiDisclaimer: 'AI responses are generated based on active ledger data & financial parameters.'
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
    aiAssistant: 'Assistant IA',
    settingsPanel: 'Panneau de Configuration',
    userProfileNode: 'Profil Utilisateur',
    fullSignatureName: 'Nom Complet',
    accessAuthKey: "Clé d'autorisation",
    updateProfile: 'Mettre à jour le profil',
    interfaceLanguage: "Langue de l'interface",
    selectLanguageDesc: 'Sélectionnez la langue opérationnelle préférée :',
    askAiPlaceholder: 'Posez des questions financières ou demandez des analyses comptables...',
    clearChat: 'Effacer la discussion',
    aiDisclaimer: 'Les réponses sont générées à partir des données comptables actives.'
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
    aiAssistant: 'اے آئی اسسٹنٹ',
    settingsPanel: 'سیٹنگز پینل',
    userProfileNode: 'صارف کی پروفائل',
    fullSignatureName: 'پورا نام',
    accessAuthKey: 'پاس ورڈ کی',
    updateProfile: 'پروفائل اپ ڈیٹ کریں',
    interfaceLanguage: 'سسٹم کی زبان',
    selectLanguageDesc: 'اپنی پسندیدہ زبان کا انتخاب کریں:',
    askAiPlaceholder: 'مالیاتی سوالات پوچھیں یا اکاؤنٹنگ رپورٹ حاصل کریں...',
    clearChat: 'چیٹ صاف کریں',
    aiDisclaimer: 'اے آئی کے جوابات آپ کے کھاتوں کی بنیاد پر تیار کیے جاتے ہیں۔'
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
    aiAssistant: 'AI Assistant',
    settingsPanel: 'Settings Panel',
    userProfileNode: 'User Profile Node',
    fullSignatureName: 'Poora Naam',
    accessAuthKey: 'Password Key',
    updateProfile: 'Profile Update Karen',
    interfaceLanguage: 'System Ki Language',
    selectLanguageDesc: 'Apni pasandida zaban select karen:',
    askAiPlaceholder: 'Maliati sawal poochen ya accounting insight mangen...',
    clearChat: 'Chat Saaf Karen',
    aiDisclaimer: 'AI jawabat aap ke live ledger data par mabni hain.'
  },
  ar: {
    dashboard: 'لوحة القيادة',
    accounting: 'المحاسبة',
    chartOfAccounts: 'شجرة الحسابات',
    journalEntry: 'دفتر اليومية',
    generalLedger: 'الدفتر العام',
    bankReconciliation: 'التسوية البنكية',
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
    aiAssistant: 'مساعد الذكاء الاصطناعي',
    settingsPanel: 'لوحة الإعدادات',
    userProfileNode: 'ملف المستخدم',
    fullSignatureName: 'الاسم الكامل',
    accessAuthKey: 'مفتاح المرور',
    updateProfile: 'تحديث الملف الشخصي',
    interfaceLanguage: 'لغة النظام',
    selectLanguageDesc: 'اختر لغة التشغيل المفضلة:',
    askAiPlaceholder: 'طرح أسئلة مالية أو طلب تحليلات محاسبية...',
    clearChat: 'مسح المحادثة',
    aiDisclaimer: 'يتم إنشاء الإجابات بناءً على البيانات المالية الحالية.'
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
    aiAssistant: 'AI 助手',
    settingsPanel: '设置面板',
    userProfileNode: '用户个人资料',
    fullSignatureName: '全名',
    accessAuthKey: '访问授权密钥',
    updateProfile: '更新个人资料',
    interfaceLanguage: '界面语言',
    selectLanguageDesc: '选择首选系统语言：',
    askAiPlaceholder: '询问财务问题或请求会计分析...',
    clearChat: '清空聊天',
    aiDisclaimer: 'AI 响应基于实时账簿数据生成。'
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
    aiAssistant: 'Asistente IA',
    settingsPanel: 'Panel de Configuración',
    userProfileNode: 'Perfil de Usuario',
    fullSignatureName: 'Nombre Completo',
    accessAuthKey: 'Clave de Autorización',
    updateProfile: 'Actualizar Perfil',
    interfaceLanguage: 'Idioma de Interfaz',
    selectLanguageDesc: 'Seleccione el idioma preferido del sistema:',
    askAiPlaceholder: 'Haga preguntas financieras o solicite informes contables...',
    clearChat: 'Limpiar Chat',
    aiDisclaimer: 'Las respuestas de IA se generan según los datos contables activos.'
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