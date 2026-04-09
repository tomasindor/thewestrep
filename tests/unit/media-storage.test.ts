import assert from "node:assert/strict";
import test from "node:test";

import { createR2Storage } from "../../lib/media/storage";

type RecordedCommand =
  | {
      action: "put";
      bucket: string;
      key: string;
      body: Buffer;
      contentType: string | undefined;
      cacheControl: string | undefined;
    }
  | {
      action: "get";
      bucket: string;
      key: string;
    }
  | {
      action: "delete";
      bucket: string;
      key: string;
    }
  | {
      action: "list";
      bucket: string;
      prefix: string | undefined;
      continuationToken: string | undefined;
    };

function createFakeClient() {
  const history: RecordedCommand[] = [];

  return {
    history,
    client: {
      async putObject(input: {
        Bucket: string;
        Key: string;
        Body: Buffer;
        ContentType?: string;
        CacheControl?: string;
      }) {
        history.push({
          action: "put",
          bucket: input.Bucket,
          key: input.Key,
          body: input.Body,
          contentType: input.ContentType,
          cacheControl: input.CacheControl,
        });

        return {
          ETag: "etag-1",
        };
      },
      async getObject(input: { Bucket: string; Key: string }) {
        history.push({
          action: "get",
          bucket: input.Bucket,
          key: input.Key,
        });

        return {
          Body: Buffer.from("binary-image"),
          ContentType: "image/webp",
          ContentLength: 12,
        };
      },
      async deleteObject(input: { Bucket: string; Key: string }) {
        history.push({
          action: "delete",
          bucket: input.Bucket,
          key: input.Key,
        });
      },
      async listObjectsV2(input: { Bucket: string; Prefix?: string; ContinuationToken?: string }) {
        history.push({
          action: "list",
          bucket: input.Bucket,
          prefix: input.Prefix,
          continuationToken: input.ContinuationToken,
        });

        if (!input.ContinuationToken) {
          return {
            Contents: [{ Key: "imports/item-1/original.jpg" }, { Key: "imports/item-1/thumb.webp" }],
            IsTruncated: true,
            NextContinuationToken: "page-2",
          };
        }

        return {
          Contents: [{ Key: "imports/item-2/detail.webp" }],
          IsTruncated: false,
        };
      },
    },
  };
}

test("putObject forwards bucket, key and payload metadata", async () => {
  const fake = createFakeClient();
  const storage = createR2Storage({
    bucketName: "catalog-images",
    client: fake.client,
  });

  const putResult = await storage.putObject({
    key: "imports/job-1/item-1/original.jpg",
    body: Buffer.from("raw-image"),
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });

  assert.equal(putResult.etag, "etag-1");
  assert.deepEqual(fake.history, [
    {
      action: "put",
      bucket: "catalog-images",
      key: "imports/job-1/item-1/original.jpg",
      body: Buffer.from("raw-image"),
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000, immutable",
    },
  ]);
});

test("listObjects paginates until all keys are collected", async () => {
  const fake = createFakeClient();
  const storage = createR2Storage({
    bucketName: "catalog-images",
    client: fake.client,
  });

  const keys = await storage.listObjectKeys("imports/");

  assert.deepEqual(keys, ["imports/item-1/original.jpg", "imports/item-1/thumb.webp", "imports/item-2/detail.webp"]);
  assert.deepEqual(
    fake.history.filter((entry) => entry.action === "list"),
    [
      {
        action: "list",
        bucket: "catalog-images",
        prefix: "imports/",
        continuationToken: undefined,
      },
      {
        action: "list",
        bucket: "catalog-images",
        prefix: "imports/",
        continuationToken: "page-2",
      },
    ],
  );
});

test("getObject and deleteObject normalize shape for callers", async () => {
  const fake = createFakeClient();
  const storage = createR2Storage({
    bucketName: "catalog-images",
    client: fake.client,
  });

  const object = await storage.getObject("imports/item-1/thumb.webp");

  assert.deepEqual(object, {
    body: Buffer.from("binary-image"),
    contentType: "image/webp",
    contentLength: 12,
  });

  await storage.deleteObject("imports/item-1/thumb.webp");

  assert.deepEqual(
    fake.history.filter((entry) => entry.action === "get" || entry.action === "delete"),
    [
      {
        action: "get",
        bucket: "catalog-images",
        key: "imports/item-1/thumb.webp",
      },
      {
        action: "delete",
        bucket: "catalog-images",
        key: "imports/item-1/thumb.webp",
      },
    ],
  );
});
