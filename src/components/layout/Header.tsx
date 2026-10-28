import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { GodownId, UserRole } from '../../types/erp';
import { NavTab } from './Sidebar';
import { searchGlobalRecords, SearchResultPO, SearchResultItem, SearchResultInvoice } from '../../utils/searchEngine';
import { formatINR } from '../../utils/math';
import {
  Menu,
  Search,
  Warehouse,
  ShieldCheck,
  RotateCcw,
  Calendar,
  AlertTriangle,
  LogOut,
  X,
  ShoppingCart,
  Boxes,
  Receipt,
  ChevronRight,
  ExternalLink,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onNavigate?: (tab: NavTab) => void;
  title: string;
  subtitle?: string;
}

const ROLES: { id: UserRole; label: string }[] = [
  { id: 'BUSINESS_OWNER', label: 'Business Owner (Arun Kumar)' },
  { id: 'PURCHASE_MANAGER', label: 'Purchase Manager (Vikram Rao)' },
  { id: 'WAREHOUSE_MANAGER', label: 'Warehouse Manager (Ramesh Gowda)' },
  { id: 'ACCOUNTS_EXECUTIVE', label: 'Accounts Executive (Kavita Nayak)' },
  { id: 'FINANCE_MANAGER', label: 'Finance Manager (Sunil Mehta)' },
  { id: 'ADMINISTRATOR', label: 'Administrator (Nandini Swamy)' },
];

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onNavigate,
  title,
  subtitle,
}) => {
  const {
    currentUser,
    setCurrentUserRole,
    activeGodownFilter,
    setActiveGodownFilter,
    godowns,
    searchTerm,
    setSearchTerm,
    resetToSeedData,
    kpis,
    logout,
    purchaseOrders,
    items,
    vendorInvoices,
    customerInvoices,
  } = useERP();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'PO' | 'ITEM' | 'INVOICE'>('ALL');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute search results across POs, Inventory items, and Invoices
  const results = useMemo(() => {
    return searchGlobalRecords(searchTerm, {
      purchaseOrders,
      items,
      vendorInvoices,
      customerInvoices,
    });
  }, [searchTerm, purchaseOrders, items, vendorInvoices, customerInvoices]);

  // Global shortcut (Ctrl+K or Cmd+K or / to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPO = (po: SearchResultPO) => {
    setSearchTerm(po.number);
    setIsSearchOpen(false);
    onNavigate?.('procurement');
  };

  const handleSelectItem = (item: SearchResultItem) => {
    setSearchTerm(item.sku);
    setIsSearchOpen(false);
    onNavigate?.('inventory');
  };

  const handleSelectInvoice = (inv: SearchResultInvoice) => {
    setSearchTerm(inv.invoiceNumber);
    setIsSearchOpen(false);
    onNavigate?.('invoice_matching');
  };

  const handleEnterPress = () => {
    if (results.purchaseOrders.length > 0) {
      handleSelectPO(results.purchaseOrders[0]);
    } else if (results.items.length > 0) {
      handleSelectItem(results.items[0]);
    } else if (results.invoices.length > 0) {
      handleSelectInvoice(results.invoices[0]);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const QUICK_SUGGESTIONS = [
    { label: 'PO-2026-01', category: 'PO' },
    { label: 'EL-RELAY-12V-DC', category: 'Item' },
    { label: 'INV-KEC-2026-88', category: 'Invoice' },
    { label: 'Kaveri Electro', category: 'Vendor' },
    { label: 'EL-COPPER-WIND-01', category: 'Item' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Mobile trigger & Page Titles */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
              {kpis.detectedMismatchesCount > 0 && title === 'Overview' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                  <AlertTriangle className="w-3 h-3" />
                  {kpis.detectedMismatchesCount} 3-Way Discrepancies
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {/* Right: Global Search, Filters, Role Switcher, Reset button */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Global Search Bar */}
          <div ref={searchContainerRef} className="relative min-w-[240px] sm:min-w-[320px] lg:min-w-[360px]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search POs, Items, Invoices (ID or Name)..."
                value={searchTerm}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEnterPress();
                  }
                }}
                className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                  Ctrl K
                </span>
              </div>
            </div>

            {/* Global Search Results Dropdown Overlay */}
            {isSearchOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full sm:w-[480px] lg:w-[540px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Header Filter Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('ALL')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                        activeFilterTab === 'ALL'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      All ({results.totalMatches})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('PO')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 ${
                        activeFilterTab === 'PO'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      POs ({results.purchaseOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('ITEM')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 ${
                        activeFilterTab === 'ITEM'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Boxes className="w-3 h-3" />
                      Items ({results.items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('INVOICE')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 ${
                        activeFilterTab === 'INVOICE'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Receipt className="w-3 h-3" />
                      Invoices ({results.invoices.length})
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">Esc to close</span>
                </div>

                {/* Results Container */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1">
                  {/* Empty Query: Quick Suggestions */}
                  {!searchTerm.trim() && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Tag className="w-3.5 h-3.5 text-blue-500" />
                        <span>Quick Searches across Manufacturing Ledger:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug.label}
                            type="button"
                            onClick={() => {
                              setSearchTerm(sug.label);
                              searchInputRef.current?.focus();
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-600 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{sug.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({sug.category})</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        Type an ID (e.g. <code>PO-2026-001</code>, <code>INV-KM-101</code>), SKU (e.g. <code>SW-RELAY-12V</code>), or Name (e.g. <code>Kaveri</code>) to search across modules.
                      </p>
                    </div>
                  )}

                  {/* Active Query: No Results */}
                  {searchTerm.trim() && results.totalMatches === 0 && (
                    <div className="p-6 text-center">
                      <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No matches found for "{searchTerm}"</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Try searching by exact Purchase Order number, Item SKU (e.g. SW-RELAY), or Vendor Invoice ID.
                      </p>
                    </div>
                  )}

                  {/* Purchase Orders Section */}
                  {(activeFilterTab === 'ALL' || activeFilterTab === 'PO') &&
                    results.purchaseOrders.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-blue-700">
                            <ShoppingCart className="w-3 h-3 text-blue-600" />
                            Purchase Orders ({results.purchaseOrders.length})
                          </span>
                          <span className="text-slate-400">Jump to Procurement</span>
                        </div>
                        {results.purchaseOrders.map((po) => (
                          <button
                            type="button"
                            key={po.id}
                            onClick={() => handleSelectPO(po)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50/70 rounded-lg mx-1 cursor-pointer transition group flex items-center justify-between gap-2 border border-transparent hover:border-blue-100"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-blue-700 font-mono group-hover:underline">
                                  {po.number}
                                </span>
                                <span className="text-xs font-medium text-slate-800 truncate">
                                  {po.title.split('•')[1] || po.title}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    po.status === 'Approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : po.status === 'Fully Received'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {po.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{po.subtitle}</p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{formatINR(po.amount)}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                  {/* Inventory Items Section */}
                  {(activeFilterTab === 'ALL' || activeFilterTab === 'ITEM') &&
                    results.items.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-indigo-700">
                            <Boxes className="w-3 h-3 text-indigo-600" />
                            Inventory Items ({results.items.length})
                          </span>
                          <span className="text-slate-400">Jump to Inventory</span>
                        </div>
                        {results.items.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50/70 rounded-lg mx-1 cursor-pointer transition group flex items-center justify-between gap-2 border border-transparent hover:border-indigo-100"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-indigo-700 font-mono group-hover:underline">
                                  {item.sku}
                                </span>
                                <span className="text-xs font-medium text-slate-900 truncate">{item.name}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {item.category} &bull; HSN: {item.hsnCode}
                              </p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <span className="text-xs font-semibold text-slate-900">{formatINR(item.standardCost)}</span>
                                <span className="text-[10px] text-slate-400 block">per {item.uom}</span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                  {/* Invoices Section */}
                  {(activeFilterTab === 'ALL' || activeFilterTab === 'INVOICE') &&
                    results.invoices.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-emerald-700">
                            <Receipt className="w-3 h-3 text-emerald-600" />
                            Invoices ({results.invoices.length})
                          </span>
                          <span className="text-slate-400">Jump to 3-Way Matching</span>
                        </div>
                        {results.invoices.map((inv) => (
                          <button
                            type="button"
                            key={inv.id}
                            onClick={() => handleSelectInvoice(inv)}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50/70 rounded-lg mx-1 cursor-pointer transition group flex items-center justify-between gap-2 border border-transparent hover:border-emerald-100"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-emerald-800 font-mono group-hover:underline">
                                  {inv.invoiceNumber}
                                </span>
                                <span className="text-xs font-medium text-slate-900 truncate">
                                  {inv.partyName}
                                </span>
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]">
                                  {inv.partyType}
                                </span>
                                {inv.matchStatus && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                      inv.matchStatus === 'Matched'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {inv.matchStatus}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Date: {inv.date} &bull; {inv.approvalStatus || 'Recorded'}
                              </p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{formatINR(inv.amount)}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {/* Footer with summary and fast click guidance */}
                {results.totalMatches > 0 && (
                  <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Found <strong>{results.totalMatches}</strong> total records matching "{searchTerm}"
                    </span>
                    <span className="text-blue-600 font-medium flex items-center gap-0.5">
                      Click result to jump <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Godown Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Warehouse className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={activeGodownFilter}
              onChange={(e) => setActiveGodownFilter(e.target.value as 'ALL' | GodownId)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Godowns</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.id === 'GODOWN_A' ? 'Godown A (Peenya)' : 'Godown B (Electronic City)'}
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-lg px-2.5 py-1 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={currentUser.role}
              onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
              className="bg-transparent text-blue-900 font-semibold focus:outline-none cursor-pointer"
              title="Switch user role to test RBAC workflows"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
            title="Sign out of current ERP session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Date Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-slate-600 bg-slate-100/70 px-2.5 py-1 rounded-lg text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>28 Oct 2026</span>
          </div>

          {/* Reset Hackathon Data */}
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Restore original 6-month hackathon demonstration dataset? This will re-seed all test transactions and discrepancies.'
                )
              ) {
                resetToSeedData();
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
            title="Reload initial synthetic dataset with 6-month transactions and discrepancies"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
