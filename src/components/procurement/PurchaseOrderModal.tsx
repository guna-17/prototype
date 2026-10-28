import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { GodownId, POLineItem, PurchaseOrder } from '../../types/erp';
import { calculateGstBreakdown, formatINR, round2 } from '../../utils/math';
import { Modal } from '../common/Modal';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose }) => {
  const { vendors, items, godowns, createPurchaseOrder, currentUser } = useERP();

  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [destinationGodownId, setDestinationGodownId] = useState<GodownId>('GODOWN_A');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  // PO Line Items state
  const [lines, setLines] = useState<
    {
      itemId: string;
      quantity: number;
      unitPrice: number;
    }[]
  >([
    {
      itemId: items[0]?.id || '',
      quantity: 100,
      unitPrice: items[0]?.standardCost || 100,
    },
  ]);

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  const handleItemChange = (index: number, itemId: string) => {
    const itm = items.find((i) => i.id === itemId);
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      itemId,
      unitPrice: itm?.standardCost || 0,
    };
    setLines(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...lines];
    updated[index].quantity = Math.max(1, qty);
    setLines(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...lines];
    updated[index].unitPrice = Math.max(0, price);
    setLines(updated);
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        itemId: items[0]?.id || '',
        quantity: 50,
        unitPrice: items[0]?.standardCost || 50,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Compute calculated line totals
  const vendorStateCode = selectedVendor?.stateCode || '29';

  let subtotalTaxable = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedLines: POLineItem[] = lines.map((line, idx) => {
    const item = items.find((i) => i.id === line.itemId) || items[0];
    const taxableAmount = round2(line.quantity * line.unitPrice);
    const tax = calculateGstBreakdown(taxableAmount, item.taxRate, vendorStateCode);

    subtotalTaxable += tax.taxableAmount;
    cgstTotal += tax.cgstAmount;
    sgstTotal += tax.sgstAmount;
    igstTotal += tax.igstAmount;

    return {
      id: `pol-${Date.now()}-${idx}`,
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      hsnCode: item.hsnCode,
      quantity: line.quantity,
      receivedQuantity: 0,
      unitPrice: line.unitPrice,
      uom: item.uom,
      taxRate: item.taxRate,
      taxableAmount: tax.taxableAmount,
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      totalAmount: tax.grandTotal,
    };
  });

  const grandTotal = round2(subtotalTaxable + cgstTotal + sgstTotal + igstTotal);

  const handleSubmit = (saveAsStatus: 'Draft' | 'Submitted' | 'Approved') => {
    if (!selectedVendor) return;

    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    createPurchaseOrder({
      poNumber,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      vendorGstin: selectedVendor.gstin,
      vendorStateCode: selectedVendor.stateCode,
      orderDate,
      expectedDeliveryDate,
      destinationGodownId,
      status: saveAsStatus,
      lines: calculatedLines,
      subtotalTaxable: round2(subtotalTaxable),
      cgstTotal: round2(cgstTotal),
      sgstTotal: round2(sgstTotal),
      igstTotal: round2(igstTotal),
      grandTotal,
      notes,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      approvedBy: saveAsStatus === 'Approved' ? currentUser.name : undefined,
      approvedAt: saveAsStatus === 'Approved' ? new Date().toISOString() : undefined,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Order (PO)"
      subtitle="Issue formal procurement order with automated Karnataka GST splitting"
      maxWidth="4xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit('Submitted');
        }}
        className="space-y-5"
      >
        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Vendor *
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
              required
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.state} - {v.stateCode === '29' ? 'Intra-State' : 'Inter-State'})
                </option>
              ))}
            </select>
            {selectedVendor && (
              <p className="text-[11px] text-slate-500 mt-1">
                GSTIN: <span className="font-mono font-medium">{selectedVendor.gstin}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Godown *
            </label>
            <select
              value={destinationGodownId}
              onChange={(e) => setDestinationGodownId(e.target.value as GodownId)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Goods receipt notes will be posted to this location.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Order Line Items
            </h4>
            <button
              type="button"
              onClick={addLine}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Item & Description</th>
                  <th className="p-2.5 w-24">HSN & Tax</th>
                  <th className="p-2.5 w-24">Qty</th>
                  <th className="p-2.5 w-28">Rate (₹)</th>
                  <th className="p-2.5 w-28 text-right">Taxable</th>
                  <th className="p-2.5 w-28 text-right">Tax</th>
                  <th className="p-2.5 w-28 text-right">Total</th>
                  <th className="p-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => {
                  const itm = items.find((i) => i.id === line.itemId) || items[0];
                  const calcLine = calculatedLines[idx];
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5">
                        <select
                          value={line.itemId}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white font-medium"
                        >
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.sku} - {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5 text-slate-600">
                        <div>HSN: {itm?.hsnCode}</div>
                        <div className="text-[10px] text-blue-600 font-medium">
                          {itm?.taxRate}% GST
                        </div>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          className="w-full text-xs p-1.5 rounded border border-slate-300"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                          className="w-full text-xs p-1.5 rounded border border-slate-300"
                        />
                      </td>
                      <td className="p-2.5 text-right font-medium text-slate-800">
                        {formatINR(calcLine?.taxableAmount || 0)}
                      </td>
                      <td className="p-2.5 text-right text-slate-600 text-[11px]">
                        {calcLine?.igstAmount > 0 ? (
                          <div>IGST: {formatINR(calcLine.igstAmount)}</div>
                        ) : (
                          <div>
                            C: {formatINR(calcLine?.cgstAmount || 0)}
                            <br />
                            S: {formatINR(calcLine?.sgstAmount || 0)}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatINR(calcLine?.totalAmount || 0)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length === 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & GST Summary */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Order Remarks / Terms
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard delivery at Peenya warehouse. Inspection within 48h."
              rows={2}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="w-full sm:w-72 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Taxable Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatINR(subtotalTaxable)}</span>
            </div>
            {vendorStateCode === '29' ? (
              <>
                <div className="flex justify-between text-blue-700">
                  <span>CGST Total (9%):</span>
                  <span>{formatINR(cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>SGST Total (9%):</span>
                  <span>{formatINR(sgstTotal)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-indigo-700">
                <span>IGST Total (18% Inter-State):</span>
                <span>{formatINR(igstTotal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-300 font-bold text-slate-900 text-sm">
              <span>Grand Total:</span>
              <span className="text-blue-700">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            Submit for Approval
          </button>
        </div>
      </form>
    </Modal>
  );
};
