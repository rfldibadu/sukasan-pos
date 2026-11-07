"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Boxes,
  Users,
  Power,
  LogOut,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronUp,
  UserCog,
} from "lucide-react";
import { useProfile } from "./_internal/hooks/use-profile";
import { useDashboard } from "@/main/hooks/reports/use-dashboard";
import { formatIDR } from "@/main/usecases/dashboard";
import { useOrders } from "@/app/orders/_internal/hooks/use-orders";
import { UpdateProfileForm } from "./_internal/forms/edit";

const OPENING_FLOAT = 300000;

export default function ProfilePage() {
  const { data: session } = useSession();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const effectiveRole = (profile?.role || session?.user?.role || "manager") as
    | "manager"
    | "cashier";

  const [viewMode, setViewMode] = useState<"manager" | "cashier" | null>(null);
  const activeRole = viewMode ?? effectiveRole;

  const { report: metrics } = useDashboard();
  const { orders } = useOrders();

  // Store & Outlet Config
  const [outletName, setOutletName] = useState("Sukasan Blacklist — Main Cafe");
  const [openingCashFloat, setOpeningCashFloat] = useState("300000");
  const [receiptHeader, setReceiptHeader] = useState(
    "Sukasan Blacklist • Jl. Sudirman No. 12"
  );
  const [receiptFooter, setReceiptFooter] = useState(
    "Thank you for brewing with us! Follow @sukasan.blacklist"
  );
  const [savedBanner, setSavedBanner] = useState(false);

  // Cashier Drawer Count state
  const [actualCashInput, setActualCashInput] = useState<string>("");
  const [endShiftModalOpen, setEndShiftModalOpen] = useState(false);

  // Terminal Preferences
  const [autoPrint, setAutoPrint] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  // Collapsible Edit Account & Avatar Drawer
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Compute Cashier shift metrics from today's orders
  const shiftMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaysOrders = orders.filter(
      (o) => o.created_at.slice(0, 10) === todayStr
    );
    const validOrders = todaysOrders.filter((o) => o.status !== "voided");
    const cashReceived = validOrders
      .filter((o) => o.payment_status === "paid" && o.payment_method === "cash")
      .reduce((acc, o) => acc + o.total_amount, 0);
    const qrisReceived = validOrders
      .filter((o) => o.payment_status === "paid" && o.payment_method === "qris")
      .reduce((acc, o) => acc + o.total_amount, 0);

    return {
      ordersPunched: validOrders.length,
      cashReceived,
      qrisReceived,
      expectedCashInDrawer: OPENING_FLOAT + cashReceived,
    };
  }, [orders]);

  const actualCashCounted =
    actualCashInput === ""
      ? shiftMetrics.expectedCashInDrawer
      : Number(actualCashInput) || 0;
  const variance = actualCashCounted - shiftMetrics.expectedCashInDrawer;

  const initials = useMemo(() => {
    const name = profile?.full_name || session?.user?.full_name || "Staff";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [profile?.full_name, session?.user?.full_name]);

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const handleSignOut = async () => {
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "/login";
    await signOut({ callbackUrl });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {savedBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          Store &amp; receipt settings saved successfully!
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Account &amp; Shift Management
          </h1>
          <p className="text-xs text-slate-500">
            {activeRole === "manager"
              ? "Manager control panel, financial overview, and store settings."
              : "Cashier shift summary, cash drawer reconciliation, and terminal settings."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {effectiveRole === "manager" && (
            <div className="inline-flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("manager")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeRole === "manager"
                    ? "bg-amber-700 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Manager View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cashier")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeRole === "cashier"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Cashier Shift
              </button>
            </div>
          )}

          {activeRole === "cashier" && (
            <button
              type="button"
              onClick={() => setEndShiftModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>End Shift</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch User / Sign Out</span>
          </button>
        </div>
      </div>

      {/* MANAGER VIEW */}
      {activeRole === "manager" && (
        <div className="space-y-6">
          {/* Manager Profile & Store Overview Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-700 flex items-center justify-center text-white font-black text-xl shadow-md">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {profile?.full_name || "Admin / Manager"}
                    </h2>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Admin / Manager
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Full System Access • Sales Reports, Raw Stocks, Menu CRUD &amp;
                    Staff Control
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    ● Active Session: {profile?.username || "admin"}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 text-right">
                <p className="text-[11px] text-slate-400">Store Status</p>
                <p className="text-sm font-bold text-emerald-600">
                  Open • Operating Hours
                </p>
              </div>
            </div>

            {/* Today's Store Financial Snapshot */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Today&apos;s Store Financial Snapshot
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80">
                  <p className="text-xs text-slate-400">
                    Today&apos;s Gross Sales
                  </p>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {formatIDR(metrics?.gross_sales ?? 0)}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    {metrics?.paid_orders_count ?? 0} Paid •{" "}
                    {metrics?.open_bills_count ?? 0} Open Bills (
                    {formatIDR(metrics?.open_bills_amount ?? 0)})
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80">
                  <p className="text-xs text-slate-400">
                    Stock &amp; Ops Expenses
                  </p>
                  <p className="text-xl font-black text-rose-600 mt-1">
                    {formatIDR(metrics?.total_cash_out ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Raw Stocks ({formatIDR(metrics?.raw_stock_expenses ?? 0)}) + Ops
                    ({formatIDR(metrics?.operational_expenses ?? 0)})
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 text-white">
                  <p className="text-xs text-slate-300">Net Cashflow Today</p>
                  <p className="text-xl font-black text-amber-400 mt-1">
                    {formatIDR(metrics?.net_cashflow ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Paid Sales minus Total Expenses
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Management Shortcuts */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Quick Management Actions:</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/stocks"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-all"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  Audit Raw Stocks &amp; Receipts
                </Link>
                <Link
                  href="/users"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  Manage Staff &amp; Passwords
                </Link>
              </div>
            </div>
          </div>

          {/* Store & Outlet Configuration (Manager Only) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Store &amp; Outlet Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure outlet details, default opening cash float, and receipt
                  footer text.
                </p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Manager Only
              </span>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Cafe / Outlet Name
                  </label>
                  <input
                    type="text"
                    value={outletName}
                    onChange={(e) => setOutletName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Default Opening Cash Float (Modal Kasir)
                  </label>
                  <input
                    type="number"
                    value={openingCashFloat}
                    onChange={(e) => setOpeningCashFloat(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Store Address / Receipt Header
                  </label>
                  <input
                    type="text"
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Receipt Footer Message
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Save Store Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASHIER VIEW */}
      {activeRole === "cashier" && (
        <div className="space-y-6">
          {/* Cashier Active Profile & Shift Metrics */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {profile?.full_name || "Cashier On-Duty"}
                    </h2>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Cashier On-Duty
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Terminal #01 (Main Counter) • Operational POS Access
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    ● Active Session: {profile?.username || "kasir"}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 text-right">
                <p className="text-[11px] text-slate-400">Opening Cash Float</p>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {formatIDR(OPENING_FLOAT)}
                </p>
              </div>
            </div>

            {/* Current Shift Metrics */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Current Shift Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80">
                  <p className="text-xs text-slate-400">Orders Punched</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {shiftMetrics.ordersPunched} Orders
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80">
                  <p className="text-xs text-slate-400">Cash Received</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">
                    {formatIDR(shiftMetrics.cashReceived)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80">
                  <p className="text-xs text-slate-400">QRIS Payments</p>
                  <p className="text-xl font-black text-blue-600 mt-1">
                    {formatIDR(shiftMetrics.qrisReceived)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Drawer Reconciliation Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Cash Drawer Count &amp; Reconciliation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify physical cash in the drawer before handing over to the next
                shift.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                <span className="text-xs text-slate-400 block">
                  Expected Cash in Drawer
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block">
                  {formatIDR(shiftMetrics.expectedCashInDrawer)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Float ({formatIDR(OPENING_FLOAT)}) + Cash Sales (
                  {formatIDR(shiftMetrics.cashReceived)})
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-500/70">
                <label className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                  Actual Cash Counted (IDR)
                </label>
                <input
                  type="number"
                  value={
                    actualCashInput === ""
                      ? shiftMetrics.expectedCashInDrawer
                      : actualCashInput
                  }
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="w-full mt-1 text-lg font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">
                  Type physical cash amount
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex flex-col justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Drawer Variance
                </span>
                <span
                  className={`text-lg font-black ${
                    variance === 0
                      ? "text-emerald-600"
                      : variance < 0
                      ? "text-rose-600"
                      : "text-amber-600"
                  }`}
                >
                  {variance === 0
                    ? "Rp 0 (Balanced)"
                    : variance < 0
                    ? `- ${formatIDR(Math.abs(variance))} (Shortage)`
                    : `+ ${formatIDR(variance)} (Overage)`}
                </span>
                <span className="text-[10px] text-emerald-600/80">
                  Ready to close shift
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Terminal Preferences */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          Terminal &amp; Hardware Preferences
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
          <label className="py-3 flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Auto-print receipt after checkout
              </p>
              <p className="text-xs text-slate-400">
                Automatically trigger 58mm thermal printer when order is paid
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 accent-amber-700 rounded"
            />
          </label>
          <label className="py-3 flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Touch sound &amp; haptic feedback
              </p>
              <p className="text-xs text-slate-400">
                Play subtle beep when tapping product cards on POS
              </p>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => setSoundEffects(e.target.checked)}
              className="w-4 h-4 accent-amber-700 rounded"
            />
          </label>
        </div>
      </div>

      {/* Collapsible Account Profile & Avatar Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEditProfile((v) => !v)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Edit Personal Profile, Avatar &amp; Password
              </h3>
              <p className="text-xs text-slate-400">
                Update your display name, profile photo, or account password
              </p>
            </div>
          </div>
          {showEditProfile ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showEditProfile && (
          <div className="p-6 pt-2 border-t border-slate-100 dark:border-slate-700">
            {!isProfileLoading && <UpdateProfileForm />}
          </div>
        )}
      </div>

      {/* End Shift Confirmation Modal (Cashier Only) */}
      {endShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Close Cashier Shift?
              </h3>
              <p className="text-xs text-slate-500">
                Your shift summary and cash drawer count will be recorded and printed
                for the store manager.
              </p>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3.5 text-left text-xs space-y-1.5 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cashier:</span>
                  <span className="font-bold">
                    {profile?.full_name || "Cashier"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Cash:</span>
                  <span className="font-bold">
                    {formatIDR(shiftMetrics.expectedCashInDrawer)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actual Cash Counted:</span>
                  <span className="font-bold text-emerald-600">
                    {formatIDR(actualCashCounted)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEndShiftModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-1/2 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print &amp; Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
