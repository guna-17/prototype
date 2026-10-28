/**
 * GST & Input Tax Credit (ITC) Reconciliation Engine
 * Compliant with Indian GST rules (GSTR-2B auto-drafted statement matching against purchase register)
 */

import { GSTR2BRecord, ITCEligibilityStatus, VendorInvoice } from '../types/erp';
import { round2 } from './math';

export interface ITCReconciliationItem {
  id: string;
  invoiceId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorGstin: string;
  booksTaxable: number;
  booksTotalTax: number;
  gstr2bTaxable: number;
  gstr2bTotalTax: number;
  taxDifference: number;
  eligibilityStatus: ITCEligibilityStatus;
  reconciliationNotes: string;
  gstr2bFilingDate?: string;
  has2BRecord: boolean;
  hasBooksRecord: boolean;
}

export interface GstReturnSummary {
  outputTaxable: number;
  outputCgst: number;
  outputSgst: number;
  outputIgst: number;
  outputTotalTax: number;

  eligibleItcCgst: number;
  eligibleItcSgst: number;
  eligibleItcIgst: number;
  eligibleItcTotal: number;

  blockedItcTotal: number;
  mismatchedItcTotal: number;

  netPayableCgst: number;
  netPayableSgst: number;
  netPayableIgst: number;
  netPayableTotal: number;
}

/**
 * Reconciles purchase invoices in ERP books with supplier-filed GSTR-2B records.
 */
export function reconcileBooksWithGSTR2B(
  purchaseInvoices: VendorInvoice[],
  gstr2bRecords: GSTR2BRecord[]
): ITCReconciliationItem[] {
  const reconItems: ITCReconciliationItem[] = [];
  const matched2bIds = new Set<string>();

  // Loop through purchase invoices in ERP
  for (const inv of purchaseInvoices) {
    const booksTotalTax = round2(inv.cgstTotal + inv.sgstTotal + inv.igstTotal);
    
    // Attempt match by GSTIN and Invoice Number (clean case-insensitive)
    const matched2b = gstr2bRecords.find(
      (r) =>
        r.supplierGstin.trim().toUpperCase() === inv.vendorGstin.trim().toUpperCase() &&
        r.invoiceNumber.trim().toUpperCase() === inv.invoiceNumber.trim().toUpperCase()
    );

    if (matched2b) {
      matched2bIds.add(matched2b.id);
      const gstr2bTotalTax = round2(matched2b.cgst + matched2b.sgst + matched2b.igst);
      const taxDiff = round2(booksTotalTax - gstr2bTotalTax);

      let status: ITCEligibilityStatus = 'Eligible';
      let notes = 'Matched with supplier GSTR-1 in GSTR-2B. Full ITC eligible.';

      if (Math.abs(taxDiff) > 1.0) {
        status = 'Mismatch';
        notes = `Tax amount difference of ₹${Math.abs(taxDiff)}. Books: ₹${booksTotalTax}, GSTR-2B: ₹${gstr2bTotalTax}. Contact vendor to amend GSTR-1.`;
      } else if (!matched2b.itcAvailable) {
        status = 'Ineligible Section 17(5)';
        notes = 'Flagged as ineligible supply under GST Act Section 17(5).';
      }

      reconItems.push({
        id: `recon-${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        vendorName: inv.vendorName,
        vendorGstin: inv.vendorGstin,
        booksTaxable: inv.taxableTotal,
        booksTotalTax,
        gstr2bTaxable: matched2b.taxableValue,
        gstr2bTotalTax,
        taxDifference: taxDiff,
        eligibilityStatus: status,
        reconciliationNotes: notes,
        gstr2bFilingDate: matched2b.filingDate,
        has2BRecord: true,
        hasBooksRecord: true,
      });
    } else {
      // Missing in GSTR-2B
      reconItems.push({
        id: `recon-${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        vendorName: inv.vendorName,
        vendorGstin: inv.vendorGstin,
        booksTaxable: inv.taxableTotal,
        booksTotalTax,
        gstr2bTaxable: 0,
        gstr2bTotalTax: 0,
        taxDifference: booksTotalTax,
        eligibilityStatus: 'Pending 2B',
        reconciliationNotes: 'Invoice entered in ERP books but NOT reflected in GSTR-2B. Supplier has not uploaded or filed GSTR-1 yet. ITC currently blocked under Rule 36(4).',
        has2BRecord: false,
        hasBooksRecord: true,
      });
    }
  }

  // Loop through remaining GSTR-2B records not matched in ERP books
  for (const record of gstr2bRecords) {
    if (!matched2bIds.has(record.id)) {
      const gstr2bTotalTax = round2(record.cgst + record.sgst + record.igst);
      reconItems.push({
        id: `recon-unmatched-2b-${record.id}`,
        invoiceNumber: record.invoiceNumber,
        invoiceDate: record.invoiceDate,
        vendorName: record.supplierName,
        vendorGstin: record.supplierGstin,
        booksTaxable: 0,
        booksTotalTax: 0,
        gstr2bTaxable: record.taxableValue,
        gstr2bTotalTax,
        taxDifference: -gstr2bTotalTax,
        eligibilityStatus: 'Needs Review',
        reconciliationNotes: 'Invoice appears in GSTR-2B but no corresponding purchase bill exists in ERP books. Possible unrecorded bill or mistaken GSTIN input by vendor.',
        gstr2bFilingDate: record.filingDate,
        has2BRecord: true,
        hasBooksRecord: false,
      });
    }
  }

  return reconItems;
}
