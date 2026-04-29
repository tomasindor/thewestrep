import { NextResponse } from "next/server";

import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";
import { createGoogleOAuthState, generateGoogleAuthUrl } from "@/lib/auth/customer-oauth";
import { isCustomerGoogleAuthConfigured } from "@/lib/env";

export const runtime = "nodejs";

const STATE_COOKIE = "google_oauth_state";
const RETURN_URL_COOKIE = "google_oauth_return_url";
const STATE_TTL_SECONDS = 60 * 5;

export async function GET(request: Request) {
  if (!isCustomerGoogleAuthConfigured()) {
    return NextResponse.json({ error: "Google OAuth no está disponible." }, { status: 501 });
  }

  const requestUrl = new URL(request.url);
  const safeReturnUrl = sanitizeAuthReturnUrl(requestUrl.searchParams.get("returnUrl"), "/");
  const state = createGoogleOAuthState();
  const redirectUrl = generateGoogleAuthUrl(state, safeReturnUrl);

  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  response.cookies.set(RETURN_URL_COOKIE, safeReturnUrl, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });

  return response;
}
