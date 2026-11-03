"use client";

import { LoginForm } from "@/app/login/_internal/components/login-form";
import { useLogin } from "@/app/login/_internal/hooks/auth-server";

export default function LoginPage() {
  const { login, isLoading, error } = useLogin();

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between items-center bg-gray-50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="w-full flex-1 flex flex-col items-center justify-center py-6 sm:py-10">
        <LoginForm onSubmit={login} isLoading={isLoading} error={error} />
      </div>

      {/* Subtle branding footer */}
      <footer className="w-full py-2 text-center">
        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">
          Sukasan Coffee • Jl. Achmad Nadjamuddin No.20
        </p>
      </footer>
    </div>
  );
}
