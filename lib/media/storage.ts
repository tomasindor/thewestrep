import "server-only";

export interface R2StorageClient {
  putObject(input: {
    Bucket: string;
    Key: string;
    Body: Buffer;
    ContentType?: string;
    CacheControl?: string;
    Metadata?: Record<string, string>;
  }): Promise<{ ETag?: string } | void>;
  getObject(input: { Bucket: string; Key: string }): Promise<{
    Body?: Buffer | Uint8Array | { arrayBuffer(): Promise<ArrayBuffer> } | { transformToByteArray(): Promise<Uint8Array> };
    ContentType?: string;
    ContentLength?: number;
  }>;
  deleteObject(input: { Bucket: string; Key: string }): Promise<void>;
  listObjectsV2(input: { Bucket: string; Prefix?: string; ContinuationToken?: string }): Promise<{
    Contents?: Array<{ Key?: string }>;
    IsTruncated?: boolean;
    NextContinuationToken?: string;
  }>;
}

export interface CreateR2StorageOptions {
  client: R2StorageClient;
  bucketName: string;
}

export interface PutR2ObjectInput {
  key: string;
  body: Buffer;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface R2ObjectResult {
  body: Buffer;
  contentType: string | undefined;
  contentLength: number;
}

async function normalizeBodyToBuffer(body: Awaited<ReturnType<R2StorageClient["getObject"]>>["Body"]): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof body === "object" && "transformToByteArray" in body && typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  if (typeof body === "object" && "arrayBuffer" in body && typeof body.arrayBuffer === "function") {
    return Buffer.from(await body.arrayBuffer());
  }

  throw new Error("R2 getObject returned an unsupported body type.");
}

export function createR2Storage({ client, bucketName }: CreateR2StorageOptions) {
  return {
    async putObject(input: PutR2ObjectInput) {
      const response = await client.putObject({
        Bucket: bucketName,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
        Metadata: input.metadata,
      });

      return {
        etag: response?.ETag,
      };
    },

    async getObject(key: string): Promise<R2ObjectResult> {
      const response = await client.getObject({
        Bucket: bucketName,
        Key: key,
      });
      const body = await normalizeBodyToBuffer(response.Body);

      return {
        body,
        contentType: response.ContentType,
        contentLength: response.ContentLength ?? body.byteLength,
      };
    },

    async deleteObject(key: string) {
      await client.deleteObject({
        Bucket: bucketName,
        Key: key,
      });
    },

    async listObjectKeys(prefix?: string) {
      const keys: string[] = [];
      let continuationToken: string | undefined;

      do {
        const response = await client.listObjectsV2({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });

        for (const entry of response.Contents ?? []) {
          if (entry.Key) {
            keys.push(entry.Key);
          }
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      return keys;
    },
  };
}
