/**
 * Three-Way Invoice Matching Engine
 * Compares: Purchase Order (PO) <-> Goods Receipt Note (GRN) <-> Vendor Invoice
 */

import {
  DiscrepancyItem,
  GoodsReceiptNote,
  InvoiceMatchStatus,
  PurchaseOrder,
  VendorInvoice,
} from '../types/erp';
import { round2 } from './math';

export interface MatchingToleranceConfig {
  priceTolerancePercentage: number; // e.g. 0.5%
  quantityTolerancePercentage: number; // e.g. 0%
  taxRoundingToleranceAmount: number; // e.g. ₹2.00
  totalAmountTolerance: number; // e.g. ₹5.00
}

export const DEFAULT_TOLERANCE: MatchingToleranceConfig = {
  priceTolerancePercentage: 0.5,
  quantityTolerancePercentage: 0,
  taxRoundingToleranceAmount: 2.0,
  totalAmountTolerance: 5.0,
};

export interface MatchingResult {
  matchStatus: InvoiceMatchStatus;
  discrepancies: DiscrepancyItem[];
  matchedSummary: {
    poFound: boolean;
    grnFound: boolean;
    vendorMatched: boolean;
    qtyOrdered: number;
    qtyAccepted: number;
    qtyInvoiced: number;
    poTaxable: number;
    invoiceTaxable: number;
    poTaxTotal: number;
    invoiceTaxTotal: number;
    poGrandTotal: number;
    invoiceGrandTotal: number;
  };
}

/**
 * Performs comprehensive 3-way matching of a vendor invoice against PO and linked GRNs.
 */
