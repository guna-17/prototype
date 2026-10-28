import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGstBreakdown, formatINR, isIntraState, round2, sumDecimals } from './math';
import { performThreeWayMatch } from './matchingEngine';
import { calculateItemStockFromLedger, getItemStockSummary, validateStockTransfer } from './inventoryEngine';
import { reconcileBooksWithGSTR2B } from './itcEngine';
import {
  GoodsReceiptNote,
  ItemMaster,
  PurchaseOrder,
  StockLedgerEntry,
  VendorInvoice,
  GSTR2BRecord,
} from '../types/erp';

test('math utils: decimal safe rounding and sum', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(sumDecimals([10.555, 20.444, 30.001]), 61.0);
  assert.equal(formatINR(125000), '₹ 1,25,000.00');
  assert.equal(formatINR(1250000.5), '₹ 12,50,000.50');
});

test('gst calculation: intra-state Karnataka (29) splits CGST and SGST equally', () => {
  assert.equal(isIntraState('29'), true);
  assert.equal(isIntraState('33'), false); // Tamil Nadu

  const intraResult = calculateGstBreakdown(10000, 18, '29');
  assert.equal(intraResult.taxableAmount, 10000);
  assert.equal(intraResult.cgstRate, 9);
  assert.equal(intraResult.cgstAmount, 900);
  assert.equal(intraResult.sgstRate, 9);
  assert.equal(intraResult.sgstAmount, 900);
  assert.equal(intraResult.igstRate, 0);
  assert.equal(intraResult.igstAmount, 0);
  assert.equal(intraResult.grandTotal, 11800);
});

test('gst calculation: inter-state applies 100% IGST', () => {
  const interResult = calculateGstBreakdown(10000, 18, '33'); // Tamil Nadu
  assert.equal(interResult.taxableAmount, 10000);
  assert.equal(interResult.cgstAmount, 0);
  assert.equal(interResult.sgstAmount, 0);
  assert.equal(interResult.igstRate, 18);
  assert.equal(interResult.igstAmount, 1800);
  assert.equal(interResult.grandTotal, 11800);
});

test('inventory ledger: correct closing balance calculation across movements', () => {
  const entries: StockLedgerEntry[] = [
    {
      id: 'e1',
      date: '2026-08-01',
      itemId: 'item-1',
      sku: 'SW-RELAY-12V',
      godownId: 'GODOWN_A',
      movementType: 'OPENING_BALANCE',
      referenceDocType: 'MANUAL',
      referenceDocId: 'OB-01',
      referenceNumber: 'OB-01',
      qtyIn: 100,
      qtyOut: 0,
      balanceAfter: 100,
      unitCost: 150,
      totalValuation: 15000,
      remarks: 'Opening Balance',
      performedBy: 'System',
      timestamp: '2026-08-01T00:00:00Z',
    },
    {
      id: 'e2',
      date: '2026-08-05',
      itemId: 'item-1',
      sku: 'SW-RELAY-12V',
      godownId: 'GODOWN_A',
      movementType: 'GRN_RECEIPT',
      referenceDocType: 'GRN',
      referenceDocId: 'grn-1',
      referenceNumber: 'GRN-001',
      qtyIn: 50,
      qtyOut: 0,
      balanceAfter: 150,
      unitCost: 150,
      totalValuation: 22500,
      remarks: 'Receipt from vendor',
      performedBy: 'Warehouse Manager',
      timestamp: '2026-08-05T00:00:00Z',
    },
    {
      id: 'e3',
      date: '2026-08-10',
      itemId: 'item-1',
      sku: 'SW-RELAY-12V',
      godownId: 'GODOWN_A',
      movementType: 'ISSUE_PRODUCTION',
      referenceDocType: 'MANUAL',
      referenceDocId: 'ISS-01',
      referenceNumber: 'ISS-01',
      qtyIn: 0,
      qtyOut: 30,
      balanceAfter: 120,
      unitCost: 150,
      totalValuation: 18000,
      remarks: 'Issued to production assembly',
      performedBy: 'Production Head',
      timestamp: '2026-08-10T00:00:00Z',
    },
  ];

  const balanceGodownA = calculateItemStockFromLedger('item-1', entries, 'GODOWN_A');
  assert.equal(balanceGodownA, 120);

  const balanceGodownB = calculateItemStockFromLedger('item-1', entries, 'GODOWN_B');
  assert.equal(balanceGodownB, 0);

  // Transfer validation
  const validTransfer = validateStockTransfer('item-1', 'GODOWN_A', 'GODOWN_B', 50, entries);
  assert.equal(validTransfer.valid, true);

  const invalidTransfer = validateStockTransfer('item-1', 'GODOWN_A', 'GODOWN_B', 200, entries);
  assert.equal(invalidTransfer.valid, false);
  assert.match(invalidTransfer.error || '', /Insufficient stock/);
});

