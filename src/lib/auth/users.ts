import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function upsertUser(identity: { sub: string; email?: string; name?: string }) {
  const db = getDb();
  await db
    .insert(users)
    .values({
      keycloakSubject: identity.sub,
      email: identity.email ?? null,
      name: identity.name ?? null,
    })
    .onConflictDoUpdate({
      target: users.keycloakSubject,
      set: {
        email: sql`excluded.email`,
        name: sql`excluded.name`,
        updatedAt: sql`now()`,
      },
    });

  const [user] = await db.select().from(users).where(eq(users.keycloakSubject, identity.sub)).limit(1);

  if (!user) {
    throw new Error("Unable to load local user record after login.");
  }

  return user;
}
