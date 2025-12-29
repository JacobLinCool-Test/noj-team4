import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
} from "./src/i18n/config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  const cookieValue = request.cookies.get(LOCALE_COOKIE)?.value;
  const isSupported = cookieValue
    ? SUPPORTED_LOCALES.includes(cookieValue as (typeof SUPPORTED_LOCALES)[number])
    : false;

  const localeToPersist = isSupported ? (cookieValue as string) : DEFAULT_LOCALE;
  const response = NextResponse.next();

  if (!cookieValue || !isSupported) {
    response.cookies.set({
      name: LOCALE_COOKIE,
      value: localeToPersist,
      path: "/",
      sameSite: "lax",
      maxAge: ONE_YEAR_IN_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
