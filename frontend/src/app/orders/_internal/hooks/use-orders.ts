"use client";

import { useMemo, useState } from "react";
import type { AxiosResponse } from "axios";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

export interface OrderItemData {
  id: string;
  product_id: string;
  product_name?: string | null;
  item_type?: string | null;
  vendor_name?: string | null;
  quantity: number;
  unit_price: number;
  addons_price: number;
  line_total: number;
  calculated_cafe_revenue: number;
  addon_ids?: string[];
  item_notes?: string | null;
}

export interface OrderData {
  id: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  net_cafe_revenue: number;
  cashier_id: string;
  cashier_name?: string | null;
  payment_method?: "cash" | "qris" | "transfer" | null;
  payment_status: "unpaid" | "paid";
  cash_amount_received?: number | null;
  change_given?: number | null;
  order_type: "dine_in" | "takeaway";
  customer_name?: string | null;
  table_number?: string | null;
  daily_order_number?: number | null;
  status: "queued" | "completed" | "voided";
  void_reason?: string | null;
  created_at: string;
  items: OrderItemData[];
}

function toOrderArray(
  data: AxiosResponse<OrderData[]> | OrderData[] | undefined
): OrderData[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && "data" in data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export function formatOrderCode(order: OrderData): string {
  if (order.daily_order_number != null) {
    return `ORD-${String(1000 + order.daily_order_number)}`;
  }
  return `ORD-${order.id.slice(0, 4).toUpperCase()}`;
}

export function formatOrderTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function useOrders() {
  const [isMutating, setIsMutating] = useState(false);

  const { data, isLoading, isValidating, error, mutate } =
    useSWRPrivateRequest<OrderData[]>({
      url: "/orders?limit=200",
      method: "GET",
    });

  const orders = useMemo(() => toOrderArray(data), [data]);

  const counts = useMemo(() => {
    const queued = orders.filter((o) => o.status === "queued").length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const voided = orders.filter((o) => o.status === "voided").length;
    return {
      queued,
      completed,
      voided,
      all: orders.length,
    };
  }, [orders]);

  // Settle an open bill (POST /orders/{id}/settle)
  const settleOrder = async (
    orderId: string,
    payload: {
      payment_method: "cash" | "qris";
      cash_amount_received?: number | null;
      discount_amount?: number;
    }
  ) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post<OrderData>(
        `/orders/${orderId}/settle`,
        payload
      );
      await mutate();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  // Mark paid queued order as completed (POST /orders/{id}/complete)
  const completeOrder = async (orderId: string) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post<OrderData>(
        `/orders/${orderId}/complete`
      );
      await mutate();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  // Add extra items to an open bill (POST /orders/{id}/items)
  const addItemsToOrder = async (
    orderId: string,
    items: Array<{
      product_id: string;
      quantity: number;
      addon_ids?: string[];
      item_notes?: string | null;
    }>
  ) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post<OrderData>(
        `/orders/${orderId}/items`,
        { items }
      );
      await mutate();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  // Void an order and restore stock (POST /orders/{id}/void)
  const voidOrder = async (orderId: string, voidReason: string) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post<OrderData>(
        `/orders/${orderId}/void`,
        { void_reason: voidReason }
      );
      await mutate();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    orders,
    counts,
    isLoading,
    isValidating,
    isMutating,
    error,
    refreshOrders: mutate,
    settleOrder,
    completeOrder,
    addItemsToOrder,
    voidOrder,
  };
}
