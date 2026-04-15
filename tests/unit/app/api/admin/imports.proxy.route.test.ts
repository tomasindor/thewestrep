import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../../../../../app/api/admin/imports/proxy/route";

test("proxy GET tries stored preview URL first and falls back to source URL when preview returns 404", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);

      if (url.includes("_small_real")) {
        return new Response("preview missing", { status: 404 });
      }

      return new Response("full image", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    },
  });

  try {
    const response = await GET(new Request("http://localhost/api/admin/imports/proxy?url=https%3A%2F%2Fphoto.yupoo.com%2Fdemo%2Falbums%2F777%2Fmain.jpg&previewUrl=https%3A%2F%2Fphoto.yupoo.com%2Fdemo%2Falbums%2F777%2Fmain_small_real.jpg"));
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [
      "https://photo.yupoo.com/demo/albums/777/main_small_real.jpg",
      "https://photo.yupoo.com/demo/albums/777/main.jpg",
    ]);
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  }
});

test("proxy GET uses source URL directly when previewUrl is not provided", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    },
  });

  try {
    const response = await GET(new Request("http://localhost/api/admin/imports/proxy?url=https%3A%2F%2Fphoto.yupoo.com%2Fdemo%2Falbums%2F777%2Fmain.jpg"));
    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["https://photo.yupoo.com/demo/albums/777/main.jpg"]);
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  }
});
