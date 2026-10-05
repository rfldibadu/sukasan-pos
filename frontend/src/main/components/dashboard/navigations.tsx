"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, Receipt, Users } from "lucide-react";
import { ProfileAvatar } from "@/main/components/ui/profile-avatar";

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
      <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
      <div>
        <h1 className="font-bold text-slate-900">Sukasan Coffee</h1>
        <p className="text-xs text-slate-500">POS & Operations</p>
      </div>

      {/* Profile Avatar with status badge */}
      <ProfileAvatar />
    </header>

      {/* Bottom Bar for Mobile Layout (Realme Note 50 Target) */}
      <nav className="fixed bottom-0 inset-x-0 flex items-center justify-around bg-white border-t border-slate-200 z-50 py-1">
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