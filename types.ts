export type Role = 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Ledger {
  id: string;
  name: string;
  type: AccountType;
  group: string; // e.g., "Current Assets", "Indirect Expenses"
  openingBalance: number; // Positive for default nature (Dr for Asset/Exp, Cr for Liab/Inc/Eq)
}

export enum VoucherType {
  JOURNAL = 'JOURNAL',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  CONTRA = 'CONTRA',
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
  DEBIT_NOTE = 'DEBIT_NOTE', // Purchase Return
  CREDIT_NOTE = 'CREDIT_NOTE', // Sales Return
}

export interface VoucherEntry {
  ledgerId: string;
  debit: number;
  credit: number;
  departmentId?: string; // ⭐ Field for Cost Center / Department tracking
  divisionId?: string;   // ⭐ Field for Regional / Division tracking
}

export interface Voucher {
  id: string;
  date: string;
  number: string;
  type: VoucherType;
  narration: string;
  entries: VoucherEntry[];
  currency?: string;
  exchangeRate?: number;
  foreignTotal?: number;
}

export interface TrialBalanceRow {
  ledgerId: string;
  ledgerName: string;
  debitTotal: number;
  creditTotal: number;
  netBalance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export interface User {
  id: string;
  username: string; // Used as login ID (e.g., email or handle)
  password: string; // In a real app, this would be hashed
  name: string;
  role: Role;
  company_id?: string; // ⭐ Company bound partition identifier
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string; // e.g., kg, pcs
  rate: number; // Selling price
  costPrice?: number; // Purchase price
  currentStock: number; // Quantity on hand
  minStockLevel?: number; // Alert threshold
}

export interface StockTransaction {
  itemId: string;
  qty: number; // Positive for In, Negative for Out
  rate: number;
  voucherId: string;
}

export interface Unit {
  id: string;
  name: string;      // e.g. "Pieces", "Box of 12"
  symbol: string;    // e.g. "pcs", "box"
  baseUnitId?: string; // If null, this is a primary unit. If set, this unit = factor * baseUnit
  factor: number;    // e.g. 1 for pcs, 12 for box
}

export type ValuationMethod = 'FIFO' | 'LIFO' | 'AVCO';

// ⭐ Lookup models for Department & Division Dropdowns
export interface Department {
  id: string;
  name: string;
}

export interface Division {
  id: string;
  name: string;
}