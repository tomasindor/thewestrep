import "server-only";

import { randomBytes } from "node:crypto";

import { getAppUrl, getCustomerGoogleCredentials } from "@/lib/env/shared";

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
}

export interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export function createGoogleOAuthState() {
  return randomBytes(32).toString("hex");
}

export function getGoogleCallbackUrl() {
  return new URL("/api/customer-auth/google/callback", getAppUrl()).toString();
}

export function generateGoogleAuthUrl(state: string, _returnUrl: string): string {
  void _returnUrl;
  const { clientId } = getCustomerGoogleCredentials();

  if (!clientId) {
    throw new Error("Google OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeGoogleCodeForToken(code: string): Promise<GoogleTokenResponse> {
  const credentials = getCustomerGoogleCredentials();

  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: getGoogleCallbackUrl(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed.");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Google user info request failed.");
  }

  const user = (await response.json()) as GoogleUserInfo;

  if (!user.email_verified) {
    throw new Error("Google account email must be verified.");
  }

  return user;
}
