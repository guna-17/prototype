import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { GodownId } from '../../types/erp';
import { calculateItemStockFromLedger } from '../../utils/inventoryEngine';
import { Modal } from '../common/Modal';
import { ArrowRightLeft } from 'lucide-react';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId,
}) => {
  const { items, godowns, stockLedger, transferStock, notify } = useERP();

  const [itemId, setItemId] = useState(preselectedItemId || items[0]?.id || '');
  const [fromGodown, setFromGodown] = useState<GodownId>('GODOWN_A');
  const [toGodown, setToGodown] = useState<GodownId>('GODOWN_B');
  const [quantity, setQuantity] = useState<number>(10);
  const [remarks, setRemarks] = useState('');

  const selectedItem = items.find((i) => i.id === itemId);
  const availableInSource = selectedItem
    ? calculateItemStockFromLedger(selectedItem.id, stockLedger, fromGodown)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (quantity <= 0) {
      notify('error', 'Invalid Quantity', 'Transfer quantity must be greater than zero.');
      return;
    }

    if (quantity > availableInSource) {
      notify(
        'error',
        'Insufficient Stock',
        `Source warehouse only has ${availableInSource} ${selectedItem.uom} available.`
      );
      return;
    }

    const res = transferStock(
      selectedItem.id,
      fromGodown,
      toGodown,
      quantity,
      remarks.trim() || 'Internal production transfer'
    );

    if (res.success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inter-Godown Stock Transfer"
      subtitle="Transfer items between Peenya and Electronic City without altering total inventory valuation"
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
            <label className="block font-semibold text-slate-700 mb-1">From (Source) *</label>
            <select
              value={fromGodown}
              onChange={(e) => {
                const src = e.target.value as GodownId;
                setFromGodown(src);
                if (src === toGodown) {
                  setToGodown(src === 'GODOWN_A' ? 'GODOWN_B' : 'GODOWN_A');
                }
              }}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-slate-500">
              Available: <span className="font-bold text-slate-800">{availableInSource}</span>{' '}
              {selectedItem?.uom}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">To (Destination) *</label>
            <select
              value={toGodown}
              onChange={(e) => setToGodown(e.target.value as GodownId)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              {godowns
                .filter((g) => g.id !== fromGodown)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Transfer Quantity ({selectedItem?.uom}) *
          </label>
          <input
            type="number"
            min="1"
            max={availableInSource}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 font-semibold text-slate-900"
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Transfer Remarks / Reason</label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Allocation for Batch #409 Switchgear assembly"
            className="w-full text-xs p-2 rounded-lg border border-slate-300"
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
            disabled={availableInSource <= 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Confirm Transfer</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
