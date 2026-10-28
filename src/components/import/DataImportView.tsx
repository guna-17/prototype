import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Download,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';

export const DataImportView: React.FC = () => {
  const { importDataset, resetToSeedData, notify } = useERP();

  const [importType, setImportType] = useState<'ITEMS' | 'VENDORS'>('ITEMS');
  const [csvText, setCsvText] = useState('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validationReport, setValidationReport] = useState<{
    total: number;
    valid: number;
    invalid: number;
    errors: string[];
  } | null>(null);

  const SAMPLE_ITEMS_CSV = `SKU,Name,Category,HSN,TaxRate,UOM,ReorderLevel,StandardCost
EL-TERMINAL-BLOCK-10,10-Way Brass Terminal Block Strip,Electrical Components,8536,18,PCS,150,42.50
EL-CAPACITOR-100UF,100uF 450V Electrolytic Motor Start Capacitor,Electrical Components,8532,18,PCS,200,85.00
EL-SILICON-SHEET-1M,Thermal Conductive Silicon Insulation Pad 1x1m,Raw Material,3926,18,ROLLS,50,340.00`;

  const SAMPLE_VENDORS_CSV = `VendorCode,Name,GSTIN,State,PaymentTermsDays,Phone,Email
VND-088,Bangalore Alloy Stampings,29AAGCB9900H1Z2,Karnataka,30,+91 98450 77112,sales@blralloys.com
VND-089,Chennai Transformer Laminations,33AAFCK1122D1ZM,Tamil Nadu,45,+91 94440 22331,orders@chennailam.com`;

  const handleLoadSample = () => {
    if (importType === 'ITEMS') {
      setCsvText(SAMPLE_ITEMS_CSV);
    } else {
      setCsvText(SAMPLE_VENDORS_CSV);
    }
  };

  const handleParseAndValidate = () => {
    if (!csvText.trim()) {
      notify('error', 'Empty Input', 'Please paste CSV content or upload a data file.');
      return;
    }

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      notify('error', 'Insufficient Data', 'CSV must contain a header row and at least 1 record row.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map((v) => v.trim());

      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });

      // Validation
      let isValid = true;
      if (importType === 'ITEMS') {
        const sku = obj.sku || obj['item sku'] || obj['code'];
        const name = obj.name || obj['item name'] || obj['description'];
        if (!sku) {
          errors.push(`Row ${i}: Missing SKU`);
          isValid = false;
        }
        if (!name) {
          errors.push(`Row ${i}: Missing Item Name`);
          isValid = false;
        }
        obj.sku = sku;
        obj.name = name;
        obj.hsnCode = obj.hsn || obj.hsncode || '8536';
        obj.taxRate = Number(obj.taxrate || obj.tax || 18);
        obj.standardCost = Number(obj.standardcost || obj.cost || obj.rate || 50);
        obj.uom = obj.uom || 'PCS';
        obj.reorderLevel = Number(obj.reorderlevel || obj.reorder || 100);
      } else {
        const name = obj.name || obj['vendor name'] || obj['supplier'];
        const gstin = obj.gstin || obj['gst number'];
        if (!name) {
          errors.push(`Row ${i}: Missing Vendor Name`);
          isValid = false;
        }
        if (!gstin) {
          errors.push(`Row ${i}: Missing GSTIN`);
          isValid = false;
        } else if (gstin.length !== 15) {
          errors.push(`Row ${i}: Invalid GSTIN format "${gstin}" (must be 15 chars)`);
          isValid = false;
        }
        obj.name = name;
        obj.gstin = gstin;
        obj.state = obj.state || 'Karnataka';
        obj.vendorCode = obj.vendorcode || obj.code || `VND-${i}`;
      }

      obj._isValid = isValid;
      rows.push(obj);
    }

    const validCount = rows.filter((r) => r._isValid).length;
    setPreviewRows(rows);
    setValidationReport({
      total: rows.length,
      valid: validCount,
      invalid: rows.length - validCount,
      errors,
    });
  };

  const handleCommitImport = () => {
    if (!validationReport || validationReport.valid === 0) return;

    const validRows = previewRows.filter((r) => r._isValid);
    const result = importDataset(importType, validRows);

    notify(
      'success',
      'Data Imported',
      `Successfully ingested ${result.imported} records into ${importType} master.`
    );
    setCsvText('');
    setPreviewRows([]);
    setValidationReport(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Data Import &amp; Quality Assessment Center
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Pre-Commit Validation Engine
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Import CSV master catalogs and transactions with automated schema mapping and duplicate prevention
          </p>
        </div>

        <button
          onClick={() => {
            if (
              window.confirm(
                'Reload the official 6-month synthetic test dataset? This will recreate all realistic discrepancies for evaluation.'
              )
            ) {
              resetToSeedData();
            }
          }}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4 text-blue-400" />
          <span>Reload Hackathon 6-Month Dataset</span>
        </button>
      </div>

      {/* Dataset Scenario Guide Card */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2 text-blue-950">
        <h4 className="font-bold flex items-center gap-1.5">
          <Database className="w-4 h-4 text-blue-600" />
          Hackathon Challenge Dataset Details (ER-02)
        </h4>
        <p className="text-slate-700 leading-relaxed">
          The ERP includes a pre-seeded 6-month transaction dataset for an electrical manufacturing enterprise in
          Karnataka (120 employees, 80 suppliers, Godown A - Peenya, Godown B - Electronic City). The dataset includes
          realistic industrial anomalies:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-medium text-[11px] text-blue-900">
          <div className="p-2 bg-white/90 rounded border border-blue-200">
            &bull; <strong>Quantity Over-Billing:</strong> Vendor billed 520 units for PO-2026-01; warehouse QA rejected 20 broken relays.
          </div>
          <div className="p-2 bg-white/90 rounded border border-blue-200">
            &bull; <strong>Raw Material Price Surge:</strong> Copper wire billed at ₹850/kg vs agreed contract rate of ₹780/kg.
          </div>
          <div className="p-2 bg-white/90 rounded border border-blue-200">
            &bull; <strong>GSTR-2B Rule 36(4) Block:</strong> Supplier Kaveri Conductors filed late; ITC blocked until portal sync.
          </div>
        </div>
      </div>

      {/* Import Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Target Master:</span>
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setImportType('ITEMS');
                  setPreviewRows([]);
                  setValidationReport(null);
                }}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  importType === 'ITEMS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Item Master Catalog
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportType('VENDORS');
                  setPreviewRows([]);
                  setValidationReport(null);
                }}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  importType === 'VENDORS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vendor Master Directory
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Insert Sample CSV Format &rarr;
          </button>
        </div>

        {/* Text Area Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Paste Comma-Separated Values (CSV) with Headers
          </label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`e.g.\nSKU,Name,Category,HSN,TaxRate,UOM,ReorderLevel,StandardCost\nEL-COIL-400V,Heavy Shunt Trip Coil 400V AC,Electrical Components,8536,18,PCS,100,145.00`}
            rows={5}
            className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            System automatically sanitizes column names and validates mandatory fields before committing.
          </span>
          <button
            type="button"
            onClick={handleParseAndValidate}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Validate &amp; Preview Rows</span>
          </button>
        </div>
      </div>

      {/* Validation Summary Card */}
      {validationReport && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Pre-Commit Validation Report
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800">
                Total: {validationReport.total}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                Valid: {validationReport.valid}
              </span>
              {validationReport.invalid > 0 && (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800">
                  Errors: {validationReport.invalid}
                </span>
              )}
            </div>
          </div>

          {/* Error messages if any */}
          {validationReport.errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <span className="font-bold block">Validation Errors:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {validationReport.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Identifier / SKU</th>
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">{importType === 'ITEMS' ? 'HSN & Tax' : 'GSTIN'}</th>
                  <th className="p-2.5">{importType === 'ITEMS' ? 'Standard Cost' : 'State'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((r, idx) => (
                  <tr key={idx} className={r._isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                    <td className="p-2.5">
                      {r._isValid ? (
                        <span className="text-emerald-700 font-bold text-[11px]">Valid</span>
                      ) : (
                        <span className="text-rose-700 font-bold text-[11px]">Invalid</span>
                      )}
                    </td>
                    <td className="p-2.5 font-bold">{r.sku || r.vendorCode}</td>
                    <td className="p-2.5">{r.name}</td>
                    <td className="p-2.5 font-mono">
                      {importType === 'ITEMS' ? `${r.hsnCode} (${r.taxRate}%)` : r.gstin}
                    </td>
                    <td className="p-2.5">
                      {importType === 'ITEMS' ? `₹${r.standardCost}` : r.state}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setPreviewRows([]);
                setValidationReport(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
            >
              Discard Preview
            </button>
            <button
              type="button"
              disabled={validationReport.valid === 0}
              onClick={handleCommitImport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              Commit Valid Records ({validationReport.valid})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
