import { useState } from "react";
import { X } from "lucide-react";
import { POSProduct } from "../usecases/pos";
import { useGetAddOns } from "../hooks/use-get-pos-products";

interface ItemCustomizerModalProps {
  product: POSProduct;
  onClose: () => void;
  onAddToCart: (notes: string, selectedAddOns?: POSProduct[]) => void;
}

const SUGAR_OPTIONS = ["Normal 100%", "Less 70%", "No Sugar"] as const;

export function ItemCustomizerModal({
  product,
  onClose,
  onAddToCart,
}: ItemCustomizerModalProps) {
  const isConsignmentOrFood =
    product.item_type === "CONSIGNMENT" ||
    product.category.toUpperCase().includes("SNACK") ||
    product.category.toUpperCase().includes("FOOD");

  const [selectedSugar, setSelectedSugar] = useState<string>(
    isConsignmentOrFood ? "" : "Less 70%"
  );
  const [notes, setNotes] = useState("");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const { addOns, isLoading: loadingAddOns } = useGetAddOns();

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
    const parts: string[] = [];
    if (selectedSugar) parts.push(selectedSugar);
    if (selectedAddOns.length > 0) {
      parts.push(...selectedAddOns.map((a) => `+${a.name}`));
    }
    if (notes.trim()) {
      parts.push(`(${notes.trim()})`);
    }

    onAddToCart(parts.join(", "), selectedAddOns);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{product.name}</h3>
            <p className="text-xs font-mono font-bold text-amber-800">
              Rp {product.price.toLocaleString("id-ID")}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Sugar Level */}
          {!isConsignmentOrFood && (
            <div>
              <label className="font-semibold text-slate-700">Sugar Level</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {SUGAR_OPTIONS.map((level) => {
                  const active = selectedSugar === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setSelectedSugar(active ? "" : level)
                      }
                      className={`py-2 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? "bg-amber-100 border-amber-600 text-amber-800 font-semibold"
                          : "border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {!isConsignmentOrFood && (
            <div>
              <label className="font-semibold text-slate-700">Add-ons</label>
              {loadingAddOns ? (
                <p className="text-slate-400 py-2">Loading add-ons...</p>
              ) : availableAddOns.length === 0 ? (
                <p className="text-slate-400 italic py-1">
                  No additional add-ons available
                </p>
              ) : (
                <div className="space-y-1.5 mt-1 max-h-40 overflow-y-auto pr-1">
                  {availableAddOns.map((addOn) => {
                    const checked = selectedAddOnIds.includes(addOn.id);
                    return (
                      <label
                        key={addOn.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? "border-amber-500 bg-amber-50/50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddOn(addOn.id)}
                            className="rounded text-amber-700 accent-amber-700"
                          />
                          <span className="font-medium text-slate-800">
                            {addOn.name}
                          </span>
                        </div>
                        <span className="font-mono text-slate-500">
                          +Rp {addOn.price.toLocaleString("id-ID")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Barista Item Notes */}
          <div>
            <label className="font-semibold text-slate-700">
              Barista Item Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Extra ice, serve in glass mug"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Add to Cart • Rp {totalPrice.toLocaleString("id-ID")}
          </button>
        </div>
      </div>
    </div>
  );
}
