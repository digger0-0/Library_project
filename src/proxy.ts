import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_MAX_AGE_MS } from "./lib/session";

function clearAuth(res: NextResponse) {
  res.cookies.delete("session");
  res.cookies.delete("username");
  return res;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isUser = pathname.startsWith("/user");
  const isAdmin = pathname.startsWith("/admin");
  if (!isUser && !isAdmin) return NextResponse.next();

  const raw = request.cookies.get("session")?.value;
  const data = raw ? decryptSession(raw, SESSION_MAX_AGE_MS) : null;

  // The role is inside the encrypted payload, so the admin gate needs no DB.
  const ok = isAdmin ? data?.role === "admin" : data !== null;

  if (!ok) {
    return clearAuth(NextResponse.redirect(new URL("/login", request.url)));
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