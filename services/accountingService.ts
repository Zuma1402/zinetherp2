import { Ledger, Voucher, VoucherEntry, AccountType, TrialBalanceRow, FinancialSummary } from '../types';

/**
 * Calculates Trial Balance with Date Filtering and Automatic Multi-Tenant Isolation.
 */
export const calculateTrialBalance = (
  ledgers: Ledger[], 
  vouchers: Voucher[], 
  startDate?: string, 
  endDate?: string
): TrialBalanceRow[] => {
  // 🌟 AUTOMATIC ISOLATION ANCHOR: Direct local storage se active company pakad li
  const currentActiveCompanyId = localStorage.getItem('supabase_active_company_id') || localStorage.getItem('active_company_id') || '';
  const isMasterZenith = !currentActiveCompanyId || currentActiveCompanyId === '11111111-1111-1111-1111-111111111111';

  // Bina pichla logic badle, data arrays ko use karne se pehle yahin scope par lock kar diya
  const allowedLedgers = isMasterZenith 
    ? ledgers 
    : ledgers.filter((l: any) => l.company_id === currentActiveCompanyId);

  const allowedVouchers = isMasterZenith 
    ? [] // Zenith root par koi data mixture nahi dikhega
    : vouchers.filter((v: any) => v.company_id === currentActiveCompanyId);

  const ledgerMap = new Map<string, { debit: number; credit: number }>();

  // 1. Initialize with Opening Balances (Using isolated allowedLedgers)
  allowedLedgers.forEach((l) => {
    let dr = 0;
    let cr = 0;
    
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

  // 2. Process Vouchers with Date Filter (Using isolated allowedVouchers)
  allowedVouchers.forEach((v) => {
    if (endDate && v.date > endDate) return; 
    
    const processEntry = (entry: VoucherEntry) => {
        const ledger = allowedLedgers.find(l => l.id === entry.ledgerId);
        if (!ledger) return;

        const isPLAccount = [AccountType.INCOME, AccountType.EXPENSE].includes(ledger.type);

        if (isPLAccount && startDate && v.date < startDate) return;

        const current = ledgerMap.get(entry.ledgerId) || { debit: 0, credit: 0 };
        ledgerMap.set(entry.ledgerId, {
            debit: current.debit + entry.debit,
            credit: current.credit + entry.credit,
        });
    };

    v.entries.forEach(processEntry);
  });

  // 3. Format Result
  return allowedLedgers.map((l) => {
    const totals = ledgerMap.get(l.id) || { debit: 0, credit: 0 };
    const net = totals.debit - totals.credit;
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


// =====================================================================
// 👑 PREVIOUS SECURITY INJECTIONS RETAINED UNTOUCHED
// =====================================================================
export const filterLedgersByCompanyScope = (
  ledgers: (Ledger & { company_id?: string })[],
  activeCompanyId: string
): Ledger[] => {
  if (!activeCompanyId || activeCompanyId === '11111111-1111-1111-1111-111111111111') {
    return ledgers;
  }
  return ledgers.filter(l => l.company_id === activeCompanyId);
};

export const filterVouchersByCompanyScope = (
  vouchers: (Voucher & { company_id?: string })[],
  activeCompanyId: string
): Voucher[] => {
  if (!activeCompanyId || activeCompanyId === '11111111-1111-1111-1111-111111111111') {
    return [];
  }
  return vouchers.filter(v => v.company_id === activeCompanyId);
};