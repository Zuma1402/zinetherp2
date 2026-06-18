import { Ledger, Voucher, InventoryItem, Unit, StockTransaction, User } from '../types';
import { supabase, handleSupabaseError } from './supabaseService';

// Supabase-based Cloud Service
// All data is now stored and managed centrally in Supabase

export const CloudService = {
  // --- Initialization & Fetching (Updated safely with companyId parameter) ---
  async fetchAllData(companyId?: string) {
    try {
      // Build queries without modifying base schemas
      let ledgersQuery = supabase.from('ledgers').select('*');
      let vouchersQuery = supabase.from('vouchers').select('*, voucher_entries(*)');
      let inventoryQuery = supabase.from('inventory').select('*');
      let unitsQuery = supabase.from('units').select('*');
      let transactionsQuery = supabase.from('stock_transactions').select('*');

      // Secure Multi-Company Filtration isolation layer
      if (companyId) {
        ledgersQuery = ledgersQuery.eq('company_id', companyId);
        vouchersQuery = vouchersQuery.eq('company_id', companyId);
        inventoryQuery = inventoryQuery.eq('company_id', companyId);
        // Note: units table globally shared rehne di hai generic mapping ke liye
        transactionsQuery = transactionsQuery.eq('company_id', companyId);
      }

      // Fetch data in parallel exactly as legacy model
      const [ledgersRes, vouchersRes, inventoryRes, unitsRes, transactionsRes] = await Promise.all([
        ledgersQuery,
        vouchersQuery,
        inventoryQuery,
        unitsQuery,
        transactionsQuery,
      ]);

      if (ledgersRes.error) throw ledgersRes.error;
      if (vouchersRes.error) throw vouchersRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (unitsRes.error) throw unitsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const mapLedgerFromDb = (r: any): Ledger => ({
        id: r.id,
        name: r.name,
        type: r.type,
        group: r.group,
        openingBalance: r.opening_balance ? Number(r.opening_balance) : 0,
      });

      const mapInventoryFromDb = (r: any): InventoryItem => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        rate: r.rate ? Number(r.rate) : 0,
        costPrice: r.cost_price !== null && r.cost_price !== undefined ? Number(r.cost_price) : undefined,
        currentStock: r.current_stock ? Number(r.current_stock) : 0,
        minStockLevel: r.min_stock_level !== null && r.min_stock_level !== undefined ? Number(r.min_stock_level) : undefined,
      });

      const mapStockFromDb = (r: any): StockTransaction => ({
        itemId: r.item_id,
        qty: r.qty ? Number(r.qty) : 0,
        rate: r.rate ? Number(r.rate) : 0,
        voucherId: r.voucher_id,
      });

      const mapUnitFromDb = (r: any): Unit => ({
        id: r.id,
        name: r.name,
        symbol: r.symbol,
        baseUnitId: r.base_unit_id || undefined,
        factor: r.factor ? Number(r.factor) : 1,
      });

      const ledgers: Ledger[] = (ledgersRes.data || []).map(mapLedgerFromDb);
      const inventory: InventoryItem[] = (inventoryRes.data || []).map(mapInventoryFromDb);
      const units: Unit[] = (unitsRes.data || []).map(mapUnitFromDb);
      const transactions: StockTransaction[] = (transactionsRes.data || []).map(mapStockFromDb);

      const vouchersData: any[] = vouchersRes.data || [];
      // Transform vouchers with their entries (convert voucher_entries fields)
      const vouchers: Voucher[] = vouchersData.map(v => ({
        id: v.id,
        date: v.date,
        number: v.number,
        type: v.type,
        narration: v.narration,
        entries: (v.voucher_entries || []).map((e: any) => ({
          ledgerId: e.ledger_id,
          debit: e.debit ? Number(e.debit) : 0,
          credit: e.credit ? Number(e.credit) : 0,
        })),
      }));

      return { ledgers, vouchers, inventory, units, transactions };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // --- Write Operations ---

  async saveLedger(ledger: Ledger) {
    try {
      const payload = {
        id: ledger.id,
        name: ledger.name,
        type: ledger.type,
        group: ledger.group,
        opening_balance: ledger.openingBalance,
        company_id: (ledger as any).company_id || null, // Safely append company tracking identity key
      };

      const { data, error } = await supabase
        .from('ledgers')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        group: data.group,
        openingBalance: data.opening_balance ? Number(data.opening_balance) : 0,
      } as Ledger;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async updateLedger(ledger: Ledger) {
    try {
      const payload = {
        name: ledger.name,
        type: ledger.type,
        group: ledger.group,
        opening_balance: ledger.openingBalance,
        company_id: (ledger as any).company_id || null,
      };

      const { data, error } = await supabase
        .from('ledgers')
        .update(payload)
        .eq('id', ledger.id)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        group: data.group,
        openingBalance: data.opening_balance ? Number(data.opening_balance) : 0,
      } as Ledger;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async deleteLedger(id: string) {
    try {
      const { error } = await supabase
        .from('ledgers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async saveVoucher(voucher: Voucher) {
    try {
      // Save voucher header with dynamic company ID check
      const { data: voucherData, error: voucherError } = await supabase
        .from('vouchers')
        .insert([{
          id: voucher.id,
          date: voucher.date,
          number: voucher.number,
          type: voucher.type,
          narration: voucher.narration,
          company_id: (voucher as any).company_id || null,
        }])
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Save voucher entries
      const entries = voucher.entries.map(e => ({
        voucher_id: voucher.id,
        ledger_id: e.ledgerId,
        debit: e.debit,
        credit: e.credit,
        company_id: (voucher as any).company_id || null,
      }));

      const { error: entriesError } = await supabase
        .from('voucher_entries')
        .insert(entries);

      if (entriesError) throw entriesError;

      return voucherData;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async deleteVoucher(id: string) {
    try {
      // Delete entries first (due to foreign key)
      const { error: entriesError } = await supabase
        .from('voucher_entries')
        .delete()
        .eq('voucher_id', id);