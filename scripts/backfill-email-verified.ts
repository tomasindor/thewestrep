import { buildEmailVerifiedBackfillSql } from "@/lib/auth/email-verified-backfill";

function printUsage() {
  console.log("Usage: tsx scripts/backfill-email-verified.ts [--print-sql]");
}

function run() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    printUsage();
    return;
  }

  const sql = buildEmailVerifiedBackfillSql();

  if (args.length === 0 || args.includes("--print-sql")) {
    console.log(sql);
    console.log("\nNOTE: This script only prints SQL. Execute manually against a confirmed target DB.");
    return;
  }

  throw new Error("Unsupported argument. Use --help for usage.");
}

run();
