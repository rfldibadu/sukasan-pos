"use client";

import { ShieldCheck, UserCheck } from "lucide-react";
import { LoginForm } from "./_internal/components/login-form";
import { useLogin } from "./_internal/hooks/auth-server";

export default function LoginPage() {
  const { login, isLoading, error } = useLogin();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md space-y-6 flex flex-col items-center">
        {/* Login Form Card */}
        <LoginForm onSubmit={login} isLoading={isLoading} error={error} />

        {/* Role-Based Access Control (RBAC) Summary */}
        <div className="w-full bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Role-Based Access Control (RBAC):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50">
              <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Admin / Manager
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Full access: Sales Dashboard, POS, Open Bills, Menu CRUD, Raw Stocks
                &amp; Expenses, and Staff Accounts.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50">
              <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                Cashier
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Operational access: Lands directly on POS Register, manages Open
                Bills, and toggles Menu availability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
