import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/today", "/plan", "/income", "/leads", "/settings"];
const authPaths = ["/login", "/register"];

function matchesPath(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requiresAuth = matchesPath(pathname, protectedPaths);
  const isAuthPage = authPaths.includes(pathname);

  if (!requiresAuth && !isAuthPage) {
    return NextResponse.next();
  }

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET must be set to enable authentication.");
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (requiresAuth && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/today/:path*",
    "/plan/:path*",
    "/income/:path*",
    "/leads/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
