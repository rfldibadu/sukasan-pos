import { Clock, CreditCard, ShoppingBag } from "lucide-react";
import { POSCartItem } from "../../page";

interface CartSummaryProps {
  cart: POSCartItem[];
  subtotal: number;
  customerName: string;
  setCustomerName: (val: string) => void;
  isSubmitting: boolean;
  onQuantityChange: (index: number, delta: number) => void;
  onClearCart: () => void;
  onSaveOpenBill: () => void;
  onProceedCheckout: () => void;
}

export function CartSummary({
  cart,
  subtotal,
  customerName,
  setCustomerName,
  isSubmitting,
  onQuantityChange,
  onClearCart,
  onSaveOpenBill,
  onProceedCheckout,
}: CartSummaryProps) {
  const formattedTotal = `Rp ${subtotal.toLocaleString("id-ID")}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4 sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber-700" />
          <h3 className="text-sm font-bold text-slate-900">Current Order</h3>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Customer / Table Input */}
      <div>
        <label className="text-xs font-semibold text-slate-700">
          Customer / Table (Open Bill ID)
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Meja 04 - Budi / Takeaway"
          className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600 transition-colors"
        />
      </div>

      {/* Dynamic Cart Items Container */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1">
            <ShoppingBag className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">Cart is empty. Tap any product to add.</p>
          </div>
        ) : (
          cart.map((item, idx) => {
            const addOnsCost =
              item.selectedAddOns?.reduce((s, a) => s + a.price, 0) || 0;
            const unitTotal = item.product.price + addOnsCost;
            const lineTotal = unitTotal * item.quantity;
            const isConsign =
              item.product.item_type === "CONSIGNMENT" ||
              item.product.item_type === "consignment";

            return (
              <div
                key={`${item.product.id}-${idx}`}
                className="flex items-start justify-between text-xs border-b border-slate-100 pb-2.5"
              >
                <div className="space-y-0.5 pr-2">
                  <p className="font-bold text-slate-900">{item.product.name}</p>
                  {item.itemNotes && (
                    <p className="text-[10px] text-slate-500">{item.itemNotes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(idx, -1)}
                      className="w-5 h-5 bg-slate-100 rounded text-slate-700 font-bold text-[11px] hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(idx, 1)}
                      className="w-5 h-5 bg-slate-100 rounded text-slate-700 font-bold text-[11px] hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-900">
                    Rp {lineTotal.toLocaleString("id-ID")}
                  </span>
                  {isConsign && (
                    <p className="text-[9px] font-semibold text-indigo-600">
                      Consign
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order Total & Dual Open Bill / Pay CTA */}
      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span className="font-mono">{formattedTotal}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
          <span>Total</span>
          <span className="font-mono text-amber-800">{formattedTotal}</span>
        </div>

        <div className="space-y-2 pt-1">
          {/* Primary Action: Open Bill (Dine-in / Bayar Nanti) */}
          <button
            type="button"
            disabled={cart.length === 0 || isSubmitting}
            onClick={onSaveOpenBill}
            className="w-full py-2.5 px-3 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-800" />
            <span>
              {isSubmitting
                ? "Menyimpan..."
                : `Simpan Antrean (${formattedTotal})`}
            </span>
          </button>

          {/* Secondary Action: Direct Pay (Takeaway / Instant Pay) */}
          <button
            type="button"
            disabled={cart.length === 0 || isSubmitting}
            onClick={onProceedCheckout}
            className="w-full py-2.5 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Bayar Sekarang ({formattedTotal})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
