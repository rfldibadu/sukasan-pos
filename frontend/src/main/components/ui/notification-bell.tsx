"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { AxiosResponse } from "axios";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Receipt,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

type AdminTask = "field_manager" | "finance" | "hrd";
type ReimbursementStatus = "not_applicable" | "pending" | "reimbursed";

interface OrderItemSummary {
  id: string;
  order_number?: string;
  customer_name?: string | null;
  total_amount: number;
  payment_status: "paid" | "open_bill" | "voided";
  payment_method?: string | null;
  created_at: string;
}

interface StaffMemberSummary {
  id: string | number;
  username: string;
  full_name: string;
  role: "manager" | "cashier";
  admin_task?: AdminTask | null;
  salary_day?: number | null;
  is_active: boolean;
}

interface StockPurchaseSummary {
  id: string;
  supplier_or_store?: string | null;
  payment_method: string;
  total_cost: number;
  notes?: string | null;
  purchased_at: string;
  created_by_name?: string | null;
  reimbursement_status?: ReimbursementStatus | null;
  items?: Array<{
    raw_stock_name?: string | null;
    quantity: number;
    unit?: string | null;
  }>;
}

interface OperationalExpenseSummary {
  id: string;
  title: string;
  category: string;
  amount: number;
  payment_method?: string | null;
  expense_date: string;
  created_by_name?: string | null;
  reimbursement_status?: ReimbursementStatus | null;
}

interface UnifiedExpenseNotification {
  id: string;
  kind: "stock_purchase" | "operational_cost";
  title: string;
  subtitle: string;
  amount: number;
  paymentMethod: string;
  reimbursementStatus: ReimbursementStatus;
  dateStr: string;
  timestamp: number;
}

interface CashierSalaryReminder {
  id: string | number;
  fullName: string;
  username: string;
  configuredDay: number;
  effectivePaydayDate: Date;
  daysUntil: number;
  isDueSoon: boolean; // true when 0 <= daysUntil <= 2
}

function unwrapArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  const payload =
    typeof raw === "object" && raw !== null && "data" in raw && "status" in raw
      ? (raw as AxiosResponse<unknown>).data
      : raw;

  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    if ("items" in payload && Array.isArray((payload as { items: unknown }).items)) {
      return (payload as { items: T[] }).items;
    }
    if ("data" in payload) {
      const inner = (payload as { data: unknown }).data;
      if (Array.isArray(inner)) return inner as T[];
      if (
        inner &&
        typeof inner === "object" &&
        "items" in inner &&
        Array.isArray((inner as { items: unknown }).items)
      ) {
        return (inner as { items: T[] }).items;
      }
    }
  }
  return [];
}

/**
 * Computes the next upcoming salary date for a cashier and how many calendar days remain.
 * Handles February (and 30-day months) by clamping `salary_day` to the last day of that month.
 */
function computeCashierSalaryReminder(
  cashier: StaffMemberSummary,
  now: Date
): CashierSalaryReminder {
  const configuredDay = Math.min(
    31,
    Math.max(1, Number(cashier.salary_day) || 30)
  );
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const daysInThisMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const effectiveDayThisMonth = Math.min(configuredDay, daysInThisMonth);
  let targetDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    effectiveDayThisMonth
  );

  // If this month's payday has already passed, compute next month's effective payday
  if (targetDate < todayMidnight) {
    const nextMonthYear =
      now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextMonthIdx = (now.getMonth() + 1) % 12;
    const daysInNextMonth = new Date(
      nextMonthYear,
      nextMonthIdx + 1,
      0
    ).getDate();
    const effectiveDayNextMonth = Math.min(configuredDay, daysInNextMonth);
    targetDate = new Date(
      nextMonthYear,
      nextMonthIdx,
      effectiveDayNextMonth
    );
  }

  const diffMs = targetDate.getTime() - todayMidnight.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return {
    id: cashier.id,
    fullName: cashier.full_name,
    username: cashier.username,
    configuredDay,
    effectivePaydayDate: targetDate,
    daysUntil,
    isDueSoon: daysUntil >= 0 && daysUntil <= 2,
  };
}

