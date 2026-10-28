import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { formatINR, round2 } from '../../utils/math';
import { Badge } from '../common/Badge';
import { RecordPaymentModal } from './RecordPaymentModal';
import {
  IndianRupee,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const PayablesReceivablesView: React.FC = () => {
  const {
    vendorInvoices,
    customerInvoices,
    paymentTransactions,
    kpis,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'payables' | 'receivables' | 'payments_log'>('payables');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isVendorPay, setIsVendorPay] = useState<boolean>(true);

  // Payables
  const approvedPayables = vendorInvoices.filter(
    (inv) => inv.approvalStatus === 'Approved for Payment' && inv.grandTotal - inv.amountPaid > 0
  );

  const disputedInvoices = vendorInvoices.filter(
    (inv) => inv.approvalStatus === 'Disputed' || inv.matchStatus !== 'Matched'
  );

  const paidInvoices = vendorInvoices.filter(
    (inv) => inv.paymentStatus === 'Fully Paid'
  );

  // Receivables
  const today = new Date().toISOString().split('T')[0];
  const pendingReceivables = customerInvoices.filter(
    (cinv) => cinv.grandTotal - cinv.amountReceived > 0
  );

  const handleOpenPayment = (invId: string, isVendor: boolean) => {
    setSelectedInvoiceId(invId);
    setIsVendorPay(isVendor);
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Position Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Payables */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Approved Payables (Owed Today)</span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-2">
            {formatINR(kpis.approvedSupplierPayables)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {approvedPayables.length} approved bills ready for disbursement
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Customer Receivables (Owed To Us)</span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-2">
            {formatINR(kpis.customerReceivables)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Overdue (&gt;30d): <strong className="text-rose-700">{formatINR(kpis.overdueReceivables)}</strong>
          </div>
        </div>

        {/* Quarantined in Dispute */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Quarantined Disputed Bills</span>
            <span className="p-1 rounded-md bg-rose-50 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-rose-700 mt-2">
            {formatINR(kpis.disputedInvoiceValue)}
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">
            Strictly excluded from approved payables
          </div>
        </div>

        {/* Working Capital */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Net Liquid Position</span>
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-blue-800 mt-2">
            {formatINR(kpis.todayNetPosition)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Receivables minus Approved Payables
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('payables')}
          className={`pb-2.5 border-b-2 transition ${
            activeTab === 'payables'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Supplier Payables ({approvedPayables.length} Approved, {disputedInvoices.length} Disputed)
        </button>
        <button
          onClick={() => setActiveTab('receivables')}
          className={`pb-2.5 border-b-2 transition ${
            activeTab === 'receivables'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Customer Receivables ({pendingReceivables.length} Outstanding)
        </button>
        <button
          onClick={() => setActiveTab('payments_log')}
          className={`pb-2.5 border-b-2 transition ${
            activeTab === 'payments_log'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Bank Transaction Clearance Ledger ({paymentTransactions.length})
        </button>
      </div>

      {/* Tab 1: Supplier Payables */}
      {activeTab === 'payables' && (
        <div className="space-y-6">
          {/* Approved Payables Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-emerald-950 text-xs">
                  Approved &amp; Scheduled Supplier Disbursements
                </h3>
                <p className="text-[11px] text-emerald-800">
                  Invoices that successfully passed 3-way matching and received formal payment authorization
                </p>
              </div>
              <span className="font-bold text-emerald-900 text-sm">
                Total: {formatINR(kpis.approvedSupplierPayables)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">Invoice Date</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5 text-right">Invoice Total</th>
                    <th className="p-3.5 text-right">Already Paid</th>
                    <th className="p-3.5 text-right font-bold text-blue-700">Remaining Balance</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvedPayables.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        No approved vendor payables currently outstanding.
                      </td>
                    </tr>
                  ) : (
                    approvedPayables.map((inv) => {
                      const balance = round2(inv.grandTotal - inv.amountPaid);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5 font-bold text-slate-900 font-mono">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3.5 font-medium text-slate-900">{inv.vendorName}</td>
                          <td className="p-3.5 text-slate-600">{inv.invoiceDate}</td>
                          <td className="p-3.5 text-slate-700 font-medium">{inv.dueDate}</td>
                          <td className="p-3.5 text-right font-medium text-slate-700">
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td className="p-3.5 text-right text-emerald-700 font-medium">
                            {formatINR(inv.amountPaid)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-blue-700">
                            {formatINR(balance)}
                          </td>
                          <td className="p-3.5 text-center">
                            <Badge variant="success">Approved</Badge>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleOpenPayment(inv.id, true)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs"
                            >
                              Pay Bill &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quarantined Disputed Invoices */}
          <div className="bg-white rounded-xl border border-rose-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Quarantined / Disputed Invoices (Payment Strictly Blocked)
                </h3>
                <p className="text-[11px] text-rose-800">
                  Invoices failed 3-way match (quantity/rate discrepancy). Will not appear in payables until resolved.
                </p>
              </div>
              <span className="font-bold text-rose-900 text-sm">
                Quarantined: {formatINR(kpis.disputedInvoiceValue)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">PO Ref</th>
                    <th className="p-3.5 text-right">Billed Total</th>
                    <th className="p-3.5 text-center">Mismatch Type</th>
                    <th className="p-3.5">Dispute Reason &amp; Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {disputedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-bold text-slate-900 font-mono">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">{inv.vendorName}</td>
                      <td className="p-3.5 text-slate-600">{inv.poNumber || '-'}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant="danger">{inv.matchStatus}</Badge>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-md">
                        {inv.discrepancies[0]?.explanation || inv.reviewNotes || 'Under 3-way audit.'}
                        {inv.discrepancies[0]?.recommendedAction && (
                          <div className="text-[11px] font-semibold text-rose-700 mt-0.5">
                            Action: {inv.discrepancies[0].recommendedAction}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Customer Receivables */}
      {activeTab === 'receivables' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-950 text-xs">Customer Sales Invoices &amp; Collections</h3>
              <p className="text-[11px] text-blue-800">
                Track electrical components distribution invoices across Karnataka and inter-state distributors
              </p>
            </div>
            <span className="font-bold text-blue-900 text-sm">
              Total Outstanding: {formatINR(kpis.customerReceivables)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Invoice No</th>
                  <th className="p-3.5">Customer &amp; State</th>
                  <th className="p-3.5">Invoice Date</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5 text-right">Invoice Total</th>
                  <th className="p-3.5 text-right">Received</th>
                  <th className="p-3.5 text-right font-bold text-emerald-700">Outstanding</th>
                  <th className="p-3.5 text-center">Aging &amp; Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerInvoices.map((cinv) => {
                  const balance = round2(cinv.grandTotal - cinv.amountReceived);
                  const isOverdue = cinv.dueDate < today && balance > 0;

                  return (
                    <tr key={cinv.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-bold text-slate-900 font-mono">
                        {cinv.invoiceNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{cinv.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {cinv.customerGstin} ({cinv.customerStateCode === '29' ? 'Karnataka' : 'Inter-State'})
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">{cinv.invoiceDate}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{cinv.dueDate}</td>
                      <td className="p-3.5 text-right font-medium text-slate-700">
                        {formatINR(cinv.grandTotal)}
                      </td>
                      <td className="p-3.5 text-right font-medium text-emerald-700">
                        {formatINR(cinv.amountReceived)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatINR(balance)}
                      </td>
                      <td className="p-3.5 text-center">
                        {balance === 0 ? (
                          <Badge variant="success">Fully Collected</Badge>
                        ) : isOverdue ? (
                          <Badge variant="danger">Overdue &gt; 30d</Badge>
                        ) : (
                          <Badge variant="info">Within Terms</Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {balance > 0 && (
                          <button
                            onClick={() => handleOpenPayment(cinv.id, false)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs"
                          >
                            Record Receipt &rarr;
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payment Transactions Ledger */}
      {activeTab === 'payments_log' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Txn Voucher No</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Type</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Invoice Ref</th>
                  <th className="p-3.5">Mode &amp; Bank</th>
                  <th className="p-3.5 font-mono">Bank Reference (UTR)</th>
                  <th className="p-3.5 text-right font-bold">Amount Cleared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      No cleared payment transactions found.
                    </td>
                  </tr>
                ) : (
                  paymentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-blue-700">{tx.paymentNumber}</td>
                      <td className="p-3.5 text-slate-600">{tx.paymentDate}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            tx.partyType === 'VENDOR'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.partyType}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">{tx.partyName}</td>
                      <td className="p-3.5 font-mono text-slate-700">{tx.invoiceNumber}</td>
                      <td className="p-3.5 text-slate-600">
                        {tx.paymentMode} ({tx.bankAccount})
                      </td>
                      <td className="p-3.5 font-mono text-slate-800 font-medium">
                        {tx.referenceNumber}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatINR(tx.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedInvoiceId && (
        <RecordPaymentModal
          isOpen={true}
          onClose={() => setSelectedInvoiceId(null)}
          invoiceId={selectedInvoiceId}
          isVendorPayment={isVendorPay}
        />
      )}
    </div>
  );
};
