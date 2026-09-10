import { NextRequest, NextResponse } from "next/server";
import { logout, verifySession } from "./lib/auth";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session")?.value;

  // user auth
  if (pathname.startsWith("/user")) {
    const data = await verifySession(false, session);
    if (!data) {
      logout();
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // admin auth
  if (pathname.startsWith("/admin")) {
    const data = await verifySession(true, session);
    if (!data || data.role !== "admin") {
      logout();
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
}