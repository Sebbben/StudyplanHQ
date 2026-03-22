import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { noStoreJson } from "@/lib/http/response";

export async function GET() {
  try {
    await db.execute(sql`select 1`);

    return noStoreJson({
      ok: true,
      checks: {
        database: "up",
      },
    });
  } catch (error) {
    console.error("Health check failed", error);

    return noStoreJson(
      {
        ok: false,
        checks: {
          database: "down",
        },
      },
      { status: 503 },
    );
  }
}
