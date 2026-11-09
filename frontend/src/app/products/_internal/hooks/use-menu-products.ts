"use client";

import { useMemo, useState } from "react";
import type { AxiosResponse } from "axios";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

export interface VendorItem {
  id: string;
  name: string;
  contact_info?: string | null;
  is_active: boolean;
}

export interface MenuProductItem {
  id: string;
  name: string;
  item_type: "MAIN" | "CONSIGNMENT" | "ADD_ON";
  retail_price: number;
  main_category?: "COFFEE" | "NON_COFFEE" | "SNACKS" | "FOODS" | "CUSTOM" | null;
  stock_quantity?: number | null;
  consignment_fee?: number | null;
  vendor_id?: string | null;
  is_active: boolean;
  vendor?: VendorItem | null;
}

export interface ProductCreatePayload {
  name: string;
  item_type: "MAIN" | "CONSIGNMENT" | "ADD_ON";
  retail_price: number;
  main_category?: "COFFEE" | "NON_COFFEE" | "SNACKS" | "FOODS" | "CUSTOM" | null;
  stock_quantity?: number | null;
  consignment_fee?: number | null;
  vendor_id?: string | null;
}

export interface ProductUpdatePayload {
  name?: string;
  item_type?: "MAIN" | "CONSIGNMENT" | "ADD_ON";
  retail_price?: number;
  main_category?: "COFFEE" | "NON_COFFEE" | "SNACKS" | "FOODS" | "CUSTOM" | null;
  stock_quantity?: number | null;
  consignment_fee?: number | null;
  vendor_id?: string | null;
  is_active?: boolean;
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

export function useMenuProducts() {
  const [isMutating, setIsMutating] = useState(false);

  const {
    data: productsRes,
    isLoading,
    error,
    mutate: mutateProducts,
  } = useSWRPrivateRequest<unknown>(
    {
      url: "/products?limit=1000&include_inactive=true",
      method: "GET",
    },
    {
      dedupingInterval: 120_000,
      revalidateOnFocus: false,
    }
  );

  const { data: vendorsRes, mutate: mutateVendors } =
    useSWRPrivateRequest<unknown>(
      {
        url: "/vendors",
        method: "GET",
      },
      {
        dedupingInterval: 120_000,
        revalidateOnFocus: false,
      }
    );

  const products = useMemo(
    () => extractArray<MenuProductItem>(productsRes),
    [productsRes]
  );

  const vendors = useMemo(
    () => extractArray<VendorItem>(vendorsRes),
    [vendorsRes]
  );

  const createProduct = async (payload: ProductCreatePayload) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post("/products", payload);
      await mutateProducts();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  const updateProduct = async (
    productId: string,
    payload: ProductUpdatePayload
  ) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.patch(
        `/products/${productId}`,
        payload
      );
      await mutateProducts();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  const updateProductStock = async (productId: string, stockQuantity: number) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.patch(`/products/${productId}/stock`, {
        stock_quantity: stockQuantity,
      });
      await mutateProducts();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  const archiveProduct = async (productId: string) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.delete(`/products/${productId}`);
      await mutateProducts();
      return res.data;
    } finally {
      setIsMutating(false);
    }
  };

  const createVendor = async (name: string, contactInfo?: string) => {
    setIsMutating(true);
    try {
      const res = await axiosHttpPrivate.post<{
        status: string;
        data: { id: string; name: string };
      }>("/vendors", {
        name,
        contact_info: contactInfo || null,
      });
      await mutateVendors();
      return res.data.data;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    products,
    vendors,
    isLoading,
    isMutating,
    error,
    refreshProducts: mutateProducts,
    createProduct,
    updateProduct,
    updateProductStock,
    archiveProduct,
    createVendor,
  };
}
