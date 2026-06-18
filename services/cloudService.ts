import { Ledger, Voucher, InventoryItem, Unit, StockTransaction, User } from '../types';
import { supabase, handleSupabaseError } from './supabaseService';

// Supabase-based Cloud Service
// All data is now stored and managed centrally in Supabase

export const CloudService = {
  // --- Initialization & Fetching ---
  async fetchAllData() {
    try {
      // Fetch all data from Supabase in parallel
      const [ledgersRes, vouchersRes, inventoryRes, unitsRes, transactionsRes] = await Promise.all([
        supabase.from('ledgers').select('*'),
        supabase.from('vouchers').select('*, voucher_entries(*)'),
        supabase.from('inventory').select('*'),
        supabase.from('units').select('*'),
        supabase.from('stock_transactions').select('*'),
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
      // Save voucher header
      const { data: voucherData, error: voucherError } = await supabase
        .from('vouchers')
        .insert([{
          id: voucher.id,
          date: voucher.date,
          number: voucher.number,
          type: voucher.type,
          narration: voucher.narration,
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

      if (entriesError) throw entriesError;

      // Then delete voucher
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async saveInventoryItem(item: InventoryItem, isUpdate: boolean = false) {
    try {
      const payload = {
        id: item.id,
        name: item.name,
        unit: item.unit,
        rate: item.rate,
        cost_price: item.costPrice ?? null,
        current_stock: item.currentStock,
        min_stock_level: item.minStockLevel ?? null,
      };

      let result;
      if (isUpdate) {
        result = await supabase
          .from('inventory')
          .update(payload)
          .eq('id', item.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('inventory')
          .insert([payload])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const d = result.data;
      return {
        id: d.id,
        name: d.name,
        unit: d.unit,
        rate: d.rate ? Number(d.rate) : 0,
        costPrice: d.cost_price !== null && d.cost_price !== undefined ? Number(d.cost_price) : undefined,
        currentStock: d.current_stock ? Number(d.current_stock) : 0,
        minStockLevel: d.min_stock_level !== null && d.min_stock_level !== undefined ? Number(d.min_stock_level) : undefined,
      } as InventoryItem;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async deleteInventoryItem(id: string) {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async saveStockTransactions(newTransactions: StockTransaction[]) {
    try {
      const payloads = newTransactions.map(t => ({
        id: (t as any).id,
        item_id: t.itemId,
        qty: t.qty,
        rate: t.rate,
        voucher_id: t.voucherId,
      }));

      const { data, error } = await supabase
        .from('stock_transactions')
        .insert(payloads)
        .select();

      if (error) throw error;
      return (data || payloads).map((d: any) => ({
        itemId: d.item_id,
        qty: Number(d.qty),
        rate: Number(d.rate),
        voucherId: d.voucher_id,
      }));
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async deleteStockTransactionsByVoucher(voucherId: string) {
    try {
      const { error } = await supabase
        .from('stock_transactions')
        .delete()
        .eq('voucher_id', voucherId);

      if (error) throw error;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async updateStockLevels(items: InventoryItem[]) {
    try {
      // Map app items to DB columns for upsert
      const payloads = items.map(i => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        rate: i.rate,
        cost_price: i.costPrice ?? null,
        current_stock: i.currentStock,
        min_stock_level: i.minStockLevel ?? null,
      }));

      const { error } = await supabase
        .from('inventory')
        .upsert(payloads, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async saveUnit(unit: Unit) {
    try {
      const payload = {
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        base_unit_id: unit.baseUnitId ?? null,
        factor: unit.factor,
      };

      const { data, error } = await supabase
        .from('units')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const d = data;
      return {
        id: d.id,
        name: d.name,
        symbol: d.symbol,
        baseUnitId: d.base_unit_id || undefined,
        factor: d.factor ? Number(d.factor) : 1,
      } as Unit;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async deleteUnit(id: string) {
    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async resetData() {
    try {
      // Delete all data
      await Promise.all([
        supabase.from('stock_transactions').delete().neq('id', ''),
        supabase.from('voucher_entries').delete().neq('id', ''),
        supabase.from('vouchers').delete().neq('id', ''),
        supabase.from('inventory').delete().neq('id', ''),
        supabase.from('ledgers').delete().neq('id', ''),
        supabase.from('units').delete().neq('id', ''),
      ]);

      return this.fetchAllData();
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },
};