test('deterministic reorder alerts and replenishment recommendations', () => {
  const item: ItemMaster = {
    id: 'item-1',
    sku: 'SW-RELAY-12V',
    name: '12V PCB Relay',
    description: '12V DC Relay for switchboards',
    category: 'Electrical Components',
    uom: 'PCS',
    hsnCode: '8536',
    taxRate: 18,
    reorderLevel: 100,
    reorderQuantity: 200,
    standardCost: 85,
    active: true,
  };

  // Stock of 40 (less than 50% of reorder level 100 => Critical)
  const entries: StockLedgerEntry[] = [
    {
      id: 'e1',
      date: '2026-08-01',
      itemId: 'item-1',
      sku: 'SW-RELAY-12V',
      godownId: 'GODOWN_A',
      movementType: 'OPENING_BALANCE',
      referenceDocType: 'MANUAL',
      referenceDocId: 'OB',
      referenceNumber: 'OB',
      qtyIn: 40,
      qtyOut: 0,
      balanceAfter: 40,
      unitCost: 85,
      totalValuation: 3400,
      remarks: 'Opening',
      performedBy: 'System',
      timestamp: '2026-08-01T00:00:00Z',
    },
  ];

  const summary = getItemStockSummary(item, entries);
  assert.equal(summary.totalStock, 40);
  assert.equal(summary.status, 'Critical');
  assert.equal(summary.recommendedReorderQty, 200); // Max(200, 200 - 40 = 160) => 200
});

test('three-way matching: correctly matches identical PO, GRN, and Invoice', () => {
  const po: PurchaseOrder = {
    id: 'po-1',
    poNumber: 'PO-2026-001',
    vendorId: 'v-1',
    vendorName: 'Kaveri Electro Metals',
    vendorGstin: '29ABCDE1234F1Z5',
    vendorStateCode: '29',
    orderDate: '2026-08-01',
    expectedDeliveryDate: '2026-08-10',
    destinationGodownId: 'GODOWN_A',
    status: 'Approved',
    lines: [
      {
        id: 'pol-1',
        itemId: 'item-1',
        sku: 'SW-RELAY-12V',
        itemName: '12V PCB Relay',
        hsnCode: '8536',
        quantity: 100,
        receivedQuantity: 100,
        unitPrice: 80,
        uom: 'PCS',
        taxRate: 18,
        taxableAmount: 8000,
        cgstAmount: 720,
        sgstAmount: 720,
        igstAmount: 0,
        totalAmount: 9440,
      },
    ],
    subtotalTaxable: 8000,
    cgstTotal: 720,
    sgstTotal: 720,
    igstTotal: 0,
    grandTotal: 9440,
    createdBy: 'Purchase Manager',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  };

  const grn: GoodsReceiptNote = {
    id: 'grn-1',
    grnNumber: 'GRN-2026-001',
    poId: 'po-1',
    poNumber: 'PO-2026-001',
    vendorId: 'v-1',
    vendorName: 'Kaveri Electro Metals',
    receiptDate: '2026-08-05',
    destinationGodownId: 'GODOWN_A',
    vendorChallanNo: 'CH-99',
    vendorChallanDate: '2026-08-05',
    status: 'Posted',
    lines: [
      {
        id: 'grnl-1',
        poLineId: 'pol-1',
        itemId: 'item-1',
        sku: 'SW-RELAY-12V',
        itemName: '12V PCB Relay',
        orderedQty: 100,
        previouslyReceivedQty: 0,
        currentReceivedQty: 100,
        acceptedQty: 100,
        rejectedQty: 0,
        unitPrice: 80,
        uom: 'PCS',
      },
    ],
    receivedBy: 'Warehouse Manager',
    createdAt: '2026-08-05T12:00:00Z',
  };

  const invoice: VendorInvoice = {
    id: 'inv-1',
    invoiceNumber: 'INV-KM-101',
    invoiceDate: '2026-08-06',
    vendorId: 'v-1',
    vendorName: 'Kaveri Electro Metals',
    vendorGstin: '29ABCDE1234F1Z5',
    poId: 'po-1',
    poNumber: 'PO-2026-001',
    grnId: 'grn-1',
    grnNumber: 'GRN-2026-001',
    items: [
      {
        itemId: 'item-1',
        sku: 'SW-RELAY-12V',
        itemName: '12V PCB Relay',
        quantity: 100,
        unitPrice: 80,
        taxRate: 18,
        taxableAmount: 8000,
        cgst: 720,
        sgst: 720,
        igst: 0,
        lineTotal: 9440,
      },
    ],
    taxableTotal: 8000,
    cgstTotal: 720,
    sgstTotal: 720,
    igstTotal: 0,
    grandTotal: 9440,
    dueDate: '2026-09-06',
    matchStatus: 'Pending Review',
    discrepancies: [],
    approvalStatus: 'Pending Review',
    amountPaid: 0,
    paymentStatus: 'Unpaid',
    createdAt: '2026-08-06T10:00:00Z',
  };

  const matchResult = performThreeWayMatch(invoice, [po], [grn], [invoice]);
  assert.equal(matchResult.matchStatus, 'Matched');
  assert.equal(matchResult.discrepancies.length, 0);
});

