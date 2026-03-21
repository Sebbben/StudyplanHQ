import { NextResponse } from "next/server";

import { buildLogoutUrl } from "@/lib/auth/oidc";
import { clearSessionCookie } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST() {
  try {
    await assertSameOrigin();
    await clearSessionCookie();

    return NextResponse.redirect(await buildLogoutUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
