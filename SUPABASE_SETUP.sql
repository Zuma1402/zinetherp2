-- ZinethERP Supabase Database Schema
-- Run these queries in your Supabase SQL Editor to set up the complete database

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Note: In production, use proper authentication and hashing
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('ADMIN', 'ACCOUNTANT', 'VIEWER')) NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create initial admin user (change password after first login)
INSERT INTO users (id, username, password, name, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'admin', 'password', 'System Admin', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- 2. COMPANY SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT NOT NULL DEFAULT 'My Company',
  email TEXT,
  tax_id TEXT,
  stock_valuation_method TEXT CHECK (stock_valuation_method IN ('FIFO', 'LIFO', 'AVCO')) DEFAULT 'FIFO',
  invoice_prefix TEXT DEFAULT 'INV-',
  next_invoice_number INTEGER DEFAULT 1,
  subscription_status TEXT CHECK (subscription_status IN ('TRIAL', 'ACTIVE', 'EXPIRED')) DEFAULT 'TRIAL',
  trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  plan_type TEXT CHECK (plan_type IN ('FREE', 'PRO_YEARLY')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create default company settings
INSERT INTO company_settings (id, company_name) VALUES 
  ('default', 'My Company')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. UNITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL UNIQUE,
  base_unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
  factor DECIMAL(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard units
INSERT INTO units (id, name, symbol, factor) VALUES 
  ('u1', 'Pieces', 'pcs', 1),
  ('u2', 'Kilograms', 'kg', 1),
  ('u3', 'Liters', 'ltr', 1),
  ('u4', 'Meters', 'm', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert derived unit (Dozen = 12 pcs)
INSERT INTO units (id, name, symbol, base_unit_id, factor) VALUES 
  ('u5', 'Dozen', 'doz', 'u1', 12)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. LEDGERS (ACCOUNTS) TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledgers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')) NOT NULL,
  "group" TEXT NOT NULL, -- Account group (e.g., "Current Assets", "Indirect Expenses")
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledgers_type ON ledgers(type);
CREATE INDEX IF NOT EXISTS idx_ledgers_group ON ledgers("group");

-- ============================================================================
-- 5. VOUCHERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  number TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('JOURNAL', 'PAYMENT', 'RECEIPT', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE')) NOT NULL,
  narration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_number ON vouchers(number);

-- ============================================================================
-- 6. VOUCHER ENTRIES TABLE (Line items for each voucher)
-- ============================================================================
CREATE TABLE IF NOT EXISTS voucher_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  ledger_id TEXT NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
  debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voucher_entries_voucher ON voucher_entries(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_entries_ledger ON voucher_entries(ledger_id);

-- ============================================================================
-- 7. INVENTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL REFERENCES units(symbol) ON DELETE RESTRICT,
  rate DECIMAL(15, 2) NOT NULL, -- Selling price
  cost_price DECIMAL(15, 2), -- Purchase price
  current_stock DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Quantity on hand
  min_stock_level DECIMAL(15, 2), -- Alert threshold
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_unit ON inventory(unit);

-- ============================================================================
-- 8. STOCK TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  qty DECIMAL(15, 2) NOT NULL, -- Positive for In, Negative for Out
  rate DECIMAL(15, 2) NOT NULL,
  voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_voucher ON stock_transactions(voucher_id);

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS) - OPTIONAL
-- ============================================================================
-- Uncomment below to enable RLS for multi-tenant support
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE voucher_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SAMPLE DATA (Optional - Uncomment to add sample accounts)
-- ============================================================================
-- INSERT INTO ledgers (id, name, type, "group", opening_balance) VALUES 
--   ('1', 'Cash', 'ASSET', 'Cash-in-Hand', 50000),
--   ('2', 'Bank Account', 'ASSET', 'Bank Accounts', 100000),
--   ('3', 'Capital Account', 'EQUITY', 'Capital Account', 150000),
--   ('4', 'Sales Account', 'INCOME', 'Sales Accounts', 0),
--   ('5', 'Office Rent', 'EXPENSE', 'Indirect Expenses', 0),
--   ('6', 'Electricity Bill', 'EXPENSE', 'Indirect Expenses', 0),
--   ('7', 'Furniture', 'ASSET', 'Fixed Assets', 0),
--   ('8', 'ABC Suppliers', 'LIABILITY', 'Sundry Creditors', 0),
--   ('9', 'XYZ Clients', 'ASSET', 'Sundry Debtors', 0)
-- ON CONFLICT (id) DO NOTHING;
