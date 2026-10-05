import { useState, useMemo } from "react";
import { POSProduct } from "../usecases/pos";

interface ProductGridProps {
  products: POSProduct[];
  onSelectProduct: (product: POSProduct) => void;
}

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [products, searchQuery]);

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* Search Input Bar */}
      <div className="relative w-full">
        <svg
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Product List Scroll Container */}
      <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar flex-1">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
            <span className="text-xs font-medium">No products match standard criteria</span>
            {searchQuery && (
              <span className="text-[11px] mt-1 text-slate-500">
                Try searching for another term.
              </span>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredProducts.map((product) => {
              const price = Number(product?.price ?? 0);
              const isConsignment =
                product.item_type === "CONSIGNMENT" || product.item_type === "consignment";
              const statusText = isConsignment ? "Sold Out" : "Unavailable";

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={!product.is_available}
                  onClick={() => onSelectProduct(product)}
                  className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-left flex flex-col justify-between transition-all hover:shadow-sm h-28 ${
                    product.is_available
                      ? "bg-white dark:bg-slate-900 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
                      : "bg-slate-50 dark:bg-slate-950 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      {product.category}
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mt-0.5 line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Rp {price.toLocaleString("id-ID")}
                    </span>
                    {!product.is_available && (
                      <span className="text-[9px] text-red-500 font-medium bg-red-50 dark:bg-red-950/50 px-1 py-0.5 rounded">
                        {statusText}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}