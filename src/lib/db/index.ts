import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";

declare global {
  var __studyplanhqPool: Pool | undefined;
}

function createPool() {
  return new Pool({ connectionString: getEnv().DATABASE_URL });
}

export function getPool() {
  const pool = global.__studyplanhqPool ?? createPool();

  if (process.env.NODE_ENV !== "production") {
    global.__studyplanhqPool = pool;
  }

  return pool;
}

export function getDb() {
  return drizzle({ client: getPool() });
}
