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
  // Add routes that require authentication
  matcher: [
    "/((?!api|_next/static|_next/image|design|favicon.ico).*)",
    "/",
    "/pos/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/products/:path*",
    "/stocks/:path*",
    "/users/:path*",
    "/profile/:path*",
  ],
};
