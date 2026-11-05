"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getDefaultRouteForRole } from "@/main/utils/permissions";
import { LoginSubmitValues } from "../usecases/auth";

export function useLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (values: LoginSubmitValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        username: values.username.trim(),
        password: values.password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid username or password");
        setIsLoading(false);
        return false;
      }

      const session = await getSession();
      const targetRoute = getDefaultRouteForRole(session?.user?.role);

      router.push(targetRoute);
      router.refresh();
      return true;
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
      return false;
    }
  };

  return {
    login,
    isLoading,
    error,
    setError,
  };
}
