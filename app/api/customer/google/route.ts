export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const canonicalPath = `/api/customer-auth/google${requestUrl.search}`;
  const redirectUrl = new URL(canonicalPath, request.url);

  return Response.redirect(redirectUrl, 307);
}
