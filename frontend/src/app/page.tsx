'use client';

import Link from "next/link";
import { useSWRPrivateRequest } from "@/main/lib/axios";
import { ShoppingBag, DollarSign, Receipt, TrendingUp, RefreshCw } from "lucide-react";

interface DashboardMetrics {
  todayRevenue: number;
  todayOrders: number;
  averageTicket: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  color: string;
}

function MetricCard({ title, value, subtext, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{subtext}</p>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Disables automatic error retries if the backend endpoint is not implemented yet
  const { data, isValidating, mutate, error } = useSWRPrivateRequest<DashboardMetrics>(
    {
      url: "/orders/metrics",
      method: "GET",
    },
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    }
  );

  const metrics = error || !data?.data ? {
    todayRevenue: 0,
    todayOrders: 0,
    averageTicket: 0,
  } : data.data;

  const formatIDR = (val: number) =>
    `Rp${val.toLocaleString('id-ID', { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-xs text-gray-500">Jl. Achmad Nadjamuddin No.20</p>
        </div>
        <button
          onClick={() => mutate()}
          className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          title="Today's Sales"
          value={formatIDR(metrics.todayRevenue)}
          subtext="Net cafe revenue"
          icon={DollarSign}
          color="bg-amber-600"
        />
        <MetricCard
          title="Total Orders"
          value={metrics.todayOrders.toString()}
          subtext="Completed transactions"
          icon={Receipt}
          color="bg-emerald-600"
        />
        <MetricCard
          title="Avg. Spend per Order"
          value={formatIDR(metrics.averageTicket)}
          subtext="Ticket size average"
          icon={TrendingUp}
          color="bg-blue-600"
        />
      </div>

      <div className="bg-linear-to-r from-amber-700 to-amber-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <h3 className="font-bold text-lg">Ready to take orders?</h3>
          <p className="text-xs text-amber-100 mt-0.5">
            Create new dine-in or takeaway transactions, select add-ons, and auto-generate receipts.
          </p>
        </div>
        <Link
          href="/pos"
          className="inline-flex items-center justify-center gap-2 bg-white text-amber-900 font-semibold px-5 py-3 rounded-xl text-sm shadow hover:bg-amber-50 active:scale-95 transition-all w-full sm:w-auto"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Open POS Register</span>
        </Link>
      </div>
    </div>
  );
}