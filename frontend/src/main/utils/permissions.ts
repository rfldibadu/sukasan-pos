export type AppRole = "manager" | "cashier";

export const ROLE_DEFAULT_ROUTE: Record<AppRole, string> = {
  manager: "/",
  cashier: "/pos",
};

export const CASHIER_RESTRICTED_PREFIXES = ["/stocks", "/users"];

export function getDefaultRouteForRole(role?: string | null): string {
  return role === "manager" ? "/" : "/pos";
}

export function canAccessRoute(pathname: string, role?: string | null): boolean {
  if (!role) return false;
  if (role === "manager") return true;
  // Cashier cannot access "/" (Dashboard), "/stocks" (Raw Stocks & Receipts), or "/users" (Staff management)
  if (pathname === "/") return false;
  if (
    CASHIER_RESTRICTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return false;
  }
  return true;
}

export const Permissions = {
  canViewDashboard: (role?: string | null) => role === "manager",
  canManageMenuCatalog: (role?: string | null) => role === "manager",
  canUpdateProductStock: (role?: string | null) =>
    role === "manager" || role === "cashier",
  canManageRawStocks: (role?: string | null) => role === "manager",
  canVoidOrder: (role?: string | null) =>
    role === "manager" || role === "cashier",
  canManageStaff: (role?: string | null) => role === "manager",
};
