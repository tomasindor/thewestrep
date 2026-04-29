import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";
import { applyRateLimit } from "@/lib/security/with-rate-limit";

const baseHandler = NextAuth(authOptions);

export { baseHandler as GET };

export async function POST(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  const params = await context.params;
  const pathSegments = params.nextauth;
  const isCredentials =
    pathSegments.includes("callback") && pathSegments.includes("credentials");

  if (isCredentials) {
    const rateLimit = await applyRateLimit(request, "login-credentials", {
      maxRequests: 5,
      windowMs: 5 * 60 * 1000,
    });
    if (rateLimit) return rateLimit;
  }

  return baseHandler(request, { params });
}
