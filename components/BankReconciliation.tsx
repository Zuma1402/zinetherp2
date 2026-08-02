import React, { useState } from 'react';
import { Ledger, Voucher, VoucherType } from '../types';
import { Upload, CheckCircle2, AlertCircle, PlusCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface BankReconciliationProps {
  ledgers: Ledger[];
  vouchers: Voucher[];
  onSaveVoucher: (voucher: Voucher) => void;
}

interface BankStatementRow {
  date: string;
  description: string;
  debit: number;
  credit: number;
  matchedVoucherId?: string;
  status: 'MATCHED' | 'UNMATCHED';
}

export const BankReconciliation: React.FC<BankReconciliationProps> = ({
  ledgers,
  vouchers,
  onSaveVoucher,
}) => {
  const [selectedBankId, setSelectedBankId] = useState('');
  const [pastedData, setPastedData] = useState('');
  const [parsedBankRows, setParsedBankRows] = useState<BankStatementRow[]>([]);
  const [showPasteBox, setShowPasteBox] = useState(true);

  const bankLedgers = ledgers.filter(
    (l) => l.group.toLowerCase().includes('bank') || l.name.toLowerCase().includes('bank')
  );

  // Parse Excel / CSV Copy-Paste Data
  const handleParseBankStatement = () => {
    if (!pastedData.trim()) return;

    const lines = pastedData.split('\n');
    const rows: BankStatementRow[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      const cells = line.split('\t');

      // Standard Columns: Date | Description | Debit | Credit
      const date = cells[0]?.trim() || new Date().toISOString().split('T')[0];
      const description = cells[1]?.trim() || 'Bank Entry';
      const debit = parseFloat(cells[2]?.replace(/,/g, '')) || 0;
      const credit = parseFloat(cells[3]?.replace(/,/g, '')) || 0;

      rows.push({
        date,
        description,
        debit,
        credit,
        status: 'UNMATCHED',
      });
    });

    // Smart Auto-Matching Engine
    const erpBankVouchers = vouchers.filter((v) =>
      v.entries?.some((e) => e.ledgerId === selectedBankId)
    );

    const updatedRows = rows.map((bankRow) => {
      const match = erpBankVouchers.find((v) => {
        const erpDebit = v.entries?.reduce((sum, e) => sum + (e.ledgerId === selectedBankId ? e.debit || 0 : 0), 0);
        const erpCredit = v.entries?.reduce((sum, e) => sum + (e.ledgerId === selectedBankId ? e.credit || 0 : 0), 0);

        // Bank Debit = ERP Credit (Withdrawal) & Bank Credit = ERP Debit (Deposit)
        return (
          (bankRow.debit > 0 && Math.abs(bankRow.debit - erpCredit) < 1) ||
          (bankRow.credit > 0 && Math.abs(bankRow.credit - erpDebit) < 1)
        );
      });

      if (match) {
        return { ...bankRow, status: 'MATCHED' as const, matchedVoucherId: match.id };
      }
      return bankRow;
    });

    setParsedBankRows(updatedRows);
    setShowPasteBox(false);
  };

  // Quick Inject Missing Bank Charges / Income into ERP
  const handleQuickInject = (row: BankStatementRow) => {
    if (!selectedBankId) return alert('Select Bank Ledger first.');

    const newVoucherId = crypto.randomUUID();
    const isDebit = row.debit > 0; // Bank Debit = Expense / Charge for ERP

    const voucherPayload: Voucher = {
      id: newVoucherId,
      date: row.date || new Date().toISOString().split('T')[0],
      number: `BRS-${Math.floor(1000 + Math.random() * 9000)}`,
      type: isDebit ? VoucherType.PAYMENT : VoucherType.RECEIPT,
      narration: `BRS Auto Injection: ${row.description}`,
      entries: [
        {
          ledgerId: selectedBankId,
          debit: isDebit ? 0 : row.credit,
          credit: isDebit ? row.debit : 0,
        },
      ],
      currency: 'PKR',
      exchangeRate: 1,
    } as any;

    onSaveVoucher(voucherPayload);

    // Update UI Status
    setParsedBankRows((prev) =>
      prev.map((r) => (r === row ? { ...r, status: 'MATCHED', matchedVoucherId: newVoucherId } : r))
    );
  };

  const matchedCount = parsedBankRows.filter((r) => r.status === 'MATCHED').length;
  const unmatchedCount = parsedBankRows.filter((r) => r.status === 'UNMATCHED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>🏦</span> Bank Statement Reconciliation (BRS)
          </h2>
          <p className="text-xs text-gray-400 font-bold mt-1">
            Auto-match uploaded bank statement entries with ERP ledger records
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black rounded-2xl outline-none"
          >
            <option value="">-- Select Bank Account --</option>
            {bankLedgers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Paste Engine Box */}
      {showPasteBox ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-indigo-950 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Upload size={16} /> Direct Bank Statement Paste Engine
          </h3>
          <p className="text-xs text-indigo-700 font-bold mb-3">
            Copy columns from Excel/Bank CSV: **[Date | Description | Debit | Credit]** and paste below:
          </p>
          <textarea
            rows={5}
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            placeholder="Paste Bank Statement rows directly here (Ctrl + V)..."
            className="w-full p-4 border border-blue-200 rounded-2xl text-xs font-mono bg-white outline-none focus:ring-2 ring-indigo-200 text-gray-800"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleParseBankStatement}
              disabled={!selectedBankId || !pastedData.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md disabled:bg-gray-200 uppercase tracking-wider"
            >
              Analyze & Reconcile
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Statement Rows</span>
                <h4 className="text-xl font-black text-gray-900 font-mono mt-0.5">{parsedBankRows.length}</h4>
              </div>
              <ShieldCheck className="text-indigo-600" size={28} />
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Auto Matched ✅</span>
                <h4 className="text-xl font-black text-emerald-800 font-mono mt-0.5">{matchedCount}</h4>
              </div>
              <CheckCircle2 className="text-emerald-600" size={28} />
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Discrepancy / Unmatched ⚠️</span>
                <h4 className="text-xl font-black text-rose-800 font-mono mt-0.5">{unmatchedCount}</h4>
              </div>
              <AlertCircle className="text-rose-600" size={28} />
            </div>
          </div>

          {/* Statement Comparison Table */}
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Reconciliation Matrix</h4>
              <button
                onClick={() => setShowPasteBox(true)}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                + Paste New Statement
              </button>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b">
                <tr>
                  <th className="p-3 pl-6">Date</th>
                  <th className="p-3">Bank Description</th>
                  <th className="p-3 text-right">Debit (Withdrawal)</th>
                  <th className="p-3 text-right">Credit (Deposit)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {parsedBankRows.map((row, idx) => (
                  <tr key={idx} className={row.status === 'MATCHED' ? 'bg-emerald-50/20' : 'bg-rose-50/20'}>
                    <td className="p-3 pl-6 font-mono text-gray-500">{row.date}</td>
                    <td className="p-3 font-bold text-gray-900">{row.description}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      {row.debit ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">
                      {row.credit ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          row.status === 'MATCHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-right pr-6">
                      {row.status === 'UNMATCHED' ? (
                        <button
                          onClick={() => handleQuickInject(row)}
                          className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-xl shadow-xs"
                        >
                          <PlusCircle size={12} /> Inject to ERP
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-mono font-bold text-[10px]">✔ Reconciled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};