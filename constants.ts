import { AccountType, Ledger, Voucher, VoucherType, Unit } from './types';

// NOTE: Initial data is now stored in Supabase
// Remove all hardcoded initial data to ensure centralized database management
// Use the SQL queries provided in SETUP_INSTRUCTIONS.md to initialize the database

export const ACCOUNT_GROUPS = [
  'Capital Account',
  'Loans (Liability)',
  'Current Liabilities',
  'Fixed Assets',
  'Current Assets',
  'Sales Accounts',
  'Purchase Accounts',
  'Direct Incomes',
  'Indirect Incomes',
  'Direct Expenses',
  'Indirect Expenses',
  'Sundry Debtors',
  'Sundry Creditors',
  'Cash-in-Hand',
  'Bank Accounts'
];