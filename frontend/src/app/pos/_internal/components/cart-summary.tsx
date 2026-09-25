
import { POSCartItem } from "../usecases/pos";

interface CartSummaryProps {
  cart: POSCartItem[];
  subtotal: number;
  onQuantityChange: (index: number, delta: number) => void;
  onProceedCheckout: () => void;
}

export function CartSummary({
  cart,
  subtotal,
  onQuantityChange,
  onProceedCheckout,
}: CartSummaryProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-120px)] sticky top-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
        Order Details
      </h2>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Your cart is empty.
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={`${item.product.id}-${idx}`}
              className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                  {item.product.name}
                </p>
                {item.itemNotes && (
                  <p className="text-xs text-slate-500 italic truncate">
                    Note: {item.itemNotes}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Rp {(item.product.price * item.quantity).toLocaleString("id-ID")}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => onQuantityChange(idx, -1)}
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold"
                >
                  -
                </button>
                <span className="text-xs font-semibold px-1 text-slate-900 dark:text-slate-100">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onQuantityChange(idx, 1)}
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-auto space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            Rp {subtotal.toLocaleString("id-ID")}
          </span>
        </div>

        <button
          disabled={cart.length === 0}
          onClick={onProceedCheckout}
          className="w-full py-3 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}