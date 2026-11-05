import Link from "next/link";
import { Flame } from "lucide-react";
import { TopSellingProduct, formatIDR } from "@/main/usecases/dashboard";

interface TopProductsCardProps {
  products: TopSellingProduct[];
}

export function TopProductsCard({ products }: TopProductsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Top Selling Items Today
          </h3>
        </div>
        <Link
          href="/products"
          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
        >
          View All Menu &rarr;
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">
          No item sales recorded today yet.
        </p>
      ) : (
        <div className="space-y-3">
          {products.map((item, index) => {
            const isTop = index === 0;
            const subtitle =
              item.item_type === "consignment" && item.vendor_name
                ? `${formatIDR(item.unit_price || 0)} / pc (Consignment: ${item.vendor_name})`
                : item.unit_price
                ? `${formatIDR(item.unit_price)} / unit`
                : item.main_category || "Menu Item";

            return (
              <div
                key={item.product_id}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-[11px] ${
                      isTop
                        ? "bg-amber-700 text-white"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {item.product_name}
                    </span>
                    <span className="text-[11px] text-slate-400">{subtitle}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {item.quantity_sold} sold
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium">
                    {formatIDR(item.total_revenue)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
