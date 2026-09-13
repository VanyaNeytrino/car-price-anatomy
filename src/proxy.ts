// src/proxy.ts
// Защита админки не только через layout: до рендера страницы.
import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