test('three-way matching: flags quantity mismatch when billed > accepted', () => {
  const po: PurchaseOrder = {
    id: 'po-2',
    poNumber: 'PO-2026-002',
    vendorId: 'v-1',
    vendorName: 'Kaveri Electro Metals',
    vendorGstin: '29ABCDE1234F1Z5',
    vendorStateCode: '29',
    orderDate: '2026-08-01',
    expectedDeliveryDate: '2026-08-10',
    destinationGodownId: 'GODOWN_A',
    status: 'Approved',
    lines: [
      {
        id: 'pol-2',
        itemId: 'item-1',
        sku: 'SW-RELAY-12V',
        itemName: '12V PCB Relay',
        hsnCode: '8536',
        quantity: 100,
        receivedQuantity: 90,
        unitPrice: 80,
        uom: 'PCS',
        taxRate: 18,
        taxableAmount: 8000,
        cgstAmount: 720,
        sgstAmount: 720,
        igstAmount: 0,
        totalAmount: 9440,
      },
    ],
    subtotalTaxable: 8000,
    cgstTotal: 720,
    sgstTotal: 720,
    igstTotal: 0,
    grandTotal: 9440,
    createdBy: 'Purchase Manager',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  };

  const grn: GoodsReceiptNote = {
    id: 'grn-2',
    grnNumber: 'GRN-2026-002',
    poId: 'po-2',
    poNumber: 'PO-2026-002',
    vendorId: 'v-1',
    vendorName: 'Kaveri Electro Metals',
    receiptDate: '2026-08-05',
    destinationGodownId: 'GODOWN_A',
    vendorChallanNo: 'CH-100',
    vendorChallanDate: '2026-08-05',
    status: 'Posted',
    lines: [
      {
        id: 'grnl-2',
        poLineId: 'pol-2',
        itemId: 'item-1',
        sku: 'SW-RELAY-12V',
        itemName: '12V PCB Relay',
        orderedQty: 100,
        previouslyReceivedQty: 0,
        currentReceivedQty: 90,
        acceptedQty: 90,
        rejectedQty: 10,
        unitPrice: 80,
        uom: 'PCS',
      },
    ],
    receivedBy: 'Warehouse Manager',
    createdAt: '2026-08-05T12:00:00Z',
  };

  const invoiceBilled100: VendorInvoice = {
    id: 'inv-2',
    invoiceNumber: 'INV-KM-102',
    invoiceDate: '2026-08-06',
    vendorId: 'v-1',
    vendorName: 'Kaveri Electro Metals',
    vendorGstin: '29ABCDE1234F1Z5',
    poId: 'po-2',
    poNumber: 'PO-2026-002',
    grnId: 'grn-2',
    grnNumber: 'GRN-2026-002',
    items: [
      {
        itemId: 'item-1',
        sku: 'SW-RELAY-12V',
        itemName: '12V PCB Relay',
        quantity: 100, // Billed 100 even though only 90 accepted!
        unitPrice: 80,
        taxRate: 18,
        taxableAmount: 8000,
        cgst: 720,
        sgst: 720,
        igst: 0,
        lineTotal: 9440,
      },
    ],
    taxableTotal: 8000,
    cgstTotal: 720,
    sgstTotal: 720,
    igstTotal: 0,
    grandTotal: 9440,
    dueDate: '2026-09-06',
    matchStatus: 'Pending Review',
    discrepancies: [],
    approvalStatus: 'Pending Review',
    amountPaid: 0,
    paymentStatus: 'Unpaid',
    createdAt: '2026-08-06T10:00:00Z',
  };

  const matchResult = performThreeWayMatch(invoiceBilled100, [po], [grn], [invoiceBilled100]);
  assert.equal(matchResult.matchStatus, 'Quantity Mismatch');
  assert.equal(matchResult.discrepancies.length, 1);
  assert.equal(matchResult.discrepancies[0].field, 'Quantity');
  assert.match(matchResult.discrepancies[0].difference as string, /\+10 units overbilled/);
});

