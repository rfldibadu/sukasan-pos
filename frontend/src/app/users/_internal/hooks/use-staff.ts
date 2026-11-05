"use client";

import { useMemo } from "react";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

export type StaffRole = "manager" | "cashier";

export type StaffUser = {
  id: number;
  username: string;
  full_name: string;
  profile_picture_url?: string | null;
  role: StaffRole;
  is_active: boolean;
};

export type StaffCreatePayload = {
  username: string;
  full_name: string;
  password: string;
  role: StaffRole;
};

export type StaffUpdatePayload = {
  full_name?: string;
  password?: string;
  role?: StaffRole;
  is_active?: boolean;
};

export const useStaff = () => {
  const { data, error, isLoading, mutate } = useSWRPrivateRequest<StaffUser[]>({
    url: "/auth/users",
    method: "GET",
  });

  const staff: StaffUser[] = useMemo(() => {
    const raw = data?.data;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [data]);

  const registerStaff = async (payload: StaffCreatePayload) => {
    const res = await axiosHttpPrivate.post<StaffUser>(
      "/auth/register",
      payload
    );
    await mutate();
    return res.data;
  };

  const updateStaff = async (userId: number, payload: StaffUpdatePayload) => {
    const res = await axiosHttpPrivate.put<StaffUser>(
      `/auth/users/${userId}`,
      payload
    );
    await mutate();
    return res.data;
  };

  const deleteStaff = async (userId: number) => {
    await axiosHttpPrivate.delete(`/auth/users/${userId}`);
    await mutate();
  };

  return {
    staff,
    isLoading,
    error,
    mutate,
    registerStaff,
    updateStaff,
    deleteStaff,
  };
};
