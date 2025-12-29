import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要認證的路徑
const protectedPaths = ['/problems', '/submissions', '/scoreboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 檢查是否為受保護的路徑
  const isProtectedPath = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtectedPath) {
    // 檢查是否有 exam_session cookie
    const sessionCookie = request.cookies.get('exam_session');

    if (!sessionCookie) {
      // 沒有登入，重定向到登入頁
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 如果已登入且訪問首頁，重定向到題目列表
  if (pathname === '/') {
    const sessionCookie = request.cookies.get('exam_session');
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/problems', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/problems/:path*',
    '/submissions/:path*',
    '/scoreboard/:path*',
  ],
};
