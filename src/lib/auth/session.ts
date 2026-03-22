import { createSecretKey } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { getEnv } from "@/lib/env";

const SESSION_COOKIE = "studyplanhq_session";
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

export type UserSession = {
  userId: number;
  sub: string;
  email?: string | null;
  name?: string | null;
};

function getSessionKey() {
  const env = getEnv();
  return createSecretKey(Buffer.from(env.SESSION_SECRET, "utf8"));
}

export async function createSessionToken(session: UserSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ONE_WEEK_IN_SECONDS}s`)
    .sign(getSessionKey());
}

export async function readSessionToken(token: string) {
  const result = await jwtVerify<UserSession>(token, getSessionKey(), {
    algorithms: ["HS256"],
  });

  return result.payload;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    return await readSessionToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: UserSession) {
  const cookieStore = await cookies();
  const token = await createSessionToken(session);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK_IN_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
