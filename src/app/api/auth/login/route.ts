import { NextResponse } from "next/server";

import { createAuthorizationUrl } from "@/lib/auth/oidc";

export async function GET() {
  const authorizationUrl = await createAuthorizationUrl();
  return NextResponse.redirect(authorizationUrl);
}
