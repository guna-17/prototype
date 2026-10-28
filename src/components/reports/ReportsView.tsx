import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { formatINR } from '../../utils/math';
import { getItemStockSummary } from '../../utils/inventoryEngine';
import { reconcileBooksWithGSTR2B } from '../../utils/itcEngine';
import { Badge } from '../common/Badge';
import { FileBarChart2, Download, Printer, Filter, Calendar } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    items,
    vendors,
    customers,
    godowns,
    purchaseOrders,
    goodsReceiptNotes,
    stockLedger,
    vendorInvoices,
    customerInvoices,
    gstr2bRecords,
    auditLogs,
    activeGodownFilter,
  } = useERP();

  const [selectedReport, setSelectedReport] = useState<number>(1);
  const [reportGodown, setReportGodown] = useState<string>('ALL');

  const REPORTS_LIST = [
    { id: 1, title: '1. Current Stock by Item', desc: 'Item-wise on-hand stock and valuations' },
    { id: 2, title: '2. Stock by Godown', desc: 'Peenya vs Electronic City warehouse breakdown' },
    { id: 3, title: '3. Stock Movement Ledger', desc: 'Opening, GRN receipts, issues & transfers' },
    { id: 4, title: '4. Low-Stock & Reorder Alerts', desc: 'Deficit against threshold & replenishment order' },
    { id: 5, title: '5. Open Purchase Orders', desc: 'Pending orders with receipt progress' },
    { id: 6, title: '6. Goods Receipts (GRN)', desc: 'Accepted vs rejected warehouse inward inspection' },
    { id: 7, title: '7. Three-Way Matching Exceptions', desc: 'Price, quantity, and tax discrepancies' },
    { id: 8, title: '8. GST Tax Discrepancies', desc: 'Intra-state CGST/SGST and Inter-state IGST' },
    { id: 9, title: '9. ITC Reconciliation Exceptions', desc: 'GSTR-2B vs Books Rule 36(4) blocked credits' },
    { id: 10, title: '10. Supplier Payables Aging', desc: 'Approved bills vs Quarantined disputed invoices' },
    { id: 11, title: '11. Customer Receivables Aging', desc: 'Outstanding balances and overdue aging' },
    { id: 12, title: '12. Audit History & Security Log', desc: 'Immutable changes, role switches & overrides' },
    { id: 13, title: '13. Monthly Transaction Summary', desc: 'Consolidated financial & operational movements' },
  ];

  const exportCurrentReportCSV = () => {
    let rows: string[][] = [];
    let filename = `SmartGST_Report_${selectedReport}.csv`;

    if (selectedReport === 1) {
      filename = 'SmartGST_Current_Stock_by_Item.csv';
      rows = [
        ['SKU', 'Name', 'Category', 'HSN', 'Godown A Stock', 'Godown B Stock', 'Total Stock', 'UOM', 'Unit Cost', 'Valuation'],
        ...items.map((i) => {
          const s = getItemStockSummary(i, stockLedger);
          return [
            i.sku,
            i.name,
            i.category,
            i.hsnCode,
            String(s.godownAStock),
            String(s.godownBStock),
            String(s.totalStock),
            i.uom,
            String(i.standardCost),
            String(s.totalValuation),
          ];
        }),
      ];
    } else if (selectedReport === 7) {
      filename = 'SmartGST_Three_Way_Matching_Exceptions.csv';
      rows = [
        ['InvoiceNo', 'Vendor', 'PO_Ref', 'Total', 'MatchStatus', 'DiscrepancyField', 'Expected', 'Actual', 'Variance'],
        ...vendorInvoices.flatMap((inv) =>
          inv.discrepancies.map((d) => [
            inv.invoiceNumber,
            inv.vendorName,
            inv.poNumber || 'None',
            String(inv.grandTotal),
            inv.matchStatus,
            d.field,
            String(d.expected),
            String(d.actual),
            String(d.difference),
          ])
        ),
      ];
    } else if (selectedReport === 9) {
      filename = 'SmartGST_ITC_Reconciliation_Exceptions.csv';
      const itc = reconcileBooksWithGSTR2B(vendorInvoices, gstr2bRecords);
      rows = [
        ['InvoiceNo', 'Vendor', 'GSTIN', 'BooksTax', 'GSTR2BTax', 'TaxDiff', 'Status', 'Notes'],
        ...itc.map((r) => [
          r.invoiceNumber,
          r.vendorName,
          r.vendorGstin,
          String(r.booksTotalTax),
          String(r.gstr2bTotalTax),
          String(r.taxDifference),
          r.eligibilityStatus,
          r.reconciliationNotes,
        ]),
      ];
    } else if (selectedReport === 10) {
      filename = 'SmartGST_Supplier_Payables_Aging.csv';
      rows = [
        ['InvoiceNo', 'Vendor', 'Date', 'DueDate', 'GrandTotal', 'Paid', 'Outstanding', 'Status'],
        ...vendorInvoices.map((inv) => [
          inv.invoiceNumber,
          inv.vendorName,
          inv.invoiceDate,
          inv.dueDate,
          String(inv.grandTotal),
          String(inv.amountPaid),
          String(inv.grandTotal - inv.amountPaid),
          inv.approvalStatus,
        ]),
      ];
    } else {
      filename = `SmartGST_Report_${selectedReport}.csv`;
      rows = [
        ['Entity', 'Reference', 'Date', 'Status', 'Amount'],
        ...purchaseOrders.map((p) => ['Purchase Order', p.poNumber, p.orderDate, p.status, String(p.grandTotal)]),
      ];
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">ERP Statutory &amp; Management Reports Hub</h2>
          <p className="text-xs text-slate-500">
            Exportable audit-ready statements across procurement, inventory valuation, 3-way matching, and GST
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCurrentReportCSV}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Reports Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: 13 Reports Directory */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Select Statutory / Management Report
          </div>
          {REPORTS_LIST.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`w-full text-left p-2.5 rounded-lg text-xs transition ${
                selectedReport === r.id
                  ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="font-semibold">{r.title}</div>
              <div className="text-[10px] text-slate-500 truncate">{r.desc}</div>
            </button>
          ))}
        </div>

        {/* Right: Selected Report Preview */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {REPORTS_LIST.find((r) => r.id === selectedReport)?.title}
              </h3>
              <p className="text-xs text-slate-500">
                {REPORTS_LIST.find((r) => r.id === selectedReport)?.desc}
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Generated for: <strong className="text-slate-700">Karnataka Unit (29)</strong>
            </div>
          </div>

          {/* Render Table Depending on Selected Report */}
          {selectedReport === 1 && (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Godown A</th>
                    <th className="p-2.5 text-right">Godown B</th>
                    <th className="p-2.5 text-right font-bold">Total Stock</th>
                    <th className="p-2.5 text-right">Unit Rate</th>
                    <th className="p-2.5 text-right font-bold">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((i) => {
                    const s = getItemStockSummary(i, stockLedger);
                    return (
                      <tr key={i.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-900">{i.sku}</td>
                        <td className="p-2.5 text-slate-700">{i.name}</td>
                        <td className="p-2.5 text-slate-500">{i.category}</td>
                        <td className="p-2.5 text-right text-slate-700">
                          {s.godownAStock} {i.uom}
                        </td>
                        <td className="p-2.5 text-right text-slate-700">
                          {s.godownBStock} {i.uom}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {s.totalStock} {i.uom}
                        </td>
                        <td className="p-2.5 text-right font-medium text-slate-700">
                          ₹{i.standardCost}
                        </td>
                        <td className="p-2.5 text-right font-bold text-blue-700">
                          {formatINR(s.totalValuation)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 7 && (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Vendor</th>
                    <th className="p-2.5">Mismatch Type</th>
                    <th className="p-2.5">Field</th>
                    <th className="p-2.5">Expected</th>
                    <th className="p-2.5">Actual</th>
                    <th className="p-2.5 text-rose-700 font-bold">Difference</th>
                    <th className="p-2.5">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorInvoices.flatMap((inv) =>
                    inv.discrepancies.map((d, idx) => (
                      <tr key={`${inv.id}-${idx}`} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-blue-700">{inv.invoiceNumber}</td>
                        <td className="p-2.5 font-medium text-slate-800">{inv.vendorName}</td>
                        <td className="p-2.5">
                          <Badge variant="danger">{inv.matchStatus}</Badge>
                        </td>
                        <td className="p-2.5 font-bold text-slate-700">{d.field}</td>
                        <td className="p-2.5 text-slate-600">{d.expected}</td>
                        <td className="p-2.5 text-slate-900 font-medium">{d.actual}</td>
                        <td className="p-2.5 text-rose-700 font-bold">{d.difference}</td>
                        <td className="p-2.5 text-slate-700">{d.recommendedAction}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 9 && (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Vendor &amp; GSTIN</th>
                    <th className="p-2.5 text-right">Books Tax</th>
                    <th className="p-2.5 text-right">GSTR-2B Tax</th>
                    <th className="p-2.5 text-right text-rose-700">Variance</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Rule 36(4) Finding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconcileBooksWithGSTR2B(vendorInvoices, gstr2bRecords).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-mono font-bold text-blue-700">{r.invoiceNumber}</td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{r.vendorName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.vendorGstin}</div>
                      </td>
                      <td className="p-2.5 text-right font-medium">{formatINR(r.booksTotalTax)}</td>
                      <td className="p-2.5 text-right font-medium">
                        {r.has2BRecord ? formatINR(r.gstr2bTotalTax) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-rose-700">
                        {formatINR(r.taxDifference)}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          variant={
                            r.eligibilityStatus === 'Eligible'
                              ? 'success'
                              : r.eligibilityStatus === 'Pending 2B'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {r.eligibilityStatus}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-600 max-w-sm">{r.reconciliationNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 10 && (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Vendor</th>
                    <th className="p-2.5">Invoice Date</th>
                    <th className="p-2.5">Due Date</th>
                    <th className="p-2.5 text-right">Invoice Total</th>
                    <th className="p-2.5 text-right">Paid</th>
                    <th className="p-2.5 text-right font-bold">Outstanding</th>
                    <th className="p-2.5 text-center">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">{inv.vendorName}</td>
                      <td className="p-2.5 text-slate-600">{inv.invoiceDate}</td>
                      <td className="p-2.5 text-slate-600 font-medium">{inv.dueDate}</td>
                      <td className="p-2.5 text-right font-medium">{formatINR(inv.grandTotal)}</td>
                      <td className="p-2.5 text-right text-emerald-700 font-medium">
                        {formatINR(inv.amountPaid)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-blue-700">
                        {formatINR(inv.grandTotal - inv.amountPaid)}
                      </td>
                      <td className="p-2.5 text-center">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fallback for remaining reports: clean generic data table */}
          {selectedReport !== 1 && selectedReport !== 7 && selectedReport !== 9 && selectedReport !== 10 && (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Document No</th>
                    <th className="p-2.5">Entity / Reference</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Value (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-mono font-bold text-blue-700">{p.poNumber}</td>
                      <td className="p-2.5 text-slate-800 font-medium">{p.vendorName}</td>
                      <td className="p-2.5 text-slate-600">{p.orderDate}</td>
                      <td className="p-2.5 text-center">
                        <Badge variant="info">{p.status}</Badge>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatINR(p.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
