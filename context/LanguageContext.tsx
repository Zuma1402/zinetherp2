import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'roman_ur' | 'ur';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    no_audit_trail: "No audit trail generated for this transaction yet (Legacy record entry).",
    excel_copy_instruction: "Copy columns from Excel: [Account Title | Debit | Credit] and paste below:",
    excel_paste_placeholder: "Paste Excel rows directly here (Ctrl + V)...",
    inject_rows: "Inject Excel Rows",
    forensic_audit_trail: "Forensic Audit Trail",
    save_voucher: "Save Voucher",
    update_voucher: "Update Voucher",
    cancel: "Cancel",
  },
  roman_ur: {
    no_audit_trail: "Is transaction ka abhi tak koi audit trail generated nahi hai (Legacy record entry).",
    excel_copy_instruction: "Excel sheet se columns copy karein: [Account Title | Debit | Credit] aur neeche paste kar dein:",
    excel_paste_placeholder: "Excel rows ko yahan Direct Paste (Ctrl + V) maren...",
    inject_rows: "Inject Excel Rows",
    forensic_audit_trail: "Forensic Audit Trail",
    save_voucher: "Voucher Save Karein",
    update_voucher: "Voucher Update Karein",
    cancel: "Cancel",
  },
  ur: {
    no_audit_trail: "اس ٹرانزیکشن کے لیے ابھی تک کوئی آڈٹ ٹریل تیار نہیں ہوئی ہے۔",
    excel_copy_instruction: "ایکسل سے کالم کاپی کریں: [اکاؤنٹ ٹائٹل | ڈیبٹ | کریڈٹ] اور نیچے پیسٹ کریں:",
    excel_paste_placeholder: "ایکسل کی قطاریں یہاں پیسٹ کریں (Ctrl + V)...",
    inject_rows: "ڈیٹا شامل کریں",
    forensic_audit_trail: "فارنسک آڈٹ ٹریل",
    save_voucher: "واؤچر محفوظ کریں",
    update_voucher: "واؤچر اپ ڈیٹ کریں",
    cancel: "منسوخ کریں",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('erp_preferred_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('erp_preferred_language', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ⭐ THIS EXPORT FIXES THE VERCEL BUILD ERROR IN FORENSICTIMELINE
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key: string) => translations['en'][key] || key
    };
  }
  return context;
};