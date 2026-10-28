import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types/erp';
import { isValidKarnatakaGstin, isValidEmail, validatePassword } from '../../utils/authEngine';
import {
  Building2,
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Warehouse,
  FileCheck2,
  Scale,
  Receipt,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AuthViewProps {
  onBypassToDemo?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onBypassToDemo }) => {
  const { login, signup, setCurrentUserRole } = useERP();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sign Up State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupCompanyName, setSignupCompanyName] = useState('Karnataka Electrical Components Ltd');
  const [signupGstin, setSignupGstin] = useState('29ABCDE1234F1Z5');
  const [signupRole, setSignupRole] = useState<UserRole>('BUSINESS_OWNER');
  const [signupGodown, setSignupGodown] = useState<'ALL' | 'GODOWN_A' | 'GODOWN_B'>('ALL');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupAgree, setSignupAgree] = useState(true);
  const [signupErrors, setSignupErrors] = useState<string[]>([]);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Quick Demo Logins
  const DEMO_USERS: {
    role: UserRole;
    name: string;
    email: string;
    label: string;
    desc: string;
    tag: string;
  }[] = [
    {
      role: 'BUSINESS_OWNER',
      name: 'Arun Kumar',
      email: 'arun.kumar@karnatakaelectronics.com',
      label: 'Business Owner',
      desc: 'Cashflow overview & executive overrides',
      tag: 'Full Access',
    },
    {
      role: 'PURCHASE_MANAGER',
      name: 'Vikram Rao',
      email: 'vikram.rao@karnatakaelectronics.com',
      label: 'Purchase Manager',
      desc: 'PO creation & vendor pricing',
      tag: 'Procurement',
    },
    {
      role: 'WAREHOUSE_MANAGER',
      name: 'Ramesh Gowda',
      email: 'ramesh.gowda@karnatakaelectronics.com',
      label: 'Warehouse Manager',
      desc: 'GRN inspection & stock ledger',
      tag: 'Inward / Godown',
    },
    {
      role: 'ACCOUNTS_EXECUTIVE',
      name: 'Kavita Nayak',
      email: 'kavita.nayak@karnatakaelectronics.com',
      label: 'Accounts Executive',
      desc: '3-way reconciliation & discrepancy alerts',
      tag: 'Invoice Matching',
    },
    {
      role: 'FINANCE_MANAGER',
      name: 'Sunil Mehta',
      email: 'sunil.mehta@karnatakaelectronics.com',
      label: 'Finance Manager',
      desc: 'Disbursement approval & GSTR-2B claim',
      tag: 'GST & Payables',
    },
    {
      role: 'ADMINISTRATOR',
      name: 'Nandini Swamy',
      email: 'admin@karnatakaelectronics.com',
      label: 'Administrator',
      desc: 'Catalog, godown config & audit logs',
      tag: 'System Master',
    },
  ];

  const handleQuickLogin = (email: string, role: UserRole) => {
    setLoginError(null);
    const result = login(email, 'password123');
    if (!result.success) {
      // Fallback: switch role directly
      setCurrentUserRole(role);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim()) {
      setLoginError('Please enter your work email.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const res = login(loginEmail, loginPassword);
      if (!res.success) {
        setLoginError(res.message || 'Invalid email or password.');
      }
      setIsLoggingIn(false);
    }, 250);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!signupName.trim() || signupName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters.');
    }
    if (!isValidEmail(signupEmail)) {
      errors.push('Please enter a valid business email.');
    }
    const pwdCheck = validatePassword(signupPassword);
    if (!pwdCheck.valid && pwdCheck.error) {
      errors.push(pwdCheck.error);
    }
    if (signupPassword !== signupConfirmPassword) {
      errors.push('Passwords do not match.');
    }
    if (signupGstin && !isValidKarnatakaGstin(signupGstin)) {
      errors.push('GSTIN must be a valid 15-character Karnataka GSTIN starting with 29 (e.g. 29ABCDE1234F1Z5).');
    }
    if (!signupAgree) {
      errors.push('Please accept the Karnataka GST compliance terms.');
    }

    setSignupErrors(errors);
    if (errors.length > 0) return;

    setIsSigningUp(true);
    setTimeout(() => {
      const res = signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        role: signupRole,
        godownAccess: signupGodown,
        companyName: signupCompanyName,
        companyGstin: signupGstin,
      });

      if (!res.success) {
        setSignupErrors([res.message || 'Signup failed. Please try again.']);
      }
      setIsSigningUp(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="w-full border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 font-bold">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">SmartGST ERP</span>
              <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] rounded font-semibold">
                Karnataka Code 29
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Electrical Components Manufacturing ERP</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict GSTR-2B ITC Matching Engine</span>
          </div>
          <button
            onClick={() => handleQuickLogin('arun.kumar@karnatakaelectronics.com', 'BUSINESS_OWNER')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 transition flex items-center gap-1"
          >
            <span>Explore Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Brand & Value Proposition */}
          <div className="lg:col-span-5 space-y-6 text-slate-300">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Problem ID: ER-02 &bull; Enterprise Grade
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Unified Procurement, Inventory &amp; GST Reconciliation
              </h1>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Purpose-built ERP for small electrical components manufacturers in Karnataka.
                Eliminate revenue leakage from unbilled inventory, 3-way invoice mismatches, and GSTR-2B tax discrepancies.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Automated 3-Way Reconciliation</h3>
                  <p className="text-[11px] text-slate-400">
                    Strict tolerance verification comparing Purchase Orders, Physical GRNs, and Vendor Invoices before approving disbursement.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Karnataka Statutory GST &amp; ITC</h3>
                  <p className="text-[11px] text-slate-400">
                    Intra-state (9% CGST + 9% SGST) vs inter-state (18% IGST) automated breakdown with real-time GSTR-2B compliance audits.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Multi-Godown Stock Control</h3>
                  <p className="text-[11px] text-slate-400">
                    Dual godown control (Peenya &amp; Electronic City) with deterministic reorder triggers and weighted-average costing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
              {/* Tab Selector: Sign In vs Sign Up */}
              <div className="flex items-center p-1 bg-slate-950/70 rounded-xl border border-slate-800/90 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setLoginError(null);
                    setSignupErrors([]);
                  }}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all text-center ${
                    activeTab === 'signin'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In to ERP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setLoginError(null);
                    setSignupErrors([]);
                  }}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all text-center ${
                    activeTab === 'signup'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create Account (Sign Up)
                </button>
              </div>

              {/* TAB 1: SIGN IN */}
              {activeTab === 'signin' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Welcome back</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Enter your manufacturing credentials to access the ERP workspace.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="arun.kumar@karnatakaelectronics.com"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">Password</label>
                        <span className="text-[11px] text-blue-400">Demo password: password123</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-9 pr-10 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Remember session on this device</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoggingIn ? (
                        <span>Verifying Credentials...</span>
                      ) : (
                        <>
                          <span>Sign In to SmartGST ERP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Quick Demo Persona Switcher */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Quick 1-Click Demo Login (Select Role)
                      </span>
                      <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        Pre-Configured
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DEMO_USERS.map((user) => (
                        <button
                          key={user.role}
                          type="button"
                          onClick={() => handleQuickLogin(user.email, user.role)}
                          className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 text-left transition group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-blue-400 group-hover:text-blue-300">
                              {user.tag}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-white mt-1 group-hover:text-blue-200 truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{user.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SIGN UP */}
              {activeTab === 'signup' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Create ERP Account</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Register a new employee or manager profile with Karnataka statutory GST compliance.
                    </p>
                  </div>

                  {signupErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                      {signupErrors.map((err, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            placeholder="Anand Hegde"
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Business Email *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            placeholder="anand.hegde@karnatakaelectronics.com"
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Manufacturing Entity Name
                        </label>
                        <input
                          type="text"
                          value={signupCompanyName}
                          onChange={(e) => setSignupCompanyName(e.target.value)}
                          placeholder="Karnataka Electrical Components Ltd"
                          className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-slate-300">Karnataka GSTIN</label>
                          <span className="text-[10px] text-blue-400">Must start with 29</span>
                        </div>
                        <input
                          type="text"
                          value={signupGstin}
                          onChange={(e) => setSignupGstin(e.target.value.toUpperCase())}
                          placeholder="29ABCDE1234F1Z5"
                          maxLength={15}
                          className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Assigned Role (RBAC) *
                        </label>
                        <select
                          value={signupRole}
                          onChange={(e) => setSignupRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition cursor-pointer"
                        >
                          <option value="BUSINESS_OWNER">Business Owner (Full Authority)</option>
                          <option value="PURCHASE_MANAGER">Purchase Manager (Procurement &amp; POs)</option>
                          <option value="WAREHOUSE_MANAGER">Warehouse Manager (GRN &amp; Stock)</option>
                          <option value="ACCOUNTS_EXECUTIVE">Accounts Executive (3-Way Matching)</option>
                          <option value="FINANCE_MANAGER">Finance Manager (Disbursement &amp; ITC)</option>
                          <option value="ADMINISTRATOR">Administrator (Master Setup)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Godown Clearance
                        </label>
                        <select
                          value={signupGodown}
                          onChange={(e) => setSignupGodown(e.target.value as 'ALL' | 'GODOWN_A' | 'GODOWN_B')}
                          className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition cursor-pointer"
                        >
                          <option value="ALL">All Godowns (Peenya &amp; Electronic City)</option>
                          <option value="GODOWN_A">Godown A (Peenya Industrial Estate)</option>
                          <option value="GODOWN_B">Godown B (Electronic City)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Password (min 6 chars) *
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type={showSignupPassword ? 'text' : 'password'}
                            required
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-10 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                          >
                            {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Confirm Password *
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type={showSignupPassword ? 'text' : 'password'}
                            required
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-2 cursor-pointer text-slate-400 hover:text-slate-300 text-xs">
                        <input
                          type="checkbox"
                          checked={signupAgree}
                          onChange={(e) => setSignupAgree(e.target.checked)}
                          className="w-3.5 h-3.5 mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                          I acknowledge Karnataka GSTIN State Code 29 statutory rules and authorize immutable audit logging for all procurement and inventory changes.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSigningUp}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSigningUp ? (
                        <span>Registering User Account...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Register &amp; Launch SmartGST ERP</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/60 px-4 py-3 text-center text-xs text-slate-500">
        SmartGST ERP &bull; Problem ID: ER-02 &bull; Small Electrical Components Manufacturer, Karnataka &bull; Real-time 3-Way Matching &amp; GSTR-2B ITC Auditing
      </footer>
    </div>
  );
};
