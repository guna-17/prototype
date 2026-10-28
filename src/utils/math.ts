/**
 * Decimal-safe arithmetic and Indian GST calculation utilities
 * Target home state: Karnataka (Code: "29")
 */

export const KARNATAKA_STATE_CODE = '29';

/**
 * Rounds a number to specified decimal places safely avoiding floating point quirks.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Safely sums an array of numbers with 2-decimal precision.
 */
export function sumDecimals(numbers: number[]): number {
  const sum = numbers.reduce((acc, curr) => acc + Math.round((curr + Number.EPSILON) * 100), 0);
  return sum / 100;
}

/**
 * Determines whether a transaction is Intra-State or Inter-State.
 * If vendor/customer is in Karnataka (29), it's Intra-State (CGST + SGST).
 * Otherwise it's Inter-State (IGST).
 */
export function isIntraState(partyStateCode: string, homeStateCode: string = KARNATAKA_STATE_CODE): boolean {
  return partyStateCode.trim() === homeStateCode.trim();
}

export interface TaxBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
}

/**
 * Calculates deterministic GST tax breakdown based on supply state and GST rate.
 */
export function calculateGstBreakdown(
  taxableAmount: number,
  taxRatePercent: number,
  partyStateCode: string,
  homeStateCode: string = KARNATAKA_STATE_CODE
): TaxBreakdown {
  const taxable = round2(taxableAmount);
  const rate = round2(taxRatePercent);

  if (isIntraState(partyStateCode, homeStateCode)) {
    const halfRate = round2(rate / 2);
    const halfTax = round2((taxable * halfRate) / 100);
    const totalTax = round2(halfTax * 2);
    return {
      taxableAmount: taxable,
      cgstRate: halfRate,
      cgstAmount: halfTax,
      sgstRate: halfRate,
      sgstAmount: halfTax,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      grandTotal: round2(taxable + totalTax),
    };
  } else {
    const igstTax = round2((taxable * rate) / 100);
    return {
      taxableAmount: taxable,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: rate,
      igstAmount: igstTax,
      totalTax: igstTax,
      grandTotal: round2(taxable + igstTax),
    };
  }
}

/**
 * Formats a number in Indian Rupee format (e.g. ₹ 1,23,456.00)
 */
export function formatINR(amount: number): string {
  const rounded = round2(amount);
  const parts = rounded.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }

  // Indian currency numbering format (last 3 digits, then groups of 2)
  let lastThree = integerPart.slice(-3);
  const otherNumbers = integerPart.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}₹ ${formattedInteger}.${decimalPart}`;
}

/**
 * Format quantity with comma separation
 */
export function formatQty(qty: number, uom: string = ''): string {
  const formatted = new Intl.NumberFormat('en-IN').format(qty);
  return uom ? `${formatted} ${uom}` : formatted;
}
