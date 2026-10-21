import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function POSBanner() {
  return (
    <div className="bg-linear-to-r from-amber-700 to-amber-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
      <div>
        <h3 className="font-bold text-lg">Ready to take orders?</h3>
        <p className="text-xs text-amber-100 mt-0.5">
          Create new dine-in or takeaway transactions, select add-ons, and auto-generate receipts.
        </p>
      </div>
      <Link
        href="/pos"
        className="inline-flex items-center justify-center gap-2 bg-white text-amber-900 font-semibold px-5 py-3 rounded-xl text-sm shadow-xs hover:bg-amber-50 active:scale-95 transition-all w-full sm:w-auto shrink-0"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Open POS Register</span>
      </Link>
    </div>
  );
}