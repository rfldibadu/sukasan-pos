// app/profile/_internal/hooks/use-profile.ts
"use client";

import { signOut } from "next-auth/react";
import { useSWRPrivateRequest } from "@/main/lib/axios/use-swr";
import { axiosHttpPrivate } from "@/main/lib/axios/instance";
import {
  UserProfile,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UpdateUserAdminRequest,
} from "../usecases/profile";

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWRPrivateRequest<UserProfile>(
    {
      url: "/auth/me",
      method: "GET",
    },
    {
      dedupingInterval: 300_000,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    }
  );

  const uploadAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    // Private Axios instance with Authorization header
    const response = await axiosHttpPrivate.post("/auth/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data; // Returns updated user with relative static URL
  };

  const updateProfile = async (payload: UpdateProfileRequest) => {
    const res = await axiosHttpPrivate.put<UpdateProfileResponse>(
      "/auth/me",
      payload
    );
    await mutate();
    return res.data;
  };

  const updateUserByAdmin = async (
    userId: string,
    payload: UpdateUserAdminRequest
  ) => {
    const res = await axiosHttpPrivate.put<UpdateProfileResponse>(
      `/auth/users/${userId}`,
      payload
    );
    return res.data;
  };

  const logoutUser = async () => {
    try {
      await axiosHttpPrivate.post("/auth/logout");
    } catch {
      // Proceed with client signout if backend request fails
    } finally {
      await signOut({ callbackUrl: "/login" });
    }
  };

  const deleteUser = async (userId: string) => {
    await axiosHttpPrivate.delete(`/auth/users/${userId}`);
  };

  return {
    profile: data?.data,
    isLoading,
    isError: error,
    updateProfile,
    updateUserByAdmin,
    logoutUser,
    deleteUser,
    mutate,
    uploadAvatar,
  };
}
