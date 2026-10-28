import React from 'react';
import { useERP } from '../../context/ERPContext';
import { formatINR } from '../../utils/math';
import { getItemStockSummary } from '../../utils/inventoryEngine';
import { NavTab } from '../layout/Sidebar';
import {
  IndianRupee,
  Scale,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Clock,
  Warehouse,
  CheckCircle2,
  FileText,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react';

interface OverviewDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate }) => {
  const {
    kpis,
    items,
    stockLedger,
    vendorInvoices,
    customerInvoices,
    auditLogs,
    godowns,
    purchaseOrders,
  } = useERP();

  // Stock valuation per Godown
  const godownAVal = items.reduce((acc, item) => {
    const summary = getItemStockSummary(item, stockLedger);
    return acc + summary.godownAStock * item.standardCost;
  }, 0);

  const godownBVal = items.reduce((acc, item) => {
    const summary = getItemStockSummary(item, stockLedger);
    return acc + summary.godownBStock * item.standardCost;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Primary Owner Question: What do we owe and what are we owed today? */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Owner Executive View
              </span>
              <span className="text-xs text-slate-400">Deterministic Real-Time Computation</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              "What do we owe, and what are we owed, today?"
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Consolidated financial position for Karnataka electrical manufacturing unit. Disputed invoices are strictly quarantined and excluded from approved payables.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('payables_receivables')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5"
            >
              <span>View Payables Ledger</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The 4 Authoritative Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* 1. What we owe suppliers (Approved Payables) */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>We Owe Suppliers (Approved)</span>
                <span className="p-1 rounded-md bg-amber-500/20 text-amber-300">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-2">
                {formatINR(kpis.approvedSupplierPayables)}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/50 pt-2">
              <span>Verified 3-way matched</span>
              <span className="text-emerald-400 font-medium">Ready to pay</span>
            </div>
          </div>

          {/* 2. What customers owe us (Customer Receivables) */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Customers Owe Us (Receivables)</span>
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-300">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">
                {formatINR(kpis.customerReceivables)}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/50 pt-2">
              <span>Overdue (&gt;30 days):</span>
              <span className="text-rose-400 font-semibold">{formatINR(kpis.overdueReceivables)}</span>
            </div>
          </div>

          {/* 3. Disputed Invoices (Quarantined) */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-rose-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Disputed / Quarantined Bills</span>
                <span className="p-1 rounded-md bg-rose-500/20 text-rose-300">
                  <ShieldAlert className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-2">
                {formatINR(kpis.disputedInvoiceValue)}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/50 pt-2">
              <span>Status:</span>
              <span className="text-rose-300 font-medium">Payment Held (3-Way Mismatch)</span>
            </div>
          </div>

          {/* 4. Total Physical Stock Owned */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Physical Inventory Owned</span>
                <span className="p-1 rounded-md bg-blue-500/20 text-blue-300">
                  <Boxes className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-300 mt-2">
                {formatINR(kpis.totalInventoryValue)}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/50 pt-2">
              <span>Across 2 Godowns:</span>
              <span className="text-slate-200 font-medium">{items.length} SKUs Managed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Attention Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: 3-Way Invoice Mismatches */}
        <div
          onClick={() => onNavigate('invoice_matching')}
          className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs hover:border-rose-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-rose-600" />
              Invoice Mismatches
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
              {kpis.detectedMismatchesCount} Action Needed
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-2">
            {kpis.detectedMismatchesCount} Invoices Failed 3-Way Match
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Price variances, under-receipts, or duplicate submissions held.
          </p>
        </div>

        {/* Card: Low Stock Reorders */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-amber-600" />
              Stock Replenishment
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {kpis.lowStockCount} SKUs Low
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-2">
            {kpis.lowStockCount} Items Below Safety Level
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic reorder alerts active for production components.
          </p>
        </div>

        {/* Card: GST & ITC Blocked */}
        <div
          onClick={() => onNavigate('gst_itc')}
          className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-blue-600" />
              ITC Reconciliation
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {kpis.gstDiscrepanciesCount} Exceptions
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-2">
            GSTR-2B vs Books Variance
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supplier non-filing & tax amount mismatches flagged for follow-up.
          </p>
        </div>

        {/* Card: Open Procurement */}
        <div
          onClick={() => onNavigate('procurement')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-slate-600" />
              Procurement Cycle
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {kpis.openPOCount} Open POs
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-2">
            Active Purchase Orders
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Awaiting supplier dispatch and warehouse gate receipt.
          </p>
        </div>
      </div>

      {/* Middle Grid: Godown Valuation & Invoices 3-Way Match Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Godown Balance Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Godown Inventory Position</h3>
              <p className="text-xs text-slate-500">Live valuation segregated by physical facility</p>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Transfer Stock &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                <Warehouse className="w-4 h-4 text-blue-600" />
                <span>Godown A (Peenya)</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">{formatINR(godownAVal)}</div>
              <p className="text-[11px] text-slate-500 mt-1">Raw copper, laminations & contact alloys</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                <Warehouse className="w-4 h-4 text-indigo-600" />
                <span>Godown B (Electronic City)</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">{formatINR(godownBVal)}</div>
              <p className="text-[11px] text-slate-500 mt-1">PCB relays, MCBs & finished switchgears</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Total Valuation across both godowns:</span>
            <span className="font-bold text-slate-900">{formatINR(godownAVal + godownBVal)}</span>
          </div>
        </div>

        {/* 3-Way Matching Health & Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Three-Way Matching Status</h3>
              <p className="text-xs text-slate-500">PO vs GRN vs Vendor Invoice consistency check</p>
            </div>
            <button
              onClick={() => onNavigate('invoice_matching')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Resolve Discrepancies &rarr;
            </button>
          </div>

          <div className="space-y-3 mt-4">
            {vendorInvoices.slice(0, 4).map((inv) => (
              <div
                key={inv.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{inv.invoiceNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 truncate">{inv.vendorName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    PO: {inv.poNumber || 'None'} | Billed: {formatINR(inv.grandTotal)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      inv.matchStatus === 'Matched'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.matchStatus === 'Quantity Mismatch'
                        ? 'bg-rose-100 text-rose-800'
                        : inv.matchStatus === 'Price Mismatch'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {inv.matchStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Audit Events & Operational Trail */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Enterprise Audit Activity</h3>
            <p className="text-xs text-slate-500">Immutable ledger changes, approvals, and overrides</p>
          </div>
          <button
            onClick={() => onNavigate('audit_trail')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Full Audit Log &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-800 font-medium leading-tight">{log.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    By <span className="font-semibold text-slate-600">{log.userName}</span> (
                    {log.role.replace('_', ' ')}) • Action: {log.action}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
