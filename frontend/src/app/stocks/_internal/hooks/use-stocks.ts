"use client";

import { useMemo, useState } from "react";
import type { AxiosResponse } from "axios";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

export type RawStockCategory =
  | "beans"
  | "milk_dairy"
  | "creamer_sweetener"
  | "syrup_beverage"
  | "powder_spread"
  | "ice"
  | "packaging_supply"
  | "other";

export type ExpensePaymentMethod = "m_banking" | "e_wallet" | "qris" | "cash";

export type CostCategory =
  | "electricity_indoor"
  | "electricity_booth"
  | "staff_salary"
  | "consignment_payout"
  | "rent"
  | "other";

export interface RawStockItem {
  id: string;
  name: string;
  category: RawStockCategory;
  unit: string;
  current_quantity: number;
  cost_per_unit: number;
  low_stock_threshold: number;
  is_active: boolean;
  updated_at?: string | null;
}

export interface StockPurchaseLineRead {
  id: string;
  raw_stock_id: string;
  raw_stock_name?: string | null;
  unit?: string | null;
  category?: RawStockCategory | null;
  quantity: number;
  unit_cost: number;
  subtotal_cost: number;
}

export interface StockPurchaseRecord {
  id: string;
  supplier_or_store?: string | null;
  payment_method: ExpensePaymentMethod;
  total_cost: number;
  receipt_image_url?: string | null;
  notes?: string | null;
  purchased_at: string;
  created_by_id: string;
  created_by_name?: string | null;
  items: StockPurchaseLineRead[];
}

export interface OperationalCostRecord {
  id: string;
  title: string;
  category: CostCategory;
  amount: number;
  payment_method?: ExpensePaymentMethod | null;
  notes?: string | null;
  expense_date: string;
  receipt_image_url?: string | null;
}

function extractArray<T>(data: unknown): T[] {
  if (!data) return [];
  const payload =
    typeof data === "object" && data !== null && "data" in data && "status" in data
      ? (data as AxiosResponse<unknown>).data
      : data;

  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

export function useStocks() {
  const [isMutating, setIsMutating] = useState(false);

  const {
    data: rawRes,
    isLoading: loadingRaw,
    mutate: mutateRaw,
  } = useSWRPrivateRequest<unknown>({
    url: "/stocks/raw",
    method: "GET",
  });

  const {
    data: purchasesRes,
    isLoading: loadingPurchases,
    mutate: mutatePurchases,
  } = useSWRPrivateRequest<unknown>({
    url: "/stocks/purchases?limit=100",
    method: "GET",
  });

  const {
    data: opsRes,
    isLoading: loadingOps,
    mutate: mutateOps,
  } = useSWRPrivateRequest<unknown>({
    url: "/operational-costs",
    method: "GET",
  });

  const rawStocks = useMemo(
    () => extractArray<RawStockItem>(rawRes),
    [rawRes]
  );

  const purchases = useMemo(
    () => extractArray<StockPurchaseRecord>(purchasesRes),
    [purchasesRes]
  );

  const operationalCosts = useMemo(
    () => extractArray<OperationalCostRecord>(opsRes),
    [opsRes]
  );

  const metrics = useMemo(() => {
    const lowStockItems = rawStocks.filter(
      (s) => s.current_quantity <= s.low_stock_threshold
    );
    const totalStockSpent = purchases.reduce(
      (sum, p) => sum + (p.total_cost || 0),
      0
    );
    const totalOpsSpent = operationalCosts.reduce(
      (sum, c) => sum + (c.amount || 0),
      0
    );
    return {
      totalCatalog: rawStocks.length,
      lowStockCount: lowStockItems.length,
      lowStockNames: lowStockItems
        .slice(0, 3)
        .map((s) => s.name)
        .join(", "),
      totalStockSpent,
      purchasesCount: purchases.length,
      totalOpsSpent,
    };
  }, [rawStocks, purchases, operationalCosts]);

  const adjustRawStockQuantity = async (
    stockId: string,
    newQuantity: number
  ) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.patch(
        `/stocks/raw/${stockId}/adjust`,
        { current_quantity: newQuantity }
      );
      await mutateRaw();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  const recordStockPurchase = async (formData: FormData) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post("/stocks/purchases", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await Promise.all([mutateRaw(), mutatePurchases()]);
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  const recordOperationalCost = async (formData: FormData) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post(
        "/operational-costs/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      await mutateOps();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    rawStocks,
    purchases,
    operationalCosts,
    metrics,
    isLoading: loadingRaw || loadingPurchases || loadingOps,
    isMutating,
    adjustRawStockQuantity,
    recordStockPurchase,
    recordOperationalCost,
    refreshAll: () => Promise.all([mutateRaw(), mutatePurchases(), mutateOps()]),
  };
}
