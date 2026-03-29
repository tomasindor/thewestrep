import { defineConfig } from "drizzle-kit";

import { loadCliEnv } from "@/lib/env/load-cli";

const { activeEnvFile } = loadCliEnv();
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    `[env] DATABASE_URL is required for drizzle-kit. Create ${activeEnvFile ?? ".env.local"} (recommended) or export DATABASE_URL before running db:push/db:studio.`,
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
