import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { getR2Config, isR2Configured } from "../../lib/env/shared";

const ORIGINAL_ENV = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
};

afterEach(() => {
  if (ORIGINAL_ENV.R2_ACCOUNT_ID === undefined) {
    delete process.env.R2_ACCOUNT_ID;
  } else {
    process.env.R2_ACCOUNT_ID = ORIGINAL_ENV.R2_ACCOUNT_ID;
  }

  if (ORIGINAL_ENV.R2_ACCESS_KEY_ID === undefined) {
    delete process.env.R2_ACCESS_KEY_ID;
  } else {
    process.env.R2_ACCESS_KEY_ID = ORIGINAL_ENV.R2_ACCESS_KEY_ID;
  }

  if (ORIGINAL_ENV.R2_SECRET_ACCESS_KEY === undefined) {
    delete process.env.R2_SECRET_ACCESS_KEY;
  } else {
    process.env.R2_SECRET_ACCESS_KEY = ORIGINAL_ENV.R2_SECRET_ACCESS_KEY;
  }

  if (ORIGINAL_ENV.R2_BUCKET_NAME === undefined) {
    delete process.env.R2_BUCKET_NAME;
  } else {
    process.env.R2_BUCKET_NAME = ORIGINAL_ENV.R2_BUCKET_NAME;
  }

  if (ORIGINAL_ENV.R2_PUBLIC_BASE_URL === undefined) {
    delete process.env.R2_PUBLIC_BASE_URL;
  } else {
    process.env.R2_PUBLIC_BASE_URL = ORIGINAL_ENV.R2_PUBLIC_BASE_URL;
  }
});

test("returns null R2 config and false readiness when credentials are incomplete", () => {
  delete process.env.R2_ACCOUNT_ID;
  process.env.R2_ACCESS_KEY_ID = "access";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET_NAME = "bucket";

  assert.equal(getR2Config(), null);
  assert.equal(isR2Configured(), false);
});

test("builds R2 config with endpoint when all required values are present", () => {
  process.env.R2_ACCOUNT_ID = "account-id";
  process.env.R2_ACCESS_KEY_ID = "access-key";
  process.env.R2_SECRET_ACCESS_KEY = "secret-key";
  process.env.R2_BUCKET_NAME = "product-assets";
  process.env.R2_PUBLIC_BASE_URL = "https://cdn.thewestrep.com/images";

  assert.deepEqual(getR2Config(), {
    accountId: "account-id",
    accessKeyId: "access-key",
    secretAccessKey: "secret-key",
    bucketName: "product-assets",
    endpoint: "https://account-id.r2.cloudflarestorage.com",
    publicBaseUrl: "https://cdn.thewestrep.com/images",
  });
  assert.equal(isR2Configured(), true);
});
