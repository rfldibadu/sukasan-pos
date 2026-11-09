"use client";

import { useState, useMemo } from "react";
import type { AxiosResponse } from "axios";
import { useSWRPrivateRequest } from "@/main/lib/axios";
import { POSProductListResponse, POSProduct } from "../usecases/pos";

type ProductData = AxiosResponse<unknown> | POSProductListResponse | POSProduct[] | undefined;
type PosProductApi = POSProduct & {
  stock_quantity?: number | null;
  consignment_fee?: number | null;
  is_active?: boolean;
  main_category?: string | null;
  retail_price?: number;
  price?: number;
  category?: string;
  vendor?: { id: string; name: string } | null;
};

function isAxiosResponse(value: ProductData): value is AxiosResponse<unknown> {
  return Boolean(value) && typeof value === "object" && "data" in value && "status" in value && "config" in value;
}

function toProductArray(data: ProductData): PosProductApi[] {
  if (!data) return [];

  const payload = isAxiosResponse(data) ? data.data : data;

  if (Array.isArray(payload)) return payload as PosProductApi[];

  if (payload && typeof payload === "object" && "data" in payload) {
    const nestedData = payload.data;
    if (Array.isArray(nestedData)) return nestedData as PosProductApi[];
  }

  return [];
}

export function useGetPosProducts() {
  const [category, setCategory] = useState<string>("All");

  const { data, error, isLoading, mutate } = useSWRPrivateRequest<POSProductListResponse | POSProduct[]>(
    {
      url: "/products?limit=1000",
      method: "GET",
    },
    {
      dedupingInterval: 120_000,
      revalidateOnFocus: false,
    }
  );

  const products: POSProduct[] = useMemo(() => {
    const rawProducts = toProductArray(data);

    return rawProducts
      .filter((p) => p.item_type !== "ADD_ON")
      .map((p) => {
        const isConsignment = p.item_type === "CONSIGNMENT";
        const isAvailable = isConsignment
          ? (p.stock_quantity ?? 0) > 0 && (p.is_active ?? true)
          : Boolean(p.is_active ?? true) && (p.stock_quantity == null || p.stock_quantity > 0);

        return {
          id: p.id,
          name: p.name,
          category: p.main_category ?? p.category ?? "COFFEE",
          price: p.retail_price ?? p.price ?? 0,
          is_available: isAvailable,
          item_type: p.item_type,
          stock_quantity: p.stock_quantity ?? null,
          consignment_fee: p.consignment_fee ?? null,
          vendor_name: p.vendor?.name ?? null,
        };
      });
  }, [data]);

  const categories = useMemo(() => {
    const rawCategories = products
      .map((p) => p.category)
      .filter((cat): cat is string => Boolean(cat));

    const uniqueCats = Array.from(new Set(rawCategories));
    return ["All", ...uniqueCats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (category === "All") return products;
    return products.filter((p) => p.category.toUpperCase() === category.toUpperCase());
  }, [products, category]);

  return {
    products: filteredProducts,
    allProducts: products,
    categories,
    category,
    setCategory,
    isLoading,
    error,
    refreshProducts: mutate,
  };
}

export function useGetAddOns() {
  const { data, isLoading } = useSWRPrivateRequest<POSProductListResponse | POSProduct[]>(
    {
      url: "/products?limit=1000",
      method: "GET",
    },
    {
      dedupingInterval: 120_000,
      revalidateOnFocus: false,
    }
  );

  const addOns: POSProduct[] = useMemo(() => {
    const rawProducts = toProductArray(data);

    return rawProducts
      .filter((p) => p.item_type === "ADD_ON" && p.is_active !== false)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.main_category ?? p.category ?? "Add-On",
        price: p.retail_price ?? p.price ?? 0,
        is_available: Boolean(p.is_active ?? true),
        item_type: p.item_type,
      }));
  }, [data]);

  return { addOns, isLoading };
}
