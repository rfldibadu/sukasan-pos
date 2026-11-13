"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  Coffee,
  Printer,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { SearchBar } from "@/main/components/ui/search-bar";
import { Pagination } from "@/main/components/ui/pagination";
import {
  formatOrderCode,
  formatOrderTime,
  OrderData,
  OrderPeriodFilter,
  OrderStatusFilter,
  useOrders,
} from "./_internal/hooks/use-orders";
import {
  useGetAddOns,
  useGetPosProducts,
} from "@/app/pos/_internal/hooks/use-get-pos-products";
import { OrderDetailsDrawer } from "./_internal/modals/order-details-drawer";
import {
  AddItemsModal,
  ReceiptPreviewModal,
  SettleBillModal,
  VoidOrderModal,
} from "./_internal/modals/order-action-modals";

const HISTORY_PAGE_SIZE = 15;

export default function OrdersPage() {
  const [statusTab, setStatusTab] = useState<OrderStatusFilter>("all");
  const [shiftFilter, setShiftFilter] = useState<OrderPeriodFilter>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    orders,
    counts,
    pagination,
    isLoading,
    isValidating,
    isMutating,
    refreshOrders,
    settleOrder,
    completeOrder,
    addItemsToOrder,
    removeItemFromOrder,
    voidOrder,
  } = useOrders({
    period: shiftFilter,
    status: statusTab,
    search: searchQuery,
    page,
    limit: HISTORY_PAGE_SIZE,
  });

  const { allProducts, refreshProducts } = useGetPosProducts();
  const { addOns } = useGetAddOns();

  // Modal states
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showNotice = (
    text: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Map product_id -> name for display fallback
  const productLookup = useMemo(() => {
    const map: Record<string, string> = {};
    allProducts.forEach((p) => {
      map[p.id] = p.name;
    });
    addOns.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [allProducts, addOns]);

  // Compute FIFO sequence numbers for active queued orders (earliest first)
  const queuedOrderSequenceMap = useMemo(() => {
    const queuedList = [...orders]
      .filter((o) => o.status === "queued")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    const seqMap: Record<string, number> = {};
    queuedList.forEach((o, idx) => {
      seqMap[o.id] = idx + 1;
    });
    return seqMap;
  }, [orders]);

  const activeOrder: OrderData | null = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const handleShiftChange = (nextPeriod: OrderPeriodFilter) => {
    setShiftFilter(nextPeriod);
    setPage(1);
    if (nextPeriod !== "today" && statusTab === "queued") {
      setStatusTab("all");
    }
  };

  const handleStatusTabChange = (nextStatus: OrderStatusFilter) => {
    setStatusTab(nextStatus);
    setPage(1);
  };

  const handleConfirmSettle = async (
    method: "cash" | "qris",
    cashReceived: number | null
  ) => {
    if (!activeOrder) return;
    try {
      await settleOrder(activeOrder.id, {
        payment_method: method,
        cash_amount_received: cashReceived,
      });
      setIsSettleOpen(false);
      setSelectedOrderId(null);
      showNotice(
        `Open Bill settled (${method.toUpperCase()}) & marked completed!`,
        "success"
      );
    } catch {
      showNotice("Failed to settle open bill. Check cash amount.", "error");
    }
  };

  const handleCompletePaidOrder = async () => {
    if (!activeOrder) return;
    try {
      await completeOrder(activeOrder.id);
      setSelectedOrderId(null);
      showNotice("Order handed over and marked Completed!", "success");
    } catch {
      showNotice("Failed to complete order.", "error");
    }
  };

  const handleConfirmAddItem = async (
    productId: string,
    quantity: number,
    notes: string,
    addonIds: string[] = []
  ) => {
    if (!activeOrder) return;
    try {
      await addItemsToOrder(activeOrder.id, [
        {
          product_id: productId,
          quantity,
          addon_ids: addonIds,
          item_notes: notes.trim() || null,
        },
      ]);
      setIsAddItemsOpen(false);
      refreshProducts();
      showNotice("Item added to Open Bill!", "success");
    } catch {
      showNotice("Failed to add item. Check stock availability.", "error");
    }
  };

  const handleRemoveOpenBillItem = async (itemId: string) => {
    if (!activeOrder) return;
    try {
      await removeItemFromOrder(activeOrder.id, itemId);
      refreshProducts();
      showNotice("Item removed from Open Bill and stock restored!", "info");
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      showNotice(detail || "Failed to remove item from Open Bill.", "error");
    }
  };

  const handleConfirmVoid = async (reason: string, authPin: string) => {
    if (!activeOrder) return;
    try {
      await voidOrder(activeOrder.id, reason, authPin);
      setIsVoidOpen(false);
      setSelectedOrderId(null);
      refreshProducts();
      showNotice("Order voided and product stock restored!", "info");
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      showNotice(detail || "Failed to void order.", "error");
    }
  };

  const summarizeOrderItems = (order: OrderData) => {
    if (!order.items || order.items.length === 0) return "No items";
    return order.items
      .map((item) => {
        const name =
          item.product_name || productLookup[item.product_id] || "Menu Item";
        const noteSuffix = item.item_notes ? ` (${item.item_notes})` : "";
        return `${item.quantity}x ${name}${noteSuffix}`;
      })
      .join(", ");
  };

  const startIdx =
    pagination.totalItems === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(
    pagination.page * pagination.limit,
    pagination.totalItems
  );

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-20 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg text-white transition-all ${
            toast.type === "error"
              ? "bg-rose-600"
              : toast.type === "info"
              ? "bg-slate-900"
              : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Orders &amp; Open Bills
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              FIFO Queue • WITA (UTC+8)
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Track active prep queue, settle open bills, and browse historical orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              refreshOrders();
              showNotice("Orders queue refreshed!", "info");
            }}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => showNotice("Thermal printer online (58mm)", "info")}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Printer: Online</span>
          </button>
        </div>
      </div>

      {/* Search & Shift Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchBar
          className="sm:col-span-2"
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setPage(1);
          }}
          placeholder="Search by Table, Customer, Order #, or Menu Item..."
        />
        <div>
          <select
            value={shiftFilter}
            onChange={(e) =>
              handleShiftChange(e.target.value as OrderPeriodFilter)
            }
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-600 shadow-2xs text-slate-700"
          >
            <option value="today">Today (Current Shift • Show All)</option>
            <option value="yesterday">Yesterday (WITA • Show All)</option>
            <option value="history">
              All Shifts / History (Paginated {HISTORY_PAGE_SIZE}/page)
            </option>
          </select>
        </div>
      </div>

      {/* Streamlined Status Tabs (3 Core Statuses + All) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleStatusTabChange("queued")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusTab === "queued"
                ? "bg-amber-100 text-amber-800 border border-amber-600 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Antrean Aktif (FIFO Queue)</span>
            <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {counts.queued}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusTabChange("completed")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusTab === "completed"
                ? "bg-amber-100 text-amber-800 border border-amber-600 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Selesai (Completed)</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusTabChange("voided")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusTab === "voided"
                ? "bg-amber-100 text-amber-800 border border-amber-600 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Dibatalkan (Voided)</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {counts.voided}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusTabChange("all")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusTab === "all"
                ? "bg-amber-100 text-amber-800 border border-amber-600 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Semua (All)</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {counts.all}
            </span>
          </button>
        </div>

        {/* Mode Badge */}
        <span className="text-[11px] text-slate-500 font-medium">
          {shiftFilter === "history"
            ? `Showing ${startIdx}–${endIdx} of ${pagination.totalItems} historical orders`
            : `Showing all ${orders.length} orders for ${
                shiftFilter === "today" ? "Today (WITA)" : "Yesterday (WITA)"
              }`}
        </span>
      </div>

      {/* Orders Feed List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading orders queue...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-2">
          <p className="text-xs font-bold text-slate-700">
            No orders found for{" "}
            {shiftFilter === "today"
              ? "Today (WITA)"
              : shiftFilter === "yesterday"
              ? "Yesterday (WITA)"
              : "All Shifts / History"}
          </p>
          <p className="text-[11px] text-slate-400">
            {shiftFilter !== "history"
              ? "Switch the filter to 'All Shifts / History' to browse past seeded orders."
              : "Try clearing your search or status filter."}
          </p>
          {shiftFilter !== "history" && (
            <button
              type="button"
              onClick={() => handleShiftChange("history")}
              className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold cursor-pointer"
            >
              Browse All Shifts / History &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isQueued = order.status === "queued";
            const isVoided = order.status === "voided";
            const isUnpaid = order.payment_status === "unpaid";
            const seqNum = queuedOrderSequenceMap[order.id];
            const orderCode = formatOrderCode(order);

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`bg-white rounded-2xl p-4 shadow-2xs transition-all cursor-pointer ${
                  isVoided
                    ? "border border-slate-200 opacity-80 hover:opacity-100"
                    : isQueued && isUnpaid
                    ? "border-2 border-amber-300 hover:border-amber-500"
                    : "border border-slate-200 hover:border-amber-400"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* FIFO Sequence Badge */}
                      {isQueued && seqNum != null && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black text-white font-mono shadow-2xs ${
                            isUnpaid ? "bg-amber-700" : "bg-slate-800"
                          }`}
                        >
                          #{seqNum}
                        </span>
                      )}

                      <span
                        className={`text-xs font-bold font-mono ${
                          isVoided
                            ? "text-slate-400 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        {orderCode}
                      </span>

                      {/* Order Type Badge */}
                      {order.order_type === "dine_in" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Coffee className="w-3 h-3" /> Dine-In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShoppingBag className="w-3 h-3" /> Takeaway
                        </span>
                      )}

                      {/* Status & Payment Badge */}
                      {isVoided ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Dibatalkan
                            (Voided)
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Stock Restored
                          </span>
                        </>
                      ) : isUnpaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" /> Open Bill
                          (Belum Bayar)
                        </span>
                      ) : order.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> Selesai &amp; Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> Sudah Bayar (
                          {(order.payment_method || "Paid").toUpperCase()})
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-bold ${
                        isVoided
                          ? "text-slate-600 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      {order.customer_name || "Guest"}
                    </h3>

                    {isVoided && order.void_reason ? (
                      <p className="text-xs text-rose-600 font-medium">
                        Alasan Void: {order.void_reason}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {summarizeOrderItems(order)}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-1 shrink-0">
                    <div
                      className={`text-sm font-bold font-mono ${
                        isVoided
                          ? "text-slate-400 line-through"
                          : isUnpaid
                          ? "text-amber-800"
                          : "text-slate-900"
                      }`}
                    >
                      Rp {order.total_amount.toLocaleString("id-ID")}
                    </div>
                    {!isVoided && (
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isUnpaid
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isUnpaid
                          ? "Bayar Nanti"
                          : `${(
                              order.payment_method || "PAID"
                            ).toUpperCase()} Lunas`}
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatOrderTime(order.created_at, shiftFilter === "history")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conditional Pagination Controls (ONLY shown when shiftFilter === 'history') */}
      {shiftFilter === "history" && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.limit}
          itemLabel="orders"
          onPageChange={setPage}
        />
      )}

      {/* Order Details Slide-Over / Bottom Sheet Drawer */}
      <OrderDetailsDrawer
        order={activeOrder}
        queueSeq={activeOrder ? queuedOrderSequenceMap[activeOrder.id] ?? null : null}
        productLookup={productLookup}
        isMutating={isMutating}
        onClose={() => setSelectedOrderId(null)}
        onOpenSettle={() => setIsSettleOpen(true)}
        onCompletePaidOrder={handleCompletePaidOrder}
        onOpenAddItems={() => setIsAddItemsOpen(true)}
        onRemoveItem={handleRemoveOpenBillItem}
        onOpenReceipt={() => setIsReceiptOpen(true)}
        onOpenVoid={() => setIsVoidOpen(true)}
      />

      {/* Action Modals */}
      <SettleBillModal
        order={activeOrder}
        isOpen={isSettleOpen}
        isMutating={isMutating}
        onClose={() => setIsSettleOpen(false)}
        onConfirmSettle={handleConfirmSettle}
      />

      <AddItemsModal
        order={activeOrder}
        products={allProducts}
        isOpen={isAddItemsOpen}
        isMutating={isMutating}
        onClose={() => setIsAddItemsOpen(false)}
        onConfirmAddItem={handleConfirmAddItem}
      />

      <ReceiptPreviewModal
        order={activeOrder}
        productLookup={productLookup}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onPrintTriggered={() => {
          setIsReceiptOpen(false);
          showNotice("Receipt opened for printing!", "success");
        }}
      />

      <VoidOrderModal
        order={activeOrder}
        isOpen={isVoidOpen}
        isMutating={isMutating}
        onClose={() => setIsVoidOpen(false)}
        onConfirmVoid={handleConfirmVoid}
      />
    </div>
  );
}
