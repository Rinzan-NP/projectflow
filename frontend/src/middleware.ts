import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VALID_USERNAMES = new Set(["nprinzan", "solinify_1", "gingr_h"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const usernameCookie = request.cookies.get("projectflow_username")?.value?.toLowerCase();
  const isAuthenticated = usernameCookie && VALID_USERNAMES.has(usernameCookie);

  // If user is accessing login page:
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/projects", request.url));
    }
    return NextResponse.next();
  }

  // If root path:
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/projects", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // All other protected pages:
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, apple-icon.png, site.webmanifest
     * - api routes (/api/*)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|site.webmanifest|api/).*)",
  ],
};
