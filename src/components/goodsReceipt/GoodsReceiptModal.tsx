import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { GodownId, GRNLineItem, PurchaseOrder } from '../../types/erp';
import { Modal } from '../common/Modal';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPoId?: string;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  preselectedPoId,
}) => {
  const { purchaseOrders, godowns, postGoodsReceipt, currentUser, notify } = useERP();

  // Filter approved or partially received POs
  const eligiblePOs = purchaseOrders.filter(
    (p) => p.status === 'Approved' || p.status === 'Partially Received'
  );

  const [selectedPoId, setSelectedPoId] = useState<string>(
    preselectedPoId || eligiblePOs[0]?.id || ''
  );

  const selectedPO = purchaseOrders.find((p) => p.id === selectedPoId);

  const [destinationGodownId, setDestinationGodownId] = useState<GodownId>(
    selectedPO?.destinationGodownId || 'GODOWN_A'
  );
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorChallanNo, setVendorChallanNo] = useState('');
  const [vendorChallanDate, setVendorChallanDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Receiving line items
  const [receiptLines, setReceiptLines] = useState<
    GRNLineItem[]
  >(() => {
    if (!selectedPO) return [];
    return selectedPO.lines.map((l) => {
      const prevRcvd = l.receivedQuantity || 0;
      const remaining = Math.max(0, l.quantity - prevRcvd);
      return {
        id: `grnl-${l.id}`,
        poLineId: l.id,
        itemId: l.itemId,
        sku: l.sku,
        itemName: l.itemName,
        orderedQty: l.quantity,
        previouslyReceivedQty: prevRcvd,
        currentReceivedQty: remaining,
        acceptedQty: remaining,
        rejectedQty: 0,
        rejectionReason: '',
        unitPrice: l.unitPrice,
        uom: l.uom,
      };
    });
  });

  const handlePOChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setDestinationGodownId(po.destinationGodownId);
      setReceiptLines(
        po.lines.map((l) => {
          const prevRcvd = l.receivedQuantity || 0;
          const remaining = Math.max(0, l.quantity - prevRcvd);
          return {
            id: `grnl-${l.id}`,
            poLineId: l.id,
            itemId: l.itemId,
            sku: l.sku,
            itemName: l.itemName,
            orderedQty: l.quantity,
            previouslyReceivedQty: prevRcvd,
            currentReceivedQty: remaining,
            acceptedQty: remaining,
            rejectedQty: 0,
            rejectionReason: '',
            unitPrice: l.unitPrice,
            uom: l.uom,
          };
        })
      );
    }
  };

  const handleQtyChange = (
    index: number,
    field: 'currentReceivedQty' | 'acceptedQty' | 'rejectedQty',
    val: number
  ) => {
    const updated = [...receiptLines];
    const line = updated[index];

    if (field === 'currentReceivedQty') {
      const rec = Math.max(0, val);
      line.currentReceivedQty = rec;
      line.acceptedQty = rec;
      line.rejectedQty = 0;
    } else if (field === 'acceptedQty') {
      const acc = Math.max(0, val);
      line.acceptedQty = acc;
      line.rejectedQty = Math.max(0, line.currentReceivedQty - acc);
    } else if (field === 'rejectedQty') {
      const rej = Math.max(0, val);
      line.rejectedQty = rej;
      line.acceptedQty = Math.max(0, line.currentReceivedQty - rej);
    }

    setReceiptLines(updated);
  };

  const handleRejectionReasonChange = (index: number, reason: string) => {
    const updated = [...receiptLines];
    updated[index].rejectionReason = reason;
    setReceiptLines(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    if (!vendorChallanNo.trim()) {
      notify('error', 'Challan Required', 'Please enter Vendor Delivery Challan / Lorry Receipt number.');
      return;
    }

    const totalAccepted = receiptLines.reduce((s, l) => s + l.acceptedQty, 0);
    if (totalAccepted === 0) {
      notify('error', 'Zero Receipt', 'Total accepted quantity must be greater than zero to post GRN.');
      return;
    }

    const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const res = postGoodsReceipt({
      grnNumber,
      poId: selectedPO.id,
      poNumber: selectedPO.poNumber,
      vendorId: selectedPO.vendorId,
      vendorName: selectedPO.vendorName,
      receiptDate,
      destinationGodownId,
      vendorChallanNo: vendorChallanNo.trim(),
      vendorChallanDate,
      lines: receiptLines,
      inspectionNotes,
      receivedBy: `${currentUser.name} (${currentUser.role})`,
    });

    if (res.success) {
      onClose();
    } else {
      notify('error', 'Posting Failed', res.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Goods Receipt Note (GRN)"
      subtitle="Inward warehouse receipt, QA inspection, and inventory ledger posting"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* PO & Warehouse Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Approved PO *
            </label>
            <select
              value={selectedPoId}
              onChange={(e) => handlePOChange(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
              required
            >
              {eligiblePOs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.poNumber} - {p.vendorName} ({p.status})
                </option>
              ))}
            </select>
            {selectedPO && (
              <p className="text-[11px] text-slate-500 mt-1">
                Vendor: <span className="font-semibold text-slate-800">{selectedPO.vendorName}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inward Godown *
            </label>
            <select
              value={destinationGodownId}
              onChange={(e) => setDestinationGodownId(e.target.value as GodownId)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Stock ledger will credit this godown.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Date *
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Challan No *
              </label>
              <input
                type="text"
                value={vendorChallanNo}
                onChange={(e) => setVendorChallanNo(e.target.value)}
                placeholder="e.g. DC-9901"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                required
              />
            </div>
          </div>
        </div>

        {/* Lines verification table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Item Inspection & Quantities
            </h4>
            <span className="text-xs text-slate-500">
              Only accepted quantities will be credited into stock balance.
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Item & SKU</th>
                  <th className="p-2.5 text-right w-20">Ordered</th>
                  <th className="p-2.5 text-right w-20">Prev Inward</th>
                  <th className="p-2.5 text-right w-24">Physically Rcvd</th>
                  <th className="p-2.5 text-right w-24">Accepted Qty</th>
                  <th className="p-2.5 text-right w-24">Rejected Qty</th>
                  <th className="p-2.5">Rejection Reason / QA Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiptLines.map((line, idx) => (
                  <tr key={line.poLineId} className="hover:bg-slate-50/50">
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{line.sku}</div>
                      <div className="text-[11px] text-slate-500">{line.itemName}</div>
                    </td>
                    <td className="p-2.5 text-right font-medium text-slate-600">
                      {line.orderedQty} {line.uom}
                    </td>
                    <td className="p-2.5 text-right text-slate-500">
                      {line.previouslyReceivedQty} {line.uom}
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.currentReceivedQty}
                        onChange={(e) =>
                          handleQtyChange(idx, 'currentReceivedQty', Number(e.target.value))
                        }
                        className="w-full text-xs p-1.5 rounded border border-slate-300 text-right font-semibold"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.acceptedQty}
                        onChange={(e) =>
                          handleQtyChange(idx, 'acceptedQty', Number(e.target.value))
                        }
                        className="w-full text-xs p-1.5 rounded border border-emerald-300 bg-emerald-50/50 text-right font-bold text-emerald-800"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.rejectedQty}
                        onChange={(e) =>
                          handleQtyChange(idx, 'rejectedQty', Number(e.target.value))
                        }
                        className="w-full text-xs p-1.5 rounded border border-rose-300 bg-rose-50/50 text-right font-bold text-rose-800"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={line.rejectionReason}
                        onChange={(e) => handleRejectionReasonChange(idx, e.target.value)}
                        placeholder={
                          line.rejectedQty > 0 ? 'Specify defect (e.g. broken pins)' : 'Optional'
                        }
                        className="w-full text-xs p-1.5 rounded border border-slate-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Warehouse Receiving & QA Inspection Notes
          </label>
          <textarea
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            placeholder="e.g. Material unloaded at Bay 2. Visual inspection complete. Verified manufacturer test certificate."
            rows={2}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Post GRN to Inventory</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
