
import { POSProduct } from "../usecases/pos";

interface ProductGridProps {
  products: POSProduct[];
  onSelectProduct: (product: POSProduct) => void;
}

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No products available in this category.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {products.map((product) => {
        const price = Number(product?.price ?? 0);

        return (
          <button
            key={product.id}
            type="button"
            disabled={!product.is_available}
            onClick={() => onSelectProduct(product)}
            className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left flex flex-col justify-between transition-all hover:shadow-md ${
              product.is_available
                ? "bg-white dark:bg-slate-900 cursor-pointer"
                : "bg-slate-50 dark:bg-slate-950 opacity-50 cursor-not-allowed"
            }`}
          >
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                {product.category}
              </span>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-1">
                {product.name}
              </h3>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Rp {price.toLocaleString("id-ID")}
              </span>
              {!product.is_available && (
                <span className="text-xs text-red-500 font-medium">
                  Sold Out
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}