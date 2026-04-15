import assert from "node:assert/strict";
import test from "node:test";

import { importJobs } from "../../lib/db/schema";
import { clearImportsQueueFromDb } from "../../lib/imports/curation";

test("clearImportsQueueFromDb deletes staging import_jobs only", async () => {
  const deletedTables: unknown[] = [];

  const result = await clearImportsQueueFromDb({
    query: {
      importJobs: {
        findMany: async () => [{ id: "job-1" }, { id: "job-2" }],
      },
    },
    delete: async (table: unknown) => {
      deletedTables.push(table);
      return [];
    },
  });

  assert.equal(result.deletedJobs, 2);
  assert.deepEqual(deletedTables, [importJobs]);
});
