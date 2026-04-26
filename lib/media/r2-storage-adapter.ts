import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { getR2Config, type R2Config } from "@/lib/env/shared";
import { createR2Storage, type CreateR2StorageOptions, type R2StorageClient } from "@/lib/media/storage";

type S3CommandClient = {
  send(command: unknown): Promise<any>;
};

export function createS3BackedR2Client(client: S3CommandClient): R2StorageClient {
  return {
    async putObject(input) {
      return client.send(new PutObjectCommand(input));
    },
    async getObject(input) {
      return client.send(new GetObjectCommand(input));
    },
    async deleteObject(input) {
      await client.send(new DeleteObjectCommand(input));
    },
    async listObjectsV2(input) {
      return client.send(new ListObjectsV2Command(input));
    },
  };
}

export interface CreateR2StorageFromEnvOptions {
  getConfig?: () => R2Config | null;
  createS3Client?: (config: Pick<R2Config, "endpoint" | "accessKeyId" | "secretAccessKey">) => S3CommandClient;
}

function createDefaultS3Client(config: Pick<R2Config, "endpoint" | "accessKeyId" | "secretAccessKey">) {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function createR2StorageFromEnv(options: CreateR2StorageFromEnvOptions = {}): ReturnType<typeof createR2Storage> {
  const config = (options.getConfig ?? getR2Config)();

  if (!config) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME are required.");
  }

  const s3Client = (options.createS3Client ?? createDefaultS3Client)(config);
  const client = createS3BackedR2Client(s3Client);

  const storageOptions: CreateR2StorageOptions = {
    client,
    bucketName: config.bucketName,
  };

  return createR2Storage(storageOptions);
}
