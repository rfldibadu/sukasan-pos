"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, LogIn } from "lucide-react";

export function ProfileAvatar() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  // State 1: User is logged out
  if (status === "unauthenticated" || !session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
      >
        <LogIn className="w-4 h-4 text-slate-500" />
        <span>Sign In</span>
      </Link>
    );
  }

const rawPhoto = session.user?.profile_picture_url || session.user?.image;

// Ensure relative FastAPI backend paths resolve to http://localhost:8000
const userPhoto = rawPhoto?.startsWith("/")
  ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${rawPhoto}`
  : rawPhoto;
  const displayName = session.user?.full_name || session.user?.email || "Staff";

  // State 2: User is logged in
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
        title="Account menu"
      >
      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline-block max-w-30 truncate">
          {displayName}
        </span>
        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-200 text-slate-600 overflow-hidden shrink-0">
          {userPhoto ? (
            <Image
              src={userPhoto}
              alt={displayName}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-slate-700" />
          )}
        </div>
        <span className="absolute bottom-px right-3.5 w-1.5 h-1.5 bg-emerald-500 border-0 border-white dark:border-slate-900 rounded-full" />      
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 sm:hidden">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </p>
          </div>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>Profile</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}