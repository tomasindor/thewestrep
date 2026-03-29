import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/db/schema";
import { getRequiredDatabaseUrl, isDatabaseConfigured } from "@/lib/env/shared";

let databaseInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlClientInstance: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!databaseInstance) {
    const sql = neon(getRequiredDatabaseUrl());
    databaseInstance = drizzle(sql, { schema });
  }

  return databaseInstance;
}

export function getDbSql() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!sqlClientInstance) {
    sqlClientInstance = neon(getRequiredDatabaseUrl());
  }

  return sqlClientInstance;
}
