import { NextResponse, type NextRequest } from "next/server";

// REBRAND-SPEC Part 4: anonymous visitors see the landing page, a returning
// session goes straight to /app. There is no auth yet, so "returning" means
// a cookie set the first time the app shell was served to this browser.
const RETURNING_COOKIE = "fp_returning";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/" && req.cookies.has(RETURNING_COOKIE)) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const res = NextResponse.next();
    res.cookies.set(RETURNING_COOKIE, "1", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app", "/app/:path*"],
};
