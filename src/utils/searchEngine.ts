/**
 * Global Search Engine for SmartGST ERP
 * Searches across Purchase Orders, Inventory items, and Invoices by ID, Number, or Name.
 */

import { PurchaseOrder, ItemMaster, VendorInvoice, CustomerInvoice } from '../types/erp';

export interface SearchResultPO {
  type: 'PO';
  id: string;
  number: string;
  title: string;
  subtitle: string;
  status: string;
  amount: number;
  date: string;
}

export interface SearchResultItem {
  type: 'ITEM';
  id: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  hsnCode: string;
  standardCost: number;
}

export interface SearchResultInvoice {
  type: 'INVOICE';
  id: string;
  invoiceNumber: string;
  partyName: string;
  partyType: 'Vendor' | 'Customer';
  matchStatus?: string;
  approvalStatus?: string;
  amount: number;
  date: string;
}

export interface GlobalSearchResults {
  query: string;
  purchaseOrders: SearchResultPO[];
  items: SearchResultItem[];
  invoices: SearchResultInvoice[];
  totalMatches: number;
}

/**
 * Searches across Purchase Orders, Inventory items, and Invoices
 * Matching by ID, code/number, or name (case-insensitive substring match).
 */
export function searchGlobalRecords(
  query: string,
  data: {
    purchaseOrders: PurchaseOrder[];
    items: ItemMaster[];
    vendorInvoices: VendorInvoice[];
    customerInvoices?: CustomerInvoice[];
  }
): GlobalSearchResults {
  const cleanQuery = (query || '').trim().toLowerCase();

  if (!cleanQuery) {
    return {
      query: '',
      purchaseOrders: [],
      items: [],
      invoices: [],
      totalMatches: 0,
    };
  }

  // 1. Search Purchase Orders
  const matchingPOs: SearchResultPO[] = data.purchaseOrders
    .filter((po) => {
      const matchId = po.id.toLowerCase().includes(cleanQuery);
      const matchNumber = po.poNumber.toLowerCase().includes(cleanQuery);
      const matchVendor = po.vendorName.toLowerCase().includes(cleanQuery);
      const matchLine = po.lines?.some(
        (l) =>
          l.sku.toLowerCase().includes(cleanQuery) ||
          l.itemName.toLowerCase().includes(cleanQuery)
      );
      return matchId || matchNumber || matchVendor || matchLine;
    })
    .slice(0, 8)
    .map((po) => ({
      type: 'PO',
      id: po.id,
      number: po.poNumber,
      title: `${po.poNumber} • ${po.vendorName}`,
      subtitle: `${po.lines?.length || 0} items ordered • ${po.destinationGodownId === 'GODOWN_A' ? 'Godown A' : 'Godown B'}`,
      status: po.status,
      amount: po.grandTotal,
      date: po.orderDate,
    }));

  // 2. Search Inventory Items
  const matchingItems: SearchResultItem[] = data.items
    .filter((item) => {
      const matchId = item.id.toLowerCase().includes(cleanQuery);
      const matchSku = item.sku.toLowerCase().includes(cleanQuery);
      const matchName = item.name.toLowerCase().includes(cleanQuery);
      const matchCategory = item.category.toLowerCase().includes(cleanQuery);
      const matchHsn = item.hsnCode?.toLowerCase().includes(cleanQuery);
      return matchId || matchSku || matchName || matchCategory || matchHsn;
    })
    .slice(0, 8)
    .map((item) => ({
      type: 'ITEM',
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      uom: item.uom,
      hsnCode: item.hsnCode,
      standardCost: item.standardCost,
    }));

  // 3. Search Invoices (Vendor Invoices + Customer Invoices)
  const vendorMatches: SearchResultInvoice[] = data.vendorInvoices
    .filter((inv) => {
      const matchId = inv.id.toLowerCase().includes(cleanQuery);
      const matchNumber = inv.invoiceNumber.toLowerCase().includes(cleanQuery);
      const matchVendor = inv.vendorName.toLowerCase().includes(cleanQuery);
      const matchPO = inv.poNumber?.toLowerCase().includes(cleanQuery);
      const matchGRN = inv.grnNumber?.toLowerCase().includes(cleanQuery);
      const matchItems = inv.items?.some(
        (it) =>
          it.sku.toLowerCase().includes(cleanQuery) ||
          it.itemName.toLowerCase().includes(cleanQuery)
      );
      return matchId || matchNumber || matchVendor || matchPO || matchGRN || matchItems;
    })
    .slice(0, 8)
    .map((inv) => ({
      type: 'INVOICE',
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.vendorName,
      partyType: 'Vendor',
      matchStatus: inv.matchStatus,
      approvalStatus: inv.approvalStatus,
      amount: inv.grandTotal,
      date: inv.invoiceDate,
    }));

  const customerMatches: SearchResultInvoice[] = (data.customerInvoices || [])
    .filter((cinv) => {
      const matchId = cinv.id.toLowerCase().includes(cleanQuery);
      const matchNumber = cinv.invoiceNumber.toLowerCase().includes(cleanQuery);
      const matchCustomer = cinv.customerName.toLowerCase().includes(cleanQuery);
      return matchId || matchNumber || matchCustomer;
    })
    .slice(0, 5)
    .map((cinv) => ({
      type: 'INVOICE',
      id: cinv.id,
      invoiceNumber: cinv.invoiceNumber,
      partyName: cinv.customerName,
      partyType: 'Customer',
      matchStatus: cinv.status,
      amount: cinv.grandTotal,
      date: cinv.invoiceDate,
    }));

  const combinedInvoices = [...vendorMatches, ...customerMatches].slice(0, 8);

  const totalMatches = matchingPOs.length + matchingItems.length + combinedInvoices.length;

  return {
    query: cleanQuery,
    purchaseOrders: matchingPOs,
    items: matchingItems,
    invoices: combinedInvoices,
    totalMatches,
  };
}
