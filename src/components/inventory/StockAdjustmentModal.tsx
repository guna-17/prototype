import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { GodownId } from '../../types/erp';
import { calculateItemStockFromLedger } from '../../utils/inventoryEngine';
import { Modal } from '../common/Modal';
import { SlidersHorizontal } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId,
}) => {
  const { items, godowns, stockLedger, adjustStock, notify } = useERP();

  const [itemId, setItemId] = useState(preselectedItemId || items[0]?.id || '');
  const [godownId, setGodownId] = useState<GodownId>('GODOWN_A');
  const [isAddition, setIsAddition] = useState(false); // default reduction (scrap/audit loss)
  const [quantity, setQuantity] = useState<number>(5);
  const [reason, setReason] = useState('');

  const selectedItem = items.find((i) => i.id === itemId);
  const currentBal = selectedItem
    ? calculateItemStockFromLedger(selectedItem.id, stockLedger, godownId)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (!reason.trim()) {
      notify('error', 'Reason Required', 'Please enter physical audit reason or authorization notes.');
      return;
    }

    const res = adjustStock(selectedItem.id, godownId, quantity, isAddition, reason.trim());
    if (res.success) {
      onClose();
    } else {
      notify('error', 'Adjustment Denied', res.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Audit & Physical Variance Adjustment"
      subtitle="Authorized correction of book balance to reflect physical floor counts"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Select Item *</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            required
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.sku} - {i.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Godown *</label>
            <select
              value={godownId}
              onChange={(e) => setGodownId(e.target.value as GodownId)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block font-semibold text-slate-700 mb-1">Current Book Stock</span>
            <span className="text-base font-bold text-slate-900 block mt-1">
              {currentBal} {selectedItem?.uom}
            </span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Adjustment Type *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsAddition(false)}
              className={`p-2 rounded-lg border font-semibold text-center transition ${
                !isAddition
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Deduct (-) Scrap / Damage / Shrinkage
            </button>
            <button
              type="button"
              onClick={() => setIsAddition(true)}
              className={`p-2 rounded-lg border font-semibold text-center transition ${
                isAddition
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Add (+) Found in Physical Audit
            </button>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Quantity to Adjust ({selectedItem?.uom}) *
          </label>
          <input
            type="number"
            min="1"
            max={!isAddition ? currentBal : 10000}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 font-semibold text-slate-900"
            required
          />
          <p className="text-[11px] text-slate-500 mt-1">
            New balance will become:{' '}
            <span className="font-bold text-blue-700">
              {isAddition ? currentBal + quantity : currentBal - quantity} {selectedItem?.uom}
            </span>
          </p>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Audit Reason / Authorization Reference *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Annual physical inventory audit reconciliation signed by Plant Head"
            rows={2}
            className="w-full text-xs p-2 rounded-lg border border-slate-300"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Apply Adjustment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
