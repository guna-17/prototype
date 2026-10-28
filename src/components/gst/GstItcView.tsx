import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { reconcileBooksWithGSTR2B } from '../../utils/itcEngine';
import { formatINR, round2 } from '../../utils/math';
import { Badge } from '../common/Badge';
import {
  Receipt,
  FileCheck2,
  AlertTriangle,
  Scale,
  ShieldAlert,
  ArrowUpRight,
  Download,
  Info,
} from 'lucide-react';

export const GstItcView: React.FC = () => {
  const { vendorInvoices, customerInvoices, gstr2bRecords } = useERP();
  const [activeTab, setActiveTab] = useState<'itc' | 'gstr3b' | 'eway'>('itc');
  const [itcFilter, setItcFilter] = useState<string>('ALL');

  // Reconcile purchase invoices against GSTR-2B records
  const reconItems = reconcileBooksWithGSTR2B(vendorInvoices, gstr2bRecords);

  const filteredRecon = reconItems.filter((item) => {
    if (itcFilter === 'ALL') return true;
    if (itcFilter === 'EXCEPTIONS') return item.eligibilityStatus !== 'Eligible';
    return item.eligibilityStatus === itcFilter;
  });

  // Calculate GSTR-3B Monthly Tax Computation
  let outputTaxable = 0;
  let outputCgst = 0;
  let outputSgst = 0;
  let outputIgst = 0;

  customerInvoices.forEach((cinv) => {
    outputTaxable += cinv.taxableTotal;
    outputCgst += cinv.cgstTotal;
    outputSgst += cinv.sgstTotal;
    outputIgst += cinv.igstTotal;
  });

  let eligibleCgst = 0;
  let eligibleSgst = 0;
  let eligibleIgst = 0;
  let blockedItcTotal = 0;

  reconItems.forEach((r) => {
    if (r.eligibilityStatus === 'Eligible' && r.invoiceId) {
      const inv = vendorInvoices.find((i) => i.id === r.invoiceId);
      if (inv) {
        eligibleCgst += inv.cgstTotal;
        eligibleSgst += inv.sgstTotal;
        eligibleIgst += inv.igstTotal;
      }
    } else {
      blockedItcTotal += r.booksTotalTax;
    }
  });

  const outputTotalTax = round2(outputCgst + outputSgst + outputIgst);
  const eligibleItcTotal = round2(eligibleCgst + eligibleSgst + eligibleIgst);

  const netCgstPayable = Math.max(0, round2(outputCgst - eligibleCgst));
  const netSgstPayable = Math.max(0, round2(outputSgst - eligibleSgst));
  const netIgstPayable = Math.max(0, round2(outputIgst - eligibleIgst));
  const netTotalPayable = round2(netCgstPayable + netSgstPayable + netIgstPayable);

  // E-Way Bill Simulation state
  const [ewayInvoiceAmount, setEwayInvoiceAmount] = useState('68500');
  const [ewayDestinationState, setEwayDestinationState] = useState('33'); // Tamil Nadu
  const [ewayDistanceKm, setEwayDistanceKm] = useState('350');
  const [ewayVehicleNo, setEwayVehicleNo] = useState('KA-04-ME-9012');

  const isEwayMandatory =
    Number(ewayInvoiceAmount) >= 50000 ||
    (ewayDestinationState !== '29' && Number(ewayInvoiceAmount) >= 50000);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              GST Calculation &amp; ITC Reconciliation Hub
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Rule 36(4) Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Karnataka State GST (Code 29) • GSTR-2B inward matching, ITC blocking, and 3B simulation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const csvContent =
                'data:text/csv;charset=utf-8,' +
                'InvoiceNo,Vendor,GSTIN,BooksTax,GSTR2BTax,TaxDiff,Status,Notes\n' +
                reconItems
                  .map(
                    (r) =>
                      `"${r.invoiceNumber}","${r.vendorName}","${r.vendorGstin}",${r.booksTotalTax},${r.gstr2bTotalTax},${r.taxDifference},"${r.eligibilityStatus}","${r.reconciliationNotes}"`
                  )
                  .join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', 'GSTR-2B-ITC-Reconciliation.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export ITC Recon CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('itc')}
          className={`pb-2.5 border-b-2 transition ${
            activeTab === 'itc'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. GSTR-2B vs Books ITC Reconciliation ({reconItems.length} Records)
        </button>
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`pb-2.5 border-b-2 transition ${
            activeTab === 'gstr3b'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. GSTR-3B Cash Tax Computation Simulator
        </button>
        <button
          onClick={() => setActiveTab('eway')}
          className={`pb-2.5 border-b-2 transition ${
            activeTab === 'eway'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. E-Way Bill &amp; E-Invoice Statutory Rules
        </button>
      </div>

      {/* Tab 1: GSTR-2B ITC Reconciliation */}
      {activeTab === 'itc' && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'EXCEPTIONS', label: 'All Exceptions (Blocked / Mismatched)' },
              { id: 'Eligible', label: 'Eligible ITC' },
              { id: 'Mismatch', label: 'Tax Amount Mismatches' },
              { id: 'Pending 2B', label: 'Blocked: Pending in 2B' },
              { id: 'Needs Review', label: 'In 2B But Not In Books' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setItcFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  itcFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Reconciliation Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Vendor Name &amp; GSTIN</th>
                    <th className="p-3.5 text-right">Books Tax</th>
                    <th className="p-3.5 text-right">GSTR-2B Tax</th>
                    <th className="p-3.5 text-right text-rose-700">Variance</th>
                    <th className="p-3.5 text-center">ITC Eligibility Status</th>
                    <th className="p-3.5">Reconciliation Finding &amp; Statutory Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecon.map((r) => {
                    let badgeVariant: 'success' | 'warning' | 'danger' | 'info' = 'success';
                    if (r.eligibilityStatus === 'Mismatch') badgeVariant = 'warning';
                    else if (r.eligibilityStatus === 'Pending 2B') badgeVariant = 'danger';
                    else if (r.eligibilityStatus === 'Needs Review') badgeVariant = 'info';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 font-bold text-blue-700 font-mono">
                          {r.invoiceNumber}
                          <div className="text-[10px] text-slate-400 font-normal">
                            {r.invoiceDate}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{r.vendorName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{r.vendorGstin}</div>
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-800">
                          {formatINR(r.booksTotalTax)}
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-800">
                          {r.has2BRecord ? formatINR(r.gstr2bTotalTax) : '-'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-rose-700">
                          {r.taxDifference !== 0 ? formatINR(r.taxDifference) : '₹ 0.00'}
                        </td>
                        <td className="p-3.5 text-center">
                          <Badge variant={badgeVariant}>{r.eligibilityStatus}</Badge>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-md">
                          <p className="leading-relaxed">{r.reconciliationNotes}</p>
                          {r.gstr2bFilingDate && (
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Vendor filed GSTR-1 on: {r.gstr2bFilingDate}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: GSTR-3B Tax Return Computation */}
      {activeTab === 'gstr3b' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Outward Output Tax */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">
                1. Total Outward Tax (Customer Sales)
              </span>
              <div className="text-xl font-bold text-slate-900 mt-2">
                {formatINR(outputTotalTax)}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span className="font-medium">{formatINR(outputCgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span className="font-medium">{formatINR(outputSgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST:</span>
                  <span className="font-medium">{formatINR(outputIgst)}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Eligible Inward ITC */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
              <span className="text-xs font-semibold text-emerald-800">
                2. Eligible Input Tax Credit (ITC)
              </span>
              <div className="text-xl font-bold text-emerald-700 mt-2">
                {formatINR(eligibleItcTotal)}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600 border-t border-emerald-100 pt-2">
                <div className="flex justify-between">
                  <span>Eligible CGST:</span>
                  <span className="font-medium text-emerald-800">{formatINR(eligibleCgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Eligible SGST:</span>
                  <span className="font-medium text-emerald-800">{formatINR(eligibleSgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Eligible IGST:</span>
                  <span className="font-medium text-emerald-800">{formatINR(eligibleIgst)}</span>
                </div>
              </div>
            </div>

            {/* Box 3: Net Cash Payable */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
              <span className="text-xs font-semibold text-blue-800">
                3. Net GST Cash Liability to Govt
              </span>
              <div className="text-xl font-bold text-blue-700 mt-2">
                {formatINR(netTotalPayable)}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600 border-t border-blue-100 pt-2">
                <div className="flex justify-between">
                  <span>Net CGST to Pay:</span>
                  <span className="font-medium">{formatINR(netCgstPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net SGST to Pay:</span>
                  <span className="font-medium">{formatINR(netSgstPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net IGST to Pay:</span>
                  <span className="font-medium">{formatINR(netIgstPayable)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Statutory Notes on GST Reconciliation
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Under GST Rule 36(4), ITC can only be availed in GSTR-3B if the supplier has uploaded
              the invoice in their GSTR-1 and it appears in the auto-drafted GSTR-2B statement.
              Invoices marked as "Pending 2B" have been strictly excluded from this computation to
              protect the company from interest and penalties.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: E-Way Bill Simulation */}
      {activeTab === 'eway' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Karnataka E-Way Bill &amp; E-Invoice Validation Engine
            </h3>
            <p className="text-xs text-slate-500">
              Test compliance rules for consignments moving out of Peenya / Electronic City godowns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Consignment Value (₹)
              </label>
              <input
                type="number"
                value={ewayInvoiceAmount}
                onChange={(e) => setEwayInvoiceAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination State</label>
              <select
                value={ewayDestinationState}
                onChange={(e) => setEwayDestinationState(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="29">Karnataka (Intra-State)</option>
                <option value="33">Tamil Nadu (Inter-State)</option>
                <option value="27">Maharashtra (Inter-State)</option>
                <option value="36">Telangana (Inter-State)</option>
                <option value="32">Kerala (Inter-State)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transit Distance</label>
              <input
                type="number"
                value={ewayDistanceKm}
                onChange={(e) => setEwayDistanceKm(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Transport Vehicle Number
              </label>
              <input
                type="text"
                value={ewayVehicleNo}
                onChange={(e) => setEwayVehicleNo(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white uppercase font-mono"
              />
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              isEwayMandatory
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <Info className="w-5 h-5 shrink-0" />
            <div>
              <h5 className="font-bold">
                {isEwayMandatory
                  ? 'Mandatory E-Way Bill Generation Required Prior to Gate Dispatch'
                  : 'Exempted from Mandatory E-Way Bill (Under ₹50,000 threshold)'}
              </h5>
              <p className="mt-1 leading-relaxed">
                {isEwayMandatory
                  ? `Consignment value of ${formatINR(
                      Number(ewayInvoiceAmount)
                    )} exceeds statutory threshold of ₹50,000. 12-digit E-Way Bill must accompany transporter ${ewayVehicleNo}. Validity: ${Math.ceil(
                      Number(ewayDistanceKm) / 200
                    )} day(s) based on ${ewayDistanceKm} km distance.`
                  : 'Consignment value is within statutory threshold. Standard delivery challan is sufficient.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
