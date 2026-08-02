import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'roman_ur' | 'ur' | 'ar' | 'zh' | 'fr' | 'es';

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
  },
  ar: {
    no_audit_trail: "لم يتم إنشاء سجل تدقيق لهذه المعاملة بعد.",
    excel_copy_instruction: "انسخ الأعمدة من Excel والصقها أدناه:",
    excel_paste_placeholder: "الصق صفوف Excel هنا مباشرة (Ctrl + V)...",
    inject_rows: "إدراج صفوف Excel",
    forensic_audit_trail: "مسار التدقيق الجنائي",
    save_voucher: "حفظ القسيمة",
    update_voucher: "تحديث القسيمة",
    cancel: "إلغاء",
  },
  zh: {
    no_audit_trail: "尚未为此交易生成审计线索。",
    excel_copy_instruction: "从 Excel 复制列并粘贴在下面：",
    excel_paste_placeholder: "直接在此处粘贴 Excel 行 (Ctrl + V)...",
    inject_rows: "注入 Excel 行",
    forensic_audit_trail: "法医审计追踪",
    save_voucher: "保存凭证",
    update_voucher: "更新凭证",
    cancel: "取消",
  },
  fr: {
    no_audit_trail: "Aucune piste d'audit générée pour cette transaction.",
    excel_copy_instruction: "Copiez les colonnes depuis Excel et collez ci-dessous:",
    excel_paste_placeholder: "Collez les lignes Excel ici (Ctrl + V)...",
    inject_rows: "Injecter les lignes Excel",
    forensic_audit_trail: "Piste d'audit médico-légale",
    save_voucher: "Enregistrer le justificatif",
    update_voucher: "Mettre à jour",
    cancel: "Annuler",
  },
  es: {
    no_audit_trail: "Aún no se ha generado una pista de auditoría para esta transacción.",
    excel_copy_instruction: "Copie las columnas de Excel y péguelas a continuación:",
    excel_paste_placeholder: "Pegue las filas de Excel directamente aquí (Ctrl + V)...",
    inject_rows: "Inyectar filas de Excel",
    forensic_audit_trail: "Pista de auditoría forense",
    save_voucher: "Guardar comprobante",
    update_voucher: "Actualizar comprobante",
    cancel: "Cancelar",
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