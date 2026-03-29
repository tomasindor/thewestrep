import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const fallbackLibDir = "/home/gonzalo/.local/playwright-libs/noble/rootfs/usr/lib/x86_64-linux-gnu";
const configuredLibDir = process.env.PLAYWRIGHT_LOCAL_LIBS?.trim() || fallbackLibDir;
const shouldInjectLocalLibs = configuredLibDir.length > 0 && existsSync(configuredLibDir);

const env = { ...process.env };

if (shouldInjectLocalLibs) {
  env.LD_LIBRARY_PATH = [configuredLibDir, env.LD_LIBRARY_PATH].filter(Boolean).join(":");
}

const cliPath = path.resolve("node_modules", "playwright", "cli.js");
const child = spawn(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[playwright-runner] Failed to start Playwright CLI.");
  console.error(error);
  process.exit(1);
});
