"use client";

import { useMemo, useState } from "react";
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
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  DashboardPeriod,
  formatIDR,
  HourlySalesBucket,
  SalesTrendBucket,
} from "@/main/usecases/dashboard";
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

const PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string; desc: string }> = [
  { id: "today", label: "Today", desc: "Daily (Default)" },
  { id: "week", label: "Week", desc: "Weekly" },
  { id: "month", label: "Month", desc: "Monthly" },
  { id: "year", label: "Year", desc: "Yearly" },
];

function getTodayWitaString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function stepReferenceDate(
  currentRef: string,
  period: DashboardPeriod,
  direction: -1 | 1
): string {
  const [y, m, d] = currentRef.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  if (period === "today") {
    dt.setUTCDate(dt.getUTCDate() + direction);
  } else if (period === "week") {
    dt.setUTCDate(dt.getUTCDate() + direction * 7);
  } else if (period === "month") {
    dt.setUTCDate(1);
    dt.setUTCMonth(dt.getUTCMonth() + direction);
  } else {
    dt.setUTCFullYear(dt.getUTCFullYear() + direction);
  }

  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(dt.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export default function HomePage() {
  const todayWita = useMemo(() => getTodayWitaString(), []);
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [refDate, setRefDate] = useState<string>(todayWita);

  const { report: metrics, isLoading, error, refresh } = useDashboard(
    period,
    refDate
  );

  const isViewingToday = refDate === todayWita && period === "today";

  const trendBuckets: SalesTrendBucket[] = useMemo(() => {
    if (metrics?.trend_buckets && metrics.trend_buckets.length > 0) {
      return metrics.trend_buckets;
    }
    const hrs =
      metrics?.hourly_sales && metrics.hourly_sales.length > 0
        ? metrics.hourly_sales
        : DEFAULT_HOURS;
    return hrs.map((h) => ({
      label: h.hour_label,
      sublabel: `${h.hour_label} WITA`,
      gross_sales: h.gross_sales,
      cash_out: 0,
      net_cashflow: h.gross_sales,
      order_count: h.order_count,
      is_peak: h.is_peak,
    }));
  }, [metrics]);

  const maxBucketValue = useMemo(() => {
    const vals = trendBuckets.flatMap((b) => [b.gross_sales || 0, b.cash_out || 0]);
    return Math.max(...vals, 1);
  }, [trendBuckets]);

  const peakBucket = useMemo(() => {
    if (trendBuckets.length === 0) return null;
    return trendBuckets.reduce(
      (best, cur) => (cur.gross_sales > best.gross_sales ? cur : best),
      trendBuckets[0]
    );
  }, [trendBuckets]);

  const avgOrderSpend =
    metrics && metrics.completed_orders_count > 0
      ? Math.round(metrics.gross_sales / metrics.completed_orders_count)
      : 0;

  const periodTitleMap: Record<DashboardPeriod, string> = {
    today: "Daily Overview (Today)",
    week: "Weekly Performance",
    month: "Monthly Financial Recap",
    year: "Yearly Cashflow Overview",
  };

  const periodNetLabelMap: Record<DashboardPeriod, string> = {
    today: "Net Cashflow (Daily)",
    week: "Net Cashflow (Weekly)",
    month: "Net Cashflow (Monthly)",
    year: "Net Cashflow (Yearly)",
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header + Period Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {periodTitleMap[period]}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              WITA (UTC+8)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time revenue, raw stock expenses, operational bills, and net cashflow.
          </p>
        </div>

        {/* Period Filter Controls (Today | Week | Month | Year + Stepper) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Period Tabs */}
          <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            {PERIOD_OPTIONS.map((opt) => {
              const active = period === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriod(opt.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    active
                      ? "bg-amber-700 text-white shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Date / Period Navigator */}
          <div className="inline-flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setRefDate((prev) => stepReferenceDate(prev, period, -1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Previous period"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="px-2.5 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {metrics?.period_label || `${refDate} (WITA)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRefDate((prev) => stepReferenceDate(prev, period, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Next period"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Date Picker Input */}
          <input
            type="date"
            value={refDate}
            onChange={(e) => {
              if (e.target.value) setRefDate(e.target.value);
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:border-amber-600"
            title="Select reference date (WITA)"
          />

          {!isViewingToday && (
            <button
              type="button"
              onClick={() => {
                setPeriod("today");
                setRefDate(todayWita);
              }}
              className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Today
            </button>
          )}

          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Quick Historical Month Shortcuts when viewing Month or Year */}
      {(period === "month" || period === "year") && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">
            Laporan Keuangan (2026):
          </span>
          {[
            { label: "Juni 2026", date: "2026-06-15" },
            { label: "Juli 2026", date: "2026-07-15" },
            { label: "Agustus 2026", date: "2026-08-15" },
            { label: "September 2026", date: "2026-09-15" },
            { label: "Oktober 2026", date: "2026-10-15" },
            { label: "November 2026", date: "2026-11-06" },
          ].map((m) => {
            const activeMonth = refDate.slice(0, 7) === m.date.slice(0, 7) && period === "month";
            return (
              <button
                key={m.date}
                type="button"
                onClick={() => {
                  setPeriod("month");
                  setRefDate(m.date);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  activeMonth
                    ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-300"
                }`}
              >
                {m.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setPeriod("year");
              setRefDate("2026-10-31");
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              period === "year" && refDate.startsWith("2026")
                ? "bg-slate-900 text-amber-300 font-bold"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Full Year 2026
          </button>
        </div>
      )}

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
                subtext={`Total sales (${metrics.period_label || period})`}
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
                subtext={`Across ${metrics.completed_orders_count} completed bills`}
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Cashflow Recap (Laporan Keuangan)
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {metrics.period_label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comparison of incoming POS sales (Pemasukan) vs. raw stock purchases &amp; operational bills (Pengeluaran).
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
                      {periodNetLabelMap[period]}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        metrics.net_cashflow >= 0
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {metrics.net_cashflow >= 0 ? "Surplus" : "Deficit"}
                    </span>
                  </div>
                  <p
                    className={`text-xl font-black mt-1 ${
                      metrics.net_cashflow >= 0 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {formatIDR(metrics.net_cashflow)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Total Masuk minus Total Keluar ({metrics.period_label})
                  </p>
                </div>
              </div>
            </div>

            {/* Period Sales & Cashflow Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  {period === "today" ? (
                    <Clock className="w-5 h-5 text-amber-600" />
                  ) : (
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {period === "today"
                        ? "Hourly Sales & Traffic Rush (WITA)"
                        : period === "week"
                        ? "Weekly Cashflow & Sales Trend (Sen–Min)"
                        : period === "month"
                        ? "Daily Cashflow & Sales Breakdown (Monthly)"
                        : "Monthly Cashflow Recap (Jan–Des)"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {period === "today"
                        ? "Peak cafe ordering hours and revenue distribution in WITA (UTC+8)"
                        : "Comparison of incoming sales (Masuk) and expenses (Keluar) across the period"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {period !== "today" && (
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                        Masuk
                      </span>
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-xs bg-rose-400 inline-block" />
                        Keluar
                      </span>
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 px-2.5 py-1 rounded-lg">
                    🔥 Peak:{" "}
                    {peakBucket && peakBucket.gross_sales > 0
                      ? `${peakBucket.sublabel || peakBucket.label} (${formatIDR(
                          peakBucket.gross_sales
                        )})`
                      : "No sales in period"}
                  </span>
                </div>
              </div>

              {/* Dynamic Bar Chart */}
              <div className="pt-2 overflow-x-auto">
                <div
                  className="flex items-end gap-1.5 sm:gap-2.5 h-44 pt-6 px-1 border-b border-slate-100 dark:border-slate-700/80 min-w-[520px]"
                >
                  {trendBuckets.map((bucket) => {
                    const inHeightPct =
                      bucket.gross_sales > 0
                        ? Math.max(
                            10,
                            Math.round((bucket.gross_sales / maxBucketValue) * 100)
                          )
                        : 4;
                    const outHeightPct =
                      bucket.cash_out > 0
                        ? Math.max(
                            8,
                            Math.round((bucket.cash_out / maxBucketValue) * 100)
                          )
                        : 0;
                    const isPeak =
                      bucket.is_peak ||
                      (bucket.gross_sales > 0 &&
                        bucket.label === peakBucket?.label);

                    const shortAmount =
                      bucket.gross_sales >= 1000000
                        ? `${(bucket.gross_sales / 1000000).toFixed(1)}M`
                        : bucket.gross_sales >= 1000
                        ? `${Math.round(bucket.gross_sales / 1000)}k`
                        : bucket.gross_sales > 0
                        ? String(bucket.gross_sales)
                        : "";

                    return (
                      <div
                        key={bucket.label}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-[22px]"
                        title={`${bucket.sublabel || bucket.label} • Masuk: ${formatIDR(
                          bucket.gross_sales
                        )} | Keluar: ${formatIDR(bucket.cash_out)} (${
                          bucket.order_count
                        } orders)`}
                      >
                        <span
                          className={`text-[9px] truncate ${
                            isPeak
                              ? "font-black text-amber-700 dark:text-amber-400"
                              : "font-semibold text-slate-400"
                          }`}
                        >
                          {shortAmount}
                        </span>
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          <div
                            style={{ height: `${inHeightPct}%` }}
                            className={`flex-1 max-w-6 rounded-t-md transition-all ${
                              isPeak
                                ? "bg-linear-to-t from-amber-700 to-amber-500 shadow-xs"
                                : bucket.gross_sales > 0
                                ? "bg-amber-400 dark:bg-amber-600 group-hover:bg-amber-500"
                                : "bg-slate-200 dark:bg-slate-700"
                            }`}
                          />
                          {period !== "today" && outHeightPct > 0 && (
                            <div
                              style={{ height: `${outHeightPct}%` }}
                              className="flex-1 max-w-4 rounded-t-md bg-rose-400/85 dark:bg-rose-500/80 transition-all"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Labels */}
                <div className="flex items-start gap-1.5 sm:gap-2.5 pt-2 text-center text-[10px] font-semibold text-slate-400 min-w-[520px]">
                  {trendBuckets.map((bucket) => {
                    const isPeak =
                      bucket.is_peak ||
                      (bucket.gross_sales > 0 &&
                        bucket.label === peakBucket?.label);
                    return (
                      <div
                        key={bucket.label}
                        className={`flex-1 min-w-[22px] truncate ${
                          isPeak
                            ? "font-bold text-amber-700 dark:text-amber-400"
                            : ""
                        }`}
                      >
                        {bucket.label}
                        {period !== "month" && (
                          <span className="block text-[9px] text-slate-300 dark:text-slate-600 truncate">
                            {bucket.order_count} ord
                          </span>
                        )}
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
