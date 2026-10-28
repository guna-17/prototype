import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ItemMaster, VendorMaster, CustomerMaster, TaxConfig } from '../../types/erp';
import { formatINR } from '../../utils/math';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Settings,
  Boxes,
  Users,
  Warehouse,
  Receipt,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export const SettingsMasterView: React.FC = () => {
  const {
    items,
    vendors,
    customers,
    godowns,
    taxConfigs,
    addItem,
    addVendor,
    addCustomer,
    currentUser,
    notify,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'items' | 'vendors' | 'customers' | 'godowns' | 'tax'>(
    'items'
  );

  // New Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemSku, setItemSku] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<any>('Electrical Components');
  const [itemHsn, setItemHsn] = useState('8536');
  const [itemTaxRate, setItemTaxRate] = useState(18);
  const [itemUom, setItemUom] = useState('PCS');
  const [itemReorderLevel, setItemReorderLevel] = useState(100);
  const [itemReorderQty, setItemReorderQty] = useState(200);
  const [itemCost, setItemCost] = useState(50);

  // New Vendor Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorState, setVendorState] = useState('Karnataka');
  const [vendorTerms, setVendorTerms] = useState(30);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSku.trim() || !itemName.trim()) {
      notify('error', 'Fields Required', 'SKU and Name are mandatory.');
      return;
    }

    addItem({
      sku: itemSku.trim().toUpperCase(),
      name: itemName.trim(),
      description: 'Manufactured/Procured component for electrical switchgear',
      category: itemCategory,
      uom: itemUom,
      hsnCode: itemHsn.trim(),
      taxRate: Number(itemTaxRate),
      reorderLevel: Number(itemReorderLevel),
      reorderQuantity: Number(itemReorderQty),
      standardCost: Number(itemCost),
      active: true,
    });

    setIsItemModalOpen(false);
    setItemSku('');
    setItemName('');
  };

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !vendorGstin.trim()) {
      notify('error', 'Fields Required', 'Vendor Name and GSTIN are mandatory.');
      return;
    }

    const stateCode = vendorGstin.trim().substring(0, 2);

    addVendor({
      vendorCode: `VND-${Math.floor(100 + Math.random() * 900)}`,
      name: vendorName.trim(),
      gstin: vendorGstin.trim().toUpperCase(),
      state: vendorState,
      stateCode,
      address: 'Industrial Estate, Bengaluru',
      contactPerson: 'Accounts Dept',
      phone: '+91 98450 00000',
      email: 'vendor@supplier.in',
      paymentTermsDays: Number(vendorTerms),
      bankNameMasked: 'Bank of Baroda (•••• 4120)',
      bankAccountMasked: '••••••••8819',
      active: true,
    });

    setIsVendorModalOpen(false);
    setVendorName('');
    setVendorGstin('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Master Data &amp; ERP Configuration</h2>
          <p className="text-xs text-slate-500">
            Maintain Items, Vendors, Customers, Godown physical locations, and statutory GST schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'items' && (
            <button
              onClick={() => setIsItemModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item Master</span>
            </button>
          )}

          {activeTab === 'vendors' && (
            <button
              onClick={() => setIsVendorModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register Vendor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-1 text-xs font-medium">
        {[
          { id: 'items', label: `Items Master (${items.length})` },
          { id: 'vendors', label: `Vendors Directory (${vendors.length})` },
          { id: 'customers', label: `Customers (${customers.length})` },
          { id: 'godowns', label: `Godowns (${godowns.length})` },
          { id: 'tax', label: `GST Tax Schedules (${taxConfigs.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Items */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Item Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">HSN Code</th>
                  <th className="p-3.5 text-right">GST Rate</th>
                  <th className="p-3.5 text-right">Standard Cost</th>
                  <th className="p-3.5 text-right">Reorder Level</th>
                  <th className="p-3.5 text-right">Reorder Pack</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold text-slate-900">{i.sku}</td>
                    <td className="p-3.5 text-slate-800 font-medium">
                      <div>{i.name}</div>
                      <div className="text-[11px] text-slate-400">{i.description}</div>
                    </td>
                    <td className="p-3.5 text-slate-600">{i.category}</td>
                    <td className="p-3.5 font-mono text-slate-600">{i.hsnCode}</td>
                    <td className="p-3.5 text-right font-medium text-blue-700">{i.taxRate}%</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      ₹{i.standardCost} / {i.uom}
                    </td>
                    <td className="p-3.5 text-right text-slate-700">
                      {i.reorderLevel} {i.uom}
                    </td>
                    <td className="p-3.5 text-right text-slate-700">
                      +{i.reorderQuantity} {i.uom}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Vendors */}
      {activeTab === 'vendors' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Vendor Code</th>
                  <th className="p-3.5">Vendor Name</th>
                  <th className="p-3.5 font-mono">GSTIN</th>
                  <th className="p-3.5">State &amp; Supply Type</th>
                  <th className="p-3.5">Payment Terms</th>
                  <th className="p-3.5">Bank Information (Masked)</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold text-blue-700 font-mono">{v.vendorCode}</td>
                    <td className="p-3.5 font-semibold text-slate-900">
                      <div>{v.name}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {v.contactPerson} ({v.phone})
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">{v.gstin}</td>
                    <td className="p-3.5">
                      <span className="font-medium text-slate-800">{v.state}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {v.stateCode === '29' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">Net {v.paymentTermsDays} Days</td>
                    <td className="p-3.5 text-slate-600 flex items-center gap-1.5 pt-4">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{v.bankNameMasked}</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Customers */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Customer Code</th>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5 font-mono">GSTIN</th>
                  <th className="p-3.5">State</th>
                  <th className="p-3.5">Contact Person</th>
                  <th className="p-3.5">Credit Terms</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold text-blue-700 font-mono">{c.customerCode}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{c.name}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">{c.gstin}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{c.state}</td>
                    <td className="p-3.5 text-slate-600">
                      {c.contactPerson} ({c.phone})
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">Net {c.paymentTermsDays} Days</td>
                    <td className="p-3.5 text-center">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Godowns */}
      {activeTab === 'godowns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {godowns.map((g) => (
            <div key={g.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{g.name}</h3>
                  <span className="font-mono text-xs text-blue-700 font-semibold">{g.code}</span>
                </div>
                <Badge variant="info">{g.location}</Badge>
              </div>

              <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                <p>
                  <strong>Address:</strong> {g.address}
                </p>
                <p>
                  <strong>Facility Manager:</strong> {g.manager}
                </p>
                <p>
                  <strong>Floor Area:</strong> {g.capacitySqFt.toLocaleString()} sq. ft.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: GST Schedules */}
      {activeTab === 'tax' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">HSN Code</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-right">CGST Rate</th>
                  <th className="p-3.5 text-right">SGST Rate</th>
                  <th className="p-3.5 text-right font-bold text-blue-700">IGST Rate</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxConfigs.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{tc.hsnCode}</td>
                    <td className="p-3.5 text-slate-700">{tc.description}</td>
                    <td className="p-3.5 text-right">{tc.cgstRate}%</td>
                    <td className="p-3.5 text-right">{tc.sgstRate}%</td>
                    <td className="p-3.5 text-right font-bold text-blue-700">{tc.igstRate}%</td>
                    <td className="p-3.5 text-center">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isItemModalOpen && (
        <Modal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          title="Add Item Master"
          subtitle="Register manufactured or procured electrical component"
          maxWidth="md"
        >
          <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                placeholder="e.g. EL-FUSE-32A"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono uppercase"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Item Name *</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. 32A Ceramic Cartridge Fuse Link"
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={itemHsn}
                  onChange={(e) => setItemHsn(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
                <select
                  value={itemTaxRate}
                  onChange={(e) => setItemTaxRate(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value={3}>3% (Precious contacts)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% (Standard electricals)</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cost (₹)</label>
                <input
                  type="number"
                  value={itemCost}
                  onChange={(e) => setItemCost(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reorder Level</label>
                <input
                  type="number"
                  value={itemReorderLevel}
                  onChange={(e) => setItemReorderLevel(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reorder Pack</label>
                <input
                  type="number"
                  value={itemReorderQty}
                  onChange={(e) => setItemReorderQty(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Save Item
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Vendor Modal */}
      {isVendorModalOpen && (
        <Modal
          isOpen={isVendorModalOpen}
          onClose={() => setIsVendorModalOpen(false)}
          title="Register Supplier / Vendor"
          subtitle="Onboard supplier with GSTIN and credit terms"
          maxWidth="md"
        >
          <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Vendor Name *</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Vijayanagar Metals & Alloys"
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN (15 Digits) *</label>
              <input
                type="text"
                value={vendorGstin}
                onChange={(e) => setVendorGstin(e.target.value)}
                placeholder="e.g. 29AABCV9988F1Z4"
                maxLength={15}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono uppercase font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">State *</label>
                <select
                  value={vendorState}
                  onChange={(e) => setVendorState(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Karnataka">Karnataka (29)</option>
                  <option value="Tamil Nadu">Tamil Nadu (33)</option>
                  <option value="Maharashtra">Maharashtra (27)</option>
                  <option value="Telangana">Telangana (36)</option>
                  <option value="Kerala">Kerala (32)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Credit Terms (Days)</label>
                <input
                  type="number"
                  value={vendorTerms}
                  onChange={(e) => setVendorTerms(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Register Vendor
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
