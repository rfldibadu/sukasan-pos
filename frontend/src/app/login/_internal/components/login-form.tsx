import { useState } from "react";
import { Coffee, Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from "lucide-react";
import { LoginSubmitValues } from "../usecases/auth";

interface LoginFormProps {
  onSubmit: (values: LoginSubmitValues) => void;
  isLoading: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ username, password });
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-200 dark:border-slate-800 transition-all">
      {/* Brand & Title */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-lg shadow-amber-800/20 ring-4 ring-gray-100 dark:ring-slate-800 mb-3.5 transition-transform">
          <Coffee className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          Sukasan Coffee
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          POS & Staff Portal
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Username
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              placeholder="Enter your username"
              className="w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800 dark:focus:border-amber-600 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full h-11 sm:h-12 pl-10 pr-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800 dark:focus:border-amber-600 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 mt-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-amber-800/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In to POS</span>
          )}
        </button>
      </form>
    </div>
  );
}
