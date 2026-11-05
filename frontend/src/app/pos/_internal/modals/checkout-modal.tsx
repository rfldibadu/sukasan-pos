import { Banknote, QrCode, X } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  subtotal: number;
  customerName: string;
  setCustomerName: (val: string) => void;
  orderType: "takeaway" | "dine_in";
  setOrderType: (val: "takeaway" | "dine_in") => void;
  paymentMethod: "qris" | "cash";
  setPaymentMethod: (val: "qris" | "cash") => void;
  cashReceived: number;
  setCashReceived: (val: number) => void;
  changeAmount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function CheckoutModal({
  isOpen,
  subtotal,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  changeAmount,
  isSubmitting,
  onClose,
  onSubmit,
}: CheckoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Payment Checkout
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center py-1">
          <p className="text-xs text-slate-500">Total Due</p>
          <p className="text-2xl font-bold font-mono text-amber-800">
            Rp {subtotal.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Payment Method Toggle */}
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPaymentMethod("qris")}
            className={`py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              paymentMethod === "qris"
                ? "border-amber-600 bg-amber-100 text-amber-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <QrCode className="w-4 h-4" /> QRIS
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={`py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              paymentMethod === "cash"
                ? "border-amber-600 bg-amber-100 text-amber-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Banknote className="w-4 h-4" /> Cash
          </button>
        </div>

        {/* QRIS View */}
        {paymentMethod === "qris" ? (
          <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-2 border border-slate-100">
            <div className="w-36 h-36 bg-white border border-slate-300 mx-auto rounded-xl flex items-center justify-center shadow-xs">
              <QrCode className="w-24 h-24 text-slate-800" />
            </div>
            <p className="text-[11px] text-slate-500">
              Scan via BCA, Gopay, OVO, ShopeePay
            </p>
          </div>
        ) : (
          /* Cash View */
          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
            <div>
              <label className="text-slate-600 font-semibold">
                Cash Tendered (Rp)
              </label>
              <input
                type="number"
                value={cashReceived || ""}
                onChange={(e) => setCashReceived(Number(e.target.value))}
                placeholder="e.g. 50000"
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:outline-none focus:border-amber-600"
              />
              <div className="flex gap-1.5 mt-2">
                {[subtotal, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCashReceived(preset)}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-mono font-semibold text-slate-700 hover:border-amber-500 cursor-pointer"
                  >
                    {preset === subtotal
                      ? "Uang Pas"
                      : `Rp ${(preset / 1000).toFixed(0)}k`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Change Due:</span>
              <span className="font-mono font-bold text-emerald-600">
                Rp {changeAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={
            isSubmitting ||
            (paymentMethod === "cash" && cashReceived < subtotal)
          }
          onClick={onSubmit}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "Processing..." : "Complete & Print Receipt"}
        </button>
      </div>
    </div>
  );
}
