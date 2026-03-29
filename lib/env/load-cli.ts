import { existsSync } from "node:fs";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";

type CliEnvReport = {
  activeEnvFile: ".env.local" | ".env" | null;
  hasEnvLocal: boolean;
  hasEnv: boolean;
};

let cachedReport: CliEnvReport | null = null;

export function loadCliEnv(): CliEnvReport {
  if (cachedReport) {
    return cachedReport;
  }

  const projectDir = process.cwd();
  const hasEnvLocal = existsSync(join(projectDir, ".env.local"));
  const hasEnv = existsSync(join(projectDir, ".env"));

  loadEnvConfig(projectDir);

  const activeEnvFile = hasEnvLocal ? ".env.local" : hasEnv ? ".env" : null;

  if (hasEnvLocal && hasEnv) {
    console.warn(
      "[env] Found both .env.local and .env. CLI commands will use .env.local first, matching Next.js. Keep a single source of truth to avoid confusion.",
    );
  }

  if (!activeEnvFile) {
    console.warn(
      "[env] No .env.local or .env file was found. CLI commands will rely on already exported environment variables.",
    );
  }

  cachedReport = {
    activeEnvFile,
    hasEnvLocal,
    hasEnv,
  };

  return cachedReport;
}
