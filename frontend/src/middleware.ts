import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { canAccessRoute } from "@/main/utils/permissions";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    if (role && !canAccessRoute(pathname, role)) {
      return NextResponse.redirect(new URL("/pos", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Add routes that require authentication while excluding public static assets/logos
  matcher: [
    "/((?!api|static|_next/static|_next/image|design|logo|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
