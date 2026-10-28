import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { VendorInvoice } from '../../types/erp';
import { calculateGstBreakdown, formatINR, round2 } from '../../utils/math';
import { Modal } from '../common/Modal';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface InvoiceMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceMatchingModal: React.FC<InvoiceMatchingModalProps> = ({ isOpen, onClose }) => {
  const { vendors, purchaseOrders, items, createVendorInvoice, notify } = useERP();

  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [poNumber, setPoNumber] = useState(purchaseOrders[0]?.poNumber || '');

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  // Line items
  const [invoiceLines, setInvoiceLines] = useState<
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

  const addLine = () => {
    setInvoiceLines((prev) => [
      ...prev,
      {
        itemId: items[0]?.id || '',
        quantity: 50,
        unitPrice: items[0]?.standardCost || 50,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (invoiceLines.length > 1) {
      setInvoiceLines((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const vendorStateCode = selectedVendor?.stateCode || '29';

  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedItems = invoiceLines.map((line) => {
    const itm = items.find((i) => i.id === line.itemId) || items[0];
    const taxable = round2(line.quantity * line.unitPrice);
    const tax = calculateGstBreakdown(taxable, itm.taxRate, vendorStateCode);

    taxableTotal += tax.taxableAmount;
    cgstTotal += tax.cgstAmount;
    sgstTotal += tax.sgstAmount;
    igstTotal += tax.igstAmount;

    return {
      itemId: itm.id,
      sku: itm.sku,
      itemName: itm.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: itm.taxRate,
      taxableAmount: tax.taxableAmount,
      cgst: tax.cgstAmount,
      sgst: tax.sgstAmount,
      igst: tax.igstAmount,
      lineTotal: tax.grandTotal,
    };
  });

  const grandTotal = round2(taxableTotal + cgstTotal + sgstTotal + igstTotal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;

    if (!invoiceNumber.trim()) {
      notify('error', 'Invoice Number Required', 'Please enter vendor bill / invoice number.');
      return;
    }

    createVendorInvoice({
      invoiceNumber: invoiceNumber.trim().toUpperCase(),
      invoiceDate,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      vendorGstin: selectedVendor.gstin,
      poNumber: poNumber.trim() || undefined,
      items: calculatedItems,
      taxableTotal: round2(taxableTotal),
      cgstTotal: round2(cgstTotal),
      sgstTotal: round2(sgstTotal),
      igstTotal: round2(igstTotal),
      grandTotal,
      dueDate,
      approvalStatus: 'Pending Review',
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Vendor Inward Invoice"
      subtitle="Enter vendor bill to run automated Three-Way Matching against PO and Goods Receipts"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Vendor & Invoice Meta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Vendor *</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              required
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vendor Invoice Number *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-901"
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Purchase Order Reference
            </label>
            <select
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">No PO Reference (Direct Bill)</option>
              {purchaseOrders.map((p) => (
                <option key={p.id} value={p.poNumber}>
                  {p.poNumber} ({p.vendorName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Invoice Date *</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              required
            />
          </div>

          <div className="flex items-center text-slate-500 pt-5 text-[11px]">
            <span>Automated 3-way match triggers immediately upon save.</span>
          </div>
        </div>

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider">
              Billed Line Items
            </h4>
            <button
              type="button"
              onClick={addLine}
              className="px-2.5 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5 w-24">Billed Qty</th>
                  <th className="p-2.5 w-28">Billed Rate (₹)</th>
                  <th className="p-2.5 text-right w-24">Taxable</th>
                  <th className="p-2.5 text-right w-24">Tax</th>
                  <th className="p-2.5 text-right w-28">Line Total</th>
                  <th className="p-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceLines.map((line, idx) => {
                  const calc = calculatedItems[idx];
                  return (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <select
                          value={line.itemId}
                          onChange={(e) => {
                            const updated = [...invoiceLines];
                            updated[idx].itemId = e.target.value;
                            setInvoiceLines(updated);
                          }}
                          className="w-full text-xs p-1.5 rounded border border-slate-300"
                        >
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.sku} - {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...invoiceLines];
                            updated[idx].quantity = Math.max(1, Number(e.target.value));
                            setInvoiceLines(updated);
                          }}
                          className="w-full text-xs p-1.5 rounded border border-slate-300 text-right"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const updated = [...invoiceLines];
                            updated[idx].unitPrice = Math.max(0, Number(e.target.value));
                            setInvoiceLines(updated);
                          }}
                          className="w-full text-xs p-1.5 rounded border border-slate-300 text-right font-semibold"
                        />
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {formatINR(calc?.taxableAmount || 0)}
                      </td>
                      <td className="p-2.5 text-right text-slate-600 text-[11px]">
                        {formatINR((calc?.cgst || 0) + (calc?.sgst || 0) + (calc?.igst || 0))}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatINR(calc?.lineTotal || 0)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={invoiceLines.length === 1}
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

        {/* Totals Summary */}
        <div className="flex justify-end pt-2">
          <div className="w-72 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Total:</span>
              <span className="font-semibold text-slate-800">{formatINR(taxableTotal)}</span>
            </div>
            <div className="flex justify-between text-blue-700">
              <span>GST Total:</span>
              <span>{formatINR(cgstTotal + sgstTotal + igstTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
              <span>Invoice Total:</span>
              <span className="text-blue-700">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
            <span>Process &amp; Run 3-Way Match</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
