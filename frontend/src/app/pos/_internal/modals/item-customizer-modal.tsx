
import { useState } from "react";
import { POSProduct } from "../usecases/pos";

interface ItemCustomizerModalProps {
  product: POSProduct;
  onClose: () => void;
  onAddToCart: (notes: string) => void;
}

export function ItemCustomizerModal({
  product,
  onClose,
  onAddToCart,
}: ItemCustomizerModalProps) {
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {product.name}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Price: Rp {product.price.toLocaleString("id-ID")}
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Customizations
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Less ice, extra sugar..."
            rows={3}
            className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onAddToCart(notes)}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}