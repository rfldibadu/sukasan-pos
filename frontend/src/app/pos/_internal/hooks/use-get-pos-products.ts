"use client";

import { useState, useMemo } from "react";
import { useSWRPrivateRequest } from "@/main/lib/axios";
import { POSProductListResponse, POSProduct } from "../usecases/pos";

export function useGetPosProducts() {
  const [category, setCategory] = useState<string>("All");

  const { data, error, isLoading, mutate } = useSWRPrivateRequest<POSProductListResponse | POSProduct[]>({
    url: "/products?limit=1000",
    method: "GET",
  });

  const products: POSProduct[] = useMemo(() => {
    if (!data) return [];
    
    let rawProducts: any[] = [];
    if (Array.isArray(data)) rawProducts = data;
    else if (Array.isArray(data.data)) rawProducts = data.data;
    else if (data.data && Array.isArray((data.data as any).data)) rawProducts = (data.data as any).data;

    return rawProducts.map((p) => {
      const isConsignment = p.item_type === "CONSIGNMENT";
      const isAvailable = isConsignment 
        ? (p.stock_quantity ?? 0) > 0 && (p.is_active ?? true)
        : Boolean(p.is_active);

      return {
        id: p.id,
        name: p.name,
        category: p.main_category ?? p.category ?? "Add-On",
        price: p.retail_price ?? p.price ?? 0,
        is_available: isAvailable,
        item_type: p.item_type,
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
    return products.filter((p) => p.category === category);
  }, [products, category]);

  return {
    products: filteredProducts,
    categories,
    category,
    setCategory,
    isLoading,
    error,
    refreshProducts: mutate,
  };
}

export function useGetAddOns() {
  const { data, isLoading } = useSWRPrivateRequest<POSProductListResponse | POSProduct[]>({
    url: "/products?item_type=ADD_ON&limit=1000",
    method: "GET",
  });

  const addOns: POSProduct[] = useMemo(() => {
    if (!data) return [];
    
    let rawProducts: any[] = [];
    if (Array.isArray(data)) rawProducts = data;
    else if (Array.isArray(data.data)) rawProducts = data.data;
    else if (data.data && Array.isArray((data.data as any).data)) rawProducts = (data.data as any).data;

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