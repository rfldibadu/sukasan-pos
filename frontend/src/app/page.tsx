"use client";

import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Store,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { formatIDR, HourlySalesBucket } from "@/main/usecases/dashboard";
import { useDashboard } from "@/main/hooks/reports/use-dashboard";
import { MetricCard } from "@/main/components/dashboard/metric-card";
import { POSBanner } from "@/main/components/dashboard/pos-banner";
import { TopProductsCard } from "@/main/components/dashboard/top-products-card";

const DEFAULT_HOURS: HourlySalesBucket[] = [
  { hour: 8, hour_label: "08:00", gross_sales: 0, order_count: 0, is_peak: false },
  { hour: 9, hour_label: "09:00", gross_sales: 0, order_count: 0, is_peak: false },
  { hour: 10, hour_label: "10:00", gross_sales: 0, order_count: 0, is_peak: false },
  { hour: 11, hour_label: "11:00", gross_sales: 0, order_count: 0, is_peak: false },
  { hour: 12, hour_label: "12:00", gross_sales: 0, order_count: 0, is_peak: false },
  { hour: 13, hour_label: "13:00", gross_sales: 0, order_count: 0, is_peak: false },
  { hour: 14, hour_label: "14:00", gross_sales: 0, order_count: 0, is_peak: false },
];

export default function HomePage() {
  const { report: metrics, isLoading, error, refresh } = useDashboard();

  const hourlySales: HourlySalesBucket[] =
    metrics?.hourly_sales && metrics.hourly_sales.length > 0
      ? metrics.hourly_sales
      : DEFAULT_HOURS;

  const maxHourlySales = Math.max(
    ...hourlySales.map((h: HourlySalesBucket) => h.gross_sales || 0),
    1
  );

  const peakBucket = hourlySales.reduce(
    (best: HourlySalesBucket, cur: HourlySalesBucket) =>
      cur.gross_sales > best.gross_sales ? cur : best,
    hourlySales[0]
  );

  const avgOrderSpend =
    metrics && metrics.completed_orders_count > 0
      ? Math.round(metrics.gross_sales / metrics.completed_orders_count)
      : 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Today&apos;s Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time revenue, order volume, and consignment splits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {metrics?.start_date && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-3 py-1 rounded-full w-fit">
              📅 {metrics.start_date}
            </span>
          )}
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-amber-700 dark:hover:text-amber-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Unable to load live dashboard metrics.</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 animate-pulse"
            />
          ))}
        </div>
      ) : (
        metrics && (
          <>
            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <MetricCard
                title="Gross Sales"
                value={formatIDR(metrics.gross_sales)}
                subtext="Total order value today"
                icon={TrendingUp}
                color="bg-emerald-600"
              />
              <MetricCard
                title="Total Orders"
                value={String(metrics.completed_orders_count)}
                subtext={`${metrics.paid_orders_count} Paid • ${metrics.open_bills_count} Open Bills`}
                icon={ShoppingBag}
                color="bg-blue-600"
              />
              <MetricCard
                title="Avg. Spend"
                value={formatIDR(avgOrderSpend)}
                subtext={`Across ${metrics.completed_orders_count} bills today`}
                icon={Receipt}
                color="bg-purple-600"
              />
              <MetricCard
                title="Net Cafe Revenue"
                value={formatIDR(metrics.net_cafe_revenue)}
                subtext="Excluding consignment vendor share"
                icon={Store}
                color="bg-amber-700"
              />
            </div>

            {/* Financial Cashflow Summary (Uang Masuk vs Uang Keluar) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Cashflow Recap (Laporan Keuangan)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparison of incoming POS sales vs. raw stock purchases &amp;
                    daily expenses.
                  </p>
                </div>
                <Link
                  href="/stocks"
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  + Log Expense / Stock Purchase &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Total Masuk (Cash In)
                    </span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatIDR(metrics.total_cash_in)}
                  </p>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                    {metrics.paid_orders_count} Paid Orders (Excl.{" "}
                    {metrics.open_bills_count} Open Bills:{" "}
                    {formatIDR(metrics.open_bills_amount)})
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                      Total Keluar (Cash Out)
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                    {formatIDR(metrics.total_cash_out)}
                  </p>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-400/70 mt-0.5">
                    Raw Stocks ({formatIDR(metrics.raw_stock_expenses)}) + Ops (
                    {formatIDR(metrics.operational_expenses)})
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 text-white dark:bg-slate-950 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Net Cashflow Today
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      {metrics.net_cashflow >= 0 ? "Surplus" : "Deficit"}
                    </span>
                  </div>
                  <p className="text-xl font-black text-amber-400 mt-1">
                    {formatIDR(metrics.net_cashflow)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Actual cash &amp; QRIS balance after expenses
                  </p>
                </div>
              </div>
            </div>

            {/* Hourly Sales & Peak Hours Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Hourly Sales &amp; Traffic Rush
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Identify peak cafe hours and revenue distribution throughout
                      the day
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 px-2.5 py-1 rounded-lg">
                    🔥 Peak Hour:{" "}
                    {peakBucket && peakBucket.gross_sales > 0
                      ? `${peakBucket.hour_label} (${formatIDR(
                          peakBucket.gross_sales
                        )})`
                      : "No peak yet"}
                  </span>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="pt-4">
                <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-40 pt-6 px-1 border-b border-slate-100 dark:border-slate-700/80">
                  {hourlySales.slice(0, 7).map((bucket: HourlySalesBucket) => {
                    const heightPct =
                      bucket.gross_sales > 0
                        ? Math.max(
                            12,
                            Math.round((bucket.gross_sales / maxHourlySales) * 100)
                          )
                        : 8;
                    const isPeak =
                      bucket.is_peak ||
                      (bucket.gross_sales > 0 &&
                        bucket.hour === peakBucket?.hour);

                    const shortAmount =
                      bucket.gross_sales >= 1000
                        ? `${Math.round(bucket.gross_sales / 1000)}k`
                        : String(bucket.gross_sales);

                    return (
                      <div
                        key={bucket.hour}
                        className="flex flex-col items-center gap-1.5 h-full justify-end group"
                      >
                        <span
                          className={`text-[10px] ${
                            isPeak
                              ? "font-black text-amber-700 dark:text-amber-400"
                              : "font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                          }`}
                        >
                          {shortAmount}
                        </span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-9 rounded-t-lg transition-all ${
                            isPeak
                              ? "bg-linear-to-t from-amber-700 to-amber-500 shadow-md shadow-amber-600/20"
                              : bucket.gross_sales > 0
                              ? "bg-amber-300 dark:bg-amber-800/70 group-hover:bg-amber-500"
                              : "bg-slate-200 dark:bg-slate-700 group-hover:bg-amber-500"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* X-Axis Labels */}
                <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2 text-center text-[10px] font-semibold text-slate-400">
                  {hourlySales.slice(0, 7).map((bucket: HourlySalesBucket) => {
                    const isPeak =
                      bucket.is_peak ||
                      (bucket.gross_sales > 0 &&
                        bucket.hour === peakBucket?.hour);
                    return (
                      <div
                        key={bucket.hour}
                        className={
                          isPeak
                            ? "font-bold text-amber-700 dark:text-amber-400"
                            : undefined
                        }
                      >
                        {bucket.hour_label}
                        <span className="block text-[9px] text-slate-300 dark:text-slate-600">
                          {bucket.order_count} ord
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Selling Products */}
            <TopProductsCard products={metrics.top_selling_products} />

            {/* Quick Action Banner */}
            <POSBanner />
          </>
        )
      )}
    </div>
  );
}
