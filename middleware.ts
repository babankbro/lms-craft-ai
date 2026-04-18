import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // Admin routes
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Instructor routes
    if (path.startsWith("/teach") && !["INSTRUCTOR", "ADMIN"].includes(role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Mentor routes
    if (path.startsWith("/review") && !["MENTOR", "INSTRUCTOR", "ADMIN"].includes(role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path.startsWith("/mentees") && !["MENTOR", "ADMIN"].includes(role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    if (path.startsWith("/observe") && !["MENTOR", "INSTRUCTOR", "ADMIN"].includes(role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Negative pattern: protect every route EXCEPT
     * - /api/auth (NextAuth endpoints)
     * - /login (public sign-in page)
     * - /_next/static, /_next/image (Next.js assets)
     * - /favicon.ico, /public (static files)
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon\.ico|public).*)",
  ],
};
