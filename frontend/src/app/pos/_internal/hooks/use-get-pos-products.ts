"use client";

import { useState, useMemo } from "react";
import { useSWRPrivateRequest } from "@/main/lib/axios";
import { POSProductListResponse, POSProduct } from "../usecases/pos";

export function useGetPosProducts() {
  const [category, setCategory] = useState<string>("All");

  const { data, error, isLoading, mutate } = useSWRPrivateRequest<POSProductListResponse | POSProduct[]>({
    url: "/products",
    method: "GET",
  });

  const products: POSProduct[] = useMemo(() => {
    if (!data) return [];
    
    // Handles both paginated/wrapped responses { data: [...] } and flat array responses [...]
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (data.data && Array.isArray((data.data as any).data)) return (data.data as any).data;
    
    return [];
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