import { NextResponse } from "next/server";

import { consumePostLoginRedirectPath, exchangeAuthorizationCode } from "@/lib/auth/oidc";
import { setSessionCookie } from "@/lib/auth/session";
import { upsertUser } from "@/lib/auth/users";

export async function GET(request: Request) {
  try {
    const userInfo = await exchangeAuthorizationCode(new URL(request.url));
    const redirectPath = await consumePostLoginRedirectPath();
    const user = await upsertUser(userInfo);

    await setSessionCookie({
      userId: user.id,
      sub: user.keycloakSubject,
      email: user.email,
      name: user.name,
    });

    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
