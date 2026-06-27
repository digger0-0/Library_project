import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./lib/auth";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session")?.value;

  // user auth
  if (pathname.startsWith("/user")) {
    const data = await verifySession(false, session);
    console.log("access to user page", data);
    if (!data) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // admin auth
  if (pathname.startsWith("/admin")) {
    const data = await verifySession(true, session);
    if (!data || data.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
}