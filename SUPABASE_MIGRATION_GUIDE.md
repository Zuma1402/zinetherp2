# ZinethERP - Supabase Migration Guide

## Overview
This project has been fully migrated to use **Supabase** as the central database. All hardcoded data has been removed and all operations now use Supabase for data persistence.

## Step-by-Step Setup Instructions

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in project details:
   - **Name**: zinetherp (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Select closest to your location
5. Wait for project to be created (2-3 minutes)

### Step 2: Get Your API Credentials
1. In your Supabase dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon key** (public API key)

### Step 3: Set Up Environment Variables
1. Open `.env.local` file in your project root
2. Replace the placeholders with your actual credentials:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
3. Save the file

### Step 4: Initialize the Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `SUPABASE_SETUP.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute all queries
6. Verify all tables are created successfully

### Step 5: Install Dependencies
```bash
npm install
```

This will install the new `@supabase/supabase-js` package along with other dependencies.

### Step 6: Run the Project
```bash
npm run dev
```

The application should now start with Supabase as the backend.

## Database Schema Overview

### Tables Created:

1. **users** - User accounts and authentication
   - id, username, password, name, role, timestamps

2. **company_settings** - Global company configuration
   - company_name, email, tax_id, subscription info, trial dates

3. **units** - Measurement units for inventory
   - id, name, symbol, base_unit_id, factor

4. **ledgers** - Chart of accounts
   - id, name, type (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE), group, opening_balance

5. **vouchers** - Transaction headers
   - id, date, number, type, narration

6. **voucher_entries** - Transaction line items
   - voucher_id (FK), ledger_id (FK), debit, credit

7. **inventory** - Stock items
   - id, name, unit, rate, cost_price, current_stock, min_stock_level

8. **stock_transactions** - Inventory movement history
   - id, item_id (FK), qty, rate, voucher_id (FK)

## Key Changes from Original Code

### Removed:
- ✅ All hardcoded initial data (INITIAL_LEDGERS, INITIAL_VOUCHERS, INITIAL_UNITS)
- ✅ localStorage for ledgers, vouchers, inventory, units, transactions
- ✅ localStorage for company settings
- ✅ Hardcoded default admin user

### Added:
- ✅ New `supabaseService.ts` for Supabase client initialization
- ✅ Environment variables for API credentials
- ✅ Async/await patterns for all data operations
- ✅ Error handling for Supabase operations
- ✅ SQL schema file for database setup

### Modified Services:
- **authService.ts** - Now uses Supabase for user management
- **cloudService.ts** - All data operations use Supabase
- **settingsService.ts** - Company settings stored in Supabase
- **constants.ts** - Removed hardcoded initial data

## Important Notes

### Security Considerations:
1. **Passwords**: In production, implement proper authentication using Supabase Auth
2. **RLS (Row Level Security)**: Consider enabling RLS policies for multi-tenant apps
3. **API Keys**: Never commit `.env.local` to version control (already in .gitignore)

### Database Reset:
If you need to reset all data and start fresh:
1. Go to Supabase SQL Editor
2. Drop and recreate tables (run SUPABASE_SETUP.sql again)
3. Or manually delete records in each table

### Sample Data:
To add sample data for testing, uncomment the "SAMPLE DATA" section at the end of `SUPABASE_SETUP.sql` and run it again.

## API Limitations:
- Free tier: Up to 500MB database size, suitable for development and testing
- For production use, consider upgrading to Pro plan

## Troubleshooting

### "Missing Supabase configuration" error:
- Check that `.env.local` exists and has correct URL and key
- Ensure you restarted the dev server after adding environment variables

### "Cannot read property 'from' of undefined":
- Verify Supabase URL and API key are correct
- Check internet connection to Supabase servers

### Table not found errors:
- Run `SUPABASE_SETUP.sql` again to ensure all tables are created
- Check Supabase SQL Editor to verify tables exist

### Connection timeout:
- Check Supabase dashboard for service status
- Verify network connectivity

## Next Steps

1. Update your components if they still reference localStorage directly
2. Add proper error handling and user feedback
3. Consider implementing Supabase Real-time subscriptions for live updates
4. Set up Row Level Security (RLS) for multi-user scenarios
5. Implement proper password hashing on backend

## Support

For Supabase documentation: https://supabase.com/docs
For this project setup issues: Check error messages in browser console
