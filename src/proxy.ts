import { NextResponse, type NextRequest } from "next/server";

/**
 * Locale routing: Persian (default) is served at `/…`, English at `/en/…`.
 * Internally every public page lives under `app/[locale]`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Expose the public path to server components (used by the 404 page).
  const headers = new Headers(request.headers);
  headers.set("x-mammoth-path", pathname);

  if (pathname === "/en" || pathname.startsWith("/en/")) return NextResponse.next({ request: { headers } });

  // `/fa/...` is the internal form; keep one canonical public URL.
  if (pathname === "/fa" || pathname.startsWith("/fa/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/fa${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Skip Next internals, the admin area, uploaded media and any file with an extension.
  matcher: ["/((?!_next/|admin|media/|images/|.*\\.[a-zA-Z0-9]+$).*)"],
};
