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
  customerName,
  setCustomerName,
  orderType,
  setOrderType,
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 sm:p-5 flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-xl my-auto">
        
        {/* Fixed Header */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
            Checkout
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto py-3 space-y-3.5 custom-scrollbar flex-1 pr-1 overscroll-contain">
          
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., Guest / John"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100 transition-all"
            />
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["takeaway", "dine_in"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    orderType === type
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {type === "takeaway" ? "Takeaway" : "Dine In"}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["qris", "cash"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    paymentMethod === method
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {method.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Calculation */}
          {paymentMethod === "cash" && (
            <div className="space-y-2.5 p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cash Received
                </label>
                <input
                  type="number"
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                />
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 pt-0.5">
                <span>Change:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Rp {changeAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer Actions */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
          <div className="flex justify-between items-center text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            <span>Total:</span>
            <span>Rp {subtotal.toLocaleString("id-ID")}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || (paymentMethod === "cash" && cashReceived < subtotal)}
              onClick={onSubmit}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing..." : "Complete Order"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}