import assert from "node:assert/strict";
import test from "node:test";

import { createR2StorageFromEnv, createS3BackedR2Client } from "../../lib/media/r2-storage-adapter";

test("createS3BackedR2Client maps putObject to S3 PutObjectCommand", async () => {
  const sent: unknown[] = [];
  const client = createS3BackedR2Client({
    send: async (command: unknown) => {
      sent.push(command);
      return { ETag: "etag-from-s3" };
    },
  });

  const response = await client.putObject({
    Bucket: "catalog",
    Key: "imports/job/item/original.jpg",
    Body: Buffer.from("image"),
    ContentType: "image/jpeg",
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: { source: "yupoo" },
  });

  assert.equal(response?.ETag, "etag-from-s3");
  assert.equal(sent.length, 1);
  assert.equal((sent[0] as { input?: { Bucket?: string } }).input?.Bucket, "catalog");
});

test("createR2StorageFromEnv fails when required R2 env vars are missing", () => {
  assert.throws(
    () => createR2StorageFromEnv({
      getConfig: () => null,
    }),
    /R2_.*required/i,
  );
});
