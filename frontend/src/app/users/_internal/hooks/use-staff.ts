"use client";

import { useMemo } from "react";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

export type StaffRole = "manager" | "cashier";
export type AdminTask = "field_manager" | "finance" | "hrd";

export type StaffUser = {
  id: string | number;
  username: string;
  full_name: string;
  profile_picture_url?: string | null;
  role: StaffRole;
  admin_task?: AdminTask | null;
  salary_day?: number | null;
  is_active: boolean;
};

export type StaffCreatePayload = {
  username: string;
  full_name: string;
  password: string;
  role: StaffRole;
  admin_task?: AdminTask | null;
  salary_day?: number | null;
};

export type StaffUpdatePayload = {
  full_name?: string;
  password?: string;
  role?: StaffRole;
  admin_task?: AdminTask | null;
  salary_day?: number | null;
  is_active?: boolean;
};

export const useStaff = () => {
  const { data, error, isLoading, mutate } = useSWRPrivateRequest<StaffUser[]>(
    {
      url: "/auth/users",
      method: "GET",
    },
    {
      dedupingInterval: 300_000,
      revalidateOnFocus: false,
    }
  );

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

  const updateStaff = async (
    userId: string | number,
    payload: StaffUpdatePayload
  ) => {
    const res = await axiosHttpPrivate.put<StaffUser>(
      `/auth/users/${userId}`,
      payload
    );
    await mutate();
    return res.data;
  };

  const deleteStaff = async (userId: string | number) => {
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
