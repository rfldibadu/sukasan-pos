"use client";

import { LoginForm } from "@/app/login/_internal/components/login-form";
import { useLogin } from "@/app/login/_internal/hooks/auth-server";

export default function LoginPage() {
  const { login, isLoading, error } = useLogin();

  return (
    <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <LoginForm onSubmit={login} isLoading={isLoading} error={error} />
    </div>
  );
}