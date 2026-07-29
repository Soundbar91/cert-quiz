import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the quiz home screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /리눅스 마스터 2급/);
  assert.match(html, /어떤 분야를 공부할까요/);
  assert.match(html, /2급 1차/);
  assert.match(html, /2급 2차/);
  assert.match(html, /랭킹 TOP 20/);
});

test("rankings API rejects an unknown category", async () => {
  const response = await render("/api/rankings?category=nope");
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.match(payload.error, /category/);
});
