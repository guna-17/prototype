/**
 * SmartGST ERP - Domain Types and Interfaces
 * Target: Electrical Components Manufacturing (Karnataka, India)
 */

export type UserRole =
  | 'BUSINESS_OWNER'
  | 'PURCHASE_MANAGER'
  | 'WAREHOUSE_MANAGER'
  | 'ACCOUNTS_EXECUTIVE'
  | 'FINANCE_MANAGER'
  | 'ADMINISTRATOR';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  godownAccess?: string; // 'ALL' | 'GODOWN_A' | 'GODOWN_B'
  companyName?: string;
  companyGstin?: string;
}

export interface UserAccount extends UserSession {
  password: string;
  createdAt: string;
}

export type GodownId = 'GODOWN_A' | 'GODOWN_B';

export interface Godown {
  id: GodownId;
  name: string;
  code: string;
  location: string;
  city: string;
  state: string;
  address: string;
  manager: string;
  capacitySqFt: number;
}

export type ItemCategory =
  | 'Raw Material'
  | 'Electrical Components'
  | 'Wiring & Cables'
  | 'Switchgear'
  | 'Transformers'
  | 'Packaging';

export interface ItemMaster {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ItemCategory;
  uom: string; // 'PCS' | 'METERS' | 'KG' | 'SETS' | 'ROLLS'
  hsnCode: string;
  taxRate: number; // e.g. 18 (18%)
  reorderLevel: number;
  reorderQuantity: number;
  standardCost: number;
  active: boolean;
}

export interface VendorMaster {
  id: string;
  vendorCode: string;
  name: string;
  gstin: string;
  state: string;
  stateCode: string; // '29' for Karnataka, '33' for TN, '27' for MH, etc.
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  paymentTermsDays: number;
  bankNameMasked: string;
  bankAccountMasked: string;
  active: boolean;
}

export interface CustomerMaster {
  id: string;
  customerCode: string;
  name: string;
  gstin: string;
  state: string;
  stateCode: string;
  address: string;
  contactPerson: string;
  phone: string;
  paymentTermsDays: number;
  active: boolean;
}

export interface TaxConfig {
  id: string;
  hsnCode: string;
  description: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  effectiveFrom: string;
  active: boolean;
}

export type POStatus =
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'Partially Received'
  | 'Fully Received'
  | 'Closed'
  | 'Cancelled';

export interface POLineItem {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  hsnCode: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  uom: string;
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  vendorStateCode: string;
  orderDate: string;
  expectedDeliveryDate: string;
  destinationGodownId: GodownId;
  status: POStatus;
  lines: POLineItem[];
  subtotalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type GRNStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface GRNLineItem {
  id: string;
  poLineId: string;
  itemId: string;
  sku: string;
  itemName: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  currentReceivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  unitPrice: number;
  uom: string;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  receiptDate: string;
  destinationGodownId: GodownId;
  vendorChallanNo: string;
  vendorChallanDate: string;
  status: GRNStatus;
  lines: GRNLineItem[];
  inspectionNotes?: string;
  receivedBy: string;
  postedAt?: string;
  createdAt: string;
}

export type MovementType =
  | 'OPENING_BALANCE'
  | 'GRN_RECEIPT'
  | 'ISSUE_PRODUCTION'
  | 'GODOWN_TRANSFER_IN'
  | 'GODOWN_TRANSFER_OUT'
  | 'STOCK_ADJUSTMENT'
  | 'RETURN_TO_VENDOR';

export interface StockLedgerEntry {
  id: string;
  date: string;
  itemId: string;
  sku: string;
  godownId: GodownId;
  movementType: MovementType;
  referenceDocType: 'PO' | 'GRN' | 'TRANSFER' | 'ADJUSTMENT' | 'MANUAL';
  referenceDocId: string;
  referenceNumber: string;
  qtyIn: number;
  qtyOut: number;
  balanceAfter: number;
  unitCost: number;
  totalValuation: number;
  remarks: string;
  performedBy: string;
  timestamp: string;
}

export type InvoiceMatchStatus =
  | 'Matched'
  | 'Quantity Mismatch'
  | 'Price Mismatch'
  | 'Tax Mismatch'
  | 'Missing PO'
  | 'Missing GRN'
  | 'Duplicate Candidate'
  | 'Vendor Mismatch'
  | 'Multiple Discrepancies'
  | 'Pending Review';

export type DiscrepancySeverity = 'High' | 'Medium' | 'Low';

export interface DiscrepancyItem {
  field: 'Quantity' | 'Price' | 'Tax' | 'Total' | 'Vendor' | 'Duplicate';
  expected: number | string;
  actual: number | string;
  difference: number | string;
  explanation: string;
  severity: DiscrepancySeverity;
  recommendedAction: string;
}

export type InvoicePaymentApprovalStatus =
  | 'Pending Review'
  | 'Approved for Payment'
  | 'Disputed'
  | 'Debit Note Issued'
  | 'Rejected';

export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  poId?: string;
  poNumber?: string;
  grnId?: string;
  grnNumber?: string;
  items: {
    itemId: string;
    sku: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    lineTotal: number;
  }[];
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  dueDate: string;
  matchStatus: InvoiceMatchStatus;
  discrepancies: DiscrepancyItem[];
  approvalStatus: InvoicePaymentApprovalStatus;
  amountPaid: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
  reviewedBy?: string;
  reviewNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  invoiceId: string;
  invoiceNumber: string;
  partyType: 'VENDOR' | 'CUSTOMER';
  partyId: string;
  partyName: string;
  amount: number;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'UPI';
  referenceNumber: string; // UTR / Cheque No
  bankAccount: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  customerStateCode: string;
  dueDate: string;
  items: {
    itemId: string;
    sku: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    lineTotal: number;
  }[];
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  amountReceived: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
  status: 'Draft' | 'Finalized' | 'Cancelled';
  createdAt: string;
}

export type ITCEligibilityStatus =
  | 'Eligible'
  | 'Mismatch'
  | 'Pending 2B'
  | 'Ineligible Section 17(5)'
  | 'Supplier Non-compliant'
  | 'Needs Review';

export interface GSTR2BRecord {
  id: string;
  returnPeriod: string; // e.g. '082026'
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: 'B2B' | 'CDNR';
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  placeOfSupply: string;
  filingDate: string;
  itcAvailable: boolean;
  reconciliationStatus?: 'Matched' | 'Tax Mismatch' | 'Missing in Books' | 'Missing in 2B';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entityType:
    | 'PURCHASE_ORDER'
    | 'GOODS_RECEIPT'
    | 'INVENTORY'
    | 'VENDOR_INVOICE'
    | 'PAYMENT'
    | 'CUSTOMER_INVOICE'
    | 'GST_RECON'
    | 'DATA_IMPORT'
    | 'SETTINGS';
  entityId: string;
  description: string;
  changes?: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
}
