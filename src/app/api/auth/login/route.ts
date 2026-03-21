import { NextResponse } from "next/server";

import { createAuthorizationUrl } from "@/lib/auth/oidc";

export async function GET(request: Request) {
  const nextPath = new URL(request.url).searchParams.get("next");
  const authorizationUrl = await createAuthorizationUrl(nextPath);
  return NextResponse.redirect(authorizationUrl);
}
