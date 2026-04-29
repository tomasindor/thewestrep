import { NextResponse } from "next/server";

import { upsertCustomerGoogleAccount } from "@/lib/auth/customer-accounts";
import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";
import { createCustomerSession } from "@/lib/auth/customer-session";
import { exchangeGoogleCodeForToken, getGoogleUserInfo } from "@/lib/auth/customer-oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "google_oauth_state";
const RETURN_URL_COOKIE = "google_oauth_return_url";
const SESSION_COOKIE = "customer_session";

function failRedirect(request: Request) {
  return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url), { status: 303 });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (!code || !state) {
    return failRedirect(request);
  }

  const cookieState = request.headers.get("cookie")?.match(/(?:^|; )google_oauth_state=([^;]+)/)?.[1];
  const cookieReturnUrl = request.headers.get("cookie")?.match(/(?:^|; )google_oauth_return_url=([^;]+)/)?.[1];

  if (!cookieState || decodeURIComponent(cookieState) !== state) {
    return failRedirect(request);
  }

  try {
    const token = await exchangeGoogleCodeForToken(code);
    const user = await getGoogleUserInfo(token.access_token);
    const account = await upsertCustomerGoogleAccount({
      email: user.email,
      name: user.name || user.given_name || "Customer",
      googleSubject: user.sub,
    });
    const session = await createCustomerSession(account.id);
    const returnUrl = sanitizeAuthReturnUrl(cookieReturnUrl ? decodeURIComponent(cookieReturnUrl) : null, "/");

    const response = NextResponse.redirect(new URL(returnUrl, request.url), { status: 303 });
    response.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
    response.cookies.set(RETURN_URL_COOKIE, "", { maxAge: 0, path: "/" });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });

    return response;
  } catch {
    return failRedirect(request);
  }
}
