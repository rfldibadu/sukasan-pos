"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, Receipt, Users } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingBag },
  { label: "Orders", href: "/orders", icon: Receipt },
  { label: "Menu", href: "/products", icon: Package },
  { label: "Staff", href: "/users", icon: Users },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="font-bold text-lg text-gray-900 leading-tight">Sukasan Coffee</h1>
          <p className="text-xs text-gray-500">POS & Operations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-600">Online</span>
        </div>
      </header>

      {/* Bottom Bar for Mobile Layout (Realme Note 50 Target) */}
      <nav className="fixed bottom-0 inset-x-0 flex items-center justify-around bg-white border-t border-slate-200 z-50 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "text-amber-800 bg-amber-100/70 font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}