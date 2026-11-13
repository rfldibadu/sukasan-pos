"use client";

import { useMemo, useState } from "react";
import type { AxiosResponse } from "axios";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

export type OrderPeriodFilter = "today" | "yesterday" | "history";
export type OrderStatusFilter = "queued" | "completed" | "voided" | "all";

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

export interface OrderCounts {
  queued: number;
  completed: number;
  voided: number;
  all: number;
}

export interface PaginatedOrdersPayload {
  items: OrderData[];
  period: OrderPeriodFilter;
  is_paginated: boolean;
  page: number;
  limit?: number | null;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  counts: OrderCounts;
  timezone?: string;
}

function normalizeOrdersResponse(
  raw: AxiosResponse<PaginatedOrdersPayload | OrderData[]> | PaginatedOrdersPayload | OrderData[] | undefined
): PaginatedOrdersPayload {
  const empty: PaginatedOrdersPayload = {
    items: [],
    period: "today",
    is_paginated: false,
    page: 1,
    limit: null,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    counts: { queued: 0, completed: 0, voided: 0, all: 0 },
    timezone: "WITA (UTC+8)",
  };

  if (!raw) return empty;

  const payload =
    typeof raw === "object" && "data" in raw && "status" in raw
      ? (raw as AxiosResponse<PaginatedOrdersPayload | OrderData[]>).data
      : raw;

  if (Array.isArray(payload)) {
    const queued = payload.filter((o) => o.status === "queued").length;
    const completed = payload.filter((o) => o.status === "completed").length;
    const voided = payload.filter((o) => o.status === "voided").length;
    return {
      ...empty,
      items: payload,
      total_items: payload.length,
      counts: { queued, completed, voided, all: payload.length },
    };
  }

  if (payload && typeof payload === "object" && "items" in payload && Array.isArray(payload.items)) {
    return payload as PaginatedOrdersPayload;
  }

  return empty;
}

export function formatOrderCode(order: OrderData): string {
  if (order.daily_order_number != null) {
    return `ORD-${String(1000 + order.daily_order_number)}`;
  }
  return `ORD-${order.id.slice(0, 4).toUpperCase()}`;
}

export function formatOrderTime(isoString: string, includeDate = true): string {
  try {
    const d = new Date(isoString);
    const timePart = d.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Makassar",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (!includeDate) {
      return `${timePart} WITA`;
    }
    const datePart = d.toLocaleDateString("id-ID", {
      timeZone: "Asia/Makassar",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${datePart} • ${timePart} WITA`;
  } catch {
    return isoString;
  }
}

export interface UseOrdersParams {
  period?: OrderPeriodFilter;
  status?: OrderStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
}

export function useOrders(params: UseOrdersParams = {}) {
  const {
    period = "today",
    status = "all",
    search = "",
    page = 1,
    limit = 15,
  } = params;

  const [isMutating, setIsMutating] = useState(false);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set("period", period);
    if (status && status !== "all") {
      q.set("status", status);
    }
    if (search.trim()) {
      q.set("search", search.trim());
    }
    if (period === "history") {
      q.set("page", String(page));
      q.set("limit", String(limit));
    }
    return q.toString();
  }, [period, status, search, page, limit]);

  const { data, isLoading, isValidating, error, mutate } =
    useSWRPrivateRequest<PaginatedOrdersPayload>(
      {
        url: `/orders?${queryString}`,
        method: "GET",
      },
      {
        dedupingInterval: 60_000,
        revalidateOnFocus: false,
        keepPreviousData: true,
      }
    );

  const normalized = useMemo(() => normalizeOrdersResponse(data), [data]);

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

  // Remove an item from an unpaid open bill (DELETE /orders/{id}/items/{item_id})
  const removeItemFromOrder = async (orderId: string, itemId: string) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.delete<OrderData>(
        `/orders/${orderId}/items/${itemId}`
      );
      await mutate();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  // Void an order and restore stock (POST /orders/{id}/void)
  const voidOrder = async (
    orderId: string,
    voidReason: string,
    authPin: string
  ) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post<OrderData>(
        `/orders/${orderId}/void`,
        { void_reason: voidReason, auth_pin: authPin }
      );
      await mutate();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    orders: normalized.items,
    counts: normalized.counts,
    pagination: {
      isPaginated: normalized.is_paginated,
      page: normalized.page,
      limit: normalized.limit || limit,
      totalItems: normalized.total_items,
      totalPages: normalized.total_pages,
      hasNext: normalized.has_next,
      hasPrev: normalized.has_prev,
      timezone: normalized.timezone || "WITA (UTC+8)",
    },
    isLoading,
    isValidating,
    isMutating,
    error,
    refreshOrders: mutate,
    settleOrder,
    completeOrder,
    addItemsToOrder,
    removeItemFromOrder,
    voidOrder,
  };
}
