import { Flame } from "lucide-react";
import { TopSellingProduct, formatIDR } from "@/main/usecases/dashboard";

interface TopProductsCardProps {
  products: TopSellingProduct[];
}

export function TopProductsCard({ products }: TopProductsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
        <Flame className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Top Selling Items</h3>
      </div>

      {products.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No item sales recorded today yet.</p>
      ) : (
        <div className="space-y-3">
          {products.map((item, index) => (
            <div key={item.product_id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                  {index + 1}
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-37.5 sm:max-w-50">
                  {item.product_name}
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 dark:text-slate-100">{item.quantity_sold} sold</p>
                <p className="text-[10px] text-slate-400">{formatIDR(item.total_revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}