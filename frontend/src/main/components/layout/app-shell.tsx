"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/main/components/dashboard/navigations";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <main className="min-h-screen min-h-[100dvh] w-full flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Navigation />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
