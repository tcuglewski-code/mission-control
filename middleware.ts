import { NextRequest, NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Test: log all requests
  console.log('[Middleware] Request:', pathname);
  
  // Bypass login endpoints
  if (pathname.startsWith("/api/login/")) {
    const res = NextResponse.next();
    res.headers.set('X-Mw-Test', 'minimal-running');
    return res;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