export function NotificationBell() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "task">("general");
  const [seenOrderIds, setSeenOrderIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem("sukasan_seen_order_notifs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userRole = session?.user?.role;
  const isEligible = userRole === "manager" && pathname !== "/pos";

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Fetch today's POS orders (for General Notifications) - gentle 3-minute interval
  const { data: ordersRes } = useSWRPrivateRequest<unknown>(
    isEligible
      ? {
          url: "/orders?period=today",
          method: "GET",
        }
      : null,
    {
      dedupingInterval: 120_000,
      refreshInterval: 180_000,
      revalidateOnFocus: false,
    }
  );

  // Fetch staff list (for resolving current admin's principal task & HRD salary dates)
  const { data: staffRes } = useSWRPrivateRequest<unknown>(
    isEligible
      ? {
          url: "/auth/users",
          method: "GET",
        }
      : null,
    {
      dedupingInterval: 300_000,
      revalidateOnFocus: false,
    }
  );

  const staffList = useMemo(
    () => unwrapArray<StaffMemberSummary>(staffRes),
    [staffRes]
  );

  // Determine the logged-in admin's principal task
  const adminTask: AdminTask = useMemo(() => {
    if (session?.user?.admin_task) return session.user.admin_task;
    const currentId = session?.user?.id;
    const currentUsername = session?.user?.username?.toLowerCase();
    const matched = staffList.find(
      (u) =>
        (currentId && String(u.id) === String(currentId)) ||
        (currentUsername && u.username.toLowerCase() === currentUsername)
    );
    if (matched?.admin_task) return matched.admin_task;
    // Fallback by known username/name if needed
    const nameLower = (session?.user?.full_name || "").toLowerCase();
    if (nameLower.includes("gerhana") || currentUsername === "gean1") {
      return "finance";
    }
    if (nameLower.includes("apan") || currentUsername === "apan1") {
      return "hrd";
    }
    return "field_manager";
  }, [session, staffList]);

  // Fetch expenses only if Finance admin (uses same URL as useStocks so cache is shared)
  const isFinance = isEligible && adminTask === "finance";
  const { data: purchasesRes, mutate: mutatePurchases } =
    useSWRPrivateRequest<unknown>(
      isFinance
        ? {
            url: "/stocks/purchases?limit=300",
            method: "GET",
          }
        : null,
      {
        dedupingInterval: 120_000,
        refreshInterval: 180_000,
        revalidateOnFocus: false,
      }
    );

  const { data: opsRes, mutate: mutateOps } = useSWRPrivateRequest<unknown>(
    isFinance
      ? {
          url: "/operational-costs",
          method: "GET",
        }
      : null,
    {
      dedupingInterval: 120_000,
      refreshInterval: 180_000,
      revalidateOnFocus: false,
    }
  );

  const recentOrders = useMemo(() => {
    const all = unwrapArray<OrderItemSummary>(ordersRes);
    return [...all]
      .filter((o) => o.payment_status !== "voided")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 15);
  }, [ordersRes]);

  const financeExpenses: UnifiedExpenseNotification[] = useMemo(() => {
    if (!isFinance) return [];
    const purchases = unwrapArray<StockPurchaseSummary>(purchasesRes);
    const ops = unwrapArray<OperationalExpenseSummary>(opsRes);

    const mappedPurchases: UnifiedExpenseNotification[] = purchases.map(
      (p) => {
        const itemsDesc =
          p.items && p.items.length > 0
            ? p.items
                .map(
                  (i) =>
                    `${i.raw_stock_name || "Stock"} (${i.quantity} ${
                      i.unit || ""
                    })`
                )
                .join(", ")
            : p.notes || "Raw Stock Purchase";
        return {
          id: p.id,
          kind: "stock_purchase",
          title: p.supplier_or_store
            ? `Stock: ${p.supplier_or_store}`
            : "Raw Stock Purchase",
          subtitle: `${itemsDesc}${
            p.created_by_name ? ` • by ${p.created_by_name}` : ""
          }`,
          amount: p.total_cost,
          paymentMethod: p.payment_method,
          reimbursementStatus: p.reimbursement_status || "not_applicable",
          dateStr: new Date(p.purchased_at).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          }),
          timestamp: new Date(p.purchased_at).getTime(),
        };
      }
    );

    const mappedOps: UnifiedExpenseNotification[] = ops.map((c) => ({
      id: c.id,
      kind: "operational_cost",
      title: c.title,
      subtitle: `${c.category.replace("_", " ")}${
        c.created_by_name ? ` • by ${c.created_by_name}` : ""
      }`,
      amount: c.amount,
      paymentMethod: c.payment_method || "m_banking",
      reimbursementStatus: c.reimbursement_status || "not_applicable",
      dateStr: new Date(c.expense_date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      timestamp: new Date(c.expense_date).getTime(),
    }));

    return [...mappedPurchases, ...mappedOps]
      .sort((a, b) => {
        // Prioritize pending reimbursements at the top, then newest
        if (
          a.reimbursementStatus === "pending" &&
          b.reimbursementStatus !== "pending"
        )
          return -1;
        if (
          b.reimbursementStatus === "pending" &&
          a.reimbursementStatus !== "pending"
        )
          return 1;
        return b.timestamp - a.timestamp;
      })
      .slice(0, 15);
  }, [isFinance, purchasesRes, opsRes]);

  const cashierSalaryReminders: CashierSalaryReminder[] = useMemo(() => {
    if (adminTask !== "hrd") return [];
    const now = new Date();
    return staffList
      .filter((u) => u.role === "cashier" && u.is_active)
      .map((c) => computeCashierSalaryReminder(c, now))
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [adminTask, staffList]);

  if (!isEligible) return null;

  const unreadOrdersCount = recentOrders.filter(
    (o) => !seenOrderIds.includes(String(o.id))
  ).length;

  const pendingReimburseCount =
    adminTask === "finance"
      ? financeExpenses.filter((e) => e.reimbursementStatus === "pending")
          .length
      : 0;

  const dueSoonSalaryCount =
    adminTask === "hrd"
      ? cashierSalaryReminders.filter((r) => r.isDueSoon).length
      : 0;

  const taskAlertCount =
    adminTask === "finance"
      ? pendingReimburseCount
      : adminTask === "hrd"
      ? dueSoonSalaryCount
      : 0;

  const totalBadgeCount = unreadOrdersCount + taskAlertCount;

  const handleMarkOrdersRead = () => {
    const allIds = Array.from(
      new Set([...seenOrderIds, ...recentOrders.map((o) => String(o.id))])
    ).slice(-100);
    setSeenOrderIds(allIds);
    try {
      localStorage.setItem("sukasan_seen_order_notifs", JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const handleMarkReimbursed = async (item: UnifiedExpenseNotification) => {
    setMutatingId(item.id);
    try {
      if (item.kind === "stock_purchase") {
        await axiosHttpPrivate.patch(`/stocks/purchases/${item.id}/reimburse`);
        await mutatePurchases();
      } else {
        await axiosHttpPrivate.patch(`/operational-costs/${item.id}/reimburse`);
        await mutateOps();
      }
    } finally {
      setMutatingId(null);
    }
  };

  const taskLabel =
    adminTask === "finance"
      ? "Finance"
      : adminTask === "hrd"
      ? "HRD"
      : "Field Manager";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
        title={`Admin Notifications (${taskLabel})`}
        aria-label="Admin Notifications"
      >
        <Bell className="w-4 h-4" />
        {totalBadgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
            {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Admin Notifications
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                  {taskLabel}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {adminTask === "field_manager"
                  ? "POS & Order Activity Feed"
                  : adminTask === "finance"
                  ? "POS Orders, Expenses & Reimbursements"
                  : "POS Orders & Cashier Salary Reminders"}
              </p>
            </div>
            {activeTab === "general" && unreadOrdersCount > 0 && (
              <button
                type="button"
                onClick={handleMarkOrdersRead}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Mark read
              </button>
            )}
          </div>

          {/* Role-Aware Tabs (Field Manager only has General POS/Orders per spec; Finance & HRD have General + Principal Task tab) */}
          {adminTask !== "field_manager" && (
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900/70 text-[11px] font-semibold border-b border-slate-200/70 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "general"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>POS / Orders</span>
                {unreadOrdersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold">
                    {unreadOrdersCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("task")}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "task"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {adminTask === "finance" ? (
                  <>
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Expenses &amp; Reimburse</span>
                  </>
                ) : (
                  <>
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Cashier Salary</span>
                  </>
                )}
                {taskAlertCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                    {taskAlertCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Body List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
            {(adminTask === "field_manager" || activeTab === "general") && (
              <>
                {recentOrders.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs text-slate-400">
                    <ShoppingBag className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    No POS orders placed today yet.
                  </div>
                ) : (
                  recentOrders.map((order) => {
                    const isUnread = !seenOrderIds.includes(String(order.id));
                    const timeStr = new Date(
                      order.created_at
                    ).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const isPaid = order.payment_status === "paid";

                    return (
                      <Link
                        key={order.id}
                        href="/orders"
                        onClick={() => {
                          handleMarkOrdersRead();
                          setIsOpen(false);
                        }}
                        className={`block p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors ${
                          isUnread
                            ? "bg-amber-50/40 dark:bg-amber-950/20"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {order.order_number ||
                                    `#ORD-${String(order.id).slice(0, 6)}`}
                                </span>
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {order.customer_name
                                  ? `Customer: ${order.customer_name}`
                                  : "Walk-in POS Order"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    isPaid
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {isPaid ? "Paid" : "Open Bill"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {timeStr}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            Rp{" "}
                            {Number(order.total_amount || 0).toLocaleString(
                              "id-ID"
                            )}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </>
            )}

            {/* FINANCE TAB: Expenses & Reimbursements */}
            {adminTask === "finance" && activeTab === "task" && (
              <>
                {financeExpenses.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs text-slate-400">
                    <Receipt className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    No stock or operational expenses logged yet.
                  </div>
                ) : (
                  financeExpenses.map((exp) => {
                    const isPending = exp.reimbursementStatus === "pending";
                    const isReimbursed =
                      exp.reimbursementStatus === "reimbursed";

                    return (
                      <div
                        key={`${exp.kind}-${exp.id}`}
                        className={`p-3 space-y-2 ${
                          isPending
                            ? "bg-amber-50/50 dark:bg-amber-950/20"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                              {exp.title}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                              {exp.subtitle}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-rose-600 block">
                              -Rp {exp.amount.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {exp.dateStr} &bull;{" "}
                              {exp.paymentMethod.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {isPending ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                <Clock className="w-3 h-3" />
                                Needs Reimburse
                              </span>
                              <button
                                type="button"
                                disabled={mutatingId === exp.id}
                                onClick={() => handleMarkReimbursed(exp)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                {mutatingId === exp.id
                                  ? "Updating..."
                                  : "Mark Reimbursed"}
                              </button>
                            </>
                          ) : isReimbursed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              Reimbursed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                              {exp.paymentMethod === "cash"
                                ? "Paid with Cafe Cash (No Reimburse)"
                                : "Paid by Finance / Direct (No Reimburse)"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* HRD TAB: Cashier Salary Date Reminders (2 days before salary_day) */}
            {adminTask === "hrd" && activeTab === "task" && (
              <>
                {cashierSalaryReminders.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs text-slate-400">
                    <CalendarClock className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    No active cashier accounts found.
                  </div>
                ) : (
                  cashierSalaryReminders.map((rem) => {
                    const formattedPayday =
                      rem.effectivePaydayDate.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                    return (
                      <div
                        key={rem.id}
                        className={`p-3 flex items-center justify-between gap-3 ${
                          rem.isDueSoon
                            ? "bg-rose-50/60 dark:bg-rose-950/30"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              rem.isDueSoon
                                ? "bg-rose-600 text-white"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <CalendarClock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {rem.fullName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                (@{rem.username})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Next Payday:{" "}
                              <strong className="text-slate-700 dark:text-slate-200">
                                {formattedPayday}
                              </strong>{" "}
                              (Every {rem.configuredDay}th)
                            </p>
                            {rem.isDueSoon && (
                              <p className="text-[10px] font-bold text-rose-600 mt-0.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {rem.daysUntil === 0
                                  ? "Salary is due TODAY!"
                                  : `Salary reminder: ${rem.daysUntil} day(s) left!`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                            rem.isDueSoon
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {rem.daysUntil === 0
                            ? "Due Today"
                            : `In ${rem.daysUntil}d`}
                        </span>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Footer Quick Link */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px]">
            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              View All Orders &rarr;
            </Link>
            {adminTask === "finance" && (
              <Link
                href="/stocks"
                onClick={() => setIsOpen(false)}
                className="font-semibold text-slate-600 dark:text-slate-300 hover:underline"
              >
                Manage Expenses &rarr;
              </Link>
            )}
            {adminTask === "hrd" && (
              <Link
                href="/users"
                onClick={() => setIsOpen(false)}
                className="font-semibold text-slate-600 dark:text-slate-300 hover:underline"
              >
                Customize Salary Dates &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
