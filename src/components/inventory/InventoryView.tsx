import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ItemMaster, StockLedgerEntry } from '../../types/erp';
import { formatINR, formatQty } from '../../utils/math';
import { getItemStockSummary } from '../../utils/inventoryEngine';
import { Badge } from '../common/Badge';
import { StockTransferModal } from './StockTransferModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import {
  Boxes,
  ArrowRightLeft,
  SlidersHorizontal,
  AlertTriangle,
  History,
  ShoppingCart,
  Download,
  Filter,
} from 'lucide-react';

interface InventoryViewProps {
  onNavigateToProcurement?: (prefillSku?: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNavigateToProcurement }) => {
  const { items, stockLedger, activeGodownFilter, searchTerm } = useERP();

  const [activeTab, setActiveTab] = useState<'summary' | 'ledger' | 'reorder'>('summary');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Filter items
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.sku.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.hsnCode.includes(term)
      );
    }
    return true;
  });

  // Filter ledger entries
  const filteredLedger = stockLedger.filter((entry) => {
    if (activeGodownFilter !== 'ALL' && entry.godownId !== activeGodownFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        entry.sku.toLowerCase().includes(term) ||
        entry.referenceNumber.toLowerCase().includes(term) ||
        entry.movementType.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Categories
  const categories = Array.from(new Set(items.map((i) => i.category)));

  // Low stock items
  const lowStockItems = items
    .map((item) => ({
      item,
      summary: getItemStockSummary(item, stockLedger),
    }))
    .filter((res) => res.summary.status === 'Low Stock' || res.summary.status === 'Critical');

  // Total valuation
  const totalValuation = items.reduce((acc, itm) => {
    const s = getItemStockSummary(itm, stockLedger);
    if (activeGodownFilter === 'GODOWN_A') return acc + s.godownAStock * itm.standardCost;
    if (activeGodownFilter === 'GODOWN_B') return acc + s.godownBStock * itm.standardCost;
    return acc + s.totalValuation;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Multi-Godown Inventory Management</h2>
            <span className="text-xs text-slate-500 font-medium">
              (Valuation: <strong className="text-slate-900">{formatINR(totalValuation)}</strong>)
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Godown A (Peenya) &amp; Godown B (Electronic City) stock ledger and deterministic reorders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
            <span>Inter-Godown Transfer</span>
          </button>

          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Low-Stock Reorder Alerts Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-900">
              Deterministic Replenishment Alert: {lowStockItems.length} SKUs Below Reorder Threshold
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockItems.map(({ item, summary }) => (
                <div
                  key={item.id}
                  className="px-2.5 py-1 bg-white/90 border border-amber-300 rounded-lg text-xs flex items-center gap-2 shadow-xs"
                >
                  <span className="font-semibold text-slate-800">{item.sku}</span>
                  <span className="text-slate-500">
                    Stock: <strong className="text-rose-700">{summary.totalStock}</strong> / Min:{' '}
                    {item.reorderLevel}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Order +{summary.recommendedReorderQty} {item.uom}
                  </span>
                  {onNavigateToProcurement && (
                    <button
                      onClick={() => onNavigateToProcurement(item.sku)}
                      className="text-blue-600 hover:text-blue-800 font-bold ml-1"
                      title="Create PO for this item"
                    >
                      &rarr; PO
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-2.5 border-b-2 transition ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Stock Summary Table ({items.length} SKUs)
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-2.5 border-b-2 transition ${
              activeTab === 'ledger'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Transaction Movement Ledger ({filteredLedger.length} Movements)
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs p-1 rounded-md border border-slate-200 bg-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Stock Summary */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">SKU & Item Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">HSN & Tax</th>
                  <th className="p-3.5 text-right">Godown A (Peenya)</th>
                  <th className="p-3.5 text-right">Godown B (ECity)</th>
                  <th className="p-3.5 text-right">Total Stock</th>
                  <th className="p-3.5 text-right">Reorder Level</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Unit Cost</th>
                  <th className="p-3.5 text-right">Total Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const summary = getItemStockSummary(item, stockLedger);

                  let statusVariant: 'success' | 'warning' | 'danger' = 'success';
                  if (summary.status === 'Critical') statusVariant = 'danger';
                  else if (summary.status === 'Low Stock') statusVariant = 'warning';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.sku}</div>
                        <div className="text-[11px] text-slate-500">{item.name}</div>
                      </td>
                      <td className="p-3.5 text-slate-600">{item.category}</td>
                      <td className="p-3.5 text-slate-600">
                        {item.hsnCode} ({item.taxRate}%)
                      </td>
                      <td className="p-3.5 text-right font-medium text-slate-700">
                        {summary.godownAStock} {item.uom}
                      </td>
                      <td className="p-3.5 text-right font-medium text-slate-700">
                        {summary.godownBStock} {item.uom}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {summary.totalStock} {item.uom}
                      </td>
                      <td className="p-3.5 text-right text-slate-600">
                        {item.reorderLevel} {item.uom}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant={statusVariant}>{summary.status}</Badge>
                      </td>
                      <td className="p-3.5 text-right text-slate-700 font-medium">
                        ₹{item.standardCost}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatINR(summary.totalValuation)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Ledger Source of Truth */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Reference Doc</th>
                  <th className="p-3.5">Movement Type</th>
                  <th className="p-3.5">Godown</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5 text-right text-emerald-700">Qty In</th>
                  <th className="p-3.5 text-right text-rose-700">Qty Out</th>
                  <th className="p-3.5 text-right font-bold">Balance After</th>
                  <th className="p-3.5">Remarks & User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No stock movement ledger records found.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {e.date}
                        <div className="text-[10px] text-slate-400">
                          {new Date(e.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-medium text-blue-700">
                        {e.referenceNumber}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {e.movementType}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {e.godownId === 'GODOWN_A' ? 'Godown A (Peenya)' : 'Godown B (ECity)'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{e.sku}</td>
                      <td className="p-3.5 text-right font-bold text-emerald-700">
                        {e.qtyIn > 0 ? `+${e.qtyIn}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-rose-700">
                        {e.qtyOut > 0 ? `-${e.qtyOut}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-slate-900">
                        {e.balanceAfter}
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate" title={e.remarks}>
                        <div>{e.remarks}</div>
                        <div className="text-[10px] text-slate-400">By: {e.performedBy}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {isTransferModalOpen && (
        <StockTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
        />
      )}

      {isAdjustModalOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
        />
      )}
    </div>
  );
};
