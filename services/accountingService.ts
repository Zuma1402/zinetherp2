import { Ledger, Voucher, VoucherEntry, AccountType, TrialBalanceRow, FinancialSummary } from '../types';

/**
 * Calculates Trial Balance with Date Filtering.
 * 
 * @param ledgers List of accounts
 * @param vouchers List of transactions
 * @param startDate (Optional) Start date for period filtering.
 * @param endDate (Optional) End date for period filtering.
 * 
 * Logic:
 * - Assets/Liabilities/Equity: Closing Balance = Opening Balance + All transactions up to endDate.
 * - Income/Expense: Net Movement = Transactions between startDate and endDate.
 */
export const calculateTrialBalance = (
  ledgers: Ledger[], 
  vouchers: Voucher[], 
  startDate?: string, 
  endDate?: string
): TrialBalanceRow[] => {
  const ledgerMap = new Map<string, { debit: number; credit: number }>();

  // 1. Initialize with Opening Balances
  // For P&L (Income/Expense), if we are looking at a specific period, we usually ignore opening balance (it resets).
  // For Balance Sheet, we always include it.
  // To keep it flexible: We include Opening Balance if NO start date is provided (All time view) OR for BS accounts.
  ledgers.forEach((l) => {
    let dr = 0;
    let cr = 0;
    
    // Only include opening balances for Balance Sheet accounts OR if we are doing a full history view
    const isBSAccount = [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY].includes(l.type);
    
    if (isBSAccount || !startDate) {
        if (l.type === AccountType.ASSET || l.type === AccountType.EXPENSE) {
            dr = l.openingBalance;
        } else {
            cr = l.openingBalance;
        }
    }
    ledgerMap.set(l.id, { debit: dr, credit: cr });
  });

  // 2. Process Vouchers with Date Filter
  vouchers.forEach((v) => {
    // Filter logic
    if (endDate && v.date > endDate) return; // Future transactions relative to report
    
    // For P&L accounts, we also check start date
    // For BS accounts, we include everything up to endDate
    const processEntry = (entry: VoucherEntry) => {
        const ledger = ledgers.find(l => l.id === entry.ledgerId);
        if (!ledger) return;

        const isPLAccount = [AccountType.INCOME, AccountType.EXPENSE].includes(ledger.type);

        // If P&L account and startDate exists, check if voucher is before start date
        if (isPLAccount && startDate && v.date < startDate) return;

        // Add to map
        const current = ledgerMap.get(entry.ledgerId) || { debit: 0, credit: 0 };
        ledgerMap.set(entry.ledgerId, {
            debit: current.debit + entry.debit,
            credit: current.credit + entry.credit,
        });
    };

    v.entries.forEach(processEntry);
  });

  // 3. Format Result
  return ledgers.map((l) => {
    const totals = ledgerMap.get(l.id) || { debit: 0, credit: 0 };
    const net = totals.debit - totals.credit;
    // Determine typical balance side for display consistency, though math uses signed net
    const isDr = net >= 0;

    return {
      ledgerId: l.id,
      ledgerName: l.name,
      debitTotal: totals.debit,
      creditTotal: totals.credit,
      netBalance: Math.abs(net),
      balanceType: isDr ? 'Dr' : 'Cr',
    };
  });
};

export const calculateFinancialSummary = (trialBalance: TrialBalanceRow[], ledgers: Ledger[]): FinancialSummary => {
  const summary: FinancialSummary = {
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
  };

  trialBalance.forEach((row) => {
    const ledger = ledgers.find((l) => l.id === row.ledgerId);
    if (!ledger) return;

    const val = row.netBalance;

    switch (ledger.type) {
      case AccountType.ASSET:
        summary.totalAssets += row.balanceType === 'Dr' ? val : -val;
        break;
      case AccountType.LIABILITY:
        summary.totalLiabilities += row.balanceType === 'Cr' ? val : -val;
        break;
      case AccountType.EQUITY:
        summary.totalEquity += row.balanceType === 'Cr' ? val : -val;
        break;
      case AccountType.INCOME:
        summary.totalIncome += row.balanceType === 'Cr' ? val : -val;
        break;
      case AccountType.EXPENSE:
        summary.totalExpenses += row.balanceType === 'Dr' ? val : -val;
        break;
    }
  });

  summary.netProfit = summary.totalIncome - summary.totalExpenses;
  return summary;
};

export const validateVoucher = (entries: VoucherEntry[]): boolean => {
  const totalDr = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCr = entries.reduce((sum, e) => sum + e.credit, 0);
  return Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;
};