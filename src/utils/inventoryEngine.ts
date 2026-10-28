/**
 * Inventory Calculation Engine & Multi-Godown Balance Ledger
 * Closing stock = Opening stock + Receipts + Incoming transfers - Consumption - Outgoing transfers + Adjustments
 */

import { GodownId, ItemMaster, StockLedgerEntry } from '../types/erp';
import { round2 } from './math';

export interface GodownStockSummary {
  godownAStock: number;
  godownBStock: number;
  totalStock: number;
  totalValuation: number;
  status: 'Adequate' | 'Low Stock' | 'Critical';
  recommendedReorderQty: number;
}

/**
 * Calculates stock balance for an item and godown directly from ledger transactions.
 */
export function calculateItemStockFromLedger(
  itemId: string,
  ledgerEntries: StockLedgerEntry[],
  godownFilter?: GodownId
): number {
  const filtered = ledgerEntries.filter(
    (e) => e.itemId === itemId && (!godownFilter || e.godownId === godownFilter)
  );

  let balance = 0;
  for (const entry of filtered) {
    balance += entry.qtyIn - entry.qtyOut;
  }
  return balance;
}

/**
 * Computes deterministic multi-godown stock summary for an item.
 */
export function getItemStockSummary(
  item: ItemMaster,
  ledgerEntries: StockLedgerEntry[]
): GodownStockSummary {
  const godownAStock = calculateItemStockFromLedger(item.id, ledgerEntries, 'GODOWN_A');
  const godownBStock = calculateItemStockFromLedger(item.id, ledgerEntries, 'GODOWN_B');
  const totalStock = godownAStock + godownBStock;
  const totalValuation = round2(totalStock * item.standardCost);

  // Status calculation
  let status: 'Adequate' | 'Low Stock' | 'Critical' = 'Adequate';
  if (totalStock <= 0 || totalStock <= item.reorderLevel * 0.5) {
    status = 'Critical';
  } else if (totalStock <= item.reorderLevel) {
    status = 'Low Stock';
  }

  // Recommended reorder quantity: target 2x reorder level buffer or standard reorder pack
  const deficit = Math.max(0, item.reorderLevel * 2 - totalStock);
  const recommendedReorderQty = Math.max(item.reorderQuantity, deficit);

  return {
    godownAStock,
    godownBStock,
    totalStock,
    totalValuation,
    status,
    recommendedReorderQty,
  };
}

/**
 * Validate whether a stock transfer between godowns is allowed.
 */
export function validateStockTransfer(
  itemId: string,
  sourceGodownId: GodownId,
  targetGodownId: GodownId,
  quantity: number,
  ledgerEntries: StockLedgerEntry[]
): { valid: boolean; error?: string; availableSourceQty: number } {
  if (sourceGodownId === targetGodownId) {
    return { valid: false, error: 'Source and Destination godowns cannot be identical.', availableSourceQty: 0 };
  }
  if (quantity <= 0) {
    return { valid: false, error: 'Transfer quantity must be strictly greater than zero.', availableSourceQty: 0 };
  }

  const availableSourceQty = calculateItemStockFromLedger(itemId, ledgerEntries, sourceGodownId);
  if (quantity > availableSourceQty) {
    return {
      valid: false,
      error: `Insufficient stock in ${sourceGodownId === 'GODOWN_A' ? 'Godown A (Peenya)' : 'Godown B (Electronic City)'}. Available: ${availableSourceQty}, Requested: ${quantity}`,
      availableSourceQty,
    };
  }

  return { valid: true, availableSourceQty };
}
