import { headers } from "next/headers";

import { env } from "@/lib/env";

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (!origin) {
    throw new Error("Missing Origin header.");
  }

  if (new URL(origin).origin !== new URL(env.APP_URL).origin) {
    throw new Error("Cross-site request rejected.");
  }
}
