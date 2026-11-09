"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  ShoppingBag,
  ClipboardList,
  Package,
  Boxes,
  Users,
} from "lucide-react";
import { NotificationBell } from "@/main/components/ui/notification-bell";
import { ProfileAvatar } from "@/main/components/ui/profile-avatar";

export function NavigationHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "manager";

  const allNavItems = [
    { name: "Home", href: "/", icon: Home, roles: ["manager"] },
    { name: "POS", href: "/pos", icon: ShoppingBag, roles: ["manager", "cashier"] },
    {
      name: "Orders",
      href: "/orders",
      icon: ClipboardList,
      roles: ["manager", "cashier"],
    },
    {
      name: "Menu",
      href: "/products",
      icon: Package,
      roles: ["manager", "cashier"],
    },
    { name: "Stocks", href: "/stocks", icon: Boxes, roles: ["manager"] },
    { name: "Staff", href: "/users", icon: Users, roles: ["manager"] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const subtitleByPath: Record<string, string> = {
    "/": "Cafe POS & Consignment",
    "/pos": "Cashier Terminal • Active Shift",
    "/orders": "Order Queue & Open Bills",
    "/products": "Menu & Consignment Catalog",
    "/stocks": "Raw Materials & Purchase Receipts",
    "/users": "Team & Access Control",
    "/profile": "Staff Profile & Shift Settings",
  };

  const subtitle = subtitleByPath[pathname] || "Cafe POS & Consignment";

  return (
    <>
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 lg:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logo/sukasan_logo.jpg"
              alt="Sukasan Coffee"
              width={52}
              height={37}
              priority
              unoptimized
              className="h-8 lg:h-9 w-auto object-contain rounded-lg shrink-0"
            />
            <div>
              <span className="font-bold text-sm lg:text-base tracking-tight text-slate-900 dark:text-white block leading-none whitespace-nowrap">
                Sukasan Coffee
              </span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap block md:hidden lg:block mt-0.5">
                {subtitle}
              </span>
            </div>
          </div>

          {/* Desktop & Landscape Navigation */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 lg:gap-2 px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? "bg-amber-700 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right User / Shift Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Shift Open
            </span>
            <NotificationBell />
            <ProfileAvatar />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-amber-700 dark:text-amber-400 font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "stroke-[2.5px]" : "stroke-[1.75px]"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default NavigationHeader;
