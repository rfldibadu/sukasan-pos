"use client";

import { useSession } from "next-auth/react";
import { DollarSign, Receipt, TrendingUp, RefreshCw, Wallet } from "lucide-react";
import { useDashboard } from "@/main/hooks/reports/use-dashboard";
import { formatIDR } from "@/main/usecases/dashboard";
import { MetricCard } from "@/main/components/dashboard/metric-card";
import { TopProductsCard } from "@/main/components/dashboard/top-products-card";
import { POSBanner } from "@/main/components/dashboard/pos-banner";

export default function DashboardPage() {
  const { status } = useSession();
  const { report, isValidating, refresh } = useDashboard();

  // Guard: Prevent rendering dashboard network calls if session is unauthenticated or loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-800" />
      </div>
    );
  }

  const metrics = report || {
    gross_sales: 0,
    completed_orders_count: 0,
    net_cafe_revenue: 0,
    net_profit: 0,
    top_selling_products: [],
  };

  const avgTicket = metrics.completed_orders_count > 0 
    ? metrics.gross_sales / metrics.completed_orders_count 
    : 0;

  return (
    <div className="space-y-5 h-full overflow-y-auto pb-20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Dashboard Overview
          </h2>
          <p className="text-[11px] text-slate-500">Jl. Achmad Nadjamuddin No.20</p>
        </div>
        <button
          onClick={() => refresh()}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
        </button>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Gross Sales Today"
          value={formatIDR(metrics.gross_sales)}
          subtext="Total order volume"
          icon={DollarSign}
          color="bg-amber-600"
        />
        <MetricCard
          title="Total Orders"
          value={metrics.completed_orders_count.toString()}
          subtext="Completed transactions"
          icon={Receipt}
          color="bg-emerald-600"
        />
        <MetricCard
          title="Avg. Spend / Order"
          value={formatIDR(avgTicket)}
          subtext="Ticket size average"
          icon={TrendingUp}
          color="bg-blue-600"
        />
        <MetricCard
          title="Net Cafe Revenue"
          value={formatIDR(metrics.net_cafe_revenue)}
          subtext="Excludes vendor payouts"
          icon={Wallet}
          color="bg-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <TopProductsCard products={metrics.top_selling_products} />
        </div>
        <div>
          <POSBanner />
        </div>
      </div>
    </div>
  );
}