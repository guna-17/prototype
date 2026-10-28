import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { GoodsReceiptNote } from '../../types/erp';
import { Badge } from '../common/Badge';
import { GoodsReceiptModal } from './GoodsReceiptModal';
import { Modal } from '../common/Modal';
import { Plus, PackageCheck, Printer, AlertTriangle, ShieldCheck } from 'lucide-react';

export const GoodsReceiptView: React.FC = () => {
  const { goodsReceiptNotes, activeGodownFilter } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceiptNote | null>(null);

  const filteredGRNs = goodsReceiptNotes.filter((grn) => {
    if (activeGodownFilter !== 'ALL' && grn.destinationGodownId !== activeGodownFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Goods Receipt Notes (GRN)</h2>
          <p className="text-xs text-slate-500">
            Physical material inward inspection, acceptance records, and inventory postings
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Goods Receipt (GRN)</span>
        </button>
      </div>

      {/* GRN List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">GRN Number</th>
                <th className="p-3.5">PO Reference</th>
                <th className="p-3.5">Vendor</th>
                <th className="p-3.5">Challan / LR No</th>
                <th className="p-3.5">Receipt Date</th>
                <th className="p-3.5">Destination Godown</th>
                <th className="p-3.5 text-center">Items Accepted</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGRNs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No Goods Receipt Notes recorded in this godown yet.
                  </td>
                </tr>
              ) : (
                filteredGRNs.map((grn) => {
                  const totalAccepted = grn.lines.reduce((s, l) => s + l.acceptedQty, 0);
                  const totalRejected = grn.lines.reduce((s, l) => s + l.rejectedQty, 0);

                  return (
                    <tr
                      key={grn.id}
                      onClick={() => setSelectedGRN(grn)}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                    >
                      <td className="p-3.5 font-bold text-blue-600">{grn.grnNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{grn.poNumber}</td>
                      <td className="p-3.5 text-slate-900 font-medium">{grn.vendorName}</td>
                      <td className="p-3.5 text-slate-600 font-mono">{grn.vendorChallanNo}</td>
                      <td className="p-3.5 text-slate-600">{grn.receiptDate}</td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {grn.destinationGodownId === 'GODOWN_A'
                          ? 'Godown A (Peenya)'
                          : 'Godown B (Electronic City)'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-emerald-700">{totalAccepted}</span>
                        {totalRejected > 0 && (
                          <span className="text-rose-600 text-[11px] ml-1.5 font-semibold">
                            ({totalRejected} rej)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant="success">Posted to Ledger</Badge>
                      </td>
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedGRN(grn)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View &rarr;
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

      {/* GRN Detail Modal */}
      {selectedGRN && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedGRN(null)}
          title={`Goods Receipt Note: ${selectedGRN.grnNumber}`}
          subtitle={`PO: ${selectedGRN.poNumber} | Vendor: ${selectedGRN.vendorName}`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            {/* Meta bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">Vendor Challan</span>
                <span className="font-mono font-medium text-slate-800">
                  {selectedGRN.vendorChallanNo} ({selectedGRN.vendorChallanDate})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Inward Warehouse</span>
                <span className="font-medium text-slate-800">
                  {selectedGRN.destinationGodownId === 'GODOWN_A'
                    ? 'Godown A (Peenya)'
                    : 'Godown B (Electronic City)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Receipt Date</span>
                <span className="font-medium text-slate-800">{selectedGRN.receiptDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Received By</span>
                <span className="font-medium text-slate-800">{selectedGRN.receivedBy}</span>
              </div>
            </div>

            {/* Inspection details table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Inward Lines & Quality Assessment
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">SKU & Item Name</th>
                      <th className="p-2.5 text-right">Ordered</th>
                      <th className="p-2.5 text-right">Physical Rcvd</th>
                      <th className="p-2.5 text-right text-emerald-700">Accepted Qty</th>
                      <th className="p-2.5 text-right text-rose-700">Rejected Qty</th>
                      <th className="p-2.5">Rejection Reason / QA Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedGRN.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{l.sku}</div>
                          <div className="text-[11px] text-slate-500">{l.itemName}</div>
                        </td>
                        <td className="p-2.5 text-right text-slate-600 font-medium">
                          {l.orderedQty} {l.uom}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-slate-800">
                          {l.currentReceivedQty} {l.uom}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          {l.acceptedQty} {l.uom}
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-700">
                          {l.rejectedQty} {l.uom}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {l.rejectionReason || (
                            <span className="text-slate-400 italic">Nil / Passed inspection</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inspection Notes */}
            {selectedGRN.inspectionNotes && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900">
                <span className="font-semibold block mb-0.5 text-[11px]">
                  Warehouse Inspector Notes:
                </span>
                <p className="text-xs">{selectedGRN.inspectionNotes}</p>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-400">
                Posted to ledger: {new Date(selectedGRN.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print GRN Inspection Report</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <GoodsReceiptModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};
