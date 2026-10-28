/**
 * SmartGST ERP - Central ERP State Context
 * Handles persistence, transactions, audit trails, RBAC, and reactive calculations.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuditLog,
  CustomerInvoice,
  CustomerMaster,
  DiscrepancyItem,
  Godown,
  GodownId,
  GoodsReceiptNote,
  GSTR2BRecord,
  InvoicePaymentApprovalStatus,
  ItemMaster,
  PaymentTransaction,
  POStatus,
  PurchaseOrder,
  StockLedgerEntry,
  TaxConfig,
  UserAccount,
  UserRole,
  UserSession,
  VendorInvoice,
  VendorMaster,
} from '../types/erp';
import { SignupInput, validateSignupInput } from '../utils/authEngine';
import {
  INITIAL_CUSTOMERS,
  INITIAL_CUSTOMER_INVOICES,
  INITIAL_GODOWNS,
  INITIAL_GSTR2B_RECORDS,
  INITIAL_ITEMS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_PAYMENT_TRANSACTIONS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_GRNS,
  INITIAL_TAX_CONFIG,
  INITIAL_VENDORS,
  INITIAL_VENDOR_INVOICES,
} from '../utils/seedData';
import { calculateItemStockFromLedger, getItemStockSummary } from '../utils/inventoryEngine';
import { performThreeWayMatch } from '../utils/matchingEngine';
import { reconcileBooksWithGSTR2B } from '../utils/itcEngine';
import { round2 } from '../utils/math';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface ERPContextType {
  // Master data
  items: ItemMaster[];
  vendors: VendorMaster[];
  customers: CustomerMaster[];
  godowns: Godown[];
  taxConfigs: TaxConfig[];

  // Transactions
  purchaseOrders: PurchaseOrder[];
  goodsReceiptNotes: GoodsReceiptNote[];
  stockLedger: StockLedgerEntry[];
  vendorInvoices: VendorInvoice[];
  customerInvoices: CustomerInvoice[];
  paymentTransactions: PaymentTransaction[];
  gstr2bRecords: GSTR2BRecord[];
  auditLogs: AuditLog[];

  // User & Authentication
  currentUser: UserSession;
  isAuthenticated: boolean;
  registeredAccounts: UserAccount[];
  activeGodownFilter: 'ALL' | GodownId;
  searchTerm: string;
  notifications: ToastNotification[];

  // Auth Operations
  login: (email: string, password: string) => { success: boolean; message?: string };
  signup: (data: SignupInput) => { success: boolean; message?: string };
  logout: () => void;

  // Setters & Actions
  setCurrentUserRole: (role: UserRole) => void;
  setActiveGodownFilter: (godown: 'ALL' | GodownId) => void;
  setSearchTerm: (term: string) => void;
  dismissNotification: (id: string) => void;
  notify: (type: ToastNotification['type'], title: string, message: string) => void;

  // Master Data Operations
  addItem: (item: Omit<ItemMaster, 'id'>) => void;
  updateItem: (id: string, item: Partial<ItemMaster>) => void;
  addVendor: (vendor: Omit<VendorMaster, 'id'>) => void;
  addCustomer: (customer: Omit<CustomerMaster, 'id'>) => void;

  // Procurement Operations
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePOStatus: (poId: string, status: POStatus, reason?: string) => boolean;

  // Goods Receipt Operations
  postGoodsReceipt: (
    grnData: Omit<GoodsReceiptNote, 'id' | 'createdAt' | 'status' | 'postedAt'>
  ) => { success: boolean; message: string };

  // Inventory Operations
  transferStock: (
    itemId: string,
    fromGodown: GodownId,
    toGodown: GodownId,
    quantity: number,
    remarks: string
  ) => { success: boolean; message: string };
  adjustStock: (
    itemId: string,
    godownId: GodownId,
    quantity: number,
    isAddition: boolean,
    reason: string
  ) => { success: boolean; message: string };

  // Invoice Matching & Dispute Operations
  createVendorInvoice: (invoice: Omit<VendorInvoice, 'id' | 'createdAt' | 'matchStatus' | 'discrepancies' | 'amountPaid' | 'paymentStatus'>) => void;
  runMatchForInvoice: (invoiceId: string) => void;
  updateInvoiceApproval: (
    invoiceId: string,
    approvalStatus: InvoicePaymentApprovalStatus,
    notes: string
  ) => boolean;

  // Payments Operations
  recordVendorPayment: (
    payment: Omit<PaymentTransaction, 'id' | 'paymentNumber' | 'createdAt' | 'partyType'>
  ) => { success: boolean; message: string };
  recordCustomerReceipt: (
    invoiceId: string,
    amount: number,
    paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'UPI',
    refNo: string,
    notes?: string
  ) => { success: boolean; message: string };

  // Bulk Import & Reset
  importDataset: (entityType: string, rows: any[]) => { total: number; imported: number; errors: string[] };
  resetToSeedData: () => void;

  // Owner & KPI Metrics
  kpis: {
    totalInventoryValue: number;
    totalStockItemsCount: number;
    lowStockCount: number;
    openPOCount: number;
    pendingGRNCount: number;
    invoicesAwaitingReviewCount: number;
    detectedMismatchesCount: number;
    approvedSupplierPayables: number;
    disputedInvoiceValue: number;
    customerReceivables: number;
    overdueReceivables: number;
    gstDiscrepanciesCount: number;
    todayNetPosition: number;
  };
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

const STORAGE_KEY = 'SMARTGST_ERP_STATE_V1';

const DEFAULT_USERS: Record<UserRole, UserSession> = {
  BUSINESS_OWNER: {
    id: 'u-owner',
    name: 'Arun Kumar',
    email: 'arun.kumar@karnatakaelectronics.com',
    role: 'BUSINESS_OWNER',
    godownAccess: 'ALL',
  },
  PURCHASE_MANAGER: {
    id: 'u-purch',
    name: 'Vikram Rao',
    email: 'vikram.rao@karnatakaelectronics.com',
    role: 'PURCHASE_MANAGER',
    godownAccess: 'ALL',
  },
  WAREHOUSE_MANAGER: {
    id: 'u-wh',
    name: 'Ramesh Gowda',
    email: 'ramesh.gowda@karnatakaelectronics.com',
    role: 'WAREHOUSE_MANAGER',
    godownAccess: 'GODOWN_A',
  },
  ACCOUNTS_EXECUTIVE: {
    id: 'u-acc',
    name: 'Kavita Nayak',
    email: 'kavita.nayak@karnatakaelectronics.com',
    role: 'ACCOUNTS_EXECUTIVE',
    godownAccess: 'ALL',
  },
  FINANCE_MANAGER: {
    id: 'u-fin',
    name: 'Sunil Mehta',
    email: 'sunil.mehta@karnatakaelectronics.com',
    role: 'FINANCE_MANAGER',
    godownAccess: 'ALL',
  },
  ADMINISTRATOR: {
    id: 'u-admin',
    name: 'Nandini Swamy',
    email: 'admin@karnatakaelectronics.com',
    role: 'ADMINISTRATOR',
    godownAccess: 'ALL',
  },
};

const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    ...DEFAULT_USERS.BUSINESS_OWNER,
    companyName: 'Karnataka Electrical Components Ltd',
    companyGstin: '29ABCDE1234F1Z5',
    password: 'password123',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    ...DEFAULT_USERS.PURCHASE_MANAGER,
    companyName: 'Karnataka Electrical Components Ltd',
    companyGstin: '29ABCDE1234F1Z5',
    password: 'password123',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    ...DEFAULT_USERS.WAREHOUSE_MANAGER,
    companyName: 'Karnataka Electrical Components Ltd',
    companyGstin: '29ABCDE1234F1Z5',
    password: 'password123',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    ...DEFAULT_USERS.ACCOUNTS_EXECUTIVE,
    companyName: 'Karnataka Electrical Components Ltd',
    companyGstin: '29ABCDE1234F1Z5',
    password: 'password123',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    ...DEFAULT_USERS.FINANCE_MANAGER,
    companyName: 'Karnataka Electrical Components Ltd',
    companyGstin: '29ABCDE1234F1Z5',
    password: 'password123',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    ...DEFAULT_USERS.ADMINISTRATOR,
    companyName: 'Karnataka Electrical Components Ltd',
    companyGstin: '29ABCDE1234F1Z5',
    password: 'password123',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_ACCOUNTS');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_AUTH_SESSION');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_USERS.BUSINESS_OWNER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_AUTH_SESSION');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Boolean(parsed && parsed.id);
      } catch {
        return false;
      }
    }
    return false;
  });

  // Load persistent or seed data
  const [items, setItems] = useState<ItemMaster[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_ITEMS');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [vendors, setVendors] = useState<VendorMaster[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_VENDORS');
    return saved ? JSON.parse(saved) : INITIAL_VENDORS;
  });

  const [customers, setCustomers] = useState<CustomerMaster[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_CUSTOMERS');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [godowns, setGodowns] = useState<Godown[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_GODOWNS');
    return saved ? JSON.parse(saved) : INITIAL_GODOWNS;
  });

  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_TAX');
    return saved ? JSON.parse(saved) : INITIAL_TAX_CONFIG;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_POS');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
  });

  const [goodsReceiptNotes, setGoodsReceiptNotes] = useState<GoodsReceiptNote[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_GRNS');
    return saved ? JSON.parse(saved) : INITIAL_GRNS;
  });

  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_LEDGER');
    return saved ? JSON.parse(saved) : INITIAL_LEDGER_ENTRIES;
  });

  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_INVOICES');
    return saved ? JSON.parse(saved) : INITIAL_VENDOR_INVOICES;
  });

  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_CINVOICES');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMER_INVOICES;
  });

  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_PAYMENTS');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENT_TRANSACTIONS;
  });

  const [gstr2bRecords, setGstr2bRecords] = useState<GSTR2BRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_GSTR2B');
    return saved ? JSON.parse(saved) : INITIAL_GSTR2B_RECORDS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_AUDIT');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'aud-01',
        timestamp: new Date().toISOString(),
        userId: 'u-owner',
        userName: 'Arun Kumar',
        role: 'BUSINESS_OWNER',
        action: 'SYSTEM_BOOT',
        entityType: 'SETTINGS',
        entityId: 'SYS',
        description: 'SmartGST ERP initialized with 6-month synthetic manufacturing ledger.',
      },
    ];
  });

  const [activeGodownFilter, setActiveGodownFilter] = useState<'ALL' | GodownId>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_ITEMS', JSON.stringify(items));
    localStorage.setItem(STORAGE_KEY + '_VENDORS', JSON.stringify(vendors));
    localStorage.setItem(STORAGE_KEY + '_CUSTOMERS', JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEY + '_GODOWNS', JSON.stringify(godowns));
    localStorage.setItem(STORAGE_KEY + '_TAX', JSON.stringify(taxConfigs));
    localStorage.setItem(STORAGE_KEY + '_POS', JSON.stringify(purchaseOrders));
    localStorage.setItem(STORAGE_KEY + '_GRNS', JSON.stringify(goodsReceiptNotes));
    localStorage.setItem(STORAGE_KEY + '_LEDGER', JSON.stringify(stockLedger));
    localStorage.setItem(STORAGE_KEY + '_INVOICES', JSON.stringify(vendorInvoices));
    localStorage.setItem(STORAGE_KEY + '_CINVOICES', JSON.stringify(customerInvoices));
    localStorage.setItem(STORAGE_KEY + '_PAYMENTS', JSON.stringify(paymentTransactions));
    localStorage.setItem(STORAGE_KEY + '_GSTR2B', JSON.stringify(gstr2bRecords));
    localStorage.setItem(STORAGE_KEY + '_AUDIT', JSON.stringify(auditLogs));
    localStorage.setItem(STORAGE_KEY + '_ACCOUNTS', JSON.stringify(accounts));
  }, [
    items,
    vendors,
    customers,
    godowns,
    taxConfigs,
    purchaseOrders,
    goodsReceiptNotes,
    stockLedger,
    vendorInvoices,
    customerInvoices,
    paymentTransactions,
    gstr2bRecords,
    auditLogs,
    accounts,
  ]);

  const notify = (type: ToastNotification['type'], title: string, message: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissNotification(id);
    }, 5000);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const logAudit = (
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    description: string,
    changes?: AuditLog['changes']
  ) => {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action,
      entityType,
      entityId,
      description,
      changes,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const setCurrentUserRole = (role: UserRole) => {
    const newUser = DEFAULT_USERS[role];
    const sessionUser: UserSession = {
      ...newUser,
      companyName: currentUser.companyName || 'Karnataka Electrical Components Ltd',
      companyGstin: currentUser.companyGstin || '29ABCDE1234F1Z5',
    };
    setCurrentUser(sessionUser);
    localStorage.setItem(STORAGE_KEY + '_AUTH_SESSION', JSON.stringify(sessionUser));
    logAudit('ROLE_SWITCH', 'SETTINGS', role, `Switched session role to ${role} (${newUser.name})`);
    notify('info', 'Role Switched', `Active view updated to ${role.replace('_', ' ')} (${newUser.name})`);
  };

  const login = (email: string, password: string): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!account) {
      return { success: false, message: 'No account registered with this email address.' };
    }
    if (account.password !== password) {
      return { success: false, message: 'Invalid password. Please check your credentials.' };
    }
    const session: UserSession = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      godownAccess: account.godownAccess || 'ALL',
      companyName: account.companyName || 'Karnataka Electrical Components Ltd',
      companyGstin: account.companyGstin || '29ABCDE1234F1Z5',
    };
    setCurrentUser(session);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY + '_AUTH_SESSION', JSON.stringify(session));
    logAudit('USER_LOGIN', 'SETTINGS', session.id, `User ${session.name} (${session.role}) signed in successfully.`);
    notify('success', 'Authentication Successful', `Welcome back, ${session.name}! (${session.role.replace('_', ' ')})`);
    return { success: true };
  };

  const signup = (data: SignupInput): { success: boolean; message?: string } => {
    const validation = validateSignupInput(data);
    if (!validation.valid) {
      return { success: false, message: validation.errors[0] || 'Invalid sign up input.' };
    }
    const cleanEmail = data.email.trim().toLowerCase();
    if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'An account with this email address already exists.' };
    }
    const newAccount: UserAccount = {
      id: `u-${Date.now()}`,
      name: data.name.trim(),
      email: cleanEmail,
      role: data.role,
      godownAccess: data.godownAccess || 'ALL',
      companyName: data.companyName?.trim() || 'Karnataka Electrical Components Ltd',
      companyGstin: data.companyGstin?.trim().toUpperCase() || '29ABCDE1234F1Z5',
      password: data.password,
      createdAt: new Date().toISOString(),
    };
    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);
    localStorage.setItem(STORAGE_KEY + '_ACCOUNTS', JSON.stringify(updatedAccounts));

    const session: UserSession = {
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      role: newAccount.role,
      godownAccess: newAccount.godownAccess,
      companyName: newAccount.companyName,
      companyGstin: newAccount.companyGstin,
    };
    setCurrentUser(session);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY + '_AUTH_SESSION', JSON.stringify(session));
    logAudit('USER_SIGNUP', 'SETTINGS', newAccount.id, `New user ${newAccount.name} registered as ${newAccount.role}.`);
    notify('success', 'Account Registered', `Welcome to SmartGST ERP, ${newAccount.name}!`);
    return { success: true };
  };

  const logout = () => {
    logAudit('USER_LOGOUT', 'SETTINGS', currentUser.id, `User ${currentUser.name} signed out.`);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY + '_AUTH_SESSION');
    notify('info', 'Signed Out', 'You have been securely signed out.');
  };

  // Master Data
  const addItem = (newItem: Omit<ItemMaster, 'id'>) => {
    const id = `item-${Date.now()}`;
    const item: ItemMaster = { ...newItem, id };
    setItems((prev) => [...prev, item]);
    logAudit('CREATE_ITEM', 'SETTINGS', item.sku, `Created Item SKU: ${item.sku} - ${item.name}`);
    notify('success', 'Item Created', `Item ${item.name} (${item.sku}) added successfully.`);
  };

  const updateItem = (id: string, updates: Partial<ItemMaster>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    logAudit('UPDATE_ITEM', 'SETTINGS', id, `Updated Item specifications`);
    notify('success', 'Item Updated', 'Master item specifications saved.');
  };

  const addVendor = (newVendor: Omit<VendorMaster, 'id'>) => {
    const id = `v-${Date.now()}`;
    const vendor: VendorMaster = { ...newVendor, id };
    setVendors((prev) => [...prev, vendor]);
    logAudit('CREATE_VENDOR', 'SETTINGS', vendor.vendorCode, `Added vendor: ${vendor.name} (${vendor.gstin})`);
    notify('success', 'Vendor Added', `Vendor ${vendor.name} registered.`);
  };

  const addCustomer = (newCustomer: Omit<CustomerMaster, 'id'>) => {
    const id = `cust-${Date.now()}`;
    const customer: CustomerMaster = { ...newCustomer, id };
    setCustomers((prev) => [...prev, customer]);
    logAudit('CREATE_CUSTOMER', 'SETTINGS', customer.customerCode, `Added customer: ${customer.name}`);
    notify('success', 'Customer Added', `Customer ${customer.name} registered.`);
  };

  // Procurement
  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `po-${Date.now()}`;
    const po: PurchaseOrder = {
      ...poData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPurchaseOrders((prev) => [po, ...prev]);
    logAudit('PO_CREATE', 'PURCHASE_ORDER', po.poNumber, `Created PO ${po.poNumber} for vendor ${po.vendorName}`);
    notify('success', 'PO Created', `Purchase Order ${po.poNumber} saved in ${po.status} status.`);
  };

  const updatePOStatus = (poId: string, status: POStatus, reason?: string): boolean => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return false;

    // RBAC check: only Owner or Finance Manager can approve POs
    if (status === 'Approved' && currentUser.role !== 'BUSINESS_OWNER' && currentUser.role !== 'FINANCE_MANAGER' && currentUser.role !== 'PURCHASE_MANAGER') {
      notify('error', 'Permission Denied', 'Only Purchase Manager, Finance Manager, or Business Owner can approve POs.');
      return false;
    }

    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? {
              ...p,
              status,
              approvedBy: status === 'Approved' ? currentUser.name : p.approvedBy,
              approvedAt: status === 'Approved' ? new Date().toISOString() : p.approvedAt,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    logAudit(
      'PO_STATUS_CHANGE',
      'PURCHASE_ORDER',
      po.poNumber,
      `Changed PO ${po.poNumber} status to ${status}${reason ? ` Reason: ${reason}` : ''}`
    );
    notify('success', 'PO Status Updated', `PO ${po.poNumber} transitioned to ${status}.`);
    return true;
  };

  // Goods Receipt (GRN) posting with atomic inventory ledger creation
  const postGoodsReceipt = (
    grnData: Omit<GoodsReceiptNote, 'id' | 'createdAt' | 'status' | 'postedAt'>
  ): { success: boolean; message: string } => {
    // Check PO validity
    const po = purchaseOrders.find((p) => p.id === grnData.poId);
    if (!po) {
      return { success: false, message: 'Invalid Purchase Order reference.' };
    }
    if (po.status !== 'Approved' && po.status !== 'Partially Received') {
      return { success: false, message: `Cannot receive goods against a PO with status "${po.status}".` };
    }

    // Check duplicate GRN number
    if (goodsReceiptNotes.some((g) => g.grnNumber.trim().toLowerCase() === grnData.grnNumber.trim().toLowerCase())) {
      return { success: false, message: `GRN number ${grnData.grnNumber} already exists in records.` };
    }

    const now = new Date().toISOString();
    const grnId = `grn-${Date.now()}`;
    const newGRN: GoodsReceiptNote = {
      ...grnData,
      id: grnId,
      status: 'Posted',
      postedAt: now,
      createdAt: now,
    };

    // Prepare ledger entries for each accepted item line
    const newLedgerEntries: StockLedgerEntry[] = [];
    const updatedPOLines = [...po.lines];

    for (const line of grnData.lines) {
      if (line.acceptedQty > 0) {
        const currentGodownBal = calculateItemStockFromLedger(line.itemId, stockLedger, grnData.destinationGodownId);
        const newBal = currentGodownBal + line.acceptedQty;

        newLedgerEntries.push({
          id: `ledg-${Date.now()}-${line.sku}`,
          date: grnData.receiptDate,
          itemId: line.itemId,
          sku: line.sku,
          godownId: grnData.destinationGodownId,
          movementType: 'GRN_RECEIPT',
          referenceDocType: 'GRN',
          referenceDocId: grnId,
          referenceNumber: grnData.grnNumber,
          qtyIn: line.acceptedQty,
          qtyOut: 0,
          balanceAfter: newBal,
          unitCost: line.unitPrice,
          totalValuation: round2(line.acceptedQty * line.unitPrice),
          remarks: `GRN receipt from ${grnData.vendorName} against ${grnData.poNumber}`,
          performedBy: currentUser.name,
          timestamp: now,
        });
      }

      // Update PO line received quantity
      const targetPOLine = updatedPOLines.find((pl) => pl.id === line.poLineId || pl.sku === line.sku);
      if (targetPOLine) {
        targetPOLine.receivedQuantity = (targetPOLine.receivedQuantity || 0) + line.acceptedQty;
      }
    }

    // Determine new PO status (Partially vs Fully Received)
    const allReceived = updatedPOLines.every((l) => l.receivedQuantity >= l.quantity);
    const someReceived = updatedPOLines.some((l) => l.receivedQuantity > 0);
    const newPOStatus: POStatus = allReceived ? 'Fully Received' : someReceived ? 'Partially Received' : po.status;

    // Execute atomic update
    setGoodsReceiptNotes((prev) => [newGRN, ...prev]);
    setStockLedger((prev) => [...prev, ...newLedgerEntries]);
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === po.id
          ? {
              ...p,
              status: newPOStatus,
              lines: updatedPOLines,
              updatedAt: now,
            }
          : p
      )
    );

    logAudit(
      'GRN_POST',
      'GOODS_RECEIPT',
      newGRN.grnNumber,
      `Posted GRN ${newGRN.grnNumber} for PO ${po.poNumber}. Added ${newLedgerEntries.length} lines to inventory ledger in ${grnData.destinationGodownId}.`
    );

    notify('success', 'GRN Posted', `Goods Receipt ${newGRN.grnNumber} posted and inventory updated.`);
    return { success: true, message: 'GRN posted and inventory balances updated successfully.' };
  };

  // Inter-Godown Stock Transfer
  const transferStock = (
    itemId: string,
    fromGodown: GodownId,
    toGodown: GodownId,
    quantity: number,
    remarks: string
  ): { success: boolean; message: string } => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Item not found.' };

    if (fromGodown === toGodown) {
      return { success: false, message: 'Source and Destination godowns cannot be identical.' };
    }

    const availableBal = calculateItemStockFromLedger(itemId, stockLedger, fromGodown);
    if (quantity <= 0 || quantity > availableBal) {
      return {
        success: false,
        message: `Insufficient stock in ${fromGodown}. Available: ${availableBal}, Requested: ${quantity}`,
      };
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const transferRef = `TRF-${Date.now().toString().slice(-6)}`;

    const outEntry: StockLedgerEntry = {
      id: `ledg-out-${Date.now()}`,
      date: today,
      itemId,
      sku: item.sku,
      godownId: fromGodown,
      movementType: 'GODOWN_TRANSFER_OUT',
      referenceDocType: 'TRANSFER',
      referenceDocId: transferRef,
      referenceNumber: transferRef,
      qtyIn: 0,
      qtyOut: quantity,
      balanceAfter: availableBal - quantity,
      unitCost: item.standardCost,
      totalValuation: round2(quantity * item.standardCost),
      remarks: `Transfer to ${toGodown}: ${remarks}`,
      performedBy: currentUser.name,
      timestamp: now,
    };

    const destBal = calculateItemStockFromLedger(itemId, stockLedger, toGodown);
    const inEntry: StockLedgerEntry = {
      id: `ledg-in-${Date.now()}`,
      date: today,
      itemId,
      sku: item.sku,
      godownId: toGodown,
      movementType: 'GODOWN_TRANSFER_IN',
      referenceDocType: 'TRANSFER',
      referenceDocId: transferRef,
      referenceNumber: transferRef,
      qtyIn: quantity,
      qtyOut: 0,
      balanceAfter: destBal + quantity,
      unitCost: item.standardCost,
      totalValuation: round2(quantity * item.standardCost),
      remarks: `Transfer from ${fromGodown}: ${remarks}`,
      performedBy: currentUser.name,
      timestamp: now,
    };

    setStockLedger((prev) => [...prev, outEntry, inEntry]);
    logAudit(
      'STOCK_TRANSFER',
      'INVENTORY',
      transferRef,
      `Transferred ${quantity} ${item.uom} of ${item.sku} from ${fromGodown} to ${toGodown}`
    );
    notify('success', 'Transfer Completed', `Stock transfer ${transferRef} of ${quantity} ${item.uom} successful.`);
    return { success: true, message: 'Stock transfer recorded successfully.' };
  };

  // Stock Adjustment (Physical audit count variance)
  const adjustStock = (
    itemId: string,
    godownId: GodownId,
    quantity: number,
    isAddition: boolean,
    reason: string
  ): { success: boolean; message: string } => {
    // Only Warehouse Manager, Owner, or Admin can adjust stock
    if (currentUser.role !== 'WAREHOUSE_MANAGER' && currentUser.role !== 'BUSINESS_OWNER' && currentUser.role !== 'ADMINISTRATOR') {
      return { success: false, message: 'Permission denied: Requires Warehouse Manager or Owner role.' };
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Item not found.' };

    const currentBal = calculateItemStockFromLedger(itemId, stockLedger, godownId);
    if (!isAddition && quantity > currentBal) {
      return { success: false, message: `Cannot reduce more stock than available (${currentBal} ${item.uom}).` };
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const adjRef = `ADJ-${Date.now().toString().slice(-6)}`;
    const newBal = isAddition ? currentBal + quantity : currentBal - quantity;

    const entry: StockLedgerEntry = {
      id: `ledg-adj-${Date.now()}`,
      date: today,
      itemId,
      sku: item.sku,
      godownId,
      movementType: 'STOCK_ADJUSTMENT',
      referenceDocType: 'ADJUSTMENT',
      referenceDocId: adjRef,
      referenceNumber: adjRef,
      qtyIn: isAddition ? quantity : 0,
      qtyOut: isAddition ? 0 : quantity,
      balanceAfter: newBal,
      unitCost: item.standardCost,
      totalValuation: round2(quantity * item.standardCost),
      remarks: `Stock audit adjustment: ${reason}`,
      performedBy: currentUser.name,
      timestamp: now,
    };

    setStockLedger((prev) => [...prev, entry]);
    logAudit(
      'STOCK_ADJUSTMENT',
      'INVENTORY',
      adjRef,
      `Adjusted ${item.sku} in ${godownId} by ${isAddition ? '+' : '-'}${quantity} ${item.uom}. Reason: ${reason}`
    );
    notify('success', 'Adjustment Recorded', `Stock adjustment ${adjRef} recorded in ledger.`);
    return { success: true, message: 'Adjustment recorded successfully.' };
  };

  // Vendor Invoice & 3-Way Matching
  const createVendorInvoice = (
    invData: Omit<VendorInvoice, 'id' | 'createdAt' | 'matchStatus' | 'discrepancies' | 'amountPaid' | 'paymentStatus'>
  ) => {
    const id = `inv-${Date.now()}`;
    const initialInvoice: VendorInvoice = {
      ...invData,
      id,
      matchStatus: 'Pending Review',
      discrepancies: [],
      amountPaid: 0,
      paymentStatus: 'Unpaid',
      createdAt: new Date().toISOString(),
    };

    // Perform 3-way match immediately
    const match = performThreeWayMatch(initialInvoice, purchaseOrders, goodsReceiptNotes, vendorInvoices);
    const invoiceWithMatch: VendorInvoice = {
      ...initialInvoice,
      matchStatus: match.matchStatus,
      discrepancies: match.discrepancies,
      approvalStatus: match.matchStatus === 'Matched' ? 'Approved for Payment' : 'Pending Review',
    };

    setVendorInvoices((prev) => [invoiceWithMatch, ...prev]);
    logAudit(
      'INVOICE_CREATE',
      'VENDOR_INVOICE',
      invoiceWithMatch.invoiceNumber,
      `Created Vendor Invoice ${invoiceWithMatch.invoiceNumber}. 3-Way Match Result: ${match.matchStatus}`
    );

    if (match.matchStatus === 'Matched') {
      notify('success', 'Invoice Matched', `Invoice ${invoiceWithMatch.invoiceNumber} verified & matched!`);
    } else {
      notify('warning', 'Discrepancy Detected', `Invoice ${invoiceWithMatch.invoiceNumber} has matching issues: ${match.matchStatus}.`);
    }
  };

  const runMatchForInvoice = (invoiceId: string) => {
    const inv = vendorInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const match = performThreeWayMatch(inv, purchaseOrders, goodsReceiptNotes, vendorInvoices);
    setVendorInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              matchStatus: match.matchStatus,
              discrepancies: match.discrepancies,
            }
          : i
      )
    );

    logAudit('RECHECK_MATCH', 'VENDOR_INVOICE', inv.invoiceNumber, `Recomputed 3-way match: ${match.matchStatus}`);
    notify('info', 'Matching Complete', `Invoice ${inv.invoiceNumber} match status: ${match.matchStatus}`);
  };

  const updateInvoiceApproval = (
    invoiceId: string,
    approvalStatus: InvoicePaymentApprovalStatus,
    notes: string
  ): boolean => {
    const inv = vendorInvoices.find((i) => i.id === invoiceId);
    if (!inv) return false;

    // RBAC: Only Finance Manager or Owner can approve disputed invoices
    if (inv.matchStatus !== 'Matched' && approvalStatus === 'Approved for Payment') {
      if (currentUser.role !== 'BUSINESS_OWNER' && currentUser.role !== 'FINANCE_MANAGER') {
        notify('error', 'Unauthorized Override', 'Only Business Owner or Finance Manager can authorize payment for disputed invoices.');
        return false;
      }
    }

    setVendorInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              approvalStatus,
              reviewedBy: currentUser.name,
              reviewNotes: notes,
              resolvedAt: new Date().toISOString(),
            }
          : i
      )
    );

    logAudit(
      'INVOICE_APPROVAL_UPDATE',
      'VENDOR_INVOICE',
      inv.invoiceNumber,
      `Invoice ${inv.invoiceNumber} marked as ${approvalStatus}. Notes: ${notes}`
    );
    notify('success', 'Approval Updated', `Invoice status set to ${approvalStatus}`);
    return true;
  };

  // Payments
  const recordVendorPayment = (
    paymentData: Omit<PaymentTransaction, 'id' | 'paymentNumber' | 'createdAt' | 'partyType'>
  ): { success: boolean; message: string } => {
    const inv = vendorInvoices.find((i) => i.id === paymentData.invoiceId);
    if (!inv) return { success: false, message: 'Vendor invoice not found.' };

    if (inv.approvalStatus !== 'Approved for Payment') {
      return {
        success: false,
        message: `Cannot pay unapproved or disputed invoice (Status: ${inv.approvalStatus}). Authorized approval required.`,
      };
    }

    const remainingDue = round2(inv.grandTotal - inv.amountPaid);
    if (paymentData.amount <= 0 || paymentData.amount > remainingDue) {
      return {
        success: false,
        message: `Invalid payment amount: ₹${paymentData.amount}. Remaining balance due is ₹${remainingDue}.`,
      };
    }

    const pmtId = `pay-${Date.now()}`;
    const pmtNumber = `PMT-${Date.now().toString().slice(-6)}`;
    const newPaidTotal = round2(inv.amountPaid + paymentData.amount);
    const newPmtStatus = newPaidTotal >= inv.grandTotal ? 'Fully Paid' : 'Partially Paid';

    const newPayment: PaymentTransaction = {
      ...paymentData,
      id: pmtId,
      paymentNumber: pmtNumber,
      partyType: 'VENDOR',
      createdAt: new Date().toISOString(),
    };

    setPaymentTransactions((prev) => [newPayment, ...prev]);
    setVendorInvoices((prev) =>
      prev.map((i) =>
        i.id === inv.id
          ? {
              ...i,
              amountPaid: newPaidTotal,
              paymentStatus: newPmtStatus,
            }
          : i
      )
    );

    logAudit(
      'PAYMENT_RECORD',
      'PAYMENT',
      pmtNumber,
      `Paid ₹${paymentData.amount} against ${inv.invoiceNumber} via ${paymentData.paymentMode} (${paymentData.referenceNumber})`
    );

    notify('success', 'Payment Recorded', `Payment of ₹${paymentData.amount} recorded for ${inv.vendorName}`);
    return { success: true, message: 'Payment recorded successfully.' };
  };

  const recordCustomerReceipt = (
    invoiceId: string,
    amount: number,
    paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'UPI',
    refNo: string,
    notes?: string
  ): { success: boolean; message: string } => {
    const cinv = customerInvoices.find((c) => c.id === invoiceId);
    if (!cinv) return { success: false, message: 'Customer invoice not found.' };

    const remaining = round2(cinv.grandTotal - cinv.amountReceived);
    if (amount <= 0 || amount > remaining) {
      return { success: false, message: `Receipt amount cannot exceed remaining balance of ₹${remaining}.` };
    }

    const newReceived = round2(cinv.amountReceived + amount);
    const newStatus = newReceived >= cinv.grandTotal ? 'Fully Paid' : 'Partially Paid';

    const pmtId = `rec-${Date.now()}`;
    const pmtNumber = `REC-${Date.now().toString().slice(-6)}`;

    const newPayment: PaymentTransaction = {
      id: pmtId,
      paymentNumber: pmtNumber,
      paymentDate: new Date().toISOString().split('T')[0],
      invoiceId: cinv.id,
      invoiceNumber: cinv.invoiceNumber,
      partyType: 'CUSTOMER',
      partyId: cinv.customerId,
      partyName: cinv.customerName,
      amount,
      paymentMode,
      referenceNumber: refNo,
      bankAccount: 'HDFC Corporate Current A/c - 0029',
      notes,
      recordedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    setPaymentTransactions((prev) => [newPayment, ...prev]);
    setCustomerInvoices((prev) =>
      prev.map((c) =>
        c.id === cinv.id
          ? {
              ...c,
              amountReceived: newReceived,
              paymentStatus: newStatus,
            }
          : c
      )
    );

    logAudit(
      'CUSTOMER_RECEIPT',
      'PAYMENT',
      pmtNumber,
      `Received ₹${amount} from customer ${cinv.customerName} against ${cinv.invoiceNumber}`
    );

    notify('success', 'Receipt Recorded', `Customer receipt of ₹${amount} credited.`);
    return { success: true, message: 'Receipt recorded successfully.' };
  };

  // Bulk Import
  const importDataset = (entityType: string, rows: any[]): { total: number; imported: number; errors: string[] } => {
    const errors: string[] = [];
    let imported = 0;

    if (entityType === 'ITEMS') {
      const validItems: ItemMaster[] = [];
      rows.forEach((row, idx) => {
        if (!row.sku || !row.name) {
          errors.push(`Row ${idx + 1}: Missing SKU or Name`);
          return;
        }
        validItems.push({
          id: `item-imp-${Date.now()}-${idx}`,
          sku: String(row.sku).trim(),
          name: String(row.name).trim(),
          description: String(row.description || ''),
          category: row.category || 'Electrical Components',
          uom: row.uom || 'PCS',
          hsnCode: String(row.hsnCode || '8536'),
          taxRate: Number(row.taxRate) || 18,
          reorderLevel: Number(row.reorderLevel) || 100,
          reorderQuantity: Number(row.reorderQuantity) || 200,
          standardCost: Number(row.standardCost) || 50,
          active: true,
        });
        imported++;
      });
      if (validItems.length > 0) setItems((prev) => [...prev, ...validItems]);
    } else if (entityType === 'VENDORS') {
      const validVendors: VendorMaster[] = [];
      rows.forEach((row, idx) => {
        if (!row.name || !row.gstin) {
          errors.push(`Row ${idx + 1}: Missing Vendor Name or GSTIN`);
          return;
        }
        validVendors.push({
          id: `v-imp-${Date.now()}-${idx}`,
          vendorCode: row.vendorCode || `VND-IMP-${idx + 1}`,
          name: String(row.name).trim(),
          gstin: String(row.gstin).trim().toUpperCase(),
          state: row.state || 'Karnataka',
          stateCode: String(row.gstin).substring(0, 2) || '29',
          address: row.address || '',
          contactPerson: row.contactPerson || '',
          phone: row.phone || '',
          email: row.email || '',
          paymentTermsDays: Number(row.paymentTermsDays) || 30,
          bankNameMasked: 'Bank (•••• 1234)',
          bankAccountMasked: '••••••••1234',
          active: true,
        });
        imported++;
      });
      if (validVendors.length > 0) setVendors((prev) => [...prev, ...validVendors]);
    }

    logAudit('DATA_IMPORT', 'DATA_IMPORT', entityType, `Imported ${imported} of ${rows.length} rows for ${entityType}`);
    return { total: rows.length, imported, errors };
  };

  // Reset to initial demo dataset
  const resetToSeedData = () => {
    localStorage.clear();
    setItems(INITIAL_ITEMS);
    setVendors(INITIAL_VENDORS);
    setCustomers(INITIAL_CUSTOMERS);
    setGodowns(INITIAL_GODOWNS);
    setTaxConfigs(INITIAL_TAX_CONFIG);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setGoodsReceiptNotes(INITIAL_GRNS);
    setStockLedger(INITIAL_LEDGER_ENTRIES);
    setVendorInvoices(INITIAL_VENDOR_INVOICES);
    setCustomerInvoices(INITIAL_CUSTOMER_INVOICES);
    setPaymentTransactions(INITIAL_PAYMENT_TRANSACTIONS);
    setGstr2bRecords(INITIAL_GSTR2B_RECORDS);
    setAuditLogs([
      {
        id: `aud-reset-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action: 'DATASET_RESET',
        entityType: 'SETTINGS',
        entityId: 'SYSTEM',
        description: 'Restored official 6-month synthetic demonstration dataset with realistic anomalies.',
      },
    ]);
    notify('success', 'Reset Completed', 'Database restored to initial 6-month hackathon test records.');
  };

  // Dynamically calculate KPIs from actual records (NEVER hardcoded!)
  const kpis = useMemo(() => {
    // 1. Total inventory value & low-stock count
    let totalInventoryValue = 0;
    let lowStockCount = 0;

    items.forEach((item) => {
      const summary = getItemStockSummary(item, stockLedger);
      totalInventoryValue += summary.totalValuation;
      if (summary.status === 'Low Stock' || summary.status === 'Critical') {
        lowStockCount++;
      }
    });

    // 2. Open POs (Draft, Submitted, Approved, Partially Received)
    const openPOCount = purchaseOrders.filter(
      (p) => p.status !== 'Closed' && p.status !== 'Cancelled' && p.status !== 'Fully Received'
    ).length;

    // 3. Pending GRNs
    const pendingGRNCount = goodsReceiptNotes.filter((g) => g.status === 'Draft').length;

    // 4. Invoices awaiting review & detected mismatches
    const invoicesAwaitingReviewCount = vendorInvoices.filter(
      (inv) => inv.approvalStatus === 'Pending Review'
    ).length;

    const detectedMismatchesCount = vendorInvoices.filter(
      (inv) => inv.matchStatus !== 'Matched'
    ).length;

    // 5. Approved Supplier Payables (Only Approved for Payment, minus amountPaid)
    let approvedSupplierPayables = 0;
    let disputedInvoiceValue = 0;

    vendorInvoices.forEach((inv) => {
      const balance = round2(inv.grandTotal - inv.amountPaid);
      if (inv.approvalStatus === 'Approved for Payment' && balance > 0) {
        approvedSupplierPayables += balance;
      } else if (inv.approvalStatus === 'Disputed') {
        disputedInvoiceValue += inv.grandTotal;
      }
    });

    // 6. Customer Receivables (Unpaid & Partially Paid customer invoices)
    let customerReceivables = 0;
    let overdueReceivables = 0;
    const today = new Date().toISOString().split('T')[0];

    customerInvoices.forEach((cinv) => {
      const outstanding = round2(cinv.grandTotal - cinv.amountReceived);
      if (outstanding > 0 && cinv.status === 'Finalized') {
        customerReceivables += outstanding;
        if (cinv.dueDate < today) {
          overdueReceivables += outstanding;
        }
      }
    });

    // 7. GST Discrepancies Count (reconciled against GSTR-2B)
    const itcRecon = reconcileBooksWithGSTR2B(vendorInvoices, gstr2bRecords);
    const gstDiscrepanciesCount = itcRecon.filter((r) => r.eligibilityStatus !== 'Eligible').length;

    // 8. Today Net Position = Customer Receivables - Approved Payables
    const todayNetPosition = round2(customerReceivables - approvedSupplierPayables);

    return {
      totalInventoryValue: round2(totalInventoryValue),
      totalStockItemsCount: items.length,
      lowStockCount,
      openPOCount,
      pendingGRNCount,
      invoicesAwaitingReviewCount,
      detectedMismatchesCount,
      approvedSupplierPayables: round2(approvedSupplierPayables),
      disputedInvoiceValue: round2(disputedInvoiceValue),
      customerReceivables: round2(customerReceivables),
      overdueReceivables: round2(overdueReceivables),
      gstDiscrepanciesCount,
      todayNetPosition,
    };
  }, [items, stockLedger, purchaseOrders, goodsReceiptNotes, vendorInvoices, customerInvoices, gstr2bRecords]);

  return (
    <ERPContext.Provider
      value={{
        items,
        vendors,
        customers,
        godowns,
        taxConfigs,
        purchaseOrders,
        goodsReceiptNotes,
        stockLedger,
        vendorInvoices,
        customerInvoices,
        paymentTransactions,
        gstr2bRecords,
        auditLogs,
        currentUser,
        isAuthenticated,
        registeredAccounts: accounts,
        activeGodownFilter,
        searchTerm,
        notifications,
        login,
        signup,
        logout,
        setCurrentUserRole,
        setActiveGodownFilter,
        setSearchTerm,
        dismissNotification,
        notify,
        addItem,
        updateItem,
        addVendor,
        addCustomer,
        createPurchaseOrder,
        updatePOStatus,
        postGoodsReceipt,
        transferStock,
        adjustStock,
        createVendorInvoice,
        runMatchForInvoice,
        updateInvoiceApproval,
        recordVendorPayment,
        recordCustomerReceipt,
        importDataset,
        resetToSeedData,
        kpis,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