test('itc reconciliation: correctly flags matched vs pending 2B vs tax mismatch', () => {
  const purchaseInvoices: VendorInvoice[] = [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      invoiceDate: '2026-08-01',
      vendorId: 'v-1',
      vendorName: 'Kaveri Electro Metals',
      vendorGstin: '29ABCDE1234F1Z5',
      items: [],
      taxableTotal: 10000,
      cgstTotal: 900,
      sgstTotal: 900,
      igstTotal: 0,
      grandTotal: 11800,
      dueDate: '2026-09-01',
      matchStatus: 'Matched',
      discrepancies: [],
      approvalStatus: 'Approved for Payment',
      amountPaid: 0,
      paymentStatus: 'Unpaid',
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-002',
      invoiceDate: '2026-08-02',
      vendorId: 'v-2',
      vendorName: 'Supreme Copper Mills',
      vendorGstin: '33XYZAB9876C1Z2',
      items: [],
      taxableTotal: 50000,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 9000,
      grandTotal: 59000,
      dueDate: '2026-09-02',
      matchStatus: 'Matched',
      discrepancies: [],
      approvalStatus: 'Approved for Payment',
      amountPaid: 0,
      paymentStatus: 'Unpaid',
      createdAt: '2026-08-02T00:00:00Z',
    },
  ];

  const gstr2bRecords: GSTR2BRecord[] = [
    {
      id: '2b-1',
      returnPeriod: '082026',
      supplierGstin: '29ABCDE1234F1Z5',
      supplierName: 'Kaveri Electro Metals',
      invoiceNumber: 'INV-001',
      invoiceDate: '2026-08-01',
      invoiceType: 'B2B',
      taxableValue: 10000,
      cgst: 900,
      sgst: 900,
      igst: 0,
      placeOfSupply: '29-Karnataka',
      filingDate: '2026-08-11',
      itcAvailable: true,
    },
    // INV-002 is NOT in GSTR-2B (vendor failed to file GSTR-1 in August)
  ];

  const reconResults = reconcileBooksWithGSTR2B(purchaseInvoices, gstr2bRecords);
  assert.equal(reconResults.length, 2);

  const item1 = reconResults.find((r) => r.invoiceNumber === 'INV-001');
  assert.equal(item1?.eligibilityStatus, 'Eligible');

  const item2 = reconResults.find((r) => r.invoiceNumber === 'INV-002');
  assert.equal(item2?.eligibilityStatus, 'Pending 2B');
});

