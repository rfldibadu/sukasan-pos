"use client";

import {
  CheckCircle,
  CreditCard,
  Plus,
  Printer,
  X,
  XCircle,
} from "lucide-react";
import {
  formatOrderCode,
  OrderData,
} from "../hooks/use-orders";

interface OrderDetailsDrawerProps {
  order: OrderData | null;
  queueSeq: number | null;
  productLookup: Record<string, string>;
  isMutating: boolean;
  onClose: () => void;
  onOpenSettle: () => void;
  onCompletePaidOrder: () => void;
  onOpenAddItems: () => void;
  onOpenReceipt: () => void;
  onOpenVoid: () => void;
}

export function OrderDetailsDrawer({
  order,
  queueSeq,
  productLookup,
  isMutating,
  onClose,
  onOpenSettle,
  onCompletePaidOrder,
  onOpenAddItems,
  onOpenReceipt,
  onOpenVoid,
}: OrderDetailsDrawerProps) {
  if (!order) return null;

  const isUnpaid = order.payment_status === "unpaid";
  const isQueued = order.status === "queued";
  const isVoided = order.status === "voided";
  const orderCode = formatOrderCode(order);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

        {/* Drawer Header with Open Bill / Queue Badges */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {isQueued && queueSeq != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black bg-amber-700 text-white font-mono">
                  #{queueSeq}
                </span>
              )}
              <span className="font-mono text-sm font-bold text-slate-900">
                {orderCode}
              </span>
              {isVoided ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Dibatalkan (Voided)
                </span>
              ) : isUnpaid ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Open Bill (Belum Bayar)
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Sudah Bayar (Lunas)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              {order.customer_name || "Guest"} &bull;{" "}
              {order.order_type === "dine_in" ? "Dine-In" : "Takeaway"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Items Detail List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ordered Items
            </h4>
            {isQueued && isUnpaid && (
              <button
                type="button"
                onClick={onOpenAddItems}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Item (Add to Bill)
              </button>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 space-y-3 border border-slate-100">
            {order.items.map((item, idx) => {
              const name =
                item.product_name ||
                productLookup[item.product_id] ||
                `Item #${idx + 1}`;
              const isConsign =
                item.item_type === "CONSIGNMENT" ||
                item.item_type === "consignment";

              return (
                <div
                  key={item.id || idx}
                  className={`${
                    idx > 0 ? "border-t border-slate-200/60 pt-2" : ""
                  } flex items-start justify-between text-xs`}
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {item.quantity}x {name}
                      {isConsign ? " (Consignment)" : ""}
                    </p>
                    {item.vendor_name && (
                      <p className="text-[11px] text-indigo-700">
                        &bull; Vendor: {item.vendor_name}
                      </p>
                    )}
                    {item.item_notes && (
                      <p className="text-[11px] text-amber-800">
                        &bull; {item.item_notes}
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    Rp {item.line_total.toLocaleString("id-ID")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-mono">
              Rp {order.subtotal_amount.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Discounts</span>
            <span className="font-mono">
              Rp {order.discount_amount.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 text-sm">
            <span>Total Tagihan (Bill Due)</span>
            <span className="font-mono text-amber-800">
              Rp {order.total_amount.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-1">
            <span>Est. Net Cafe Revenue (less vendor fee)</span>
            <span className="font-mono text-emerald-600 font-semibold">
              Rp {order.net_cafe_revenue.toLocaleString("id-ID")}
            </span>
          </div>
          {order.void_reason && (
            <div className="pt-2 border-t border-rose-100 text-rose-600 font-medium">
              Alasan Void: {order.void_reason}
            </div>
          )}
        </div>

        {/* Dynamic Actions Based on Open Bill / Paid Status */}
        <div className="space-y-2 pt-2">
          {/* Open Bill Action: Settle Bill (Bayar Sekarang) */}
          {!isVoided && isUnpaid && (
            <button
              type="button"
              disabled={isMutating}
              onClick={onOpenSettle}
              className="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" /> Selesaikan Pembayaran (Pay
              Bill)
            </button>
          )}

          {/* Paid & Queued Action: Handover Drink */}
          {!isVoided && !isUnpaid && isQueued && (
            <button
              type="button"
              disabled={isMutating}
              onClick={onCompletePaidOrder}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" /> Serahkan Pesanan (Mark
              Completed)
            </button>
          )}

          {/* Secondary Actions */}
          <div
            className={`grid ${
              !isVoided && isQueued ? "grid-cols-2" : "grid-cols-1"
            } gap-2`}
          >
            <button
              type="button"
              onClick={onOpenReceipt}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Bill / Receipt
            </button>
            {!isVoided && isQueued && (
              <button
                type="button"
                onClick={onOpenVoid}
                className="py-2.5 px-4 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Void Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
