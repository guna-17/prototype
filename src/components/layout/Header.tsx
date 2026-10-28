import React from 'react';
import { useERP } from '../../context/ERPContext';
import { GodownId, UserRole } from '../../types/erp';
import {
  Menu,
  Search,
  Warehouse,
  ShieldCheck,
  RotateCcw,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
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
  } = useERP();

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

        {/* Right: Search, Filters, Role Switcher, Reset button */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Search Bar */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU, PO, Inv, Vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
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
