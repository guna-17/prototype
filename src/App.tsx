/**
 * SmartGST ERP - Master Application Entry
 * Target: Electrical Components Manufacturer in Karnataka, India
 */

import React, { useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { NavTab, Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { PurchaseOrdersView } from './components/procurement/PurchaseOrdersView';
import { GoodsReceiptView } from './components/goodsReceipt/GoodsReceiptView';
import { InventoryView } from './components/inventory/InventoryView';
import { InvoiceMatchingView } from './components/matching/InvoiceMatchingView';
import { GstItcView } from './components/gst/GstItcView';
import { PayablesReceivablesView } from './components/payablesReceivables/PayablesReceivablesView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { SettingsMasterView } from './components/settings/SettingsMasterView';
import { NotificationToast } from './components/common/NotificationToast';
import { AuthView } from './components/auth/AuthView';

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'Executive Financial Health & Operational Status',
  },
  procurement: {
    title: 'Procurement',
    subtitle: 'Purchase Orders & Vendor Sourcing Workflow',
  },
  goods_receipts: {
    title: 'Goods Receipts',
    subtitle: 'Inward Warehouse Inspections & Material Acceptance (GRN)',
  },
  inventory: {
    title: 'Inventory',
    subtitle: 'Multi-Godown Stock Ledger & Deterministic Replenishment Alerts',
  },
  invoice_matching: {
    title: 'Invoice Matching',
    subtitle: 'Three-Way Reconciliation Engine (PO vs GRN vs Vendor Invoice)',
  },
  gst_itc: {
    title: 'GST & ITC Reconciliation',
    subtitle: 'Karnataka Statutory Inward Matching & GSTR-2B Eligibility Rules',
  },
  payables_receivables: {
    title: 'Payables & Receivables',
    subtitle: 'Supplier Disbursements & Customer Cash Collections',
  },
  reports: {
    title: 'Reports & Exports',
    subtitle: '13 Statutory & Analytical Statements with CSV Export',
  },
  audit_trail: {
    title: 'Audit Trail',
    subtitle: 'Immutable Governance, Price Overrides & Security Log',
  },
  settings: {
    title: 'Master Settings',
    subtitle: 'Item Catalogs, Vendors, Customers & GST Schedules',
  },
};

function MainApp() {
  const { isAuthenticated } = useERP();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <AuthView />
        <NotificationToast />
      </>
    );
  }

  const { title, subtitle } = TAB_TITLES[currentTab] || {
    title: 'SmartGST ERP',
    subtitle: 'Unified Procurement, Inventory & GST Reconciliation',
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onNavigate={(tab) => setCurrentTab(tab)}
          title={title}
          subtitle={subtitle}
        />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewDashboard onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'procurement' && <PurchaseOrdersView />}

          {currentTab === 'goods_receipts' && <GoodsReceiptView />}

          {currentTab === 'inventory' && (
            <InventoryView
              onNavigateToProcurement={(sku) => {
                setCurrentTab('procurement');
              }}
            />
          )}

          {currentTab === 'invoice_matching' && <InvoiceMatchingView />}

          {currentTab === 'gst_itc' && <GstItcView />}

          {currentTab === 'payables_receivables' && <PayablesReceivablesView />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'audit_trail' && <AuditTrailView />}

          {currentTab === 'settings' && <SettingsMasterView />}
        </main>

        <footer className="px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
          <span>
            SmartGST ERP &bull; Problem ID: ER-02 &bull; Small Electrical Components Manufacturer, Karnataka &bull;
            Deterministic Calculations (No Mock Arithmetic)
          </span>
        </footer>
      </div>

      {/* Floating Notifications */}
      <NotificationToast />
    </div>
  );
}

export default function App() {
  return (
    <ERPProvider>
      <MainApp />
    </ERPProvider>
  );
}
