import { Coffee, Croissant, CupSoda, Sparkles } from "lucide-react";
import { POSProduct } from "../usecases/pos";

interface ProductGridProps {
  products: POSProduct[];
  searchQuery: string;
  onSelectProduct: (product: POSProduct) => void;
}

export function ProductGrid({
  products,
  searchQuery,
  onSelectProduct,
}: ProductGridProps) {
  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      (product.vendor_name?.toLowerCase().includes(term) ?? false)
    );
  });

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center">
        <Coffee className="w-8 h-8 mb-2 opacity-30" />
        <span className="text-xs font-semibold text-slate-600">
          No menu items found
        </span>
        {searchQuery && (
          <span className="text-[11px] mt-1 text-slate-400">
            Try searching for another drink or pastry name.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {filteredProducts.map((product) => {
        const price = Number(product?.price ?? 0);
        const isConsignment =
          product.item_type === "CONSIGNMENT" ||
          product.item_type === "consignment";
        const catUpper = product.category.toUpperCase();

        const isTeaOrNonCoffee = catUpper.includes("NON_COFFEE") || catUpper.includes("TEA");
        const isFoodOrSnack =
          isConsignment || catUpper.includes("SNACK") || catUpper.includes("FOOD");

        const iconBoxClass = isConsignment
          ? "bg-indigo-50 text-indigo-700"
          : isTeaOrNonCoffee
          ? "bg-emerald-50 text-emerald-700"
          : isFoodOrSnack
          ? "bg-orange-50 text-orange-700"
          : "bg-amber-50 text-amber-700";

        const badgeClass = isConsignment
          ? "text-indigo-700 bg-indigo-50"
          : isTeaOrNonCoffee
          ? "text-emerald-700 bg-emerald-50"
          : "text-amber-700 bg-amber-50";

        const badgeText = isConsignment
          ? "Consign"
          : isTeaOrNonCoffee
          ? "Non-Coffee"
          : isFoodOrSnack
          ? "Food & Snack"
          : "Coffee";

        return (
          <button
            key={product.id}
            type="button"
            disabled={!product.is_available}
            onClick={() => onSelectProduct(product)}
            className={`p-3 rounded-2xl text-left flex flex-col justify-between transition-all shadow-2xs space-y-2 ${
              !product.is_available
                ? "bg-slate-50 border border-slate-200 opacity-55 cursor-not-allowed"
                : isConsignment
                ? "bg-white border-2 border-indigo-100 hover:border-amber-500 cursor-pointer"
                : "bg-white border border-slate-200 hover:border-amber-500 cursor-pointer"
            }`}
          >
            <div
              className={`h-24 w-full rounded-xl flex items-center justify-center font-bold relative ${iconBoxClass}`}
            >
              {isConsignment || isFoodOrSnack ? (
                <Croissant className="w-8 h-8 opacity-65" />
              ) : isTeaOrNonCoffee ? (
                <CupSoda className="w-8 h-8 opacity-65" />
              ) : catUpper === "CUSTOM" ? (
                <Sparkles className="w-8 h-8 opacity-65" />
              ) : (
                <Coffee className="w-8 h-8 opacity-65" />
              )}

              {product.stock_quantity != null && product.is_available && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/90 text-slate-700 shadow-2xs">
                  {product.stock_quantity} left
                </span>
              )}
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${badgeClass}`}
                >
                  {badgeText}
                </span>
                {!product.is_available && (
                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    Out of Stock
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight mt-1 line-clamp-2">
                {product.name}
              </h4>
              <p className="font-mono font-bold text-amber-800 text-xs mt-1">
                Rp {price.toLocaleString("id-ID")}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
