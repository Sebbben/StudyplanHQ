import { cookies } from "next/headers";

import { env } from "@/lib/env";

const STATE_COOKIE = "studyplanhq_oauth_state";
const VERIFIER_COOKIE = "studyplanhq_oauth_verifier";
const REDIRECT_PATH = "/api/auth/callback/keycloak";

type DiscoveryDocument = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
};

type UserInfo = {
  sub: string;
  email?: string;
  name?: string;
};

function base64UrlEncode(input: Uint8Array) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return base64UrlEncode(bytes);
}

async function createPkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function discoverOidcConfiguration(): Promise<DiscoveryDocument> {
  const response = await fetch(`${env.KEYCLOAK_ISSUER_URL}/.well-known/openid-configuration`, {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("Failed to discover OIDC configuration.");
  }

  return response.json();
}

export function getRedirectUri() {
  return `${env.APP_URL}${REDIRECT_PATH}`;
}

export async function createAuthorizationUrl() {
  const cookieStore = await cookies();
  const discovery = await discoverOidcConfiguration();
  const state = randomString();
  const verifier = randomString(48);
  const challenge = await createPkceChallenge(verifier);
  const authorizationUrl = new URL(discovery.authorization_endpoint);

  authorizationUrl.searchParams.set("client_id", env.KEYCLOAK_CLIENT_ID);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid profile email");
  authorizationUrl.searchParams.set("redirect_uri", getRedirectUri());
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  cookieStore.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return authorizationUrl.toString();
}

export async function exchangeAuthorizationCode(url: URL) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const verifier = cookieStore.get(VERIFIER_COOKIE)?.value;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  if (!expectedState || !verifier || !state || !code || state !== expectedState) {
    throw new Error("Invalid OIDC callback state.");
  }

  const discovery = await discoverOidcConfiguration();
  const tokenResponse = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.KEYCLOAK_CLIENT_ID,
      client_secret: env.KEYCLOAK_CLIENT_SECRET,
      code,
      code_verifier: verifier,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to exchange authorization code.");
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    throw new Error("OIDC token response did not include an access token.");
  }

  const userInfoResponse = await fetch(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
    cache: "no-store",
  });

  if (!userInfoResponse.ok) {
    throw new Error("Failed to fetch user profile from Keycloak.");
  }

  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(VERIFIER_COOKIE);

  return (await userInfoResponse.json()) as UserInfo;
}

export async function buildLogoutUrl() {
  const discovery = await discoverOidcConfiguration();

  if (!discovery.end_session_endpoint) {
    return env.APP_URL;
  }

  const logoutUrl = new URL(discovery.end_session_endpoint);
  logoutUrl.searchParams.set("client_id", env.KEYCLOAK_CLIENT_ID);
  logoutUrl.searchParams.set("post_logout_redirect_uri", env.APP_URL);
  return logoutUrl.toString();
}
