import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { POStatus, PurchaseOrder } from '../../types/erp';
import { formatINR } from '../../utils/math';
import { Badge } from '../common/Badge';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { Modal } from '../common/Modal';
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  PackageCheck,
  FileText,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface PurchaseOrdersViewProps {
  onNavigateToGRN?: (poId: string) => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ onNavigateToGRN }) => {
  const { purchaseOrders, updatePOStatus, currentUser, activeGodownFilter, searchTerm } = useERP();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');

  // Filter logic
  const filteredPOs = purchaseOrders.filter((po) => {
    if (activeGodownFilter !== 'ALL' && po.destinationGodownId !== activeGodownFilter) {
      return false;
    }
    if (statusFilter !== 'ALL' && po.status !== statusFilter) {
      return false;
    }
    if (vendorFilter !== 'ALL' && po.vendorId !== vendorFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchPO = po.poNumber.toLowerCase().includes(term);
      const matchVendor = po.vendorName.toLowerCase().includes(term);
      const matchId = po.id.toLowerCase().includes(term);
      const matchLine = po.lines?.some(
        (l) => l.sku.toLowerCase().includes(term) || l.itemName.toLowerCase().includes(term)
      );
      if (!matchPO && !matchVendor && !matchId && !matchLine) return false;
    }
    return true;
  });

  const getStatusBadgeVariant = (status: POStatus) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Fully Received':
        return 'purple';
      case 'Partially Received':
        return 'info';
      case 'Submitted':
        return 'warning';
      case 'Draft':
        return 'neutral';
      case 'Cancelled':
      case 'Closed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const handleApprove = (po: PurchaseOrder) => {
    updatePOStatus(po.id, 'Approved');
    if (selectedPO?.id === po.id) {
      setSelectedPO({ ...selectedPO, status: 'Approved' });
    }
  };

  const handleCancel = (po: PurchaseOrder) => {
    if (window.confirm(`Are you sure you want to cancel ${po.poNumber}?`)) {
      updatePOStatus(po.id, 'Cancelled', 'Cancelled by authorized user');
      if (selectedPO?.id === po.id) {
        setSelectedPO({ ...selectedPO, status: 'Cancelled' });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Procurement & Purchase Orders</h2>
          <p className="text-xs text-slate-500">
            Create, approve, and track vendor purchase orders across warehouses
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'Submitted', 'Approved', 'Partially Received', 'Fully Received', 'Draft', 'Cancelled'].map(
          (st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          )
        )}
      </div>

      {/* POs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Vendor</th>
                <th className="p-3.5">Order Date</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5 text-right">Taxable</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No purchase orders found matching active filters.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => setSelectedPO(po)}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    <td className="p-3.5 font-bold text-blue-600">{po.poNumber}</td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">{po.vendorName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        GSTIN: {po.vendorGstin}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600">{po.orderDate}</td>
                    <td className="p-3.5 text-slate-700">
                      <span className="font-medium">
                        {po.destinationGodownId === 'GODOWN_A' ? 'Godown A (Peenya)' : 'Godown B (Electronic City)'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {po.lines.length} {po.lines.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-700">
                      {formatINR(po.subtotalTaxable)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {formatINR(po.grandTotal)}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(po.status)}>{po.status}</Badge>
                    </td>
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPO(po)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Detail View Modal */}
      {selectedPO && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPO(null)}
          title={`Purchase Order: ${selectedPO.poNumber}`}
          subtitle={`Issued to ${selectedPO.vendorName} on ${selectedPO.orderDate}`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            {/* Meta bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">Vendor GSTIN</span>
                <span className="font-mono font-medium text-slate-800">
                  {selectedPO.vendorGstin}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Delivery Godown</span>
                <span className="font-medium text-slate-800">
                  {selectedPO.destinationGodownId === 'GODOWN_A'
                    ? 'Godown A (Peenya)'
                    : 'Godown B (Electronic City)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Expected Date</span>
                <span className="font-medium text-slate-800">
                  {selectedPO.expectedDeliveryDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <Badge variant={getStatusBadgeVariant(selectedPO.status)}>{selectedPO.status}</Badge>
              </div>
            </div>

            {/* Line items with receipt progress */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Order Items & Warehouse Receipts
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">SKU & Item</th>
                      <th className="p-2.5">HSN</th>
                      <th className="p-2.5 text-right">Ordered</th>
                      <th className="p-2.5 text-right">Received</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">Tax</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPO.lines.map((l) => {
                      const receiptPercent = Math.min(
                        100,
                        Math.round(((l.receivedQuantity || 0) / l.quantity) * 100)
                      );
                      return (
                        <tr key={l.id}>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{l.sku}</div>
                            <div className="text-slate-500 text-[11px]">{l.itemName}</div>
                          </td>
                          <td className="p-2.5 text-slate-600">{l.hsnCode}</td>
                          <td className="p-2.5 text-right font-medium">
                            {l.quantity} {l.uom}
                          </td>
                          <td className="p-2.5 text-right">
                            <span
                              className={`font-semibold ${
                                l.receivedQuantity >= l.quantity
                                  ? 'text-emerald-700'
                                  : l.receivedQuantity > 0
                                  ? 'text-amber-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {l.receivedQuantity || 0} {l.uom}
                            </span>
                            <div className="w-16 bg-slate-200 rounded-full h-1 mt-1 ml-auto overflow-hidden">
                              <div
                                className="bg-emerald-600 h-1 rounded-full"
                                style={{ width: `${receiptPercent}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-medium">₹{l.unitPrice}</td>
                          <td className="p-2.5 text-right">{formatINR(l.taxableAmount)}</td>
                          <td className="p-2.5 text-right text-[11px] text-slate-600">
                            {formatINR(l.cgstAmount + l.sgstAmount + l.igstAmount)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900">
                            {formatINR(l.totalAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total breakdown */}
            <div className="flex justify-end">
              <div className="w-72 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Taxable:</span>
                  <span className="font-semibold text-slate-800">
                    {formatINR(selectedPO.subtotalTaxable)}
                  </span>
                </div>
                {selectedPO.vendorStateCode === '29' ? (
                  <>
                    <div className="flex justify-between text-blue-700">
                      <span>CGST:</span>
                      <span>{formatINR(selectedPO.cgstTotal)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>SGST:</span>
                      <span>{formatINR(selectedPO.sgstTotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-indigo-700">
                    <span>IGST:</span>
                    <span>{formatINR(selectedPO.igstTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-blue-700">{formatINR(selectedPO.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Workflow Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-[11px] text-slate-500">
                Created by {selectedPO.createdBy}
                {selectedPO.approvedBy && ` • Approved by ${selectedPO.approvedBy}`}
              </div>

              <div className="flex items-center gap-2">
                {selectedPO.status === 'Submitted' && (
                  <>
                    <button
                      onClick={() => handleCancel(selectedPO)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                    >
                      Reject PO
                    </button>
                    <button
                      onClick={() => handleApprove(selectedPO)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                    >
                      Approve PO
                    </button>
                  </>
                )}

                {selectedPO.status === 'Draft' && (
                  <button
                    onClick={() => updatePOStatus(selectedPO.id, 'Submitted')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Submit for Approval
                  </button>
                )}

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PO</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* New PO Modal */}
      {isCreateModalOpen && (
        <PurchaseOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
};
