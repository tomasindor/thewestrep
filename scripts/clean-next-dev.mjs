import { existsSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";

const projectDir = process.cwd();
const isMountedWindowsPath = projectDir.startsWith("/mnt/");
const isNativeWindowsPath = /^[A-Za-z]:\\/.test(projectDir);
const shouldCleanNextDev = isMountedWindowsPath || isNativeWindowsPath;

function hasRunningNextServerInProject() {
  if (process.platform === "win32") {
    return false;
  }

  let normalizedProjectDir;

  try {
    normalizedProjectDir = realpathSync(projectDir);
  } catch {
    return false;
  }

  const currentPid = process.pid;

  try {
    for (const entry of readdirSync("/proc", { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) {
        continue;
      }

      const pid = Number(entry.name);

      if (!Number.isFinite(pid) || pid === currentPid) {
        continue;
      }

      try {
        const cwd = realpathSync(`/proc/${entry.name}/cwd`);

        if (cwd !== normalizedProjectDir) {
          continue;
        }

        const cmdline = readFileSync(`/proc/${entry.name}/cmdline`, "utf8").replaceAll("\u0000", " ");

        if (cmdline.includes("next-server") || cmdline.includes("next dev")) {
          return true;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }

  return false;
}

if (shouldCleanNextDev) {
  const nextDevDir = path.join(projectDir, ".next", "dev");

  if (existsSync(nextDevDir)) {
    if (hasRunningNextServerInProject()) {
      console.log(`[dev-clean] Skipped removing ${nextDevDir} because another Next dev server is already running for this project.`);
      process.exit(0);
    }

    rmSync(nextDevDir, { recursive: true, force: true });
    console.log(`[dev-clean] Removed ${nextDevDir} before starting Next dev.`);
  }
}