export function performThreeWayMatch(
  invoice: VendorInvoice,
  allPOs: PurchaseOrder[],
  allGRNs: GoodsReceiptNote[],
  allInvoices: VendorInvoice[],
  tolerances: MatchingToleranceConfig = DEFAULT_TOLERANCE
): MatchingResult {
  const discrepancies: DiscrepancyItem[] = [];

  // Check 1: Duplicate Invoice Check
  const duplicateCandidate = allInvoices.find(
    (other) =>
      other.id !== invoice.id &&
      other.vendorId === invoice.vendorId &&
      other.invoiceNumber.trim().toLowerCase() === invoice.invoiceNumber.trim().toLowerCase()
  );
  if (duplicateCandidate) {
    discrepancies.push({
      field: 'Duplicate',
      expected: 'Unique Invoice Number',
      actual: `Duplicate of ${duplicateCandidate.invoiceNumber} (${duplicateCandidate.invoiceDate})`,
      difference: 'Duplicate detected',
      explanation: `Invoice ${invoice.invoiceNumber} from vendor has already been recorded in system.`,
      severity: 'High',
      recommendedAction: 'Quarantine invoice. Verify with vendor before proceeding.',
    });
  }

  // Check 2: PO existence and reference match
  const po = invoice.poId
    ? allPOs.find((p) => p.id === invoice.poId || p.poNumber === invoice.poNumber)
    : allPOs.find((p) => p.poNumber === invoice.poNumber);

  if (!po) {
    discrepancies.push({
      field: 'Total',
      expected: 'Valid Purchase Order Reference',
      actual: invoice.poNumber || 'None provided',
      difference: 'PO Not Found',
      explanation: 'No approved Purchase Order found matching reference.',
      severity: 'High',
      recommendedAction: 'Request valid PO reference from vendor or create retroactive PO with authorization.',
    });

    return {
      matchStatus: 'Missing PO',
      discrepancies,
      matchedSummary: {
        poFound: false,
        grnFound: false,
        vendorMatched: false,
        qtyOrdered: 0,
        qtyAccepted: 0,
        qtyInvoiced: invoice.items.reduce((s, i) => s + i.quantity, 0),
        poTaxable: 0,
        invoiceTaxable: invoice.taxableTotal,
        poTaxTotal: 0,
        invoiceTaxTotal: invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal,
        poGrandTotal: 0,
        invoiceGrandTotal: invoice.grandTotal,
      },
    };
  }

  // Check 3: Vendor matching
  let vendorMatched = true;
  if (po.vendorId !== invoice.vendorId) {
    vendorMatched = false;
    discrepancies.push({
      field: 'Vendor',
      expected: `${po.vendorName} (${po.vendorId})`,
      actual: `${invoice.vendorName} (${invoice.vendorId})`,
      difference: 'Vendor ID mismatch',
      explanation: 'Invoice vendor does not match the vendor named on the Purchase Order.',
      severity: 'High',
      recommendedAction: 'Verify vendor credentials and contractual supplier entity.',
    });
  }

  // Check 4: GRN lookup (All posted GRNs referencing this PO)
  const linkedGRNs = allGRNs.filter(
    (g) => (g.poId === po.id || g.poNumber === po.poNumber) && g.status === 'Posted'
  );

  if (linkedGRNs.length === 0) {
    discrepancies.push({
      field: 'Quantity',
      expected: 'Posted GRN in Warehouse',
      actual: 'No posted GRN found',
      difference: 'Zero goods receipt',
      explanation: 'No warehouse Goods Receipt Note (GRN) has been posted for this Purchase Order yet.',
      severity: 'High',
      recommendedAction: 'Wait for warehouse inspection & GRN posting before processing invoice.',
    });

    return {
      matchStatus: 'Missing GRN',
      discrepancies,
      matchedSummary: {
        poFound: true,
        grnFound: false,
        vendorMatched,
        qtyOrdered: po.lines.reduce((s, l) => s + l.quantity, 0),
        qtyAccepted: 0,
        qtyInvoiced: invoice.items.reduce((s, i) => s + i.quantity, 0),
        poTaxable: po.subtotalTaxable,
        invoiceTaxable: invoice.taxableTotal,
        poTaxTotal: po.cgstTotal + po.sgstTotal + po.igstTotal,
        invoiceTaxTotal: invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal,
        poGrandTotal: po.grandTotal,
        invoiceGrandTotal: invoice.grandTotal,
      },
    };
  }

  // Compute aggregate quantities across GRNs for each item
  const grnAcceptedBySku: Record<string, number> = {};
  linkedGRNs.forEach((grn) => {
    grn.lines.forEach((line) => {
      grnAcceptedBySku[line.sku] = (grnAcceptedBySku[line.sku] || 0) + line.acceptedQty;
    });
  });

  const poLineBySku: Record<string, { orderedQty: number; unitPrice: number; taxRate: number }> = {};
  po.lines.forEach((l) => {
    poLineBySku[l.sku] = {
      orderedQty: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    };
  });

  let totalQtyOrdered = 0;
  let totalQtyAccepted = 0;
  let totalQtyInvoiced = 0;

  // Check 5: Item-level checks (Quantity, Unit Price, Tax Rate)
  invoice.items.forEach((item) => {
    totalQtyInvoiced += item.quantity;
    const poLine = poLineBySku[item.sku];
    const acceptedQty = grnAcceptedBySku[item.sku] || 0;
    totalQtyAccepted += acceptedQty;
    if (poLine) totalQtyOrdered += poLine.orderedQty;

    // Check quantity: Invoiced qty should not exceed accepted GRN qty
    if (item.quantity > acceptedQty) {
      const diff = round2(item.quantity - acceptedQty);
      discrepancies.push({
        field: 'Quantity',
        expected: `${acceptedQty} units (Accepted GRN)`,
        actual: `${item.quantity} units (Billed)`,
        difference: `+${diff} units overbilled`,
        explanation: `Vendor billed for ${item.quantity} units of ${item.sku}, but warehouse only accepted ${acceptedQty} units.`,
        severity: 'High',
        recommendedAction: 'Issue Debit Note or request revised invoice for accepted quantity only.',
      });
    }

    // Check unit price against PO
    if (poLine) {
      const priceDiff = round2(item.unitPrice - poLine.unitPrice);
      const allowedPriceVariance = (poLine.unitPrice * tolerances.priceTolerancePercentage) / 100;

      if (priceDiff > allowedPriceVariance) {
        discrepancies.push({
          field: 'Price',
          expected: `₹${poLine.unitPrice.toFixed(2)} (Agreed PO Price)`,
          actual: `₹${item.unitPrice.toFixed(2)} (Billed)`,
          difference: `+₹${priceDiff.toFixed(2)} / unit`,
          explanation: `Unit price for ${item.sku} is higher than contract PO price by ₹${priceDiff.toFixed(2)}.`,
          severity: 'High',
          recommendedAction: 'Hold payment and verify purchase rate revision with Purchase Manager.',
        });
      }

      // Check tax rate
      if (Math.abs(item.taxRate - poLine.taxRate) > 0.01) {
        discrepancies.push({
          field: 'Tax',
          expected: `${poLine.taxRate}% GST`,
          actual: `${item.taxRate}% GST`,
          difference: `${round2(item.taxRate - poLine.taxRate)}% tax diff`,
          explanation: `GST tax rate on invoice (${item.taxRate}%) differs from PO tax configuration (${poLine.taxRate}%).`,
          severity: 'Medium',
          recommendedAction: 'Check HSN classification and rate schedule applicable for this item.',
        });
      }
    }
  });

  // Check 6: Taxable and Grand Total Tolerances
  const poTaxTotal = po.cgstTotal + po.sgstTotal + po.igstTotal;
  const invoiceTaxTotal = invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal;

  const taxDiff = Math.abs(invoiceTaxTotal - poTaxTotal);
  if (taxDiff > tolerances.taxRoundingToleranceAmount && invoice.items.length === po.lines.length) {
    // Only flag if lines count match (not partial invoicing)
    const isPartial = totalQtyInvoiced < totalQtyOrdered;
    if (!isPartial) {
      discrepancies.push({
        field: 'Tax',
        expected: `₹${poTaxTotal.toFixed(2)} (PO Tax)`,
        actual: `₹${invoiceTaxTotal.toFixed(2)} (Invoice Tax)`,
        difference: `₹${round2(invoiceTaxTotal - poTaxTotal).toFixed(2)}`,
        explanation: 'Invoice tax amounts exceed allowed rounding tolerance threshold of ₹2.00.',
        severity: 'Medium',
        recommendedAction: 'Recompute tax components using GST decimal rounding rules.',
      });
    }
  }

  // Determine final match status
  let finalStatus: InvoiceMatchStatus = 'Matched';
  if (duplicateCandidate) {
    finalStatus = 'Duplicate Candidate';
  } else if (!vendorMatched) {
    finalStatus = 'Vendor Mismatch';
  } else if (discrepancies.length > 1) {
    finalStatus = 'Multiple Discrepancies';
  } else if (discrepancies.some((d) => d.field === 'Quantity')) {
    finalStatus = 'Quantity Mismatch';
  } else if (discrepancies.some((d) => d.field === 'Price')) {
    finalStatus = 'Price Mismatch';
  } else if (discrepancies.some((d) => d.field === 'Tax')) {
    finalStatus = 'Tax Mismatch';
  } else {
    finalStatus = 'Matched';
  }

  return {
    matchStatus: finalStatus,
    discrepancies,
    matchedSummary: {
      poFound: true,
      grnFound: true,
      vendorMatched,
      qtyOrdered: totalQtyOrdered,
      qtyAccepted: totalQtyAccepted,
      qtyInvoiced: totalQtyInvoiced,
      poTaxable: po.subtotalTaxable,
      invoiceTaxable: invoice.taxableTotal,
      poTaxTotal,
      invoiceTaxTotal,
      poGrandTotal: po.grandTotal,
      invoiceGrandTotal: invoice.grandTotal,
    },
  };
}
