import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { formatINR, round2 } from '../../utils/math';
import { Modal } from '../common/Modal';
import { IndianRupee } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  isVendorPayment: boolean; // true = Paying Vendor, false = Receiving from Customer
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  isVendorPayment,
}) => {
  const {
    vendorInvoices,
    customerInvoices,
    recordVendorPayment,
    recordCustomerReceipt,
    notify,
  } = useERP();

  const vendorInv = vendorInvoices.find((v) => v.id === invoiceId);
  const custInv = customerInvoices.find((c) => c.id === invoiceId);

  const dueAmount = isVendorPayment
    ? vendorInv
      ? round2(vendorInv.grandTotal - vendorInv.amountPaid)
      : 0
    : custInv
    ? round2(custInv.grandTotal - custInv.amountReceived)
    : 0;

  const [paymentAmount, setPaymentAmount] = useState<number>(dueAmount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'UPI'>('NEFT');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('HDFC Bank Corporate - 0029');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentAmount <= 0) {
      notify('error', 'Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }

    if (!referenceNumber.trim()) {
      notify('error', 'Reference Required', 'Please enter bank UTR / Cheque reference number.');
      return;
    }

    if (isVendorPayment && vendorInv) {
      const res = recordVendorPayment({
        paymentDate,
        invoiceId: vendorInv.id,
        invoiceNumber: vendorInv.invoiceNumber,
        partyId: vendorInv.vendorId,
        partyName: vendorInv.vendorName,
        amount: paymentAmount,
        paymentMode,
        referenceNumber: referenceNumber.trim(),
        bankAccount,
        notes,
        recordedBy: 'Accounts / Finance',
      });
      if (res.success) onClose();
    } else if (!isVendorPayment && custInv) {
      const res = recordCustomerReceipt(
        custInv.id,
        paymentAmount,
        paymentMode,
        referenceNumber.trim(),
        notes
      );
      if (res.success) onClose();
    }
  };

  const title = isVendorPayment
    ? `Disburse Supplier Payment: ${vendorInv?.vendorName}`
    : `Record Customer Collection: ${custInv?.customerName}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`Invoice: ${isVendorPayment ? vendorInv?.invoiceNumber : custInv?.invoiceNumber} • Outstanding Due: ${formatINR(dueAmount)}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Invoice Total:</span>
            <span className="font-semibold text-slate-900">
              {formatINR(isVendorPayment ? vendorInv?.grandTotal || 0 : custInv?.grandTotal || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-500">Already Cleared:</span>
            <span className="font-semibold text-emerald-700">
              {formatINR(isVendorPayment ? vendorInv?.amountPaid || 0 : custInv?.amountReceived || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 font-bold text-sm">
            <span>Outstanding Balance:</span>
            <span className="text-blue-700">{formatINR(dueAmount)}</span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
          <input
            type="number"
            min="1"
            max={dueAmount}
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction Mode *</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="NEFT">NEFT (Electronic)</option>
              <option value="RTGS">RTGS (High Value)</option>
              <option value="IMPS">IMPS (Immediate)</option>
              <option value="UPI">UPI / Digital</option>
              <option value="Cheque">Bank Cheque</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Bank Reference / UTR Number *
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. UTR-HDFC-991820491 or Cheque #881201"
            className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Bank Account</label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cleared via RTGS. Advised vendor accounts."
            className="w-full text-xs p-2 rounded-lg border border-slate-300"
          />
        </div>

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
            <IndianRupee className="w-4 h-4" />
            <span>Confirm &amp; Post Payment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
