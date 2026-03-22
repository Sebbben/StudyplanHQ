import { buildLogoutUrl } from "@/lib/auth/oidc";
import { clearSessionCookie } from "@/lib/auth/session";
import { noStoreJson, toErrorResponse } from "@/lib/http/response";
import { assertTrustedMutationRequest } from "@/lib/security/request";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    await clearSessionCookie();

    return noStoreJson({ logoutUrl: await buildLogoutUrl() });
  } catch (error) {
    return toErrorResponse(error, { fallbackMessage: "Logout failed." });
  }
}
