import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";

declare global {
  var __studyplanhqPool: Pool | undefined;
}

const pool = global.__studyplanhqPool ?? new Pool({ connectionString: env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  global.__studyplanhqPool = pool;
}

export const db = drizzle({ client: pool });
export { pool };
