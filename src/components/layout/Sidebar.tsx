import React from 'react';
import { useERP } from '../../context/ERPContext';
import {
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Boxes,
  Scale,
  Receipt,
  IndianRupee,
  FileBarChart2,
  History,
  UploadCloud,
  Settings,
  Building2,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'procurement'
  | 'goods_receipts'
  | 'inventory'
  | 'invoice_matching'
  | 'gst_itc'
  | 'payables_receivables'
  | 'reports'
  | 'audit_trail'
  | 'data_import'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { kpis, currentUser } = useERP();

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    {
      id: 'procurement',
      label: '2. Procurement',
      icon: ShoppingCart,
      badge: kpis.openPOCount > 0 ? kpis.openPOCount : undefined,
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'goods_receipts',
      label: '3. Goods Receipts',
      icon: PackageCheck,
      badge: kpis.pendingGRNCount > 0 ? kpis.pendingGRNCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'inventory',
      label: '4. Inventory',
      icon: Boxes,
      badge: kpis.lowStockCount > 0 ? kpis.lowStockCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'invoice_matching',
      label: '5. Invoice Matching',
      icon: Scale,
      badge: kpis.detectedMismatchesCount > 0 ? kpis.detectedMismatchesCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 font-bold',
    },
    {
      id: 'gst_itc',
      label: '6. GST and ITC',
      icon: Receipt,
      badge: kpis.gstDiscrepanciesCount > 0 ? kpis.gstDiscrepanciesCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'payables_receivables',
      label: '7. Payables & Receivables',
      icon: IndianRupee,
    },
    { id: 'reports', label: '8. Reports', icon: FileBarChart2 },
    { id: 'audit_trail', label: '9. Audit Trail', icon: History },
    { id: 'data_import', label: '10. Data Import', icon: UploadCloud },
    { id: 'settings', label: '11. Settings', icon: Settings },
  ];

  const handleNavClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">SmartGST ERP</span>
                <span className="px-1.5 py-0.2 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] rounded font-semibold">
                  ER-02
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Electrical Components Mfg</p>
            </div>
          </div>

          <div className="mt-3 py-1.5 px-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Jurisdiction:</span>
            <span className="text-blue-300 font-medium">Karnataka (Code 29)</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Core Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.badgeColor || 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-900/60 text-blue-300 font-semibold text-xs flex items-center justify-center border border-blue-700/40">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-blue-400 truncate">
                {currentUser.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