test('auth engine: validates Karnataka GSTIN (Code 29) formats strictly', async () => {
  const { isValidKarnatakaGstin, isValidEmail, validatePassword, validateSignupInput } = await import('./authEngine');

  // Valid Karnataka GSTIN
  assert.equal(isValidKarnatakaGstin('29ABCDE1234F1Z5'), true);
  assert.equal(isValidKarnatakaGstin('29abcde1234f1z5'), true);

  // Invalid: Not Karnataka (33 is Tamil Nadu, 27 is Maharashtra)
  assert.equal(isValidKarnatakaGstin('33ABCDE1234F1Z5'), false);
  assert.equal(isValidKarnatakaGstin('27ABCDE1234F1Z5'), false);
  // Invalid: Bad length or symbols
  assert.equal(isValidKarnatakaGstin('29ABCDE1234F'), false);
  assert.equal(isValidKarnatakaGstin(''), false);

  // Email format
  assert.equal(isValidEmail('arun@karnatakaelectronics.com'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail(''), false);

  // Password length
  assert.equal(validatePassword('123456').valid, true);
  assert.equal(validatePassword('12345').valid, false);

  // Full signup validation
  const validSignup = validateSignupInput({
    name: 'Anand Hegde',
    email: 'anand@karnatakaelectronics.com',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'BUSINESS_OWNER',
    companyGstin: '29ABCDE1234F1Z5',
  });
  assert.equal(validSignup.valid, true);

  const mismatchSignup = validateSignupInput({
    name: 'Anand Hegde',
    email: 'anand@karnatakaelectronics.com',
    password: 'password123',
    confirmPassword: 'wrongpassword',
    role: 'BUSINESS_OWNER',
  });
  assert.equal(mismatchSignup.valid, false);
  assert.match(mismatchSignup.errors[0], /do not match/);
});

test('global search engine: searches across POs, Inventory items, and Invoices by ID, number, or name', async () => {
  const { searchGlobalRecords } = await import('./searchEngine');

  const mockPOs: PurchaseOrder[] = [
    {
      id: 'po-101',
      poNumber: 'PO-2026-001',
      vendorId: 'v-1',
      vendorName: 'Kaveri Electro Metals',
      vendorGstin: '29ABCDE1234F1Z5',
      vendorStateCode: '29',
      orderDate: '2026-08-01',
      expectedDeliveryDate: '2026-08-10',
      destinationGodownId: 'GODOWN_A',
      status: 'Approved',
      lines: [
        {
          id: 'pol-1',
          itemId: 'item-1',
          sku: 'SW-RELAY-12V',
          itemName: '12V PCB Relay',
          hsnCode: '8536',
          quantity: 100,
          receivedQuantity: 100,
          unitPrice: 80,
          uom: 'PCS',
          taxRate: 18,
          taxableAmount: 8000,
          cgstAmount: 720,
          sgstAmount: 720,
          igstAmount: 0,
          totalAmount: 9440,
        },
      ],
      subtotalTaxable: 8000,
      cgstTotal: 720,
      sgstTotal: 720,
      igstTotal: 0,
      grandTotal: 9440,
      createdBy: 'Purchase Manager',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
  ];

  const mockItems: ItemMaster[] = [
    {
      id: 'item-1',
      sku: 'SW-RELAY-12V',
      name: '12V PCB Relay',
      description: 'Switchgear component',
      category: 'Electrical Components',
      uom: 'PCS',
      hsnCode: '8536',
      taxRate: 18,
      reorderLevel: 100,
      reorderQuantity: 200,
      standardCost: 85,
      active: true,
    },
    {
      id: 'item-2',
      sku: 'CB-COPPER-1MM',
      name: 'Enamelled Copper Wire 1mm',
      description: 'Winding wire',
      category: 'Wiring & Cables',
      uom: 'KG',
      hsnCode: '8544',
      taxRate: 18,
      reorderLevel: 50,
      reorderQuantity: 150,
      standardCost: 750,
      active: true,
    },
  ];

  const mockInvoices: VendorInvoice[] = [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-KM-101',
      invoiceDate: '2026-08-06',
      vendorId: 'v-1',
      vendorName: 'Kaveri Electro Metals',
      vendorGstin: '29ABCDE1234F1Z5',
      poId: 'po-101',
      poNumber: 'PO-2026-001',
      items: [],
      taxableTotal: 8000,
      cgstTotal: 720,
      sgstTotal: 720,
      igstTotal: 0,
      grandTotal: 9440,
      dueDate: '2026-09-06',
      matchStatus: 'Matched',
      discrepancies: [],
      approvalStatus: 'Approved for Payment',
      amountPaid: 0,
      paymentStatus: 'Unpaid',
      createdAt: '2026-08-06T10:00:00Z',
    },
  ];

  // 1. Search by PO Number
  const poResult = searchGlobalRecords('PO-2026-001', {
    purchaseOrders: mockPOs,
    items: mockItems,
    vendorInvoices: mockInvoices,
  });
  assert.equal(poResult.purchaseOrders.length, 1);
  assert.equal(poResult.purchaseOrders[0].number, 'PO-2026-001');

  // 2. Search by Item SKU
  const itemResult = searchGlobalRecords('SW-RELAY', {
    purchaseOrders: mockPOs,
    items: mockItems,
    vendorInvoices: mockInvoices,
  });
  assert.equal(itemResult.items.length, 1);
  assert.equal(itemResult.items[0].sku, 'SW-RELAY-12V');

  // 3. Search by Invoice Number
  const invResult = searchGlobalRecords('INV-KM-101', {
    purchaseOrders: mockPOs,
    items: mockItems,
    vendorInvoices: mockInvoices,
  });
  assert.equal(invResult.invoices.length, 1);
  assert.equal(invResult.invoices[0].invoiceNumber, 'INV-KM-101');

  // 4. Cross-domain search by vendor name
  const vendorResult = searchGlobalRecords('Kaveri', {
    purchaseOrders: mockPOs,
    items: mockItems,
    vendorInvoices: mockInvoices,
  });
  assert.equal(vendorResult.purchaseOrders.length, 1);
  assert.equal(vendorResult.invoices.length, 1);
  assert.equal(vendorResult.totalMatches >= 2, true);

  // 5. Empty query returns 0 matches
  const emptyResult = searchGlobalRecords('', {
    purchaseOrders: mockPOs,
    items: mockItems,
    vendorInvoices: mockInvoices,
  });
  assert.equal(emptyResult.totalMatches, 0);
});
