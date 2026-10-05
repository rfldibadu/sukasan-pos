import { useState } from "react";
import { POSProduct } from "../usecases/pos";
import { useGetAddOns } from "../hooks/use-get-pos-products";

interface ItemCustomizerModalProps {
  product: POSProduct;
  onClose: () => void;
  onAddToCart: (notes: string, selectedAddOns?: POSProduct[]) => void;
}

export function ItemCustomizerModal({
  product,
  onClose,
  onAddToCart,
}: ItemCustomizerModalProps) {
  const [notes, setNotes] = useState("");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const { addOns, isLoading: loadingAddOns } = useGetAddOns();

  const isStandaloneAddOn =
    product.item_type === "ADD_ON" ||
    product.category?.toUpperCase() === "ADD_ON" ||
    product.category?.toUpperCase() === "ADD-ON";

  const availableAddOns = addOns.filter((item) => item.id !== product.id);

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedAddOns = availableAddOns.filter((item) =>
    selectedAddOnIds.includes(item.id)
  );
  const addOnsTotal = selectedAddOns.reduce((sum, item) => sum + item.price, 0);
  const totalPrice = product.price + addOnsTotal;

  const handleConfirm = () => {
    if (isStandaloneAddOn) return;

    const formattedNotes = [
      notes.trim(),
      selectedAddOns.length > 0
        ? `Add-ons: ${selectedAddOns.map((a) => a.name).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    onAddToCart(formattedNotes, selectedAddOns);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-4 sm:p-5 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 shadow-xl my-auto">
        {/* Header */}
        <div className="flex justify-between items-start pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-tight">
                {product.name}
              </h3>
              {isStandaloneAddOn && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1 py-0.5 rounded">
                  Add-On Only
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Base Price: Rp {product.price.toLocaleString("id-ID")}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="overflow-y-auto py-3 space-y-3.5 custom-scrollbar flex-1 px-0.5">
          {/* Caution Notice for Standalone Add-ons */}
          {isStandaloneAddOn ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <svg
                  className="w-4 h-4 text-amber-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Cannot order stand-alone Add-On</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                Add-ons must be attached to a main product (Coffee, Non-Coffee, etc.).
              </p>
            </div>
          ) : (
            /* Add-ons Wrapper Card */
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Add-ons
              </label>

              {loadingAddOns ? (
                <div className="text-xs text-slate-400 py-2">Loading add-ons...</div>
              ) : availableAddOns.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-1">
                  No additional add-ons available
                </div>
              ) : (
                <div className="p-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                  <div className="max-h-24 sm:max-h-26 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar overscroll-contain">
                    {availableAddOns.map((addOn) => {
                      const isSelected = selectedAddOnIds.includes(addOn.id);
                      return (
                        <button
                          key={addOn.id}
                          type="button"
                          onClick={() => toggleAddOn(addOn.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="truncate max-w-42.5 text-left">
                            {addOn.name}
                          </span>
                          <span className="shrink-0">
                            +Rp {addOn.price.toLocaleString("id-ID")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Order Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Order Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isStandaloneAddOn}
              placeholder={
                isStandaloneAddOn
                  ? "Notes disabled for standalone add-ons"
                  : "Less ice, extra sweet..."
              }
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="w-1/3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            type="button"
            disabled={isStandaloneAddOn}
            className={`w-2/3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              isStandaloneAddOn
                ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
            }`}
          >
            {isStandaloneAddOn ? (
              <span>Add-On Only</span>
            ) : (
              <>
                <span>Add</span>
                <span>•</span>
                <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}