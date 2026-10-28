import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { InvoiceMatchStatus, VendorInvoice } from '../../types/erp';
import { formatINR } from '../../utils/math';
import { Badge } from '../common/Badge';
import { InvoiceMatchingModal } from './InvoiceMatchingModal';
import { Modal } from '../common/Modal';
import {
  Scale,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  FileCheck,
  RotateCw,
  FileText,
  HelpCircle,
} from 'lucide-react';

export const InvoiceMatchingView: React.FC = () => {
  const {
    vendorInvoices,
    purchaseOrders,
    goodsReceiptNotes,
    runMatchForInvoice,
    updateInvoiceApproval,
    currentUser,
    notify,
    searchTerm,
  } = useERP();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Filtered invoices
  const filteredInvoices = vendorInvoices.filter((inv) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'DISCREPANCIES') {
        if (inv.matchStatus === 'Matched') return false;
      } else if (inv.matchStatus !== statusFilter) {
        return false;
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchInv = inv.invoiceNumber.toLowerCase().includes(term);
      const matchVendor = inv.vendorName.toLowerCase().includes(term);
      const matchPO = inv.poNumber?.toLowerCase().includes(term);
      const matchGRN = inv.grnNumber?.toLowerCase().includes(term);
      const matchItems = inv.items?.some(
        (it) => it.sku.toLowerCase().includes(term) || it.itemName.toLowerCase().includes(term)
      );
      if (!matchInv && !matchVendor && !matchPO && !matchGRN && !matchItems) return false;
    }
    return true;
  });

  const getMatchBadgeVariant = (status: InvoiceMatchStatus) => {
    switch (status) {
      case 'Matched':
        return 'success';
      case 'Quantity Mismatch':
        return 'danger';
      case 'Price Mismatch':
        return 'warning';
      case 'Tax Mismatch':
        return 'warning';
      case 'Duplicate Candidate':
        return 'danger';
      case 'Missing GRN':
      case 'Missing PO':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  const handleApprove = (inv: VendorInvoice) => {
    const success = updateInvoiceApproval(
      inv.id,
      'Approved for Payment',
      'Approved for regular payment cycle.'
    );
    if (success && selectedInvoice?.id === inv.id) {
      setSelectedInvoice({
        ...selectedInvoice,
        approvalStatus: 'Approved for Payment',
      });
    }
  };

  const handleDispute = (inv: VendorInvoice) => {
    const reason = disputeNotes.trim() || 'Flagged 3-way variance held for vendor credit note.';
    const success = updateInvoiceApproval(inv.id, 'Disputed', reason);
    if (success && selectedInvoice?.id === inv.id) {
      setSelectedInvoice({
        ...selectedInvoice,
        approvalStatus: 'Disputed',
        reviewNotes: reason,
      });
      setDisputeNotes('');
    }
  };

  const handleAuthorizedOverride = (inv: VendorInvoice) => {
    if (!overrideReason.trim()) {
      notify('error', 'Reason Required', 'Mandatory executive justification required for audit trail.');
      return;
    }
    const success = updateInvoiceApproval(
      inv.id,
      'Approved for Payment',
      `Authorized Executive Override by ${currentUser.name}: ${overrideReason.trim()}`
    );
    if (success && selectedInvoice?.id === inv.id) {
      setSelectedInvoice({
        ...selectedInvoice,
        approvalStatus: 'Approved for Payment',
        reviewNotes: overrideReason.trim(),
      });
      setOverrideReason('');
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Three-Way Invoice Matching Engine</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              PO &harr; GRN &harr; Invoice
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Automated tolerance verification for quantity, unit price, tax codes, and duplicate detection
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vendor Invoice</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'All Invoices' },
          { id: 'DISCREPANCIES', label: 'All Discrepancies' },
          { id: 'Matched', label: 'Matched (Clean)' },
          { id: 'Quantity Mismatch', label: 'Quantity Mismatch' },
          { id: 'Price Mismatch', label: 'Price Mismatch' },
          { id: 'Tax Mismatch', label: 'Tax Mismatch' },
          { id: 'Duplicate Candidate', label: 'Duplicate Candidate' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Invoice No</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Vendor</th>
                <th className="p-3.5">PO Ref</th>
                <th className="p-3.5">GRN Ref</th>
                <th className="p-3.5 text-right">Taxable</th>
                <th className="p-3.5 text-right">Invoice Total</th>
                <th className="p-3.5 text-center">3-Way Match</th>
                <th className="p-3.5 text-center">Payment Approval</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No vendor invoices match active filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    <td className="p-3.5 font-bold text-blue-600 font-mono">
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-3.5 text-slate-600">{inv.invoiceDate}</td>
                    <td className="p-3.5 font-medium text-slate-900">
                      <div>{inv.vendorName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.vendorGstin}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{inv.poNumber || '-'}</td>
                    <td className="p-3.5 text-slate-600">{inv.grnNumber || '-'}</td>
                    <td className="p-3.5 text-right font-medium text-slate-700">
                      {formatINR(inv.taxableTotal)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant={getMatchBadgeVariant(inv.matchStatus)}>
                        {inv.matchStatus}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inv.approvalStatus === 'Approved for Payment'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.approvalStatus === 'Disputed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.approvalStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3-Way Reconciliation Detail Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedInvoice(null);
            setIsResolving(false);
          }}
          title={`Three-Way Reconciliation: ${selectedInvoice.invoiceNumber}`}
          subtitle={`Vendor: ${selectedInvoice.vendorName} | PO Ref: ${selectedInvoice.poNumber || 'None'} | Billed: ${formatINR(selectedInvoice.grandTotal)}`}
          maxWidth="6xl"
        >
          <div className="space-y-5 text-xs">
            {/* Top Match Status Hero */}
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                selectedInvoice.matchStatus === 'Matched'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {selectedInvoice.matchStatus === 'Matched' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {selectedInvoice.matchStatus === 'Matched'
                      ? 'Perfect 3-Way Verification: All Quantities, Rates & Tax Treatments Matched'
                      : `Matching Discrepancy Detected: ${selectedInvoice.matchStatus}`}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {selectedInvoice.matchStatus === 'Matched'
                      ? 'PO ordered quantities correspond to warehouse accepted quantities and invoice line totals.'
                      : `${selectedInvoice.discrepancies.length} discrepancy item(s) require review. Invoice quarantined from automatic payment.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => runMatchForInvoice(selectedInvoice.id)}
                  className="px-3 py-1.5 bg-white/80 hover:bg-white text-slate-800 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Re-run Match</span>
                </button>
              </div>
            </div>

            {/* Discrepancy Breakdown Table if any */}
            {selectedInvoice.discrepancies.length > 0 && (
              <div>
                <h4 className="font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Identified Discrepancies ({selectedInvoice.discrepancies.length})
                </h4>
                <div className="border border-rose-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-100/60 text-rose-900 font-semibold border-b border-rose-200">
                      <tr>
                        <th className="p-2.5">Field</th>
                        <th className="p-2.5">Expected (PO / GRN)</th>
                        <th className="p-2.5">Actual (Invoice)</th>
                        <th className="p-2.5 text-rose-700">Variance / Difference</th>
                        <th className="p-2.5">Explanation</th>
                        <th className="p-2.5">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-rose-50/30">
                      {selectedInvoice.discrepancies.map((d, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-slate-800">{d.field}</td>
                          <td className="p-2.5 font-medium text-slate-700">{d.expected}</td>
                          <td className="p-2.5 font-medium text-slate-900">{d.actual}</td>
                          <td className="p-2.5 font-bold text-rose-700">{d.difference}</td>
                          <td className="p-2.5 text-slate-700">{d.explanation}</td>
                          <td className="p-2.5 font-medium text-blue-800">
                            {d.recommendedAction}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Billed Items Details */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                Billed Invoice Line Items
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">SKU & Item Name</th>
                      <th className="p-2.5 text-right">Billed Qty</th>
                      <th className="p-2.5 text-right">Billed Unit Price</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">GST Rate</th>
                      <th className="p-2.5 text-right">Tax Amount</th>
                      <th className="p-2.5 text-right font-bold">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{item.sku}</div>
                          <div className="text-[11px] text-slate-500">{item.itemName}</div>
                        </td>
                        <td className="p-2.5 text-right font-medium">{item.quantity}</td>
                        <td className="p-2.5 text-right font-medium">₹{item.unitPrice}</td>
                        <td className="p-2.5 text-right font-medium">
                          {formatINR(item.taxableAmount)}
                        </td>
                        <td className="p-2.5 text-right">{item.taxRate}%</td>
                        <td className="p-2.5 text-right text-slate-600">
                          {formatINR(item.cgst + item.sgst + item.igst)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {formatINR(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Approval Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Approval &amp; Audit Trail</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.approvalStatus}</span>
                </div>
                {selectedInvoice.reviewedBy && (
                  <div className="text-[11px] text-slate-500">
                    Reviewed by: <strong>{selectedInvoice.reviewedBy}</strong>
                  </div>
                )}
                {selectedInvoice.reviewNotes && (
                  <div className="text-[11px] p-2 bg-white rounded border border-slate-200 text-slate-700 italic">
                    "{selectedInvoice.reviewNotes}"
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Total:</span>
                  <span className="font-semibold text-slate-800">
                    {formatINR(selectedInvoice.taxableTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Total GST (CGST+SGST / IGST):</span>
                  <span>
                    {formatINR(
                      selectedInvoice.cgstTotal + selectedInvoice.sgstTotal + selectedInvoice.igstTotal
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-blue-700">{formatINR(selectedInvoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Resolution Workflow Box */}
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900">Invoice Matching Resolution Actions</h4>

              {selectedInvoice.matchStatus === 'Matched' ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    Invoice passed all 3-way tolerance rules. Ready for standard accounts payable.
                  </span>
                  {selectedInvoice.approvalStatus !== 'Approved for Payment' && (
                    <button
                      onClick={() => handleApprove(selectedInvoice)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                    >
                      Approve for Payment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDispute(selectedInvoice)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Place On Formal Dispute (Quarantine)</span>
                    </button>

                    <button
                      onClick={() => setIsResolving(!isResolving)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Authorized Executive Override...</span>
                    </button>
                  </div>

                  {isResolving && (
                    <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-2">
                      <span className="font-semibold text-amber-900 block text-xs">
                        Executive Authorization Required (Owner / Finance Manager):
                      </span>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Provide detailed commercial justification for overriding this discrepancy..."
                        rows={2}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsResolving(false)}
                          className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAuthorizedOverride(selectedInvoice)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                        >
                          Confirm Override &amp; Approve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Record Invoice Modal */}
      {isModalOpen && (
        <InvoiceMatchingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};
