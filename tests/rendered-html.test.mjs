import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("server-renders the certification picker home screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /자격증 랜덤 퀴즈/);
  assert.match(html, /어떤 자격증을 준비하세요/);
  assert.match(html, /리눅스마스터/);
  assert.match(html, /AWS SAA/);
});

test("does not leak sign-in or ranking affordances", async () => {
  const response = await render();
  const html = await response.text();

  for (const term of ["signin-with-chatgpt", "랭킹", "로그인"]) {
    assert.ok(!html.includes(term), `홈 화면에 '${term}' 가 남아 있습니다`);
  }
});
