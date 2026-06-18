import { InventoryItem, StockTransaction, ValuationMethod } from '../types';

/**
 * Calculates the value of the current stock based on the selected valuation method.
 * 
 * @param item The inventory item containing current stock level.
 * @param transactions All stock transactions (history).
 * @param method 'FIFO' | 'LIFO' | 'AVCO' (Weighted Average).
 * @returns The total monetary value of the current stock.
 */
export const calculateStockValue = (
  item: InventoryItem,
  transactions: StockTransaction[],
  method: ValuationMethod
): number => {
  if (item.currentStock <= 0) return 0;

  // Filter only PURCHASE (Inward) transactions for this item
  // We use the purchase history to determine the cost layers.
  // We assume transactions with positive qty are purchases/returns inwards.
  const purchases = transactions
    .filter(t => t.itemId === item.id && t.qty > 0)
    .map(t => ({ qty: t.qty, rate: t.rate })); // Copy to avoid mutation

  // If no purchase history, fallback to the item's current cost price or rate
  if (purchases.length === 0) {
    return item.currentStock * (item.costPrice || 0);
  }

  // --- Weighted Average Cost (AVCO) ---
  if (method === 'AVCO') {
    const totalQty = purchases.reduce((sum, p) => sum + p.qty, 0);
    const totalCost = purchases.reduce((sum, p) => sum + (p.qty * p.rate), 0);
    
    if (totalQty === 0) return 0;
    
    const averageCost = totalCost / totalQty;
    return item.currentStock * averageCost;
  }

  // --- FIFO (First-In, First-Out) ---
  // Ending Inventory is based on the LATEST purchases (First ones are sold).
  if (method === 'FIFO') {
    let remainingStock = item.currentStock;
    let value = 0;

    // Reverse purchases: Look at newest first
    const reversedPurchases = [...purchases].reverse();

    for (const batch of reversedPurchases) {
      if (remainingStock <= 0) break;

      const take = Math.min(remainingStock, batch.qty);
      value += take * batch.rate;
      remainingStock -= take;
    }

    // If stock remains (e.g., opening stock not in transactions), use current costPrice
    if (remainingStock > 0) {
        value += remainingStock * (item.costPrice || 0);
    }
    
    return value;
  }

  // --- LIFO (Last-In, First-Out) ---
  // Ending Inventory is based on the OLDEST purchases (Newest ones are sold).
  if (method === 'LIFO') {
    let remainingStock = item.currentStock;
    let value = 0;

    // Look at oldest first (standard order)
    for (const batch of purchases) {
      if (remainingStock <= 0) break;

      const take = Math.min(remainingStock, batch.qty);
      value += take * batch.rate;
      remainingStock -= take;
    }

    // If stock remains, use current costPrice
    if (remainingStock > 0) {
        value += remainingStock * (item.costPrice || 0);
    }

    return value;
  }

  return 0;
};